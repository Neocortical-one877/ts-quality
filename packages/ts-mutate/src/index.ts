import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import ts from 'typescript';
import {
  type ChangedRegion,
  type CoverageEvidence,
  type MutationResult,
  type MutationSite,
  changedFileSet,
  collectSourceFiles,
  digestObject,
  ensureDir,
  matchPattern,
  normalizePath,
  readJson,
  spanOverlaps,
  writeJson
} from '../../evidence-model/src/index';

export interface MutationManifest {
  version: '1';
  entries: Record<string, MutationResult>;
}

export interface MutationOptions {
  repoRoot: string;
  testCommand: string[];
  sourceFiles?: string[];
  changedFiles?: string[];
  changedRegions?: ChangedRegion[];
  coverage?: CoverageEvidence[];
  coveredOnly?: boolean;
  manifestPath?: string;
  timeoutMs?: number;
  maxSites?: number;
}

export interface MutationRun {
  sites: MutationSite[];
  results: MutationResult[];
  score: number;
  killed: number;
  survived: number;
}

function lineOf(node: any, sourceFile: any): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function spanFor(node: any, sourceFile: any) {
  const startLine = lineOf(node, sourceFile);
  const endLine = sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;
  return { startLine, endLine, startOffset: node.getStart(sourceFile), endOffset: node.end };
}

function coverageForLine(filePath: string, line: number, coverage: CoverageEvidence[]): boolean {
  const normalized = normalizePath(filePath);
  const entry = coverage.find((item) => item.filePath === normalized || item.filePath.endsWith(normalized));
  if (!entry) {
    return true;
  }
  return (entry.lines[String(line)] ?? 0) > 0;
}

function mutationId(filePath: string, span: { startLine: number; endLine: number; startOffset: number; endOffset: number }, original: string, replacement: string): string {
  return digestObject({ filePath: normalizePath(filePath), span, original, replacement });
}

