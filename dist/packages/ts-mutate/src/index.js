"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverMutationSites = discoverMutationSites;
exports.applyMutation = applyMutation;
exports.runMutations = runMutations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const typescript_1 = __importDefault(require("typescript"));
const index_1 = require("../../evidence-model/src/index");
function lineOf(node, sourceFile) {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}
function spanFor(node, sourceFile) {
    const startLine = lineOf(node, sourceFile);
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;
    return { startLine, endLine, startOffset: node.getStart(sourceFile), endOffset: node.end };
}
function coverageForLine(filePath, line, coverage) {
    const normalized = (0, index_1.normalizePath)(filePath);
    const entry = coverage.find((item) => item.filePath === normalized || item.filePath.endsWith(normalized));
    if (!entry) {
        return true;
    }
    return (entry.lines[String(line)] ?? 0) > 0;
}
function mutationId(filePath, span, original, replacement) {
    return (0, index_1.digestObject)({ filePath: (0, index_1.normalizePath)(filePath), span, original, replacement });
}
function discoverMutationSites(sourceText, filePath, coverage = [], changedFiles = [], changedRegions = [], coveredOnly = false) {
    const sourceFile = typescript_1.default.createSourceFile(filePath, sourceText, typescript_1.default.ScriptTarget.Latest, true);
    const sites = [];
    const changed = (0, index_1.changedFileSet)(changedFiles, changedRegions);
    const fileRegions = changedRegions.filter((item) => (0, index_1.normalizePath)(item.filePath) === (0, index_1.normalizePath)(filePath));
    function consider(node, replacement, operator, description) {
        const span = spanFor(node, sourceFile);
        const line = span.startLine;
        const inChangedRegion = fileRegions.length === 0 || fileRegions.some((region) => (0, index_1.spanOverlaps)(line, region.span));
        if (changed.size > 0 && !changed.has((0, index_1.normalizePath)(filePath)) && !inChangedRegion) {
            return;
        }
        if (coveredOnly && !coverageForLine(filePath, line, coverage)) {
            return;
        }
        const original = node.getText(sourceFile);
        sites.push({
            id: mutationId(filePath, span, original, replacement),
            filePath: (0, index_1.normalizePath)(filePath),
            span: { startLine: span.startLine, endLine: span.endLine },
            startOffset: span.startOffset,
            endOffset: span.endOffset,
            operator,
            original,
            replacement,
            description
        });
    }
    function visit(node) {
        if (typescript_1.default.isBinaryExpression(node)) {
            const token = node.operatorToken.kind;
            const text = node.operatorToken.getText(sourceFile);
            if (token === typescript_1.default.SyntaxKind.EqualsEqualsEqualsToken) {
                consider(node.operatorToken, '!==', text, 'strict equality inversion');
            }
            else if (token === typescript_1.default.SyntaxKind.ExclamationEqualsEqualsToken) {
                consider(node.operatorToken, '===', text, 'strict inequality inversion');
            }
            else if (token === typescript_1.default.SyntaxKind.GreaterThanToken) {
                consider(node.operatorToken, '>=', text, 'greater-than relaxation');
            }
            else if (token === typescript_1.default.SyntaxKind.GreaterThanEqualsToken) {
                consider(node.operatorToken, '>', text, 'greater-than tightening');
            }
            else if (token === typescript_1.default.SyntaxKind.LessThanToken) {
                consider(node.operatorToken, '<=', text, 'less-than relaxation');
            }
            else if (token === typescript_1.default.SyntaxKind.LessThanEqualsToken) {
                consider(node.operatorToken, '<', text, 'less-than tightening');
            }
            else if (token === typescript_1.default.SyntaxKind.PlusToken) {
                consider(node.operatorToken, '-', text, 'addition to subtraction');
            }
            else if (token === typescript_1.default.SyntaxKind.MinusToken) {
                consider(node.operatorToken, '+', text, 'subtraction to addition');
            }
            else if (token === typescript_1.default.SyntaxKind.AmpersandAmpersandToken) {
                consider(node.operatorToken, '||', text, 'and to or');
            }
            else if (token === typescript_1.default.SyntaxKind.BarBarToken) {
                consider(node.operatorToken, '&&', text, 'or to and');
            }
        }
        if (node.kind === typescript_1.default.SyntaxKind.TrueKeyword) {
            consider(node, 'false', 'true', 'boolean flip true->false');
        }
        if (node.kind === typescript_1.default.SyntaxKind.FalseKeyword) {
            consider(node, 'true', 'false', 'boolean flip false->true');
        }
        typescript_1.default.forEachChild(node, visit);
    }
    visit(sourceFile);
    return sites;
}
function applyMutation(sourceText, site) {
    return `${sourceText.slice(0, site.startOffset)}${site.replacement}${sourceText.slice(site.endOffset)}`;
}
function copyRecursive(sourceDir, destinationDir, exclude) {
    (0, index_1.ensureDir)(destinationDir);
    for (const entry of fs_1.default.readdirSync(sourceDir, { withFileTypes: true })) {
        if (exclude.has(entry.name)) {
            continue;
        }
        const sourcePath = path_1.default.join(sourceDir, entry.name);
        const destinationPath = path_1.default.join(destinationDir, entry.name);
        if (entry.isDirectory()) {
            copyRecursive(sourcePath, destinationPath, exclude);
        }
        else {
            (0, index_1.ensureDir)(path_1.default.dirname(destinationPath));
            fs_1.default.copyFileSync(sourcePath, destinationPath);
        }
    }
}
function hasSyntaxErrors(filePath, sourceText) {
    const sourceFile = typescript_1.default.createSourceFile(filePath, sourceText, typescript_1.default.ScriptTarget.Latest, true);
    return sourceFile.parseDiagnostics.length > 0;
}
function manifestKey(repoRoot, site, testCommand) {
    const absolutePath = path_1.default.join(repoRoot, site.filePath);
    const fileText = fs_1.default.readFileSync(absolutePath, 'utf8');
    return (0, index_1.digestObject)({ site, sourceDigest: (0, index_1.digestObject)(fileText), testCommand });
}
function loadManifest(filePath) {
    if (!filePath || !fs_1.default.existsSync(filePath)) {
        return { version: '1', entries: {} };
    }
    return (0, index_1.readJson)(filePath);
}
function saveManifest(filePath, manifest) {
    if (!filePath) {
        return;
    }
    (0, index_1.writeJson)(filePath, manifest);
}
function runSingleMutation(repoRoot, site, mutatedSource, testCommand, timeoutMs) {
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
    const tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'ts-quality-mutant-'));
    try {
        copyRecursive(repoRoot, tempDir, new Set(['.git', 'node_modules', 'dist', '.ts-quality']));
        const targetPath = path_1.default.join(tempDir, site.filePath);
        (0, index_1.ensureDir)(path_1.default.dirname(targetPath));
        fs_1.default.writeFileSync(targetPath, mutatedSource, 'utf8');
        const started = Date.now();
        const result = (0, child_process_1.spawnSync)(testCommand[0], testCommand.slice(1), {
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
    }
    finally {
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    }
}
function runMutations(options) {
    const sourceFiles = (options.sourceFiles ?? (0, index_1.collectSourceFiles)(options.repoRoot, ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx', 'src/**/*.mjs', 'src/**/*.cjs']))
        .filter((filePath) => !(0, index_1.matchPattern)('**/*.d.ts', filePath));
    const coverage = options.coverage ?? [];
    const changedFiles = options.changedFiles ?? [];
    const changedRegions = options.changedRegions ?? [];
    const sites = sourceFiles.flatMap((relativePath) => {
        const sourceText = fs_1.default.readFileSync(path_1.default.join(options.repoRoot, relativePath), 'utf8');
        return discoverMutationSites(sourceText, relativePath, coverage, changedFiles, changedRegions, options.coveredOnly ?? false);
    });
    const limitedSites = typeof options.maxSites === 'number' ? sites.slice(0, options.maxSites) : sites;
    const manifest = loadManifest(options.manifestPath);
    const results = [];
    for (const site of limitedSites) {
        const key = manifestKey(options.repoRoot, site, options.testCommand);
        const cached = manifest.entries[key];
        if (cached) {
            results.push(cached);
            continue;
        }
        const sourceText = fs_1.default.readFileSync(path_1.default.join(options.repoRoot, site.filePath), 'utf8');
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
//# sourceMappingURL=index.js.map