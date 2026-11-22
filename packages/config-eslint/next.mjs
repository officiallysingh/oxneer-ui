// Shared ESLint flat config for Next.js apps in this repo.
import { defineConfig } from 'eslint/config';
import reactLibrary from './react-library.mjs';

export default defineConfig([
  ...reactLibrary,
  {
    rules: {
      // React Compiler rules turned on by eslint-plugin-react-hooks 7.1. Existing app code
      // has ~60 hits; kept as warnings until those components are refactored.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
]);
