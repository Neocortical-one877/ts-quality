#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { analyzeCrap, formatCrapText, parseLcov } from './index';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index >= 0) {
    return process.argv[index + 1];
  }
  return undefined;
}

const rootDir = argument('--root') ?? process.cwd();
const lcovPath = argument('--lcov');
const outputJson = process.argv.includes('--json');
const changedFiles = (argument('--changed') ?? '').split(',').filter(Boolean);
const coverage = lcovPath ? parseLcov(fs.readFileSync(path.resolve(rootDir, lcovPath), 'utf8')) : [];
const report = analyzeCrap({ rootDir, coverage, changedFiles });
if (outputJson) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write(`${formatCrapText(report)}\n`);
}
