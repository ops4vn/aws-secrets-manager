#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

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
  log('Done. Remember to run cargo to regenerate Cargo.lock if needed and commit yourself.');
}

main();


