// @ts-check
/**
 * Generator for @universal-material/react.
 *
 * Reads the web library's HTMLElementTagNameMap blocks (the source of truth for the
 * publicly-typed `u-*` elements and their public class names) and emits one
 * `@lit/react` createComponent() wrapper per element under src/components/<tag>.ts,
 * plus a barrel src/index.ts.
 *
 * Why the tagNameMap and NOT the CEM `name`/`events` fields:
 *  - The CEM (../../dist/custom-elements.json) lists 64 customElement declarations,
 *    5 of which are internal/template-only elements with no tagNameMap entry
 *    (u-calendar, u-range-calendar, u-overflow-menu, u-overflow-menu-item,
 *    u-typeahead-template-render) — those are not form fields and are not wrapped.
 *  - The CEM `events` arrays are incomplete (input/change come from inner native
 *    <input>/redispatchEvent, which the CEM @event JSDoc scan does not capture), so
 *    the value/event map is curated below from planning/research/form-participation.md.
 *
 * Anti-drift guard: the emitted wrapper count must equal the number of tagNameMap
 * entries, and that count is cross-checked against the CEM's eligible-element count
 * (customElements that DO have a tagName). Drift exits non-zero.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const WEB_SRC = path.resolve(REPO_ROOT, 'src');
const CEM_PATH = path.resolve(REPO_ROOT, 'dist/custom-elements.json');
const OUT_DIR = path.resolve(__dirname, '../src');
const COMPONENTS_DIR = path.resolve(OUT_DIR, 'components');

/**
 * Curated value/event map keyed by tag.
 * Sourced from planning/research/form-participation.md §2.2 and the task-07 contract table.
 * Each entry maps a React prop name -> [domEventName, EventTypeName].
 * Tags absent here get NO events map (non-input / display-only elements).
 * @type {Record<string, Record<string, [string, string]>>}
 */
const EVENTS = {
  'u-text-field': { onInput: ['input', 'InputEvent'], onChange: ['change', 'Event'] },
  'u-text-area': { onInput: ['input', 'InputEvent'], onChange: ['change', 'Event'] },
  'u-search': { onInput: ['input', 'InputEvent'], onChange: ['change', 'Event'] },
  'u-select': { onInput: ['input', 'InputEvent'], onChange: ['change', 'Event'] },
  'u-datepicker': { onInput: ['input', 'InputEvent'], onChange: ['change', 'Event'] },
  'u-range-datepicker': { onInput: ['input', 'InputEvent'], onChange: ['change', 'Event'] },
  'u-slider': { onInput: ['input', 'InputEvent'], onChange: ['change', 'Event'] },
  'u-checkbox': { onChange: ['change', 'Event'] },
  'u-checkbox-list-item': { onChange: ['change', 'Event'] },
  'u-radio': { onChange: ['change', 'Event'] },
  'u-radio-list-item': { onChange: ['change', 'Event'] },
  'u-switch': { onChange: ['change', 'Event'] },
  'u-switch-list-item': { onChange: ['change', 'Event'] },
  'u-typeahead': {
    onInput: ['input', 'InputEvent'],
    onChange: ['change', 'Event'],
    onSelected: ['selected', 'CustomEvent'],
  },
  'u-chip-field': {
    onChange: ['change', 'Event'],
    onRemove: ['remove', 'CustomEvent'],
  },
};

/** Recursively collect *.ts/*.d.ts files under a directory. */
function walk(dir, ext = '.ts') {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, ext));
    else if (entry.name.endsWith(ext)) out.push(p);
  }
  return out;
}

/**
 * Resolve the set of names reachably re-exported from the web library's public
 * barrel (dist/index.d.ts), following `export * from './x.js'` transitively.
 *
 * Most tagNameMap classes are re-exported by name, but a handful (u-option,
 * u-fab-menu, u-fab-menu-item, u-checkbox-list-item, u-radio-list-item) are only
 * SIDE-EFFECT imported by the barrel (the element registers) without their class
 * being `export *`-re-exported — so `import { Option } from '@universal-material/web'`
 * fails to type-check. The generator detects these dynamically (so it never drifts
 * if the web library starts/stops exporting one) and emits a tag-resolved wrapper
 * for them instead of a named-import wrapper.
 *
 * @returns {Set<string>} the set of reachably-exported names.
 */
