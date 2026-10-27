// Scaffolds a project, installs it, then runs what its own CI runs. CI's
// `template` job calls this script, so a local run checks the same thing.
//
//   npm run smoke -- --pm pnpm --browser-tests
//
// `--pm` picks the package manager (default npm); every other flag goes to the
// generator. The first failing step ends the run and keeps the folder.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');

const { pm, generatorFlags } = parseArgs(process.argv.slice(2));
const browserTests = generatorFlags.includes('--browser-tests');

const workDir = mkdtempSync(join(tmpdir(), 'create-corniflex-smoke-'));
const appDir = join(workDir, 'app');

console.log(`Smoke test with ${pm} in ${appDir}`);

step('scaffold', repoRoot, process.execPath, [
  join(repoRoot, 'dist/index.js'),
  appDir,
  '--yes',
  '--no-git',
  '--skip-install',
  '--pm',
  pm,
  ...generatorFlags,
]);

step('install', appDir, `${pm} install`);
// Only npm needs `--` to pass the flag to ESLint; pnpm and yarn forward it.
step('lint', appDir, `${pm} run lint ${pm === 'npm' ? '-- ' : ''}--max-warnings 0`);
if (browserTests)
  step('install Chromium', appDir, `npx playwright install ${process.env.CI ? '--with-deps ' : ''}chromium`);
step('test', appDir, `${pm} test`);
step('build', appDir, `${pm} run build`);

rmSync(workDir, { recursive: true, force: true });
console.log('\nSmoke test passed.');

function parseArgs(args: string[]): { pm: string; generatorFlags: string[] } {
  let pm = 'npm';
  const generatorFlags: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--pm')
      pm = args[++i] ?? pm;
    else if (arg.startsWith('--pm='))
      pm = arg.slice('--pm='.length);
    else
      generatorFlags.push(arg);
  }
  return { pm, generatorFlags };
}

// A command string goes through the shell (npm and pnpm are .cmd files on
// Windows); the generator runs as node with an argument list.
function step(name: string, cwd: string, command: string, args?: string[]): void {
  console.log(`\n> ${name}`);
  const result = args
    ? spawnSync(command, args, { cwd, stdio: 'inherit' })
    : spawnSync(command, { cwd, stdio: 'inherit', shell: true });
  if (result.status === 0)
    return;
  console.error(`\nSmoke test failed at "${name}". The project is kept in ${appDir}`);
  process.exit(result.status ?? 1);
}
