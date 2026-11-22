#!/usr/bin/env node
/**
 * Runs the dev tasks from turbo.json without the turbo binary.
 * Useful on Windows machines where Device Guard blocks the unsigned turbo.exe.
 */
import { spawn } from 'node:child_process';

const colors = { web: '\x1b[35m', reset: '\x1b[0m' };

const tasks = [{ name: 'web', args: ['run', 'dev', '--workspace=@oxneer/web'] }];

const children = new Set();
let shuttingDown = false;

function prefixed(name, chunk) {
  const color = colors[name] ?? '';
  return String(chunk)
    .replace(/\r?\n$/, '')
    .split(/\r?\n/)
    .map((line) => `${color}[${name}]${colors.reset} ${line}`)
    .join('\n');
}

function shutdown(code) {
  if (shuttingDown) {
    process.exitCode = code;
    return;
  }
  shuttingDown = true;

  for (const child of children) {
    if (process.platform === 'win32') {
      // Kill the npm.cmd shell and everything under it (tsc, next dev).
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
    } else {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(code), 500);
}

function start({ name, args }) {
  // npm is a .cmd shim on Windows, so it has to go through cmd.exe.
  const child =
    process.platform === 'win32'
      ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: process.env,
        })
      : spawn('npm', args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: process.env,
        });

  children.add(child);

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`${prefixed(name, chunk)}\n`);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`${prefixed(name, chunk)}\n`);
  });

  child.on('error', (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });

  child.on('exit', (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;
    console.error(`[${name}] exited with ${signal ? `signal ${signal}` : `code ${code}`}`);
    shutdown(code ?? 1);
  });
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

for (const task of tasks) start(task);
