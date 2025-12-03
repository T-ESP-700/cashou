// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const path = require('path');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // Expo's base config
  expoConfig,
  // Make ESLint (eslint-plugin-import) resolve our TS path aliases like "@/..."
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    settings: {
      // Use the TS resolver and point it to this app's tsconfig
      'import/resolver': {
        typescript: {
          project: path.join(__dirname, 'tsconfig.json'),
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      // Work around npm optional dependency bug in eslint-plugin-import's native resolver
      // See: https://github.com/npm/cli/issues/4828
      // We'll rely on TS + Babel path aliasing; disable problematic rules to avoid false errors
      'import/no-unresolved': 'off',
      'import/namespace': 'off',
      'import/named': 'off',
      'import/default': 'off',
      'import/no-duplicates': 'off',
      'import/order': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
