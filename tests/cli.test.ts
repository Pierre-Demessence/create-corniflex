import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, '../src/index.ts');

// Spawned with stdin ignored and stdout piped, like an agent without a terminal.
function runCli(cwd: string, args: string[]) {
  const result = spawnSync(process.execPath, [entry, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function withTempDir(run: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-cli-'));
  try {
    run(dir);
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('without a terminal, a directory is scaffolded with the defaults', () => {
  withTempDir((cwd) => {
    const { status, output } = runCli(cwd, ['app']);
    assert.equal(status, 0, output);
    assert.ok(existsSync(join(cwd, 'app', 'package.json')));
    assert.ok(existsSync(join(cwd, 'app', '.git')), 'git is on by default');
    assert.ok(!existsSync(join(cwd, 'app', 'node_modules')), 'no install by default');
    assert.ok(!existsSync(join(cwd, 'app', 'src', 'example.browser.test.ts')), 'no browser tests by default');
  });
});

test('--no-git skips git and --yes asks nothing', () => {
  withTempDir((cwd) => {
    const { status, output } = runCli(cwd, ['app', '--yes', '--no-git']);
    assert.equal(status, 0, output);
    assert.ok(existsSync(join(cwd, 'app', 'package.json')));
    assert.ok(!existsSync(join(cwd, 'app', '.git')));
  });
});

test('without a terminal, a missing directory is an error and writes nothing', () => {
  withTempDir((cwd) => {
    const { status, output } = runCli(cwd, []);
    assert.equal(status, 1);
    assert.match(output, /Pass a directory/);
    assert.deepEqual(readdirSync(cwd), []);
  });
});

test('without a terminal, a non-empty directory needs --overwrite', () => {
  withTempDir((cwd) => {
    mkdirSync(join(cwd, 'app'));
    writeFileSync(join(cwd, 'app', 'package.json'), '{"name":"mine"}\n');

    const refused = runCli(cwd, ['app', '--no-git']);
    assert.equal(refused.status, 1);
    assert.match(refused.output, /not empty.*--overwrite.*package\.json/);
    assert.equal(readdirSync(join(cwd, 'app')).length, 1, 'nothing written');

    const accepted = runCli(cwd, ['app', '--no-git', '--overwrite']);
    assert.equal(accepted.status, 0, accepted.output);
    assert.ok(existsSync(join(cwd, 'app', 'vite.config.ts')));
  });
});

test('a directory holding only .git counts as empty', () => {
  withTempDir((cwd) => {
    mkdirSync(join(cwd, 'app', '.git'), { recursive: true });
    const { status, output } = runCli(cwd, ['app']);
    assert.equal(status, 0, output);
    assert.ok(existsSync(join(cwd, 'app', 'package.json')));
  });
});
