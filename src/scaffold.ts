import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsonc',
  '.md',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

// Some files are stored without their leading dot so npm does not strip or
// rename them when the package is published (npm treats a literal `.gitignore`
// inside a package as ignore rules — the create-react-app gotcha). The
// scaffolder restores the dot when copying into the target project.
const DOTFILE_RENAMES: Record<string, string> = {
  _gitignore: '.gitignore',
};

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn'] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface ScaffoldOptions {
  browserTests: boolean;
  pm: PackageManager;
  pmVersion?: string;
  projectName: string;
}

export interface CopyTemplateOptions {
  replacements?: Record<string, string>;
}

export function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'app';
}

export function toTitleCase(slug: string): string {
  const title = slug
    .split('-')
    .filter(Boolean)
    .map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
  return title || 'App';
}

// Every token the template sources may use, built from the CLI options.
export function scaffoldReplacements(options: ScaffoldOptions): Record<string, string> {
  return {
    PROJECT_NAME: options.projectName,
    PROJECT_TITLE: toTitleCase(options.projectName),
    ...packageManagerReplacements(options.pm, options.pmVersion),
    ...browserTestReplacements(options.pm, options.browserTests),
  };
}

// `version` is the manager's installed version, when known. Yarn 1 spells the
// frozen install `--frozen-lockfile`; every later version `--immutable`, which
// is also assumed when the version is unknown.
export function packageManagerReplacements(pm: PackageManager, version?: string): Record<string, string> {
  const isYarnClassic = pm === 'yarn' && isClassicYarn(version);
  const installCi = {
    npm: 'npm ci',
    pnpm: 'pnpm install --frozen-lockfile',
    yarn: `yarn install ${isYarnClassic ? '--frozen-lockfile' : '--immutable'}`,
  }[pm];
  // pnpm/action-setup reads the version from `packageManager` and fails
  // without one, so an unpinned project asks for the latest.
  const setup = {
    npm: '',
    pnpm: version ? '- uses: pnpm/action-setup@v6' : '- uses: pnpm/action-setup@v6\n  with:\n    version: latest',
    yarn: '- run: corepack enable',
  }[pm];
  return { PM: pm, INSTALL_CI: installCi, CI_PM_SETUP: setup };
}

// The tokens are emptied when `enabled` is false, which drops their lines.
export function browserTestReplacements(pm: PackageManager, enabled: boolean): Record<string, string> {
  const tokens = ['BROWSER_IMPORT', 'BROWSER_PROJECT', 'CI_BROWSER_SETUP', 'AGENTS_BROWSER_TESTS', 'README_BROWSER_SETUP'];
  if (!enabled)
    return Object.fromEntries(tokens.map(token => [token, '']));
  const installBrowser = browserInstallCommand(pm);
  return {
    BROWSER_IMPORT: `import { playwright } from '@vitest/browser-playwright';`,
    BROWSER_PROJECT: [
      '{',
      '  extends: true,',
      '  test: {',
      `    name: 'browser',`,
      `    include: ['src/**/*.browser.test.ts'],`,
      '    browser: {',
      '      enabled: true,',
      '      headless: true,',
      `      instances: [{ browser: 'chromium' }],`,
      '      provider: playwright(),',
      '    },',
      '  },',
      '},',
    ].join('\n'),
    CI_BROWSER_SETUP: `- run: ${installBrowser} --with-deps`,
    AGENTS_BROWSER_TESTS: [
      '- Tests that need real layout (sizes, positions, wrapping) go in',
      '  `<name>.browser.test.ts` (sample: `src/example.browser.test.ts`) and run in',
      '  headless Chromium; jsdom computes no layout. Install the browser once with',
      `  \`${installBrowser}\`.`,
    ].join('\n'),
    README_BROWSER_SETUP: installBrowser,
  };
}

export function browserInstallCommand(pm: PackageManager): string {
  return `${{ npm: 'npx', pnpm: 'pnpm exec', yarn: 'yarn' }[pm]} playwright install chromium`;
}