export function discoverMutationSites(sourceText: string, filePath: string, coverage: CoverageEvidence[] = [], changedFiles: string[] = [], changedRegions: ChangedRegion[] = [], coveredOnly = false): MutationSite[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const sites: MutationSite[] = [];
  const changed = changedFileSet(changedFiles, changedRegions);
  const fileRegions = changedRegions.filter((item) => normalizePath(item.filePath) === normalizePath(filePath));

  function consider(node: any, replacement: string, operator: string, description: string): void {
    const span = spanFor(node, sourceFile);
    const line = span.startLine;
    const inChangedRegion = fileRegions.length === 0 || fileRegions.some((region) => spanOverlaps(line, region.span));
    if (changed.size > 0 && !changed.has(normalizePath(filePath)) && !inChangedRegion) {
      return;
    }
    if (coveredOnly && !coverageForLine(filePath, line, coverage)) {
      return;
    }
    const original = node.getText(sourceFile);
    sites.push({
      id: mutationId(filePath, span, original, replacement),
      filePath: normalizePath(filePath),
      span: { startLine: span.startLine, endLine: span.endLine },
      startOffset: span.startOffset,
      endOffset: span.endOffset,
      operator,
      original,
      replacement,
      description
    });
  }

  function visit(node: any): void {
    if (ts.isBinaryExpression(node)) {
      const token = node.operatorToken.kind;
      const text = node.operatorToken.getText(sourceFile);
      if (token === ts.SyntaxKind.EqualsEqualsEqualsToken) {
        consider(node.operatorToken, '!==', text, 'strict equality inversion');
      } else if (token === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
        consider(node.operatorToken, '===', text, 'strict inequality inversion');
      } else if (token === ts.SyntaxKind.GreaterThanToken) {
        consider(node.operatorToken, '>=', text, 'greater-than relaxation');
      } else if (token === ts.SyntaxKind.GreaterThanEqualsToken) {
        consider(node.operatorToken, '>', text, 'greater-than tightening');
      } else if (token === ts.SyntaxKind.LessThanToken) {
        consider(node.operatorToken, '<=', text, 'less-than relaxation');
      } else if (token === ts.SyntaxKind.LessThanEqualsToken) {
        consider(node.operatorToken, '<', text, 'less-than tightening');
      } else if (token === ts.SyntaxKind.PlusToken) {
        consider(node.operatorToken, '-', text, 'addition to subtraction');
      } else if (token === ts.SyntaxKind.MinusToken) {
        consider(node.operatorToken, '+', text, 'subtraction to addition');
      } else if (token === ts.SyntaxKind.AmpersandAmpersandToken) {
        consider(node.operatorToken, '||', text, 'and to or');
      } else if (token === ts.SyntaxKind.BarBarToken) {
        consider(node.operatorToken, '&&', text, 'or to and');
      }
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      consider(node, 'false', 'true', 'boolean flip true->false');
    }
    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      consider(node, 'true', 'false', 'boolean flip false->true');
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return sites;
}

export function applyMutation(sourceText: string, site: MutationSite): string {
  return `${sourceText.slice(0, site.startOffset)}${site.replacement}${sourceText.slice(site.endOffset)}`;
}

function copyRecursive(sourceDir: string, destinationDir: string, exclude: Set<string>): void {
  ensureDir(destinationDir);
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (exclude.has(entry.name)) {
      continue;
    }
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(sourcePath, destinationPath, exclude);
    } else {
      ensureDir(path.dirname(destinationPath));
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function hasSyntaxErrors(filePath: string, sourceText: string): boolean {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  return sourceFile.parseDiagnostics.length > 0;
}

function manifestKey(repoRoot: string, site: MutationSite, testCommand: string[]): string {
  const absolutePath = path.join(repoRoot, site.filePath);
  const fileText = fs.readFileSync(absolutePath, 'utf8');
  return digestObject({ site, sourceDigest: digestObject(fileText), testCommand });
}

function loadManifest(filePath: string | undefined): MutationManifest {
  if (!filePath || !fs.existsSync(filePath)) {
    return { version: '1', entries: {} };
  }
  return readJson<MutationManifest>(filePath);
}

function saveManifest(filePath: string | undefined, manifest: MutationManifest): void {
  if (!filePath) {
    return;
  }
  writeJson(filePath, manifest);
}

function runSingleMutation(repoRoot: string, site: MutationSite, mutatedSource: string, testCommand: string[], timeoutMs: number): MutationResult {
  if (hasSyntaxErrors(site.filePath, mutatedSource)) {
    return {
      kind: 'mutation-result',
      siteId: site.id,
      filePath: site.filePath,
      status: 'invalid',
      durationMs: 0,
      details: 'Mutation produced syntax errors'
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-quality-mutant-'));
  try {
    copyRecursive(repoRoot, tempDir, new Set(['.git', 'node_modules', 'dist', '.ts-quality']));
    const targetPath = path.join(tempDir, site.filePath);
    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, mutatedSource, 'utf8');
    const started = Date.now();
    const result = spawnSync(testCommand[0], testCommand.slice(1), {
      cwd: tempDir,
      encoding: 'utf8',
      timeout: timeoutMs,
      shell: process.platform === 'win32'
    });
    const durationMs = Date.now() - started;
    if (result.error) {
      return {
        kind: 'mutation-result',
        siteId: site.id,
        filePath: site.filePath,
        status: 'error',
        durationMs,
        details: result.error.message
      };
    }
    return {
      kind: 'mutation-result',
      siteId: site.id,
      filePath: site.filePath,
      status: result.status === 0 ? 'survived' : 'killed',
      durationMs,
      details: `${(result.stdout ?? '').trim()}\n${(result.stderr ?? '').trim()}`.trim().slice(0, 280)
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function runMutations(options: MutationOptions): MutationRun {
  const sourceFiles = (options.sourceFiles ?? collectSourceFiles(options.repoRoot, ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx', 'src/**/*.mjs', 'src/**/*.cjs']))
    .filter((filePath) => !matchPattern('**/*.d.ts', filePath));
  const coverage = options.coverage ?? [];
  const changedFiles = options.changedFiles ?? [];
  const changedRegions = options.changedRegions ?? [];
  const sites = sourceFiles.flatMap((relativePath) => {
    const sourceText = fs.readFileSync(path.join(options.repoRoot, relativePath), 'utf8');
    return discoverMutationSites(sourceText, relativePath, coverage, changedFiles, changedRegions, options.coveredOnly ?? false);
  });
  const limitedSites = typeof options.maxSites === 'number' ? sites.slice(0, options.maxSites) : sites;
  const manifest = loadManifest(options.manifestPath);
  const results: MutationResult[] = [];

  for (const site of limitedSites) {
    const key = manifestKey(options.repoRoot, site, options.testCommand);
    const cached = manifest.entries[key];
    if (cached) {
      results.push(cached);
      continue;
    }
    const sourceText = fs.readFileSync(path.join(options.repoRoot, site.filePath), 'utf8');
    const mutatedSource = applyMutation(sourceText, site);
    const result = runSingleMutation(options.repoRoot, site, mutatedSource, options.testCommand, options.timeoutMs ?? 15_000);
    results.push(result);
    manifest.entries[key] = result;
  }

  saveManifest(options.manifestPath, manifest);
  const killed = results.filter((result) => result.status === 'killed').length;
  const survived = results.filter((result) => result.status === 'survived').length;
  const total = killed + survived;
  return {
    sites: limitedSites,
    results,
    score: total === 0 ? 1 : killed / total,
    killed,
    survived
  };
}
