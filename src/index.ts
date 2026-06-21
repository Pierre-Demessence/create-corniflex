import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { cancel, confirm, intro, isCancel, outro, spinner, text } from '@clack/prompts';
import { Command, Option } from 'commander';

import pkg from '../package.json' with { type: 'json' };
import { copyTemplate, isDirEmpty, slugify, toTitleCase } from './scaffold.ts';

interface CliOptions {
  git?: boolean;
  install?: boolean;
  pm: string;
  skipInstall?: boolean;
}

const here = dirname(fileURLToPath(import.meta.url));
const templateDir = resolve(here, '../template');

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
    .addOption(new Option('--pm <manager>', 'package manager').choices(['npm', 'pnpm', 'yarn', 'bun']).default('npm'))
    .parse();

  const opts = program.opts<CliOptions>();
  const [dirArg] = program.args;

  intro('create-corniflex');

  const targetName = dirArg ?? (await promptText('Where should we create your project?', 'my-app'));
  const targetDir = resolve(process.cwd(), targetName);
  const projectName = slugify(basename(targetDir));

  if (!isDirEmpty(targetDir)) {
    const overwrite = await promptConfirm(
      `Directory "${basename(targetDir)}" is not empty. Continue anyway?`,
      false,
    );
    if (!overwrite)
      return abort();
  }

  const doGit = opts.git === false ? false : await promptConfirm('Initialize a git repository?', true);
  const doInstall = resolveInstall(opts);
  const wantInstall = typeof doInstall === 'boolean' ? doInstall : await promptConfirm('Install dependencies now?', false);

  const scaffolding = spinner();
  scaffolding.start('Scaffolding project');
  copyTemplate(templateDir, targetDir, { replacements: { PROJECT_NAME: projectName, PROJECT_TITLE: toTitleCase(projectName) } });
  scaffolding.stop('Project files created');

  if (doGit)
    initGit(targetDir);

  if (wantInstall)
    installDeps(targetDir, opts.pm);

  const next = [
    `cd ${targetName}`,
    ...(wantInstall ? [] : [`${opts.pm} install`]),
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

function installDeps(targetDir: string, pm: string): void {
  const installing = spinner();
  installing.start(`Installing dependencies with ${pm}`);
  try {
    run(`${pm} install`, targetDir);
    installing.stop('Dependencies installed');
  }
  catch {
    installing.stop(`Could not run "${pm} install" — install dependencies manually.`);
  }
}

function run(command: string, cwd: string): void {
  execSync(command, { cwd, stdio: 'ignore' });
}

function abort(): never {
  cancel('Operation cancelled.');
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
