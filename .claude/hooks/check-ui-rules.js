// PostToolUse hook: flag DESIGN.md violations in the text Claude just wrote to a .tsx file.
// Also works as an audit: node .claude/hooks/check-ui-rules.js <file-or-dir>...
const fs = require('node:fs');
const path = require('node:path');

const UI_FILE = /(?:^|\/)(?:apps\/web\/src|packages\/ui\/src)\/.*(?<!\.test|\.spec)\.tsx$/;
const TOKENS = 'use a semantic token (muted, primary, success, warning, info, destructive)';

const RULES = [
  {
    name: 'raw palette class',
    pattern:
      /\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|placeholder|shadow|accent|caret|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g,
    fix: TOKENS,
  },
  {
    name: 'hex color',
    pattern: /(?<!href=)["'`[]#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})["'`\]]/gi,
    fix: `${TOKENS}; brand logos are the only exception`,
  },
  {
    name: 'rgb/hsl literal',
    pattern: /\b(?:rgb|hsl)a?\(\s*\d/g,
    fix: `${TOKENS}; brand logos are the only exception`,
  },
  { name: 'template-string className', pattern: /className=\{`[^`]*\$\{/g, fix: 'use cn()' },
  { name: 'react-icons import', pattern: /from\s+['"]react-icons/g, fix: 'use lucide-react' },
];

const toPosix = (file) => file.replace(/\\/g, '/');

function scan(text) {
  return RULES.flatMap(({ name, pattern, fix }) =>
    [...text.matchAll(pattern)].map((match) => ({
      name,
      fix,
      snippet: match[0].split('\n')[0],
      line: text.slice(0, match.index).split('\n').length,
    })),
  );
}

function runHook() {
  let input = '';
  process.stdin.on('data', (c) => (input += c));
  process.stdin.on('end', () => {
    try {
      const { tool_input = {} } = JSON.parse(input || '{}');
      const text = tool_input.new_string ?? tool_input.content;
      if (!tool_input.file_path || !text || !UI_FILE.test(toPosix(tool_input.file_path))) return;

      const findings = scan(text);
      if (findings.length === 0) return;

      const lines = findings.map((f) => `- ${f.name}: ${f.snippet} (${f.fix})`);
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `DESIGN.md violations in the text just written to ${tool_input.file_path}:\n${lines.join('\n')}`,
          },
        }),
      );
    } catch {
      // Never block Claude on a checker failure.
    }
  });
}

function collectFiles(target) {
  if (!fs.statSync(target).isDirectory()) return [target];
  return fs
    .readdirSync(target, { withFileTypes: true })
    .filter((entry) => entry.name !== 'node_modules' && entry.name !== '.next')
    .flatMap((entry) => collectFiles(path.join(target, entry.name)));
}

function runAudit(targets) {
  const files = targets.flatMap(collectFiles).filter((file) => UI_FILE.test(toPosix(file)));
  let total = 0;
  for (const file of files) {
    for (const f of scan(fs.readFileSync(file, 'utf8'))) {
      total += 1;
      console.log(`${toPosix(file)}:${f.line}  ${f.name}: ${f.snippet}  (${f.fix})`);
    }
  }
  console.log(`${total} violation(s) in ${files.length} file(s) checked`);
  process.exitCode = total > 0 ? 1 : 0;
}

const targets = process.argv.slice(2);
if (targets.length > 0) runAudit(targets);
else runHook();
