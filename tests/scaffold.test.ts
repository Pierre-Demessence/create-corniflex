import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { copyTemplate, isDirEmpty, slugify, toTitleCase } from '../src/scaffold.ts';

const here = dirname(fileURLToPath(import.meta.url));
const templateDir = resolve(here, '../template');

test('slugify produces npm-safe names', () => {
  assert.equal(slugify('My Cool App'), 'my-cool-app');
  assert.equal(slugify('  --Foo__Bar!! '), 'foo-bar');
  assert.equal(slugify(''), 'app');
});

test('toTitleCase humanizes a slug', () => {
  assert.equal(toTitleCase('my-cool-app'), 'My Cool App');
  assert.equal(toTitleCase('app'), 'App');
  assert.equal(toTitleCase(''), 'App');
});

test('isDirEmpty treats missing dirs as empty', () => {
  assert.equal(isDirEmpty(join(tmpdir(), 'corniflex-does-not-exist-xyz')), true);
});

test('copyTemplate renders project files with replacements', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    copyTemplate(templateDir, dir, { replacements: { PROJECT_NAME: 'test-app', PROJECT_TITLE: 'Test App' } });

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string };
    assert.equal(pkg.name, 'test-app');

    assert.ok(existsSync(join(dir, '.gitignore')), '.gitignore restored from _gitignore');
    assert.ok(!existsSync(join(dir, '_gitignore')), '_gitignore not copied literally');
    assert.ok(existsSync(join(dir, 'vite.config.ts')), 'vite config copied');
    assert.ok(existsSync(join(dir, 'src', 'main.ts')), 'entry copied');
    assert.ok(existsSync(join(dir, '.vscode', 'settings.json')), '.vscode preserved');

    const brand = JSON.parse(readFileSync(join(dir, 'brand.json'), 'utf8')) as { name: string };
    assert.equal(brand.name, 'Test App', 'brand uses the display title');
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
