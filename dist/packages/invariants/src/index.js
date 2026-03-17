"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateInvariants = evaluateInvariants;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("../../evidence-model/src/index");
function selectorMatchesInvariant(selector, filePath, symbols) {
    if (selector.startsWith('path:')) {
        return (0, index_1.matchPattern)(selector.slice(5), filePath);
    }
    if (selector.startsWith('symbol:')) {
        const symbolFragment = selector.slice(7);
        return symbols.some((symbol) => symbol.filePath === filePath && symbol.symbol.includes(symbolFragment));
    }
    if (selector.startsWith('domain:')) {
        const fragment = selector.slice(7);
        return filePath.includes(`/${fragment}/`) || filePath.startsWith(`${fragment}/`) || filePath.includes(fragment);
    }
    return (0, index_1.matchPattern)(selector, filePath);
}
function impactedFiles(invariant, changedFiles, changedRegions, complexity) {
    const output = new Set();
    for (const filePath of changedFiles.map((item) => (0, index_1.normalizePath)(item))) {
        if (invariant.selectors.some((selector) => selectorMatchesInvariant(selector, filePath, complexity))) {
            output.add(filePath);
        }
    }
    for (const region of changedRegions) {
        const filePath = (0, index_1.normalizePath)(region.filePath);
        if (invariant.selectors.some((selector) => selectorMatchesInvariant(selector, filePath, complexity))) {
            output.add(filePath);
        }
    }
    return [...output].sort();
}
function loadTestDocuments(rootDir, patterns) {
    const files = (0, index_1.collectSourceFiles)(rootDir, patterns);
    return files.map((filePath) => {
        const contents = fs_1.default.readFileSync(path_1.default.join(rootDir, filePath), 'utf8');
        return {
            filePath,
            contents,
            lowered: contents.toLowerCase()
        };
    });
}
function unique(values) {
    return [...new Set(values.filter((value) => value.length > 0))];
}
function lexicalVariants(value) {
    const normalized = (0, index_1.normalizePath)(value);
    const base = path_1.default.basename(normalized, path_1.default.extname(normalized));
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
function selectorHints(invariant) {
    const hints = [];
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
function focusedTestDocuments(testDocuments, invariant, files) {
    if (invariant.requiredTestPatterns && invariant.requiredTestPatterns.length > 0) {
        return testDocuments.filter((document) => invariant.requiredTestPatterns?.some((pattern) => (0, index_1.matchPattern)(pattern, document.filePath)));
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
function scenarioHasCoverage(corpus, keywords) {
    const lowered = corpus.toLowerCase();
    return keywords.every((keyword) => lowered.includes(keyword.toLowerCase()));
}
function evaluateInvariants(options) {
    const testDocuments = loadTestDocuments(options.rootDir, options.testPatterns ?? ['test/**/*.js', 'test/**/*.mjs', 'test/**/*.cjs', 'test/**/*.ts', '**/*.test.js', '**/*.test.mjs', '**/*.test.cjs', '**/*.spec.ts']);
    const results = [];
    const changedByFile = new Set(options.changedFiles.map((item) => (0, index_1.normalizePath)(item)));
    for (const invariant of options.invariants) {
        const files = impactedFiles(invariant, options.changedFiles, options.changedRegions, options.complexity);
        if (files.length === 0) {
            continue;
        }
        const obligations = [];
        const evidence = [];
        let status = 'supported';
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
        const focusedTests = focusedTestDocuments(testDocuments, invariant, files);
        const focusedCorpus = focusedTests.map((document) => document.contents).join('\n');
        const scenarioResults = [];
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
        for (const region of options.changedRegions.filter((region) => files.includes((0, index_1.normalizePath)(region.filePath)))) {
            const regionMutations = fileMutations.filter((site) => {
                if (site.filePath !== (0, index_1.normalizePath)(region.filePath)) {
                    return false;
                }
                for (let line = region.span.startLine; line <= region.span.endLine; line += 1) {
                    if ((0, index_1.spanOverlaps)(line, site.span)) {
                        return true;
                    }
                }
                return false;
            });
            if (regionMutations.length === 0 && changedByFile.has((0, index_1.normalizePath)(region.filePath))) {
                evidence.push(`Changed region ${region.hunkId} in ${region.filePath} has no selected mutation sites; review test specificity manually.`);
            }
        }
        const evidenceSummary = {
            invariantId: invariant.id,
            impactedFiles: files,
            focusedTests: focusedTests.map((document) => document.filePath),
            changedFunctions,
            changedFunctionsUnder80Coverage: lowCoverageChanged.length,
            maxChangedCrap: changedFunctions.reduce((max, item) => Math.max(max, item.crap), 0),
            mutationSitesInScope: fileMutations.length,
            killedMutantsInScope: killedMutants.length,
            survivingMutantsInScope: survivingMutants.length,
            scenarioResults
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
//# sourceMappingURL=index.js.map