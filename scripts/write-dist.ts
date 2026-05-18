import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

type HashAlgorithm = 'md5' | 'sha256' | 'sha512';

interface Options {
  targetPath: string;
  clean: boolean;
  hashAlgorithm: HashAlgorithm;
}

interface FileEntry {
  absolutePath: string;
  relativePath: string;
  size: number;
}

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const HASH_ALGORITHMS = new Set<HashAlgorithm>(['md5', 'sha256', 'sha512']);

function printUsage(): void {
  console.log([
    'Usage: npm run write-dist -- <target-path> [--clean] [--hash md5|sha256|sha512]',
    '       npx ts-node scripts/write-dist.ts <target-path> [--clean] [--hash md5|sha256|sha512]',
    '',
    'Copies the contents of dist into <target-path>, then validates each copied file',
    'by comparing file size and hash. Defaults to md5.',
    '',
    'When using npm, pass script options after an extra separator:',
    '  npm run write-dist -- -- --clean ./release-copy',
    '',
    'Options:',
    '  --clean                 Empty the target directory before copying.',
    '  --hash <algorithm>      Hash algorithm to use: md5, sha256, or sha512.',
    '  --help                  Show this help text.'
  ].join('\n'));
}

function parseArgs(argv: string[]): Options {
  let targetPath = '';
  let clean = false;
  let hashAlgorithm: HashAlgorithm = 'md5';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--clean') {
      clean = true;
      continue;
    }

    if (arg === '--hash') {
      const nextValue = argv[index + 1];
      if (!nextValue || !HASH_ALGORITHMS.has(nextValue as HashAlgorithm)) {
        throw new Error('--hash must be one of: md5, sha256, sha512');
      }
      hashAlgorithm = nextValue as HashAlgorithm;
      index += 1;
      continue;
    }

    if (arg.startsWith('--hash=')) {
      const nextValue = arg.slice('--hash='.length);
      if (!HASH_ALGORITHMS.has(nextValue as HashAlgorithm)) {
        throw new Error('--hash must be one of: md5, sha256, sha512');
      }
      hashAlgorithm = nextValue as HashAlgorithm;
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (targetPath) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
    targetPath = arg;
  }

  if (!targetPath) {
    throw new Error('Target path is required.');
  }

  return {
    targetPath,
    clean,
    hashAlgorithm
  };
}

function isSameOrInside(candidate: string, parent: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validatePaths(targetDir: string, clean: boolean): void {
  if (!fs.existsSync(DIST_DIR) || !fs.statSync(DIST_DIR).isDirectory()) {
    throw new Error(`dist directory not found: ${DIST_DIR}`);
  }

  if (targetDir === DIST_DIR || isSameOrInside(targetDir, DIST_DIR)) {
    throw new Error('Target path must not be the dist directory or inside dist.');
  }

  if (!clean) {
    return;
  }

  const protectedPaths = [
    path.parse(targetDir).root,
    os.homedir(),
    process.cwd(),
    path.dirname(process.cwd())
  ].map((value) => path.resolve(value));

  if (protectedPaths.includes(targetDir)) {
    throw new Error(`Refusing to clean protected path: ${targetDir}`);
  }
}

function removeExistingTargetContents(targetDir: string): void {
  if (!fs.existsSync(targetDir)) {
    return;
  }

  const entries = fs.readdirSync(targetDir);
  for (const entry of entries) {
    fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
  }
}

function listFiles(rootDir: string): FileEntry[] {
  const files: FileEntry[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const relativePath = path.relative(rootDir, absolutePath);
      files.push({
        absolutePath,
        relativePath,
        size: fs.statSync(absolutePath).size
      });
    }
  }

  walk(rootDir);
  return files;
}

function copyFiles(files: FileEntry[], targetDir: string): void {
  for (const file of files) {
    const targetPath = path.join(targetDir, file.relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(file.absolutePath, targetPath);
  }
}

function hashFile(filePath: string, algorithm: HashAlgorithm): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);

    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function validateCopiedFiles(
  sourceFiles: FileEntry[],
  targetDir: string,
  algorithm: HashAlgorithm
): Promise<void> {
  const failures: string[] = [];

  for (const sourceFile of sourceFiles) {
    const targetPath = path.join(targetDir, sourceFile.relativePath);

    if (!fs.existsSync(targetPath)) {
      failures.push(`${sourceFile.relativePath}: missing from target`);
      continue;
    }

    const targetStat = fs.statSync(targetPath);
    if (!targetStat.isFile()) {
      failures.push(`${sourceFile.relativePath}: target is not a file`);
      continue;
    }

    if (targetStat.size !== sourceFile.size) {
      failures.push(`${sourceFile.relativePath}: size mismatch (${sourceFile.size} != ${targetStat.size})`);
      continue;
    }

    const [sourceHash, targetHash] = await Promise.all([
      hashFile(sourceFile.absolutePath, algorithm),
      hashFile(targetPath, algorithm)
    ]);

    if (sourceHash !== targetHash) {
      failures.push(`${sourceFile.relativePath}: ${algorithm} mismatch`);
    }
  }

  if (failures.length > 0) {
    console.error('\n[ERROR] Validation failed:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }
}

function warnAboutExtraTargetFiles(sourceFiles: FileEntry[], targetDir: string): void {
  if (!fs.existsSync(targetDir)) {
    return;
  }

  const sourceRelativePaths = new Set(sourceFiles.map((file) => file.relativePath));
  const targetFiles = listFiles(targetDir);
  const extraFiles = targetFiles.filter((file) => !sourceRelativePaths.has(file.relativePath));

  if (extraFiles.length === 0) {
    return;
  }

  console.warn(`[WARN] Target contains ${extraFiles.length} file(s) not present in dist. Use --clean for an exact mirror.`);
  for (const file of extraFiles.slice(0, 10)) {
    console.warn(`  - ${file.relativePath}`);
  }
  if (extraFiles.length > 10) {
    console.warn(`  ...and ${extraFiles.length - 10} more`);
  }
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const targetDir = path.resolve(options.targetPath);

    validatePaths(targetDir, options.clean);

    console.log(`[INFO] Source: ${DIST_DIR}`);
    console.log(`[INFO] Target: ${targetDir}`);
    console.log(`[INFO] Hash: ${options.hashAlgorithm}`);

    const sourceFiles = listFiles(DIST_DIR);
    if (sourceFiles.length === 0) {
      throw new Error('dist directory has no files to copy.');
    }

    if (options.clean) {
      console.log('[INFO] Cleaning target directory...');
      removeExistingTargetContents(targetDir);
    }

    console.log(`[INFO] Copying ${sourceFiles.length} file(s)...`);
    fs.mkdirSync(targetDir, { recursive: true });
    copyFiles(sourceFiles, targetDir);

    console.log('[INFO] Validating copied files...');
    await validateCopiedFiles(sourceFiles, targetDir, options.hashAlgorithm);
    warnAboutExtraTargetFiles(sourceFiles, targetDir);

    console.log(`[OK] Wrote and validated ${sourceFiles.length} dist file(s).`);
  } catch (error) {
    console.error('[ERROR]', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
