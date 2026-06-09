# Rename `UmTabBar` → `TabBar` (web 3.9.0 dropped the `Um` prefix)

## Scope
`src/tab-bar/tab-bar.directive.ts` only. This directive **enhances** the native `<u-tab-bar>` (keep it).

## Context
Web 3.9.0 exports `TabBar` (`src/tab-bar/tab-bar.ts` → `export class TabBar`). `UmTabBar` is gone.
`UmTabBar` is used only as a type here.

## Changes
- Line 3: `import { UmTabBar } from '@universal-material/web';` → `import { TabBar } from '@universal-material/web';`
- Line 13: `readonly #tabBar: UmTabBar;` → `readonly #tabBar: TabBar;`
- Line 26: `inject<ElementRef<UmTabBar>>(ElementRef)` → `inject<ElementRef<TabBar>>(ElementRef)`

## Acceptance
- No `UmTabBar` token remains; directive still compiles against `TabBar`.

## Verify
```
grep -n "UmTabBar" src/tab-bar/tab-bar.directive.ts   # no matches
```
