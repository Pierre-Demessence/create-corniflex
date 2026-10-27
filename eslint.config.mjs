import antfu from '@antfu/eslint-config';

export default antfu({
  type: 'app',
  typescript: true,
  formatters: false,
  stylistic: {
    semi: true,
  },
  // The templates ship configs that reference deps not installed here, so they
  // must never be linted as part of this package.
  ignores: ['dist/**', 'node_modules/**', 'docs/**', 'template/**', 'template-browser-tests/**'],
  rules: {
    // This is a CLI; console output is the product.
    'no-console': 'off',
    // We use the built-in node:test runner, not vitest.
    'test/no-import-node-test': 'off',
  },
});
