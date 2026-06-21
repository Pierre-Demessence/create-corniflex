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

export function isDirEmpty(dir: string): boolean {
  if (!existsSync(dir))
    return true;
  return readdirSync(dir).length === 0;
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
    const mappedRel = relative(templateDir, sourceFile)
      .split(/[/\\]/)
      .map(segment => DOTFILE_RENAMES[segment] ?? segment)
      .join('/');
    const destFile = join(targetDir, mappedRel);
    mkdirSync(dirname(destFile), { recursive: true });

    const isText
      = TEXT_EXTENSIONS.has(extname(sourceFile))
        || Object.hasOwn(DOTFILE_RENAMES, basename(sourceFile));
    if (isText) {
      const content = applyReplacements(readFileSync(sourceFile, 'utf8'), replacements);
      writeFileSync(destFile, content);
    }
    else {
      cpSync(sourceFile, destFile);
    }
  }
}

function applyReplacements(content: string, replacements: Record<string, string>): string {
  let out = content;
  for (const [token, value] of Object.entries(replacements))
    out = out.replaceAll(`{{${token}}}`, value);
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
