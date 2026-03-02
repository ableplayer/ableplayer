import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  {
    files: ["scripts/*.js"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-unused-vars': ['error', {
        caughtErrorsIgnorePattern: '^_'
      }]
    }
  },
  globalIgnores(['build/**'])
]);
