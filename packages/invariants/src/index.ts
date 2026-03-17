import fs from 'fs';
import path from 'path';
import {
  type BehaviorClaim,
  type ChangedRegion,
  type ComplexityEvidence,
  type InvariantEvidenceSubSignal,
  type InvariantEvidenceSummary,
  type InvariantScenarioResult,
  type InvariantSpec,
  type MutationResult,
  type MutationSite,
  type TestObligation,
  collectSourceFiles,
  matchPattern,
  normalizePath,
  spanOverlaps
} from '../../evidence-model/src/index';

export interface InvariantEvaluationOptions {
  rootDir: string;
  invariants: InvariantSpec[];
  changedFiles: string[];
  changedRegions: ChangedRegion[];
  complexity: ComplexityEvidence[];
  mutationSites: MutationSite[];
  mutations: MutationResult[];
  testPatterns?: string[];
}

interface TestDocument {
  filePath: string;
  contents: string;
  lowered: string;
}

function selectorMatchesInvariant(selector: string, filePath: string, symbols: ComplexityEvidence[]): boolean {
  if (selector.startsWith('path:')) {
    return matchPattern(selector.slice(5), filePath);
  }
  if (selector.startsWith('symbol:')) {
    const symbolFragment = selector.slice(7);
    return symbols.some((symbol) => symbol.filePath === filePath && symbol.symbol.includes(symbolFragment));
  }
  if (selector.startsWith('domain:')) {
    const fragment = selector.slice(7);
    return filePath.includes(`/${fragment}/`) || filePath.startsWith(`${fragment}/`) || filePath.includes(fragment);
  }
  return matchPattern(selector, filePath);
}

function impactedFiles(invariant: InvariantSpec, changedFiles: string[], changedRegions: ChangedRegion[], complexity: ComplexityEvidence[]): string[] {
  const output = new Set<string>();
  for (const filePath of changedFiles.map((item) => normalizePath(item))) {
    if (invariant.selectors.some((selector) => selectorMatchesInvariant(selector, filePath, complexity))) {
      output.add(filePath);
    }
  }
  for (const region of changedRegions) {
    const filePath = normalizePath(region.filePath);
    if (invariant.selectors.some((selector) => selectorMatchesInvariant(selector, filePath, complexity))) {
      output.add(filePath);
    }
  }
  return [...output].sort();
}

