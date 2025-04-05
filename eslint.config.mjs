import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
          global: 'readonly',
          ...globals.browser,
          ...globals.es2021,
          ...globals.webextensions,
      }
    }
  },
  {
    ignores: ["dist/", "package/", "node_modules/", "webpack.config.js",]
  },
  {
    rules: {
        "no-unused-vars": ["warn", {
          'varsIgnorePattern': '^_',
          'argsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }],
    }
  }
];