// The overlay's package.json lists only the extra devDependencies, so Renovate
// keeps their versions current in this repo like the template's own.
export function addBrowserTests(overlayDir: string, targetDir: string): void {
  const file = join(targetDir, 'package.json');
  const pkg = JSON.parse(readFileSync(file, 'utf8')) as { devDependencies?: Record<string, string> };
  const overlay = JSON.parse(readFileSync(join(overlayDir, 'package.json'), 'utf8')) as { devDependencies: Record<string, string> };
  const merged = { ...pkg.devDependencies, ...overlay.devDependencies };
  pkg.devDependencies = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  cpSync(join(overlayDir, 'src'), join(targetDir, 'src'), { recursive: true });
}

export function isClassicYarn(version?: string): boolean {
  return version?.startsWith('1.') ?? false;
}

// Yarn 2+ defaults to Plug'n'Play, whose generated .pnp.* files fail ESLint.
export function writeYarnConfig(targetDir: string): void {
  writeFileSync(join(targetDir, '.yarnrc.yml'), 'nodeLinker: node-modules\n');
}

export function pinPackageManager(targetDir: string, pm: PackageManager, version: string): void {
  const file = join(targetDir, 'package.json');
  const pkg = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  const pinned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(pkg)) {
    pinned[key] = value;
    // Placed after `private`, where sort-package-json expects it.
    if (key === 'private')
      pinned.packageManager = `${pm}@${version}`;
  }
  writeFileSync(file, `${JSON.stringify(pinned, null, 2)}\n`);
}

// A `.git` folder alone (a freshly cloned empty repository) does not count.
export function isDirEmpty(dir: string): boolean {
  if (!existsSync(dir))
    return true;
  return readdirSync(dir).every(name => name === '.git');
}

// The files the sources would write that already exist in `targetDir`, as
// sorted paths relative to it.
export function existingTemplateFiles(sourceDirs: string[], targetDir: string): string[] {
  const existing = new Set<string>();
  for (const sourceDir of sourceDirs) {
    for (const sourceFile of walk(sourceDir)) {
      const rel = targetRelativePath(sourceDir, sourceFile);
      if (existsSync(join(targetDir, rel)))
        existing.add(rel);
    }
  }
  return [...existing].toSorted();
}

// Names up to `limit` files, then counts the rest.
export function describeFiles(files: string[], limit = 10): string {
  const shown = files.slice(0, limit).join(', ');
  return files.length > limit ? `${shown} and ${files.length - limit} more` : shown;
}

export function copyTemplate(
  templateDir: string,
  targetDir: string,
  options: CopyTemplateOptions = {},
): void {
  if (!existsSync(templateDir) || !statSync(templateDir).isDirectory())
    throw new Error(`Template directory not found: ${templateDir}`);

  const replacements = options.replacements ?? {};
  for (const sourceFile of walk(templateDir)) {
    const destFile = join(targetDir, targetRelativePath(templateDir, sourceFile));
    mkdirSync(dirname(destFile), { recursive: true });

    if (isTextFile(sourceFile)) {
      const content = applyReplacements(readFileSync(sourceFile, 'utf8'), replacements);
      writeFileSync(destFile, content);
    }
    else {
      cpSync(sourceFile, destFile);
    }
  }
}

// Text files get their tokens filled; any other file is copied as it is.
export function isTextFile(file: string): boolean {
  return TEXT_EXTENSIONS.has(extname(file)) || Object.hasOwn(DOTFILE_RENAMES, basename(file));
}

function targetRelativePath(sourceDir: string, sourceFile: string): string {
  return relative(sourceDir, sourceFile)
    .split(/[/\\]/)
    .map(segment => DOTFILE_RENAMES[segment] ?? segment)
    .join('/');
}

// A token alone on its line may expand to several lines (each indented like the
// token) or to nothing, in which case the line is dropped.
function applyReplacements(content: string, replacements: Record<string, string>): string {
  let out = content;
  for (const [token, value] of Object.entries(replacements)) {
    const placeholder = `{{${token}}}`;
    const ownLine = new RegExp(`^([ \\t]*)\\{\\{${token}\\}\\}\\r?\\n`, 'gm');
    out = out.replace(ownLine, (_line, indent: string) =>
      value === '' ? '' : `${indent}${value.split('\n').join(`\n${indent}`)}\n`);
    out = out.replaceAll(placeholder, value);
  }
  return out;
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory())
      files.push(...walk(full));
    else
      files.push(full);
  }
  return files;
}
