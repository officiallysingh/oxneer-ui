import path from 'node:path';
import { defineConfig } from 'eslint/config';
import next from '@oxneer/config-eslint/next';

export default defineConfig([
  ...next,
  {
    rules: {
      // App Router only: point the rule at app/ (absolute, so it works from any cwd).
      '@next/next/no-html-link-for-pages': ['error', path.join(import.meta.dirname, 'src/app')],
    },
  },
]);
