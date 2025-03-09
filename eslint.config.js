import globals from "globals";
import js from "@eslint/js";
import ts from "typescript-eslint";
import react from "eslint-plugin-react";

export default [
  {
    ignores: ["node_modules", "dist"],
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: { react },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
  },
  js.configs.recommended,
  ...ts.configs.recommended,
];
