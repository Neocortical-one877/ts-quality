import fs from 'fs';
import path from 'path';
import os from 'os';

export const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export function fixturePath(name) {
  return path.join(repoRoot, 'fixtures', name);
}

export function tempCopyOfFixture(name) {
  const source = fixturePath(name);
  const target = fs.mkdtempSync(path.join(os.tmpdir(), `ts-quality-${name}-`));
  fs.cpSync(source, target, { recursive: true });
  return target;
}

export function distModule(...segments) {
  return path.join(repoRoot, 'dist', ...segments);
}

export async function importDist(...segments) {
  return import(pathToFileUrl(distModule(...segments)).href);
}

export function pathToFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return new URL(`file://${normalized.startsWith('/') ? '' : '/'}${normalized}`);
}

export function latestRunId(rootDir) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, '.ts-quality', 'latest.json'), 'utf8')).latestRunId;
}

export function readRun(rootDir) {
  const runId = latestRunId(rootDir);
  return JSON.parse(fs.readFileSync(path.join(rootDir, '.ts-quality', 'runs', runId, 'run.json'), 'utf8'));
}
