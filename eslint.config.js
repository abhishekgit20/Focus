// Minimal ESLint setup — this project previously had none at all, so the
// bar here is "catch real footguns without drowning an unlinted codebase in
// noise on day one," not maximum strictness. Type-aware rules are
// deliberately skipped (they'd need per-directory tsconfig project wiring
// across client/server/shared) in favor of the plain recommended rule sets.
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "migrations/**", ".github/**"],
  },
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // This codebase uses `any` deliberately in a lot of places (Express
      // req/res narrowing, third-party payload shapes) — banning it outright
      // would make the very first lint run fail wall-to-wall.
      "@typescript-eslint/no-explicit-any": "off",
      // ignoreRestSiblings: true because `const { password, ...safe } = user`
      // (destructure-to-omit) is a deliberate pattern this codebase uses in
      // its security-sensitive sanitizeUser() — without it, ESLint flags the
      // very variables that pattern exists to drop as "unused."
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  {
    files: ["client/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["server/**/*.ts", "shared/**/*.ts", "script/**/*.ts", "scripts/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  }
);