function readExportedNames() {
  const distIndex = path.resolve(REPO_ROOT, 'dist/index.d.ts');
  /** @type {Set<string>} */
  const names = new Set();
  if (!fs.existsSync(distIndex)) return names;
  /** @param {string} file @param {Set<string>} seen */
  function resolve(file, seen) {
    if (seen.has(file) || !fs.existsSync(file)) return;
    seen.add(file);
    const s = fs.readFileSync(file, 'utf8');
    for (const m of s.matchAll(/export\s+declare\s+(?:abstract\s+)?class\s+(\w+)/g))
      names.add(m[1]);
    for (const m of s.matchAll(/export\s+\{([^}]*)\}/g)) {
      for (const part of m[1].split(',')) {
        const n = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (n) names.add(n);
      }
    }
    for (const m of s.matchAll(
      /export\s+(?:declare\s+)?(?:const|function|type|interface|enum)\s+(\w+)/g,
    ))
      names.add(m[1]);
    for (const m of s.matchAll(/export\s+\*\s+from\s+'([^']+)'/g)) {
      let rel = m[1].replace(/\.js$/, '.d.ts');
      if (!/\.d\.ts$/.test(rel)) rel += '.d.ts';
      resolve(path.resolve(path.dirname(file), rel), seen);
    }
  }
  resolve(distIndex, new Set());
  return names;
}

/** Build the tag -> public class name map from HTMLElementTagNameMap blocks. */
function readTagNameMap() {
  /** @type {Map<string, string>} */
  const map = new Map();
  const re = /'(u-[a-z-]+)'\s*:\s*([A-Za-z0-9_]+)\s*;/g;
  for (const file of walk(WEB_SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = re.exec(src))) {
      map.set(m[1], m[2]);
    }
  }
  return map;
}

/** Count CEM customElement declarations that have a tagName (eligible elements). */
function readCemEligibleTags() {
  if (!fs.existsSync(CEM_PATH)) return null;
  const json = JSON.parse(fs.readFileSync(CEM_PATH, 'utf8'));
  /** @type {Set<string>} */
  const tags = new Set();
  for (const mod of json.modules ?? []) {
    for (const decl of mod.declarations ?? []) {
      if (decl.customElement && decl.tagName) tags.add(decl.tagName);
    }
  }
  return tags;
}

/** Derive the React display name: U + public class name (u-text-field/TextField -> UTextField). */
function displayName(className) {
  return 'U' + className;
}

/** Emit the events-map object literal for a tag, or null when it has no events. */
function eventsLiteral(tag) {
  const events = EVENTS[tag];
  if (!events) return null;
  const lines = Object.entries(events).map(
    ([prop, [domName, type]]) =>
      `    ${prop}: '${domName}' as EventName<${type}>,`,
  );
  return `{\n${lines.join('\n')}\n  }`;
}

/**
 * @param {string} tag
 * @param {string} className
 * @param {boolean} exported whether `className` is a named export of @universal-material/web
 */
function emitComponent(tag, className, exported) {
  const dn = displayName(className);
  const events = eventsLiteral(tag);
  const eventsImport = events
    ? `import { createComponent, type EventName } from '@lit/react';`
    : `import { createComponent } from '@lit/react';`;
  const eventsLine = events ? `\n  events: ${events},` : '';

  if (exported) {
    return `// AUTO-GENERATED by scripts/gen.mjs — DO NOT EDIT.
import * as React from 'react';
${eventsImport}
import { ${className} } from '@universal-material/web';

export const ${dn} = createComponent({
  react: React,
  tagName: '${tag}',
  elementClass: ${className},
  displayName: '${dn}',${eventsLine}
});
`;
  }

  // This element's class is NOT re-exported by name from @universal-material/web —
  // the barrel only side-effect-imports it (so the element registers). Pull in web for
  // its side effect (registration + the HTMLElementTagNameMap augmentation), then
  // resolve the constructor at runtime via customElements.get('${tag}') and type it via
  // the augmented tagNameMap, so the wrapper keeps the element's full prop typing.
  return `// AUTO-GENERATED by scripts/gen.mjs — DO NOT EDIT.
import * as React from 'react';
${eventsImport}
import '@universal-material/web'; // side-effect: registers <${tag}> + tagNameMap augmentation

type ${className} = HTMLElementTagNameMap['${tag}'];
const ${className} = customElements.get('${tag}') as { new (): ${className} };

export const ${dn} = createComponent({
  react: React,
  tagName: '${tag}',
  elementClass: ${className},
  displayName: '${dn}',${eventsLine}
});
`;
}