function loadTestDocuments(rootDir: string, patterns: string[]): TestDocument[] {
  const files = collectSourceFiles(rootDir, patterns);
  return files.map((filePath) => {
    const contents = fs.readFileSync(path.join(rootDir, filePath), 'utf8');
    return {
      filePath,
      contents,
      lowered: contents.toLowerCase()
    } satisfies TestDocument;
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function lexicalVariants(value: string): string[] {
  const normalized = normalizePath(value);
  const base = path.basename(normalized, path.extname(normalized));
  const dashed = base.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
  const underscored = dashed.replace(/-/g, '_');
  const spaced = dashed.replace(/-/g, ' ');
  const compact = base.replace(/[^a-zA-Z0-9]/g, '');
  return unique([
    normalized.toLowerCase(),
    base.toLowerCase(),
    dashed.toLowerCase(),
    underscored.toLowerCase(),
    spaced.toLowerCase(),
    compact.toLowerCase()
  ]);
}

function selectorHints(invariant: InvariantSpec): string[] {
  const hints: string[] = [];
  for (const selector of invariant.selectors) {
    if (selector.startsWith('symbol:')) {
      hints.push(...lexicalVariants(selector.slice(7)));
    }
    if (selector.startsWith('domain:')) {
      hints.push(selector.slice(7).toLowerCase());
    }
  }
  return unique(hints);
}

function focusedTestDocuments(testDocuments: TestDocument[], invariant: InvariantSpec, files: string[]): TestDocument[] {
  if (invariant.requiredTestPatterns && invariant.requiredTestPatterns.length > 0) {
    return testDocuments.filter((document) => invariant.requiredTestPatterns?.some((pattern) => matchPattern(pattern, document.filePath)));
  }

  const hints = unique([
    ...files.flatMap((filePath) => lexicalVariants(filePath)),
    ...selectorHints(invariant)
  ]).filter((hint) => hint.length >= 3);

  return testDocuments.filter((document) => {
    const loweredPath = document.filePath.toLowerCase();
    return hints.some((hint) => loweredPath.includes(hint) || document.lowered.includes(hint));
  });
}

function scenarioHasCoverage(corpus: string, keywords: string[]): boolean {
  const lowered = corpus.toLowerCase();
  return keywords.every((keyword) => lowered.includes(keyword.toLowerCase()));
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function describeChangedFunction(item: { filePath: string; symbol: string; coveragePct: number; crap: number }): string {
  return `${item.symbol} (${item.filePath}, coverage ${item.coveragePct}%, CRAP ${item.crap})`;
}

function summarizeScenarioSupport(result: InvariantScenarioResult): string {
  if (result.supported) {
    return `${result.scenarioId}: keywords + failure-path evidence matched`;
  }
  const missing: string[] = [];
  if (!result.keywordsMatched) {
    missing.push('keywords');
  }
  if (!result.failurePathKeywordsMatched) {
    missing.push('failure-path');
  }
  return `${result.scenarioId}: missing ${missing.join(' + ')} evidence`;
}

function buildSubSignals(options: {
  files: string[];
  focusedTests: TestDocument[];
  changedFunctions: Array<{ filePath: string; symbol: string; coveragePct: number; crap: number }>;
  lowCoverageChanged: Array<{ filePath: string; symbol: string; coveragePct: number; crap: number }>;
  mutationSitesInScope: number;
  killedMutantsInScope: number;
  survivingMutantsInScope: number;
  scenarioResults: InvariantScenarioResult[];
}): InvariantEvidenceSubSignal[] {
  const focusedTestFiles = options.focusedTests.map((document) => document.filePath);
  const scenarioSupportedCount = options.scenarioResults.filter((item) => item.supported).length;
  const changedFunctionsSummary = options.changedFunctions.length > 0
    ? options.changedFunctions.map((item) => describeChangedFunction(item))
    : ['none'];

  return [
    {
      signalId: 'focused-test-alignment',
      label: 'Focused test alignment',
      level: focusedTestFiles.length > 0 ? 'clear' : 'missing',
      summary: focusedTestFiles.length > 0
        ? `${pluralize(focusedTestFiles.length, 'focused test file')} aligned to invariant scope`
        : 'No focused test files aligned to invariant scope',
      facts: [
        `impacted files: ${options.files.join(', ') || 'none'}`,
        `focused tests: ${focusedTestFiles.join(', ') || 'none'}`
      ]
    },
    {
      signalId: 'scenario-support',
      label: 'Scenario support',
      level: options.scenarioResults.length === 0
        ? 'info'
        : scenarioSupportedCount === options.scenarioResults.length
          ? 'clear'
          : scenarioSupportedCount === 0
            ? 'missing'
            : 'warning',
      summary: options.scenarioResults.length === 0
        ? 'Invariant declares no scenarios'
        : `${scenarioSupportedCount}/${options.scenarioResults.length} scenario(s) have deterministic support`,
      facts: options.scenarioResults.length > 0
        ? options.scenarioResults.map((item) => summarizeScenarioSupport(item))
        : ['none']
    },
    {
      signalId: 'coverage-pressure',
      label: 'Coverage pressure',
      level: options.lowCoverageChanged.length > 0 ? 'warning' : 'clear',
      summary: options.lowCoverageChanged.length > 0
        ? `${pluralize(options.lowCoverageChanged.length, 'changed function')} under 80% coverage`
        : 'All changed functions in invariant scope are at or above 80% coverage',
      facts: options.lowCoverageChanged.length > 0
        ? options.lowCoverageChanged.map((item) => describeChangedFunction(item))
        : ['changed functions under 80% coverage: 0']
    },
    {
      signalId: 'mutation-pressure',
      label: 'Mutation pressure',
      level: options.mutationSitesInScope === 0
        ? 'info'
        : options.survivingMutantsInScope > 0
          ? 'warning'
          : 'clear',
      summary: options.mutationSitesInScope === 0
        ? 'No mutation sites were selected in invariant scope'
        : options.survivingMutantsInScope > 0
          ? `${pluralize(options.survivingMutantsInScope, 'surviving mutant')} across ${pluralize(options.mutationSitesInScope, 'mutation site')}`
          : `${pluralize(options.killedMutantsInScope, 'killed mutant')} across ${pluralize(options.mutationSitesInScope, 'mutation site')} with no survivors`,
      facts: [
        `mutation sites in scope: ${options.mutationSitesInScope}`,
        `killed mutants in scope: ${options.killedMutantsInScope}`,
        `surviving mutants in scope: ${options.survivingMutantsInScope}`
      ]
    },
    {
      signalId: 'changed-function-pressure',
      label: 'Changed function pressure',
      level: options.changedFunctions.length > 0 ? 'info' : 'missing',
      summary: options.changedFunctions.length > 0
        ? `${pluralize(options.changedFunctions.length, 'changed function')} in invariant scope; max changed CRAP ${options.changedFunctions.reduce((max, item) => Math.max(max, item.crap), 0)}`
        : 'No changed functions were mapped into invariant scope',
      facts: changedFunctionsSummary
    }
  ];
}

export function evaluateInvariants(options: InvariantEvaluationOptions): BehaviorClaim[] {
  const testDocuments = loadTestDocuments(options.rootDir, options.testPatterns ?? ['test/**/*.js', 'test/**/*.mjs', 'test/**/*.cjs', 'test/**/*.ts', '**/*.test.js', '**/*.test.mjs', '**/*.test.cjs', '**/*.spec.ts']);
  const results: BehaviorClaim[] = [];
  const changedByFile = new Set(options.changedFiles.map((item) => normalizePath(item)));

  for (const invariant of options.invariants) {
    const files = impactedFiles(invariant, options.changedFiles, options.changedRegions, options.complexity);
    if (files.length === 0) {
      continue;
    }

    const obligations: TestObligation[] = [];
    const evidence: string[] = [];
    let status: BehaviorClaim['status'] = 'supported';

    const fileMutations = options.mutationSites.filter((site) => files.includes(site.filePath));
    const mutationResults = options.mutations.filter((result) => files.includes(result.filePath));
    const survivingMutants = mutationResults.filter((result) => result.status === 'survived');
    const killedMutants = mutationResults.filter((result) => result.status === 'killed');
    const changedFunctions = options.complexity
      .filter((item) => files.includes(item.filePath) && item.changed)
      .map((item) => ({
        filePath: item.filePath,
        symbol: item.symbol,
        coveragePct: item.coveragePct,
        crap: item.crap
      }))
      .sort((left, right) => left.filePath.localeCompare(right.filePath) || left.symbol.localeCompare(right.symbol));
    const lowCoverageChanged = changedFunctions.filter((item) => item.coveragePct < 80);
    const maxChangedCrap = changedFunctions.reduce((max, item) => Math.max(max, item.crap), 0);
    const focusedTests = focusedTestDocuments(testDocuments, invariant, files);
    const focusedCorpus = focusedTests.map((document) => document.contents).join('\n');
    const scenarioResults: InvariantScenarioResult[] = [];

    if (survivingMutants.length > 0) {
      status = 'at-risk';
      evidence.push(`${survivingMutants.length} surviving mutants in impacted invariant scope`);
    }
    if (lowCoverageChanged.length > 0) {
      status = status === 'at-risk' ? 'at-risk' : 'unsupported';
      evidence.push(`${lowCoverageChanged.length} changed functions under 80% coverage in invariant scope`);
    }
    if (focusedTests.length === 0) {
      status = status === 'at-risk' ? 'at-risk' : 'unsupported';
      evidence.push(`No focused test files matched invariant scope for ${files.join(', ')}; align test names/imports or set requiredTestPatterns.`);
    }

    for (const scenario of invariant.scenarios) {
      const hasKeywords = focusedTests.length > 0 && scenarioHasCoverage(focusedCorpus, scenario.keywords);
      const hasFailurePath = scenario.failurePathKeywords ? focusedTests.length > 0 && scenarioHasCoverage(focusedCorpus, scenario.failurePathKeywords) : true;
      const supported = hasKeywords && hasFailurePath;
      scenarioResults.push({
        scenarioId: scenario.id,
        description: scenario.description,
        expected: scenario.expected,
        keywordsMatched: hasKeywords,
        failurePathKeywordsMatched: hasFailurePath,
        supported
      });
      if (!supported) {
        obligations.push({
          id: `${invariant.id}:${scenario.id}`,
          invariantId: invariant.id,
          priority: invariant.severity === 'critical' || invariant.severity === 'high' ? 'high' : 'medium',
          description: `Add or tighten a focused test for scenario '${scenario.description}' to preserve invariant '${invariant.title}'.`,
          scenarioId: scenario.id,
          fileHints: files
        });
        evidence.push(`Missing deterministic test evidence for scenario '${scenario.description}'`);
        status = status === 'at-risk' ? 'at-risk' : 'unsupported';
      }
    }

    for (const region of options.changedRegions.filter((region) => files.includes(normalizePath(region.filePath)))) {
      const regionMutations = fileMutations.filter((site) => {
        if (site.filePath !== normalizePath(region.filePath)) {
          return false;
        }
        for (let line = region.span.startLine; line <= region.span.endLine; line += 1) {
          if (spanOverlaps(line, site.span)) {
            return true;
          }
        }
        return false;
      });
      if (regionMutations.length === 0 && changedByFile.has(normalizePath(region.filePath))) {
        evidence.push(`Changed region ${region.hunkId} in ${region.filePath} has no selected mutation sites; review test specificity manually.`);
      }
    }

    const evidenceSummary: InvariantEvidenceSummary = {
      invariantId: invariant.id,
      impactedFiles: files,
      focusedTests: focusedTests.map((document) => document.filePath),
      changedFunctions,
      changedFunctionsUnder80Coverage: lowCoverageChanged.length,
      maxChangedCrap,
      mutationSitesInScope: fileMutations.length,
      killedMutantsInScope: killedMutants.length,
      survivingMutantsInScope: survivingMutants.length,
      scenarioResults,
      subSignals: buildSubSignals({
        files,
        focusedTests,
        changedFunctions,
        lowCoverageChanged,
        mutationSitesInScope: fileMutations.length,
        killedMutantsInScope: killedMutants.length,
        survivingMutantsInScope: survivingMutants.length,
        scenarioResults
      })
    };

    results.push({
      id: `${invariant.id}:claim`,
      invariantId: invariant.id,
      description: `${invariant.title} applies to ${files.join(', ')}`,
      status,
      evidence: evidence.length > 0 ? evidence : [`Focused tests: ${focusedTests.map((document) => document.filePath).join(', ')}`],
      obligations,
      evidenceSummary
    });
  }

  return results;
}
