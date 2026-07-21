#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

const { domain: UPDATE_DOMAIN } = readJson(resolve(__dirname, 'domain.json'));
const escDomain = UPDATE_DOMAIN.replace(/\./g, '\\.');

function log(message) {
  process.stdout.write(`${message}\n`);
}

function readJson(filePath) {
  const content = readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(filePath, content, 'utf8');
}

function syncTauriConfigVersion(version) {
  const tauriConfigPath = resolve(repoRoot, 'src-tauri', 'tauri.conf.json');
  const tauriConfig = readJson(tauriConfigPath);
  if (tauriConfig.version !== version) {
    tauriConfig.version = version;
    writeJson(tauriConfigPath, tauriConfig);
    log(`Updated tauri.conf.json version -> ${version}`);
  } else {
    log('tauri.conf.json already up-to-date');
  }
}

function syncCargoVersion(version) {
  const cargoPath = resolve(repoRoot, 'src-tauri', 'Cargo.toml');
  const content = readFileSync(cargoPath, 'utf8');

  // Replace the first version key in the [package] section only
  const updated = content.replace(/(^\[package\][\s\S]*?\n)version\s*=\s*"[^"]+"/, (m, p1) => {
    return `${p1}version = "${version}"`;
  });

  if (updated !== content) {
    writeFileSync(cargoPath, updated, 'utf8');
    log(`Updated Cargo.toml version -> ${version}`);
  } else {
    log('Cargo.toml already up-to-date');
  }
}

function syncReadmeVersion(version) {
  const readmePath = resolve(repoRoot, 'README.md');
  let content = readFileSync(readmePath, 'utf8');
  let changed = false;

  // Update version in the "Phiên bản mới nhất" line
  const versionLineRegex = /(\*\*Phiên bản mới nhất:\s+v)[\d.]+(\*\*)/;
  if (versionLineRegex.test(content)) {
    content = content.replace(versionLineRegex, `$1${version}$2`);
    changed = true;
  }

  // Update macOS download link (format: Tải Secrets Manager 0.0.17 (aarch64))
  const macosRegex = new RegExp(
    String.raw`(- \*\*macOS \(Apple Silicon\)\*\*: \[Tải Secrets Manager )[\d.]+( \(aarch64\)\]\(https://` +
    escDomain +
    String.raw`/releases/darwin/aarch64/)[\d.]+(/.+?\))`, 'g'
  );
  if (macosRegex.test(content)) {
    content = content.replace(macosRegex, `$1${version}$2${version}$3`);
    changed = true;
  }

  // Update Windows download link (format: Tải Secrets Manager 0.0.17 (x64))
  const windowsRegex = new RegExp(
    String.raw`(- \*\*Windows \(x86_64\)\*\*: \[Tải Secrets Manager )[\d.]+( \(x64\)\]\(https://` +
    escDomain +
    String.raw`/releases/windows/x86_64/)[\d.]+(/.+?_)[\d.]+(_x64_en-US\.msi\))`, 'g'
  );
  if (windowsRegex.test(content)) {
    content = content.replace(windowsRegex, `$1${version}$2${version}$3${version}$4`);
    changed = true;
  }

  // Update Linux download link (format: Tải Secrets Manager 0.0.17 (AppImage))
  const linuxRegex = new RegExp(
    String.raw`(- \*\*Linux \(x86_64\)\*\*: \[Tải Secrets Manager )[\d.]+( \(AppImage\)\]\(https://` +
    escDomain +
    String.raw`/releases/linux/x86_64/)[\d.]+(/.+?_)[\d.]+(_amd64\.AppImage\))`, 'g'
  );
  if (linuxRegex.test(content)) {
    content = content.replace(linuxRegex, `$1${version}$2${version}$3${version}$4`);
    changed = true;
  }

  if (changed) {
    writeFileSync(readmePath, content, 'utf8');
    log(`Updated README.md version -> ${version}`);
  } else {
    log('README.md already up-to-date or no version markers found');
  }
}

function isValidSemver(v) {
  return /^\d+\.\d+\.\d+$/.test(v);
}

function bumpSemver(current, part) {
  if (!isValidSemver(current)) throw new Error(`Invalid current version: ${current}`);
  const [maj, min, pat] = current.split('.').map(Number);
  if (part === 'major') return `${maj + 1}.0.0`;
  if (part === 'minor') return `${maj}.${min + 1}.0`;
  if (part === 'patch') return `${maj}.${min}.${pat + 1}`;
  throw new Error(`Unknown bump part: ${part}`);
}

function writePackageJsonVersion(version) {
  const pkgPath = resolve(repoRoot, 'package.json');
  const pkg = readJson(pkgPath);
  if (pkg.version !== version) {
    pkg.version = version;
    writeJson(pkgPath, pkg);
    log(`Updated package.json version -> ${version}`);
  } else {
    log('package.json already up-to-date');
  }
}

function main() {
  const arg = process.argv[2];
  const pkgPath = resolve(repoRoot, 'package.json');
  const pkg = readJson(pkgPath);
  let targetVersion = null;

  if (!arg) {
    // default: bump patch
    targetVersion = bumpSemver(pkg.version, 'patch');
  } else if (['major', 'minor', 'patch'].includes(arg)) {
    targetVersion = bumpSemver(pkg.version, arg);
  } else if (isValidSemver(arg)) {
    targetVersion = arg;
  } else {
    console.error('Usage: bun scripts/sync-version.mjs [major|minor|patch|x.y.z]');
    process.exit(1);
  }

  writePackageJsonVersion(targetVersion);
  syncCargoVersion(targetVersion);
  syncTauriConfigVersion(targetVersion);
  syncReadmeVersion(targetVersion);
  log('Done. Remember to run cargo to regenerate Cargo.lock if needed and commit yourself.');
}

main();


