// Shared ESLint flat config for React/TypeScript workspace packages (@oxneer/ui, @oxneer/api).
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Turn off rules that conflict with Prettier; keep it after the presets above.
  prettier,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'dist/**', 'coverage/**', 'next-env.d.ts']),
]);
