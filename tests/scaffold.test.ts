import type { PackageManager } from '../src/scaffold.ts';
import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';

import { fileURLToPath } from 'node:url';
import { addBrowserTests, copyTemplate, describeFiles, existingTemplateFiles, isClassicYarn, isDirEmpty, isTextFile, PACKAGE_MANAGERS, pinPackageManager, scaffoldReplacements, slugify, toTitleCase, writeYarnConfig } from '../src/scaffold.ts';

const here = dirname(fileURLToPath(import.meta.url));
const templateDir = resolve(here, '../template');
const browserTestsDir = resolve(here, '../template-browser-tests');

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

test('isDirEmpty ignores a lone .git folder but not other entries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    assert.equal(isDirEmpty(dir), true);
    mkdirSync(join(dir, '.git'));
    assert.equal(isDirEmpty(dir), true);
    writeFileSync(join(dir, 'README.md'), '');
    assert.equal(isDirEmpty(dir), false);
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('existingTemplateFiles lists the files a scaffold would overwrite', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{}');
    writeFileSync(join(dir, '.gitignore'), '');
    writeFileSync(join(dir, 'notes.txt'), '');
    assert.deepEqual(existingTemplateFiles([templateDir], dir), ['.gitignore', 'package.json']);
    assert.ok(!existingTemplateFiles([templateDir], dir).includes('_gitignore'));

    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'example.browser.test.ts'), '');
    assert.ok(!existingTemplateFiles([templateDir], dir).includes('src/example.browser.test.ts'));
    assert.ok(existingTemplateFiles([templateDir, browserTestsDir], dir).includes('src/example.browser.test.ts'));
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('describeFiles names up to ten files, then counts the rest', () => {
  assert.equal(describeFiles(['a', 'b']), 'a, b');
  const files = Array.from({ length: 13 }, (_, i) => `f${i}`);
  assert.equal(describeFiles(files), 'f0, f1, f2, f3, f4, f5, f6, f7, f8, f9 and 3 more');
});

// Every folder that feeds a scaffold: the template and each overlay.
const sourceDirs = [templateDir, ...readdirSync(resolve(here, '..'), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name.startsWith('template-'))
  .map(entry => resolve(here, '..', entry.name))];

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name));
}

test('every {{TOKEN}} in the template sources is filled by scaffoldReplacements', () => {
  assert.ok(sourceDirs.includes(browserTestsDir), 'overlays are found');
  const known = Object.keys(scaffoldReplacements({ browserTests: true, pm: 'npm', projectName: 'app' }));
  assert.deepEqual(known, Object.keys(scaffoldReplacements({ browserTests: false, pm: 'npm', projectName: 'app' })), 'the same tokens with and without overlays');

  for (const sourceDir of sourceDirs) {
    for (const file of filesUnder(sourceDir)) {
      const tokens = readFileSync(file, 'utf8').match(/\{\{[^{}\s]*\}\}/g) ?? [];
      if (tokens.length === 0)
        continue;
      assert.ok(isTextFile(file), `${file} holds tokens but copyTemplate does not fill its extension`);
      for (const token of tokens)
        assert.ok(known.includes(token.slice(2, -2)), `${token} in ${file} is not a scaffoldReplacements token`);
    }
  }
});

