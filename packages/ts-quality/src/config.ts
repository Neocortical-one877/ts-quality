import fs from 'fs';
import path from 'path';
import vm from 'vm';
import ts from 'typescript';
import { createRequire } from 'module';
import { type Agent, type ConstitutionRule, type InvariantSpec, type OverrideRecord, type Waiver, type Approval, parseUnifiedDiff, readJson } from '../../evidence-model/src/index';

export interface TsQualityConfig {
  version?: string;
  sourcePatterns?: string[];
  testPatterns?: string[];
  coverage?: {
    lcovPath?: string;
  };
  mutations?: {
    testCommand: string[];
    coveredOnly?: boolean;
    timeoutMs?: number;
    maxSites?: number;
  };
  policy?: {
    maxChangedCrap?: number;
    minMutationScore?: number;
    minMergeConfidence?: number;
  };
  changeSet?: {
    files?: string[];
    diffFile?: string;
  };
  invariantsPath?: string;
  constitutionPath?: string;
  agentsPath?: string;
  approvalsPath?: string;
  waiversPath?: string;
  overridesPath?: string;
  attestationsDir?: string;
  trustedKeysDir?: string;
}

export interface LoadedContext {
  rootDir: string;
  configPath: string;
  config: Required<TsQualityConfig>;
}

function transpileModule(filePath: string): any {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const transpileFilePath = filePath.endsWith('.mjs') || filePath.endsWith('.cjs')
    ? `${filePath.slice(0, -4)}.js`
    : filePath;
  const outputText = ts.transpileModule(sourceText, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      allowJs: true
    },
    fileName: transpileFilePath
  }).outputText;
  const moduleObject = { exports: {} as Record<string, unknown> };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: createRequire(filePath),
    __dirname: path.dirname(filePath),
    __filename: filePath,
    process,
    console
  };
  vm.runInNewContext(outputText, sandbox, { filename: filePath });
  return moduleObject.exports.default ?? moduleObject.exports;
}

export function loadModuleFile<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
  if (filePath.endsWith('.json')) {
    return readJson<T>(filePath);
  }
  if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) {
    return transpileModule(filePath) as T;
  }
  throw new Error(`Unsupported file type for ${filePath}`);
}

function validateStringArray(name: string, value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${name} must be an array of strings`);
  }
  return value as string[];
}

function validateConfig(raw: TsQualityConfig): Required<TsQualityConfig> {
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

export function findConfigPath(rootDir: string): string {
  for (const candidate of ['ts-quality.config.ts', 'ts-quality.config.js', 'ts-quality.config.mjs', 'ts-quality.config.cjs', 'ts-quality.config.json']) {
    const filePath = path.join(rootDir, candidate);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  throw new Error(`No ts-quality config found in ${rootDir}`);
}

export function loadContext(rootDir: string, explicitConfigPath?: string): LoadedContext {
  const configPath = explicitConfigPath ? path.resolve(rootDir, explicitConfigPath) : findConfigPath(rootDir);
  const config = validateConfig(loadModuleFile<TsQualityConfig>(configPath));
  return { rootDir, configPath, config };
}

export function loadInvariants(rootDir: string, relativePath: string): InvariantSpec[] {
  const filePath = path.join(rootDir, relativePath);
  return fs.existsSync(filePath) ? loadModuleFile<InvariantSpec[]>(filePath) : [];
}

export function loadConstitution(rootDir: string, relativePath: string): ConstitutionRule[] {
  const filePath = path.join(rootDir, relativePath);
  return fs.existsSync(filePath) ? loadModuleFile<ConstitutionRule[]>(filePath) : [];
}

export function loadAgents(rootDir: string, relativePath: string): Agent[] {
  const filePath = path.join(rootDir, relativePath);
  return fs.existsSync(filePath) ? loadModuleFile<Agent[]>(filePath) : [];
}

export function loadWaivers(rootDir: string, relativePath: string): Waiver[] {
  const filePath = path.join(rootDir, relativePath);
  return fs.existsSync(filePath) ? loadModuleFile<Waiver[]>(filePath) : [];
}

export function loadApprovals(rootDir: string, relativePath: string): Approval[] {
  const filePath = path.join(rootDir, relativePath);
  return fs.existsSync(filePath) ? loadModuleFile<Approval[]>(filePath) : [];
}

export function loadOverrides(rootDir: string, relativePath: string): OverrideRecord[] {
  const filePath = path.join(rootDir, relativePath);
  return fs.existsSync(filePath) ? loadModuleFile<OverrideRecord[]>(filePath) : [];
}

export function loadChangedRegions(rootDir: string, diffFileRelative: string): ReturnType<typeof parseUnifiedDiff> {
  if (!diffFileRelative) {
    return [];
  }
  const filePath = path.join(rootDir, diffFileRelative);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return parseUnifiedDiff(fs.readFileSync(filePath, 'utf8'));
}
