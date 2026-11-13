import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default [
  {
    // The vendored design system follows its own package's lint rules; its check.mjs guards the bytes.
    ignores: ['node_modules/', 'test-results/', 'playwright-report/', '.plan/', 'work/', 'src/vendor/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/brace-style': ['error', 'stroustrup'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'tests/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