test('copyTemplate renders project files with replacements', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    copyTemplate(templateDir, dir, { replacements: scaffoldReplacements({ browserTests: false, pm: 'npm', projectName: 'test-app' }) });

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

test('copyTemplate drops obsolete files and settings and checks indexed access', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    copyTemplate(templateDir, dir);

    assert.ok(!existsSync(join(dir, 'CLAUDE.md')), 'Claude Code reads AGENTS.md directly');

    const settings = JSON.parse(readFileSync(join(dir, '.vscode', 'settings.json'), 'utf8')) as Record<string, unknown>;
    assert.ok(!('eslint.useFlatConfig' in settings), 'flat config is the ESLint extension default');

    const tsconfig = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8')) as { compilerOptions: Record<string, unknown> };
    assert.equal(tsconfig.compilerOptions.noUncheckedIndexedAccess, true);
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('copyTemplate scaffolds LF line endings, editor settings and theme tokens', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    copyTemplate(templateDir, dir);

    assert.equal(readFileSync(join(dir, '.gitattributes'), 'utf8').trim(), '* text=auto eol=lf');

    const settings = JSON.parse(readFileSync(join(dir, '.vscode', 'settings.json'), 'utf8')) as Record<string, unknown>;
    assert.equal(settings['editor.formatOnSave'], false);
    assert.deepEqual(settings['editor.codeActionsOnSave'], { 'source.fixAll.eslint': 'explicit', 'source.organizeImports': 'never' });
    assert.ok(Array.isArray(settings['eslint.validate']), 'eslint.validate lists the linted languages');

    const css = readFileSync(join(dir, 'src', 'style.css'), 'utf8');
    assert.match(css, /color-scheme: light dark/);
    assert.match(css, /@media \(prefers-color-scheme: dark\)/);
    assert.match(readFileSync(join(dir, 'src', 'main.ts'), 'utf8'), /import '\.\/style\.css';/);
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('copyTemplate scaffolds docs that follow the ID conventions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    copyTemplate(templateDir, dir);

    const backlog = readFileSync(join(dir, 'docs', 'backlog.md'), 'utf8');
    assert.match(backlog, /^Next ID: B1$/m);
    assert.ok(backlog.includes('`B<n>`'));

    assert.ok(readFileSync(join(dir, 'AGENTS.md'), 'utf8').includes('`research/`'));
    assert.ok(existsSync(join(dir, 'docs', 'plans', '.gitkeep')), 'plans folder kept');
    assert.ok(!existsSync(join(dir, 'docs', 'plans', 'done')), 'no plans/done');
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('copyTemplate ships a Renovate config', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    copyTemplate(templateDir, dir);

    const renovate = JSON.parse(readFileSync(join(dir, 'renovate.json'), 'utf8')) as {
      minimumReleaseAge: string;
      packageRules: { groupName: string }[];
    };
    assert.equal(renovate.minimumReleaseAge, '7 days', 'matches the npm release-age gate');
    assert.deepEqual(renovate.packageRules.map(rule => rule.groupName), ['ESLint', 'Vitest']);
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('package.json lists the refreshed tool versions and no import resolver', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    copyTemplate(templateDir, dir, { replacements: scaffoldReplacements({ browserTests: false, pm: 'npm', projectName: 'test-app' }) });

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      devDependencies: Record<string, string>;
      engines: Record<string, string>;
    };
    assert.deepEqual(
      {
        '@vitest/coverage-v8': pkg.devDependencies['@vitest/coverage-v8'],
        'eslint': pkg.devDependencies.eslint,
        'jiti': pkg.devDependencies.jiti,
        'jsdom': pkg.devDependencies.jsdom,
        'typescript': pkg.devDependencies.typescript,
        'vite': pkg.devDependencies.vite,
        'vitest': pkg.devDependencies.vitest,
      },
      {
        '@vitest/coverage-v8': '^5.0.5',
        'eslint': '^10.13.0',
        'jiti': '^2.7.0',
        'jsdom': '^30.1.3',
        'typescript': '~6.0.3',
        'vite': '^8.3.4',
        'vitest': '^5.0.5',
      },
    );
    assert.equal(pkg.engines.node, '^22.22.2 || ^24.15.0 || >=26.0.0');
    assert.ok(!Object.keys(pkg.devDependencies).some(name => name.includes('import-x')));
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const pm of PACKAGE_MANAGERS) {
  test(`copyTemplate renders ${pm} commands everywhere`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
    try {
      copyTemplate(templateDir, dir, { replacements: scaffoldReplacements({ browserTests: false, pm, pmVersion: '10.0.0', projectName: 'test-app' }) });

      const files = ['README.md', 'AGENTS.md', join('.github', 'workflows', 'ci.yml')].map(file => readFileSync(join(dir, file), 'utf8'));
      for (const content of files) {
        assert.ok(!content.includes('{{'), 'no token left unfilled');
        assert.ok(content.includes(`${pm} `), `${pm} commands present`);
        if (pm !== 'npm')
          assert.ok(!/\bnpm (?:run|ci|test|install)/.test(content), 'no npm commands');
      }

      const ci = files[2] ?? '';
      assert.ok(ci.includes(`cache: ${pm}`));
      assert.ok(ci.includes('node-version-file: .tool-versions'));
      // Renovate's asdf manager knows the tool only as `nodejs`; mise and
      // setup-node accept both spellings.
      assert.equal(readFileSync(join(dir, '.tool-versions'), 'utf8').trim(), 'nodejs 24');
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('browser tests are left out unless asked for', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    copyTemplate(templateDir, dir, { replacements: scaffoldReplacements({ browserTests: false, pm: 'npm', projectName: 'test-app' }) });

    for (const file of ['vite.config.ts', 'package.json', 'brand.json', 'README.md', 'AGENTS.md', join('.github', 'workflows', 'ci.yml')])
      assert.ok(!readFileSync(join(dir, file), 'utf8').includes('{{'), `no token left unfilled in ${file}`);
    assert.ok(!readFileSync(join(dir, 'vite.config.ts'), 'utf8').includes('playwright'));
    assert.ok(!readFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'utf8').includes('playwright'));
    assert.ok(!readFileSync(join(dir, 'README.md'), 'utf8').includes('playwright'));
    assert.ok(!existsSync(join(dir, 'src', 'example.browser.test.ts')));
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { devDependencies: Record<string, string> };
    assert.ok(!('playwright' in pkg.devDependencies));
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const [pm, exec] of [['npm', 'npx'], ['pnpm', 'pnpm exec'], ['yarn', 'yarn']] as const) {
  test(`--browser-tests adds a Chromium test project with ${pm}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
    try {
      copyTemplate(templateDir, dir, { replacements: scaffoldReplacements({ browserTests: true, pm, pmVersion: '10.0.0', projectName: 'test-app' }) });
      addBrowserTests(browserTestsDir, dir);

      const viteConfig = readFileSync(join(dir, 'vite.config.ts'), 'utf8');
      assert.ok(viteConfig.includes(`import { playwright } from '@vitest/browser-playwright';`));
      assert.ok(viteConfig.includes(`      {
        extends: true,
        test: {
          name: 'browser',`), 'browser project indented in the projects list');
      assert.ok(viteConfig.includes('provider: playwright(),'));

      const install = `${exec} playwright install chromium`;
      const ci = readFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'utf8');
      assert.ok(ci.includes(`      - run: ${install} --with-deps
      - run: ${pm} test`), 'browser installed before tests');
      assert.ok(readFileSync(join(dir, 'README.md'), 'utf8').includes(`${pm} install
${install}
`));
      assert.ok(readFileSync(join(dir, 'AGENTS.md'), 'utf8').includes('`<name>.browser.test.ts`'));
      assert.ok(existsSync(join(dir, 'src', 'example.browser.test.ts')));

      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { devDependencies: Record<string, string> };
      const names = Object.keys(pkg.devDependencies);
      assert.deepEqual(names, names.toSorted(), 'devDependencies stay sorted');
      assert.equal(pkg.devDependencies['@vitest/browser-playwright'], pkg.devDependencies.vitest, 'matches Vitest exactly');
      assert.ok(pkg.devDependencies.playwright);
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('CI setup steps follow the package manager', () => {
  const setup = (pm: PackageManager, version?: string) => {
    const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
    try {
      copyTemplate(templateDir, dir, { replacements: scaffoldReplacements({ browserTests: false, pm, pmVersion: version, projectName: 'test-app' }) });
      return readFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'utf8');
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  assert.ok(setup('npm').includes('checkout@v7\n      - uses: actions/setup-node@v7'), 'npm leaves no extra line');
  assert.ok(setup('npm').includes('- run: npm ci'));
  assert.ok(setup('pnpm', '10.0.0').includes('      - uses: pnpm/action-setup@v6\n      - uses: actions/setup-node@v7'));
  assert.ok(setup('pnpm').includes('      - uses: pnpm/action-setup@v6\n        with:\n          version: latest\n'));
  assert.ok(setup('pnpm').includes('- run: pnpm install --frozen-lockfile'));
  assert.ok(setup('yarn', '4.5.0').includes('      - run: corepack enable\n'));
  assert.ok(setup('yarn', '4.5.0').includes('- run: yarn install --immutable'));
  assert.ok(setup('yarn', '1.22.22').includes('- run: yarn install --frozen-lockfile'));
});

test('writeYarnConfig selects the node_modules linker', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    writeYarnConfig(dir);
    assert.equal(readFileSync(join(dir, '.yarnrc.yml'), 'utf8'), 'nodeLinker: node-modules\n');
    assert.ok(isClassicYarn('1.22.22'));
    assert.ok(!isClassicYarn('4.5.0'));
    assert.ok(!isClassicYarn());
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pinPackageManager adds the field after private', () => {
  const dir = mkdtempSync(join(tmpdir(), 'corniflex-'));
  try {
    copyTemplate(templateDir, dir, { replacements: scaffoldReplacements({ browserTests: false, pm: 'pnpm', projectName: 'test-app' }) });
    pinPackageManager(dir, 'pnpm', '10.0.0');

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Record<string, unknown>;
    assert.equal(pkg.packageManager, 'pnpm@10.0.0');
    const keys = Object.keys(pkg);
    assert.equal(keys[keys.indexOf('private') + 1], 'packageManager');
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