function emitBarrel(entries) {
  const exports = entries
    .map(([tag]) => `export * from './components/${tag}.js';`)
    .join('\n');
  return `// AUTO-GENERATED by scripts/gen.mjs — DO NOT EDIT.
import '@universal-material/web'; // side-effect: registers every <u-*> element once

${exports}

// Re-export the @lit/react EventName helper for consumers typing bespoke events.
export type { EventName } from '@lit/react';
`;
}

function main() {
  const map = readTagNameMap();
  const exportedNames = readExportedNames();
  // Stable alphabetical-by-tag order for minimal diffs across regenerations.
  const entries = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Clean the components dir so removed elements don't linger.
  fs.rmSync(COMPONENTS_DIR, { recursive: true, force: true });
  fs.mkdirSync(COMPONENTS_DIR, { recursive: true });

  let withEvents = 0;
  /** @type {string[]} */
  const tagResolved = [];
  for (const [tag, className] of entries) {
    const exported = exportedNames.size === 0 || exportedNames.has(className);
    if (!exported) tagResolved.push(tag);
    fs.writeFileSync(
      path.join(COMPONENTS_DIR, `${tag}.ts`),
      emitComponent(tag, className, exported),
      'utf8',
    );
    if (EVENTS[tag]) withEvents++;
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), emitBarrel(entries), 'utf8');

  // Anti-drift cross-check against the CEM.
  const cemTags = readCemEligibleTags();
  /** @type {string[]} */
  const skipped = [];
  if (cemTags) {
    for (const t of cemTags) if (!map.has(t)) skipped.push(t);
  }

  const generated = entries.length;
  console.log(`Generated ${generated} wrappers (${withEvents} with an events map).`);
  if (exportedNames.size === 0) {
    console.warn(
      `WARNING: could not read web exports from dist/index.d.ts — assuming all ` +
        `classes are named exports. Build web first for the named/tag-resolved split.`,
    );
  } else if (tagResolved.length) {
    console.log(
      `Tag-resolved (class not re-exported by @universal-material/web): ` +
        `${tagResolved.length} — ${tagResolved.join(', ')}.`,
    );
  }
  if (cemTags) {
    console.log(
      `CEM eligible elements: ${cemTags.size} (tagName present). ` +
        `Wrapped: ${generated}. Skipped ${skipped.length}: ${skipped.join(', ') || '(none)'}.`,
    );
    // The skipped tags are the internal/template-only elements with no tagNameMap entry.
    // Anti-drift: every wrapped tag must be a real CEM element, and the only CEM tags we
    // skip must be the ones missing from the tagNameMap (internals). If a tagNameMap tag
    // is NOT in the CEM, the manifest is stale — fail loudly.
    const notInCem = entries.map(([t]) => t).filter((t) => !cemTags.has(t));
    if (notInCem.length) {
      console.error(
        `DRIFT: ${notInCem.length} tagNameMap element(s) missing from the CEM ` +
          `(stale dist/custom-elements.json? run \`npm run analyze\` at the web root): ` +
          notInCem.join(', '),
      );
      process.exit(1);
    }
  } else {
    console.warn(
      `WARNING: ${CEM_PATH} not found — skipping CEM cross-check. Build web first.`,
    );
  }

  // Primary anti-drift guard: a fixed expected count. A web-library element
  // rename/addition/removal flips this and fails the build loudly.
  const EXPECTED = 59;
  if (generated !== EXPECTED) {
    console.error(
      `DRIFT: generated ${generated} wrappers but expected ${EXPECTED}. ` +
        `If the web library intentionally added/removed a publicly-typed element, ` +
        `update EXPECTED in scripts/gen.mjs.`,
    );
    process.exit(1);
  }
}

main();
