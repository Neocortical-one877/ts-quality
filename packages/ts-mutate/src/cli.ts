#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { parseLcov } from '../../crap4ts/src/index';
import { runMutations } from './index';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const rootDir = argument('--root') ?? process.cwd();
const lcovPath = argument('--lcov');
const changedFiles = (argument('--changed') ?? '').split(',').filter(Boolean);
const command = (argument('--test-command') ?? 'node,--test').split(',').filter(Boolean);
const coverage = lcovPath ? parseLcov(fs.readFileSync(path.resolve(rootDir, lcovPath), 'utf8')) : [];
const run = runMutations({
  repoRoot: rootDir,
  changedFiles,
  coverage,
  testCommand: command,
  coveredOnly: process.argv.includes('--covered-only'),
  manifestPath: path.join(rootDir, '.ts-quality', 'mutation-manifest.json')
});
process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
