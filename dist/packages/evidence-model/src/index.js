"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePath = normalizePath;
exports.createRunId = createRunId;
exports.assertSafeRunId = assertSafeRunId;
exports.ensureDir = ensureDir;
exports.stableSortKeys = stableSortKeys;
exports.stableStringify = stableStringify;
exports.sha256Hex = sha256Hex;
exports.digestObject = digestObject;
exports.readText = readText;
exports.writeText = writeText;
exports.readJson = readJson;
exports.writeJson = writeJson;
exports.fileDigest = fileDigest;
exports.listFiles = listFiles;
exports.collectSourceFiles = collectSourceFiles;
exports.globToRegExp = globToRegExp;
exports.matchPattern = matchPattern;
exports.matchesAny = matchesAny;
exports.findCoverageEvidence = findCoverageEvidence;
exports.repoDigest = repoDigest;
exports.inferPackages = inferPackages;
exports.resolvePackageName = resolvePackageName;
exports.buildRepositoryEntity = buildRepositoryEntity;
exports.loadOptionalJsonArray = loadOptionalJsonArray;
exports.isWaiverActive = isWaiverActive;
exports.isFindingWaived = isFindingWaived;
exports.parseUnifiedDiff = parseUnifiedDiff;
exports.writeRunArtifact = writeRunArtifact;
exports.readLatestRun = readLatestRun;
exports.listRunIds = listRunIds;
exports.loadRun = loadRun;
exports.readMaybe = readMaybe;
exports.clamp = clamp;
exports.nowIso = nowIso;
exports.summarizeMutationScore = summarizeMutationScore;
exports.changedFileSet = changedFileSet;
exports.spanOverlaps = spanOverlaps;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
function normalizePath(value) {
    const normalized = value.replace(/\\/g, '/').replace(/\/+/g, '/');
    return normalized.replace(/^\.\//, '').replace(/^\//, '').replace(/\/$/, '');
}
function createRunId(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}
function assertSafeRunId(runId) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)) {
        throw new Error(`runId must use only letters, numbers, dot, underscore, and hyphen: ${runId}`);
    }
    return runId;
}
function ensureDir(dirPath) {
    fs_1.default.mkdirSync(dirPath, { recursive: true });
}
function stableSortKeys(value) {
    if (Array.isArray(value)) {
        return value.map((item) => stableSortKeys(item));
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, inner]) => [key, stableSortKeys(inner)]);
        return Object.fromEntries(entries);
    }
    return value;
}
function stableStringify(value) {
    return JSON.stringify(stableSortKeys(value), null, 2);
}
function sha256Hex(input) {
    return crypto_1.default.createHash('sha256').update(input).digest('hex');
}
function digestObject(value) {
    return `sha256:${sha256Hex(stableStringify(value))}`;
}
function readText(filePath) {
    return fs_1.default.readFileSync(filePath, 'utf8');
}
function writeText(filePath, contents) {
    ensureDir(path_1.default.dirname(filePath));
    fs_1.default.writeFileSync(filePath, contents, 'utf8');
}
function readJson(filePath) {
    return JSON.parse(readText(filePath));
}
function writeJson(filePath, value) {
    writeText(filePath, `${stableStringify(value)}\n`);
}
function fileDigest(filePath) {
    return `sha256:${sha256Hex(fs_1.default.readFileSync(filePath))}`;
}
function listFiles(rootDir, options) {
    const include = options?.include ?? /./;
    const excludeDirs = new Set((options?.excludeDirs ?? ['node_modules', 'dist', '.git', '.ts-quality']).map((item) => normalizePath(item)));
    const output = [];
    function visit(currentDir) {
        const entries = fs_1.default.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const absolute = path_1.default.join(currentDir, entry.name);
            const relative = normalizePath(path_1.default.relative(rootDir, absolute));
            if (entry.isDirectory()) {
                if (excludeDirs.has(entry.name) || excludeDirs.has(relative)) {
                    continue;
                }
                visit(absolute);
                continue;
            }
            if (include.test(relative)) {
                output.push(relative);
            }
        }
    }
    if (fs_1.default.existsSync(rootDir)) {
        visit(rootDir);
    }
    return output.sort();
}
function collectSourceFiles(rootDir, patterns = ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx', 'src/**/*.mjs', 'src/**/*.cjs']) {
    const files = listFiles(rootDir, { include: /\.(ts|tsx|js|jsx|mjs|cjs)$/ });
    return files.filter((filePath) => patterns.some((pattern) => matchPattern(pattern, filePath)));
}
function globToRegExp(pattern) {
    const normalized = normalizePath(pattern);
    let output = '^';
    for (let index = 0; index < normalized.length;) {
        if (normalized.slice(index, index + 3) === '**/') {
            output += '(?:.*/)?';
            index += 3;
            continue;
        }
        if (normalized.slice(index, index + 2) === '**') {
            output += '.*';
            index += 2;
            continue;
        }
        const current = normalized[index] ?? '';
        if (current === '*') {
            output += '[^/]*';
            index += 1;
            continue;
        }
        output += current.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        index += 1;
    }
    output += '$';
    return new RegExp(output);
}
function matchPattern(pattern, value) {
    const normalizedPattern = normalizePath(pattern);
    const normalizedValue = normalizePath(value);
    if (normalizedPattern.startsWith('path:')) {
        return matchPattern(normalizedPattern.slice(5), normalizedValue);
    }
    if (!normalizedPattern.includes('*')) {
        return normalizedPattern === normalizedValue;
    }
    return globToRegExp(normalizedPattern).test(normalizedValue);
}
function matchesAny(patterns, value) {
    return patterns.some((pattern) => matchPattern(pattern, value));
}
function findCoverageEvidence(filePath, coverage) {
    const normalized = normalizePath(filePath);
    const exact = coverage.find((item) => normalizePath(item.filePath) === normalized);
    if (exact) {
        return exact;
    }
    const suffixMatches = coverage.filter((item) => normalizePath(item.filePath).endsWith(`/${normalized}`));
    return suffixMatches.length === 1 ? suffixMatches[0] : undefined;
}
function repoDigest(rootDir, filePaths) {
    const entries = filePaths.map((filePath) => ({ filePath, digest: fileDigest(path_1.default.join(rootDir, filePath)) }));
    return digestObject(entries);
}
function inferPackages(rootDir) {
    const packageJsonFiles = listFiles(rootDir, { include: /package\.json$/ });
    return packageJsonFiles.map((filePath) => {
        const packageDir = normalizePath(path_1.default.dirname(filePath));
        const packageJson = readJson(path_1.default.join(rootDir, filePath));
        return {
            name: packageJson.name ?? packageDir,
            dir: packageDir === '.' ? '' : packageDir
        };
    });
}
function resolvePackageName(filePath, packages) {
    const normalized = normalizePath(filePath);
    const match = packages
        .filter((entry) => normalized === entry.dir || normalized.startsWith(`${entry.dir}/`) || entry.dir === '')
        .sort((left, right) => right.dir.length - left.dir.length)[0];
    return match?.name;
}
function buildRepositoryEntity(rootDir, filePaths) {
    const packages = inferPackages(rootDir);
    return {
        rootDir: normalizePath(rootDir),
        name: path_1.default.basename(rootDir),
        packages,
        digest: repoDigest(rootDir, filePaths)
    };
}
function loadOptionalJsonArray(filePath) {
    if (!fs_1.default.existsSync(filePath)) {
        return [];
    }
    return readJson(filePath);
}
function isWaiverActive(waiver, nowIso) {
    if (!waiver.expiresAt) {
        return true;
    }
    return new Date(nowIso).getTime() <= new Date(waiver.expiresAt).getTime();
}
function isFindingWaived(finding, waivers, nowIso) {
    return waivers.find((waiver) => waiver.ruleId === (finding.ruleId ?? finding.code) && isWaiverActive(waiver, nowIso) && finding.scope.every((scope) => waiver.scope.some((item) => matchPattern(item, scope) || item === scope)));
}
function parseUnifiedDiff(diffText) {
    const regions = [];
    let currentFile;
    let counter = 0;
    for (const line of diffText.split(/\r?\n/)) {
        if (line.startsWith('+++ b/')) {
            currentFile = normalizePath(line.slice(6));
            continue;
        }
        const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
        if (match && currentFile) {
            const startLine = Number(match[1]);
            const lineCount = Number(match[2] ?? '1');
            regions.push({
                filePath: currentFile,
                hunkId: `hunk-${counter++}`,
                span: {
                    startLine,
                    endLine: startLine + Math.max(lineCount - 1, 0)
                }
            });
        }
    }
    return regions;
}
function writeRunArtifact(rootDir, run) {
    const safeRunId = assertSafeRunId(run.runId);
    const artifactRoot = path_1.default.join(rootDir, '.ts-quality', 'runs', safeRunId);
    ensureDir(artifactRoot);
    writeJson(path_1.default.join(artifactRoot, 'run.json'), run);
    writeJson(path_1.default.join(artifactRoot, 'verdict.json'), run.verdict);
    writeJson(path_1.default.join(rootDir, '.ts-quality', 'latest.json'), { latestRunId: safeRunId });
    return artifactRoot;
}
function readLatestRun(rootDir) {
    const latestPointerPath = path_1.default.join(rootDir, '.ts-quality', 'latest.json');
    if (!fs_1.default.existsSync(latestPointerPath)) {
        throw new Error(`No latest run pointer found at ${latestPointerPath}`);
    }
    const pointer = readJson(latestPointerPath);
    return loadRun(rootDir, pointer.latestRunId);
}
function listRunIds(rootDir) {
    const runsDir = path_1.default.join(rootDir, '.ts-quality', 'runs');
    if (!fs_1.default.existsSync(runsDir)) {
        return [];
    }
    return fs_1.default.readdirSync(runsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}
function loadRun(rootDir, runId) {
    const safeRunId = assertSafeRunId(runId);
    return readJson(path_1.default.join(rootDir, '.ts-quality', 'runs', safeRunId, 'run.json'));
}
function readMaybe(filePath) {
    if (!fs_1.default.existsSync(filePath)) {
        return undefined;
    }
    return readJson(filePath);
}
function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}
function nowIso() {
    return new Date().toISOString();
}
function summarizeMutationScore(results) {
    const killed = results.filter((result) => result.status === 'killed').length;
    const survived = results.filter((result) => result.status === 'survived').length;
    const total = killed + survived;
    return {
        killed,
        survived,
        score: total === 0 ? 1 : killed / total
    };
}
function changedFileSet(changedFiles, changedRegions) {
    return new Set([...changedFiles.map((item) => normalizePath(item)), ...changedRegions.map((item) => normalizePath(item.filePath))]);
}
function spanOverlaps(line, span) {
    return line >= span.startLine && line <= span.endLine;
}
//# sourceMappingURL=index.js.map