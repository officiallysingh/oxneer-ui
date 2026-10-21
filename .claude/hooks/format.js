// PostToolUse hook: run prettier on the file Claude just wrote or edited.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const FORMATTABLE = /\.(ts|tsx|js|jsx|cjs|mjs|json|css|scss|md|ya?ml)$/i;

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try {
    const { tool_input = {}, tool_response = {} } = JSON.parse(input || '{}');
    const file = tool_input.file_path || tool_response.filePath;
    if (!file || !FORMATTABLE.test(file) || file.includes('node_modules')) return;

    const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
    const prettier = path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
    execFileSync(
      process.execPath,
      [prettier, '--write', '--ignore-unknown', '--log-level', 'warn', file],
      {
        cwd: root,
        stdio: ['ignore', 'ignore', 'inherit'],
      },
    );
  } catch {
    // Never block Claude on a formatting failure.
  }
});
