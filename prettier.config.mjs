/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 * @type {import("prettier-plugin-organize-attributes").PrettierPluginOrganizeAttributesParserOptions}
 */
const config = {
  tabWidth: 2,
  printWidth: 120,
  singleAttributePerLine: true,
  plugins: ['prettier-plugin-organize-attributes'],
  attributeGroups: [
    "^class$",
    "$ANGULAR_STRUCTURAL_DIRECTIVE",
    "^slot$",
    "^(id|name)$",
    "^type$",
    "^variant$",
    "$DEFAULT",
    "^aria-",
    "^\\(click\\)$",
  ],
  overrides: [
    {
      // Angular component templates use control-flow syntax (@if/@for/@switch)
      // that the default html parser can't parse; the angular parser handles it.
      files: '*.component.html',
      options: { parser: 'angular' },
    },
  ],
};

export default config;
