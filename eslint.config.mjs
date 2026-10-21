import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // App Router uses app/ not pages/; point rule to app dir or disable.
      '@next/next/no-html-link-for-pages': ['error', 'apps/web/src/app'],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent tooling / hook scripts (CommonJS, run directly by node)
    ".claude/**",
  ]),
]);

export default eslintConfig;
