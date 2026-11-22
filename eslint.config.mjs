// Repo-root files only (scripts/, tooling configs). Each workspace has its own
// eslint.config.mjs; ESLint uses the config nearest to each file.
import { defineConfig, globalIgnores } from 'eslint/config';
import reactLibrary from '@oxneer/config-eslint/react-library';

export default defineConfig([
  ...reactLibrary,
  // Agent tooling / hook scripts (CommonJS, run directly by node)
  globalIgnores(['.claude/**']),
]);
