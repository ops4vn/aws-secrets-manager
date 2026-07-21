#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

function log(message) {
  process.stdout.write(`${message}\n`);
}

function error(message) {
  process.stderr.write(`${message}\n`);
}

function readJson(filePath) {
  const content = readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(filePath, content, 'utf8');
}

const DOMAIN_FILE = resolve(__dirname, 'domain.json');

function getDomain() {
  if (!existsSync(DOMAIN_FILE)) {
    error(`Error: domain file not found at ${DOMAIN_FILE}`);
    process.exit(1);
  }
  return readJson(DOMAIN_FILE).domain;
}

function setDomain(newDomain) {
  writeJson(DOMAIN_FILE, { domain: newDomain });
  log(`Wrote ${DOMAIN_FILE} -> ${newDomain}`);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeDots(str) {
  return str.replace(/\./g, '\\.');
}

// ── sync: tauri.conf.json ─────────────────────────────────────────────────

function syncTauriConfig(domain) {
  const configPath = resolve(repoRoot, 'src-tauri', 'tauri.conf.json');
  const config = readJson(configPath);
  const endpoint = config.plugins.updater.endpoints[0];

  const urlMatch = endpoint.match(/^https:\/\/([^/]+)\/releases\//);
  if (!urlMatch) {
    error('tauri.conf.json: could not parse updater endpoint URL');
    return false;
  }

  const currentDomain = urlMatch[1];
  if (currentDomain === domain) {
    log('tauri.conf.json already up-to-date');
    return false;
  }

  config.plugins.updater.endpoints[0] = endpoint.replace(
    `https://${currentDomain}/`,
    `https://${domain}/`,
  );
  writeJson(configPath, config);
  log(`Updated tauri.conf.json domain -> ${domain}`);
  return true;
}

// ── sync: README.md ───────────────────────────────────────────────────────

function syncReadme(domain) {
  const readmePath = resolve(repoRoot, 'README.md');
  let content = readFileSync(readmePath, 'utf8');

  const urlMatch = content.match(/https:\/\/([^/]+)\/releases\//);
  if (!urlMatch) {
    log('README.md: no download URLs found — skipping');
    return false;
  }

  const currentDomain = urlMatch[1];
  if (currentDomain === domain) {
    log('README.md already up-to-date');
    return false;
  }

  content = content.replace(
    new RegExp(`https://${escapeRegex(currentDomain)}/releases/`, 'g'),
    `https://${domain}/releases/`,
  );
  writeFileSync(readmePath, content, 'utf8');
  log(`Updated README.md domain -> ${domain}`);
  return true;
}

// ── sync: sync-version.mjs ────────────────────────────────────────────────

function syncVersionScript(domain) {
  const scriptPath = resolve(repoRoot, 'scripts', 'sync-version.mjs');
  const content = readFileSync(scriptPath, 'utf8');

  // sync-version.mjs now reads domain from domain.json at runtime.
  // Verify it's properly configured rather than doing text replacement.
  const readsDomainJson = content.includes("readJson(resolve(__dirname, 'domain.json'))");
  const usesEscDomain = content.includes('escDomain');
  const hasHardcodedDomain = content.includes(escapeDots(domain));

  if (readsDomainJson && usesEscDomain) {
    log('sync-version.mjs already up-to-date (reads domain dynamically)');
    return false;
  }
  if (hasHardcodedDomain) {
    log('sync-version.mjs: domain is hardcoded — run the refactored version from domain-consolidation plan');
    return false;
  }
  error('sync-version.mjs: does not read domain from domain.json — re-run the domain-consolidation refactoring');
  return false;
}

// ── check ─────────────────────────────────────────────────────────────────

function checkSync() {
  const domain = getDomain();
  const mismatches = [];

  // tauri.conf.json
  const configPath = resolve(repoRoot, 'src-tauri', 'tauri.conf.json');
  const config = readJson(configPath);
  const endpoint = config.plugins.updater.endpoints[0];
  const tauriMatch = endpoint.match(/^https:\/\/([^/]+)\/releases\//);
  const tauriDomain = tauriMatch ? tauriMatch[1] : null;
  if (tauriDomain !== domain) {
    mismatches.push(
      `src-tauri/tauri.conf.json: expected "${domain}", found "${tauriDomain ?? '(missing)'}"`,
    );
  }

  // README.md
  const readmeContent = readFileSync(resolve(repoRoot, 'README.md'), 'utf8');
  const readmeMatch = readmeContent.match(/https:\/\/([^/]+)\/releases\//);
  const readmeDomain = readmeMatch ? readmeMatch[1] : null;
  if (readmeDomain !== domain) {
    mismatches.push(
      `README.md: expected "${domain}", found "${readmeDomain ?? '(missing)'}"`,
    );
  }

  // sync-version.mjs — now reads domain dynamically from domain.json at runtime
  const scriptContent = readFileSync(
    resolve(repoRoot, 'scripts', 'sync-version.mjs'),
    'utf8',
  );
  const readsDomainJson = scriptContent.includes("readJson(resolve(__dirname, 'domain.json'))");
  const usesEscDomain = scriptContent.includes('escDomain');
  const hasHardcodedDomain = scriptContent.includes(escapeDots(domain));
  if (!readsDomainJson || !usesEscDomain) {
    mismatches.push(
      `scripts/sync-version.mjs: does not read domain from domain.json (readsDomainJson=${readsDomainJson}, usesEscDomain=${usesEscDomain})`,
    );
  }
  if (hasHardcodedDomain) {
    mismatches.push(
      `scripts/sync-version.mjs: domain is STILL hardcoded — run sync-domain to update it`,
    );
  }

  return { mismatches, synced: mismatches.length === 0 };
}

// ── main ──────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  // mode: set <new-domain>
  if (args[0] === 'set' && args[1]) {
    const newDomain = args[1];
    setDomain(newDomain);

    let changed = 0;
    if (syncTauriConfig(newDomain)) changed++;
    if (syncReadme(newDomain)) changed++;
    if (syncVersionScript(newDomain)) changed++;

    log(
      changed > 0
        ? `\nSynced domain to ${newDomain} (${changed} file${changed === 1 ? '' : 's'} updated)`
        : '\nAll files already up-to-date',
    );
    return;
  }

  // mode: --check
  if (args[0] === '--check') {
    const { mismatches, synced } = checkSync();
    if (synced) {
      log(`All files synced to domain: ${getDomain()}`);
      process.exit(0);
    }
    error(`Domain sync check FAILED for domain: ${getDomain()}`);
    for (const m of mismatches) {
      error(`  ✗ ${m}`);
    }
    process.exit(1);
  }

  // mode: sync (no args) — exit if unknown arg
  if (args.length > 0) {
    error('Usage: bun scripts/sync-domain.mjs [set <new-domain>|--check]');
    process.exit(1);
  }

  const domain = getDomain();
  log(`Syncing domain: ${domain}`);

  let changed = 0;
  if (syncTauriConfig(domain)) changed++;
  if (syncReadme(domain)) changed++;
  if (syncVersionScript(domain)) changed++;

  log(
    changed > 0
      ? `\nUpdated ${changed} file${changed === 1 ? '' : 's'} to domain: ${domain}`
      : '\nAll files already synced',
  );
}

main();
