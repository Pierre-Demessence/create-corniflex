import type { PackageManager } from './scaffold.ts';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';

import { fileURLToPath } from 'node:url';
import { cancel, confirm, intro, isCancel, log, outro, spinner, text } from '@clack/prompts';

import { Command, Option } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { addBrowserTests, browserInstallCommand, copyTemplate, describeFiles, existingTemplateFiles, isClassicYarn, isDirEmpty, PACKAGE_MANAGERS, pinPackageManager, scaffoldReplacements, slugify, writeYarnConfig } from './scaffold.ts';

interface CliOptions {
  browserTests?: boolean;
  git?: boolean;
  install?: boolean;
  overwrite?: boolean;
  pm: PackageManager;
  skipInstall?: boolean;
  yes?: boolean;
}

const here = dirname(fileURLToPath(import.meta.url));
const templateDir = resolve(here, '../template');
const browserTestsDir = resolve(here, '../template-browser-tests');

async function main(): Promise<void> {
  const program = new Command();
  program
    .name('create-corniflex')
    .description(pkg.description)
    .version(pkg.version)
    .argument('[directory]', 'directory to create the project in')
    .option('--no-git', 'skip git initialization')
    .option('--install', 'install dependencies after scaffolding')
    .option('--skip-install', 'do not install dependencies')
    .option('--yes', 'accept the defaults instead of asking questions')
    .option('--overwrite', 'scaffold into a non-empty directory')
    .option('--browser-tests', 'add Vitest browser mode (Playwright) for layout tests')
    .addOption(new Option('--pm <manager>', 'package manager').choices(PACKAGE_MANAGERS).default('npm'))
    .parse();

  const opts = program.opts<CliOptions>();
  const [dirArg] = program.args;

  // Without a terminal (an agent, a script) or with --yes, nothing is asked and
  // the defaults apply: git on, no install, no overwrite of a non-empty folder.
  const interactive = !opts.yes && Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const sourceDirs = opts.browserTests ? [templateDir, browserTestsDir] : [templateDir];

  if (!interactive) {
    if (!dirArg)
      fail('Pass a directory to create the project in: create-corniflex <directory>.');
    checkTargetIsUsable(resolve(process.cwd(), dirArg), opts, sourceDirs);
  }

  intro('create-corniflex');

  const targetName = dirArg ?? (await promptText('Where should we create your project?', 'my-app'));
  const targetDir = resolve(process.cwd(), targetName);
  const projectName = slugify(basename(targetDir));

  if (interactive && !opts.overwrite && !isDirEmpty(targetDir)) {
    const overwritten = existingTemplateFiles(sourceDirs, targetDir);
    const files = overwritten.length > 0 ? ` These files would be overwritten: ${describeFiles(overwritten)}.` : '';
    const proceed = await promptConfirm(`Directory "${basename(targetDir)}" is not empty.${files} Continue anyway?`, false);
    if (!proceed)
      return abort();
  }

  const doGit = opts.git === false ? false : !interactive || await promptConfirm('Initialize a git repository?', true);
  const doInstall = resolveInstall(opts);
  const wantInstall = doInstall ?? (interactive && await promptConfirm('Install dependencies now?', false));

  const scaffolding = spinner();
  scaffolding.start('Scaffolding project');
  const pmVersion = readVersion(opts.pm);
  copyTemplate(templateDir, targetDir, {
    replacements: scaffoldReplacements({ browserTests: opts.browserTests ?? false, pm: opts.pm, pmVersion, projectName }),
  });
  if (opts.browserTests)
    addBrowserTests(browserTestsDir, targetDir);
  if (pmVersion)
    pinPackageManager(targetDir, opts.pm, pmVersion);
  if (opts.pm === 'yarn' && !isClassicYarn(pmVersion))
    writeYarnConfig(targetDir);
  scaffolding.stop('Project files created');
  if (!pmVersion)
    log.warn(`${opts.pm} was not found, so package.json has no "packageManager" field.`);

  if (doGit)
    initGit(targetDir);

  const installed = wantInstall && installDeps(targetDir, opts.pm, opts.browserTests ?? false);

  const next = [
    `cd ${targetName}`,
    ...(wantInstall ? [] : [`${opts.pm} install`]),
    ...(opts.browserTests && !installed ? [browserInstallCommand(opts.pm)] : []),
    `${opts.pm} run dev`,
  ];
  outro(`Done! Next steps:\n  ${next.join('\n  ')}`);
}

function resolveInstall(opts: CliOptions): boolean | undefined {
  if (opts.install)
    return true;
  if (opts.skipInstall)
    return false;
  return undefined;
}

function checkTargetIsUsable(targetDir: string, opts: CliOptions, sourceDirs: string[]): void {
  if (opts.overwrite || isDirEmpty(targetDir))
    return;
  const overwritten = existingTemplateFiles(sourceDirs, targetDir);
  const files = overwritten.length > 0 ? ` (it would overwrite ${describeFiles(overwritten)})` : '';
  fail(`Directory "${basename(targetDir)}" is not empty. Pass --overwrite to scaffold into it anyway${files}.`);
}

async function promptText(message: string, defaultValue: string): Promise<string> {
  const answer = await text({ message, placeholder: defaultValue, defaultValue });
  if (isCancel(answer))
    abort();
  return (answer as string) || defaultValue;
}

async function promptConfirm(message: string, initialValue: boolean): Promise<boolean> {
  const answer = await confirm({ message, initialValue });
  if (isCancel(answer))
    abort();
  return answer as boolean;
}

function initGit(targetDir: string): void {
  if (existsSync(resolve(targetDir, '.git')))
    return;
  try {
    run('git init -b main', targetDir);
  }
  catch {
    try {
      run('git init', targetDir);
    }
    catch {
      // git is not installed — scaffolding still succeeded.
    }
  }
}

// Returns false when the dependencies could not be installed.
function installDeps(targetDir: string, pm: PackageManager, browserTests: boolean): boolean {
  const installing = spinner();
  installing.start(`Installing dependencies with ${pm}`);
  try {
    run(`${pm} install`, targetDir);
    installing.stop('Dependencies installed');
  }
  catch {
    installing.stop(`Could not run "${pm} install" — install dependencies manually.`);
    return false;
  }
  if (browserTests)
    installBrowser(targetDir, pm);
  return true;
}

function installBrowser(targetDir: string, pm: PackageManager): void {
  const command = browserInstallCommand(pm);
  const installing = spinner();
  installing.start('Installing Chromium for browser tests');
  try {
    run(command, targetDir);
    installing.stop('Chromium installed');
  }
  catch {
    installing.stop(`Could not run "${command}" — run it manually.`);
  }
}

// Runs from the temp directory so a project's own `packageManager` field
// (through corepack) cannot change the answer.
function readVersion(pm: PackageManager): string | undefined {
  try {
    return execSync(`${pm} --version`, { cwd: tmpdir(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  }
  catch {
    return undefined;
  }
}

function run(command: string, cwd: string): void {
  execSync(command, { cwd, stdio: 'ignore' });
}

function fail(message: string): never {
  cancel(message);
  process.exit(1);
}

function abort(): never {
  return fail('Operation cancelled.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
