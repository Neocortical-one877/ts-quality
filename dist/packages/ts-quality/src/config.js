"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadModuleFile = loadModuleFile;
exports.findConfigPath = findConfigPath;
exports.loadContext = loadContext;
exports.loadInvariants = loadInvariants;
exports.loadConstitution = loadConstitution;
exports.loadAgents = loadAgents;
exports.loadWaivers = loadWaivers;
exports.loadApprovals = loadApprovals;
exports.loadOverrides = loadOverrides;
exports.loadChangedRegions = loadChangedRegions;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const vm_1 = __importDefault(require("vm"));
const typescript_1 = __importDefault(require("typescript"));
const module_1 = require("module");
const index_1 = require("../../evidence-model/src/index");
function transpileModule(filePath) {
    const sourceText = fs_1.default.readFileSync(filePath, 'utf8');
    const transpileFilePath = filePath.endsWith('.mjs') || filePath.endsWith('.cjs')
        ? `${filePath.slice(0, -4)}.js`
        : filePath;
    const outputText = typescript_1.default.transpileModule(sourceText, {
        compilerOptions: {
            target: typescript_1.default.ScriptTarget.ES2022,
            module: typescript_1.default.ModuleKind.CommonJS,
            esModuleInterop: true,
            allowJs: true
        },
        fileName: transpileFilePath
    }).outputText;
    const moduleObject = { exports: {} };
    const sandbox = {
        module: moduleObject,
        exports: moduleObject.exports,
        require: (0, module_1.createRequire)(filePath),
        __dirname: path_1.default.dirname(filePath),
        __filename: filePath,
        process,
        console
    };
    vm_1.default.runInNewContext(outputText, sandbox, { filename: filePath });
    return moduleObject.exports.default ?? moduleObject.exports;
}
function loadModuleFile(filePath) {
    if (!fs_1.default.existsSync(filePath)) {
        throw new Error(`Required file not found: ${filePath}`);
    }
    if (filePath.endsWith('.json')) {
        return (0, index_1.readJson)(filePath);
    }
    if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) {
        return transpileModule(filePath);
    }
    throw new Error(`Unsupported file type for ${filePath}`);
}
function validateStringArray(name, value) {
    if (value === undefined) {
        return undefined;
    }
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw new Error(`${name} must be an array of strings`);
    }
    return value;
}
function validateConfig(raw) {
    const sourcePatterns = validateStringArray('sourcePatterns', raw.sourcePatterns) ?? ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx', 'src/**/*.mjs', 'src/**/*.cjs'];
    const testPatterns = validateStringArray('testPatterns', raw.testPatterns) ?? ['test/**/*.js', 'test/**/*.mjs', 'test/**/*.cjs', 'test/**/*.ts', '**/*.test.js', '**/*.test.mjs', '**/*.test.cjs', '**/*.spec.ts'];
    const changeFiles = validateStringArray('changeSet.files', raw.changeSet?.files) ?? [];
    const mutationCommand = validateStringArray('mutations.testCommand', raw.mutations?.testCommand) ?? ['node', '--test'];
    return {
        version: raw.version ?? '5',
        sourcePatterns,
        testPatterns,
        coverage: {
            lcovPath: raw.coverage?.lcovPath ?? 'coverage/lcov.info'
        },
        mutations: {
            testCommand: mutationCommand,
            coveredOnly: raw.mutations?.coveredOnly ?? false,
            timeoutMs: raw.mutations?.timeoutMs ?? 15_000,
            maxSites: raw.mutations?.maxSites ?? 25
        },
        policy: {
            maxChangedCrap: raw.policy?.maxChangedCrap ?? 30,
            minMutationScore: raw.policy?.minMutationScore ?? 0.8,
            minMergeConfidence: raw.policy?.minMergeConfidence ?? 70
        },
        changeSet: {
            files: changeFiles,
            diffFile: raw.changeSet?.diffFile ?? ''
        },
        invariantsPath: raw.invariantsPath ?? '.ts-quality/invariants.ts',
        constitutionPath: raw.constitutionPath ?? '.ts-quality/constitution.ts',
        agentsPath: raw.agentsPath ?? '.ts-quality/agents.ts',
        approvalsPath: raw.approvalsPath ?? '.ts-quality/approvals.json',
        waiversPath: raw.waiversPath ?? '.ts-quality/waivers.json',
        overridesPath: raw.overridesPath ?? '.ts-quality/overrides.json',
        attestationsDir: raw.attestationsDir ?? '.ts-quality/attestations',
        trustedKeysDir: raw.trustedKeysDir ?? '.ts-quality/keys'
    };
}
function findConfigPath(rootDir) {
    for (const candidate of ['ts-quality.config.ts', 'ts-quality.config.js', 'ts-quality.config.mjs', 'ts-quality.config.cjs', 'ts-quality.config.json']) {
        const filePath = path_1.default.join(rootDir, candidate);
        if (fs_1.default.existsSync(filePath)) {
            return filePath;
        }
    }
    throw new Error(`No ts-quality config found in ${rootDir}`);
}
function loadContext(rootDir, explicitConfigPath) {
    const configPath = explicitConfigPath ? path_1.default.resolve(rootDir, explicitConfigPath) : findConfigPath(rootDir);
    const config = validateConfig(loadModuleFile(configPath));
    return { rootDir, configPath, config };
}
function loadInvariants(rootDir, relativePath) {
    const filePath = path_1.default.join(rootDir, relativePath);
    return fs_1.default.existsSync(filePath) ? loadModuleFile(filePath) : [];
}
function loadConstitution(rootDir, relativePath) {
    const filePath = path_1.default.join(rootDir, relativePath);
    return fs_1.default.existsSync(filePath) ? loadModuleFile(filePath) : [];
}
function loadAgents(rootDir, relativePath) {
    const filePath = path_1.default.join(rootDir, relativePath);
    return fs_1.default.existsSync(filePath) ? loadModuleFile(filePath) : [];
}
function loadWaivers(rootDir, relativePath) {
    const filePath = path_1.default.join(rootDir, relativePath);
    return fs_1.default.existsSync(filePath) ? loadModuleFile(filePath) : [];
}
function loadApprovals(rootDir, relativePath) {
    const filePath = path_1.default.join(rootDir, relativePath);
    return fs_1.default.existsSync(filePath) ? loadModuleFile(filePath) : [];
}
function loadOverrides(rootDir, relativePath) {
    const filePath = path_1.default.join(rootDir, relativePath);
    return fs_1.default.existsSync(filePath) ? loadModuleFile(filePath) : [];
}
function loadChangedRegions(rootDir, diffFileRelative) {
    if (!diffFileRelative) {
        return [];
    }
    const filePath = path_1.default.join(rootDir, diffFileRelative);
    if (!fs_1.default.existsSync(filePath)) {
        return [];
    }
    return (0, index_1.parseUnifiedDiff)(fs_1.default.readFileSync(filePath, 'utf8'));
}
//# sourceMappingURL=config.js.map