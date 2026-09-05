/**
 * ESLint configuration.
 *
 * Legacy (.eslintrc) format rather than flat config: eslint is pinned to 8.x
 * here, where flat config is still opt-in. `@react-native/eslint-config` ships
 * a `/flat` export for when this moves to eslint 9.
 */

module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'coverage/',
    '*.json',
  ],
  rules: {
    // `_name` is the codebase's marker for "intentionally unused" — used by
    // not-yet-implemented stubs that must keep their real signatures.
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      // Build tooling runs in Node, not React Native.
      files: ['tools/**/*.ts', '*.config.js', 'jest.config.js'],
      env: { node: true },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
