import fs from 'fs';
import path from 'path';
import {
  type AmendmentProposal,
  type AnalysisContext,
  type Approval,
  type Attestation,
  type FileEntity,
  type OverrideRecord,
  type RunArtifact,
  type SymbolEntity,
  assertSafeRunId,
  buildRepositoryEntity,
  collectSourceFiles,
  createRunId,
  digestObject,
  ensureDir,
  fileDigest,
  listRunIds,
  loadRun,
  normalizePath,
  nowIso,
  readLatestRun,
  resolvePackageName,
  stableStringify,
  writeJson,
  writeRunArtifact
} from '../../evidence-model/src/index';
import { analyzeCrap, parseLcov } from '../../crap4ts/src/index';
import { runMutations } from '../../ts-mutate/src/index';
import { evaluateInvariants } from '../../invariants/src/index';
import { defaultPolicy, evaluatePolicy, renderExplainText, renderMarkdownReport, renderPrSummary } from '../../policy-engine/src/index';
import { evaluateGovernance, generateGovernancePlan } from '../../governance/src/index';
import { applyAmendment, authorizeChange, buildChangeBundle, evaluateAmendment, generateKeyPair, loadTrustedKeys, saveAttestation, signAttestation, verifyAttestation } from '../../legitimacy/src/index';
import { loadAgents, loadApprovals, loadChangedRegions, loadConstitution, loadContext, loadInvariants, loadOverrides, loadWaivers } from './config';

export interface CheckResult {
  run: RunArtifact;
  artifactDir: string;
}

function fileEntities(rootDir: string, filePaths: string[]): FileEntity[] {
  const repo = buildRepositoryEntity(rootDir, filePaths);
  return filePaths.map((filePath) => {
    const normalizedFilePath = normalizePath(filePath);
    const result: FileEntity = {
      filePath: normalizedFilePath,
      digest: fileDigest(path.join(rootDir, filePath))
    };
    const packageName = resolvePackageName(normalizedFilePath, repo.packages);
    if (packageName) {
      result.packageName = packageName;
    }
    return result;
  });
}

function symbolEntities(complexity: RunArtifact['complexity']): SymbolEntity[] {
  return complexity.map((item) => ({
    filePath: item.filePath,
    symbol: item.symbol,
    kind: item.symbol.split(':')[0] ?? 'function',
    span: item.span
  }));
}

function latestRunOrUndefined(rootDir: string): RunArtifact | undefined {
  try {
    return readLatestRun(rootDir);
  } catch {
    return undefined;
  }
}

function portablePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function resolveCliPath(rootDir: string, candidate: string, options?: { preferRoot?: boolean }): string {
  if (path.isAbsolute(candidate)) {
    return candidate;
  }
  const cwdResolved = path.resolve(process.cwd(), candidate);
  const rootResolved = path.resolve(rootDir, candidate);
  const rootRelativeFromCwd = portablePath(path.relative(process.cwd(), rootDir));
  const normalizedCandidate = portablePath(candidate);
  if (fs.existsSync(rootResolved)) {
    return rootResolved;
  }
  if (fs.existsSync(cwdResolved)) {
    return cwdResolved;
  }
  if (rootRelativeFromCwd && (normalizedCandidate === rootRelativeFromCwd || normalizedCandidate.startsWith(`${rootRelativeFromCwd}/`) )) {
    return cwdResolved;
  }
  return options?.preferRoot === false ? cwdResolved : rootResolved;
}

function recordSubjectPath(rootDir: string, resolvedSubject: string, originalCandidate: string): string {
  const relative = portablePath(path.relative(rootDir, resolvedSubject));
  if (relative && !relative.startsWith('..')) {
    return relative;
  }
  if (path.isAbsolute(resolvedSubject)) {
    return portablePath(resolvedSubject);
  }
  return normalizePath(originalCandidate);
}

function verifyAttestationAtRoot(rootDir: string, attestation: Attestation, trustedKeys: Record<string, string>): { ok: boolean; reason: string } {
  const signature = verifyAttestation(attestation, trustedKeys);
  if (!signature.ok) {
    return signature;
  }
  const subjectFile = typeof attestation.payload?.subjectFile === 'string' ? attestation.payload.subjectFile : undefined;
  if (!subjectFile) {
    return signature;
  }
  const resolvedSubject = path.isAbsolute(subjectFile) ? subjectFile : path.resolve(rootDir, subjectFile);
  if (!fs.existsSync(resolvedSubject)) {
    return { ok: false, reason: `subject file missing: ${subjectFile}` };
  }
  const digest = digestObject(fs.readFileSync(resolvedSubject, 'utf8'));
  if (digest !== attestation.subjectDigest) {
    return { ok: false, reason: 'subject digest mismatch' };
  }
  return { ok: true, reason: 'verified' };
}

function attestationAppliesToRun(attestation: Attestation, runId: string): boolean {
  const subjectFile = typeof attestation.payload?.subjectFile === 'string' ? portablePath(attestation.payload.subjectFile) : '';
  return subjectFile.includes(`runs/${runId}/`);
}

function writeModuleExport(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `export default ${stableStringify(value)};\n`, 'utf8');
}

function attestationFiles(rootDir: string, dirRelative: string): string[] {
  const directory = path.join(rootDir, dirRelative);
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory).filter((entry: string) => entry.endsWith('.json')).map((entry: string) => path.join(directory, entry)).sort();
}

export function loadVerifiedAttestations(rootDir: string, attestationsDir: string, trustedKeysDir: string): { attestations: Attestation[]; verification: Array<{ issuer: string; ok: boolean; reason: string }> } {
  const keys = loadTrustedKeys(resolveCliPath(rootDir, trustedKeysDir));
  const verification: Array<{ issuer: string; ok: boolean; reason: string }> = [];
  const attestations: Attestation[] = [];
  for (const filePath of attestationFiles(rootDir, attestationsDir)) {
    const attestation = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Attestation;
    const result = verifyAttestationAtRoot(rootDir, attestation, keys);
    verification.push({ issuer: attestation.issuer, ok: result.ok, reason: result.reason });
    if (result.ok) {
      attestations.push(attestation);
    }
  }
  return { attestations, verification };
}

function buildAnalysisContext(input: {
  runId: string;
  createdAt: string;
  sourceFiles: string[];
  changedFiles: string[];
  changedRegions: RunArtifact['changedRegions'];
  executionFingerprint: string;
}): AnalysisContext {
  return {
    runId: input.runId,
    createdAt: input.createdAt,
    sourceFiles: [...input.sourceFiles],
    changedFiles: [...input.changedFiles],
    changedRegions: [...input.changedRegions],
    executionFingerprint: input.executionFingerprint
  };
}

export function runCheck(rootDir: string, options?: { changedFiles?: string[]; configPath?: string; runId?: string }): CheckResult {
  const loaded = loadContext(rootDir, options?.configPath);
  const sourceFiles = collectSourceFiles(rootDir, loaded.config.sourcePatterns);
  const changedRegions = loaded.config.changeSet.diffFile ? loadChangedRegions(rootDir, loaded.config.changeSet.diffFile) : [];

  const changedFiles = (options?.changedFiles ?? loaded.config.changeSet.files ?? sourceFiles).map((item) => normalizePath(item));
  const runId = assertSafeRunId(options?.runId ?? createRunId());
  const createdAt = nowIso();
  const lcovPath = path.join(rootDir, loaded.config.coverage.lcovPath);
  const coverage = fs.existsSync(lcovPath) ? parseLcov(fs.readFileSync(lcovPath, 'utf8')) : [];
  const waivers = loadWaivers(rootDir, loaded.config.waiversPath);
  const approvals = loadApprovals(rootDir, loaded.config.approvalsPath);
  const overrides = loadOverrides(rootDir, loaded.config.overridesPath);
  const invariants = loadInvariants(rootDir, loaded.config.invariantsPath);
  const constitution = loadConstitution(rootDir, loaded.config.constitutionPath);
  const agents = loadAgents(rootDir, loaded.config.agentsPath);
  const previousRun = latestRunOrUndefined(rootDir);

  const crapReport = analyzeCrap({
    rootDir,
    sourceFiles,
    coverage,
    changedFiles,
    changedRegions
  });

  const mutationRun = runMutations({
    repoRoot: rootDir,
    sourceFiles,
    changedFiles,
    changedRegions,
    coverage,
    coveredOnly: loaded.config.mutations.coveredOnly ?? false,
    testCommand: loaded.config.mutations.testCommand,
    manifestPath: path.join(rootDir, '.ts-quality', 'mutation-manifest.json'),
    timeoutMs: loaded.config.mutations.timeoutMs ?? 15_000,
    maxSites: loaded.config.mutations.maxSites ?? 25
  });

  const claims = evaluateInvariants({
    rootDir,
    invariants,
    changedFiles,
    changedRegions,
    complexity: crapReport.hotspots,
    mutationSites: mutationRun.sites,
    mutations: mutationRun.results,
    testPatterns: loaded.config.testPatterns
  });

  const verifiedAttestations = loadVerifiedAttestations(rootDir, loaded.config.attestationsDir, loaded.config.trustedKeysDir);

  const preliminaryInput: any = {
    nowIso: nowIso(),
    policy: {
      ...defaultPolicy(),
      ...loaded.config.policy
    },
    changedComplexity: crapReport.hotspots.filter((item) => item.changed),
    mutations: mutationRun.results,
    mutationBaseline: mutationRun.baseline,
    behaviorClaims: claims,
    governance: [],
    waivers
  };
  if (previousRun) {
    preliminaryInput.previousRun = previousRun;
  }
  const preliminary = evaluatePolicy(preliminaryInput);

  const governance = evaluateGovernance({
    rootDir,
    constitution,
    changedFiles,
    changedRegions,
    approvals,
    runId,
    attestationsClaims: verifiedAttestations.attestations.flatMap((item) => item.claims),
    run: {
      complexity: crapReport.hotspots,
      mutations: mutationRun.results,
      verdict: preliminary.verdict
    }
  });

  const evaluatedInput: any = {
    nowIso: nowIso(),
    policy: {
      ...defaultPolicy(),
      ...loaded.config.policy
    },
    changedComplexity: crapReport.hotspots.filter((item) => item.changed),
    mutations: mutationRun.results,
    mutationBaseline: mutationRun.baseline,
    behaviorClaims: claims,
    governance,
    waivers
  };
  if (previousRun) {
    evaluatedInput.previousRun = previousRun;
  }
  const evaluated = evaluatePolicy(evaluatedInput);

  const repo = buildRepositoryEntity(rootDir, sourceFiles);
  const analysis = buildAnalysisContext({
    runId,
    createdAt,
    sourceFiles,
    changedFiles,
    changedRegions,
    executionFingerprint: mutationRun.executionFingerprint
  });
  const run: RunArtifact = {
    version: '5.0.0',
    runId,
    createdAt,
    repo,
    changedFiles,
    changedRegions,
    analysis,
    files: fileEntities(rootDir, sourceFiles),
    symbols: symbolEntities(crapReport.hotspots),
    coverage,
    complexity: crapReport.hotspots,
    mutationSites: mutationRun.sites,
    mutations: mutationRun.results,
    mutationBaseline: mutationRun.baseline,
    invariants,
    behaviorClaims: claims,
    governance,
    attestations: verifiedAttestations.attestations,
    approvals,
    overrides,
    verdict: evaluated.verdict
  };
  if (evaluated.trend) {
    run.trend = evaluated.trend;
  }

  const artifactDir = writeRunArtifact(rootDir, run);
  writeJson(path.join(artifactDir, 'report.json'), run);
  fs.writeFileSync(path.join(artifactDir, 'report.md'), `${renderMarkdownReport(run)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'pr-summary.md'), `${renderPrSummary(run)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'explain.txt'), `${renderExplainText(run)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'attestation-verify.txt'), `${verifiedAttestations.verification.map((item) => `${item.issuer}: ${item.ok ? 'ok' : 'failed'} (${item.reason})`).join('\n')}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'check-summary.txt'), `Merge confidence: ${run.verdict.mergeConfidence}/100\nOutcome: ${run.verdict.outcome}\nBest next action: ${run.verdict.bestNextAction ?? 'none'}\n`, 'utf8');
  const plan = generateGovernancePlan(run, constitution, agents);
  fs.writeFileSync(path.join(artifactDir, 'plan.txt'), `${plan.summary}\n\n${plan.steps.map((step, index) => `${index + 1}. [${step.type}] ${step.title}\n   rationale: ${step.rationale}\n   evidence: ${step.evidence.join('; ')}\n   tradeoffs: ${step.tradeoffs.join('; ')}`).join('\n')}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'govern.txt'), `${governance.map((item) => `${item.ruleId}: ${item.message}\n- ${item.evidence.join('\n- ')}`).join('\n')}\n`, 'utf8');
  return { run, artifactDir };
}

export function initProject(rootDir: string): void {
  ensureDir(path.join(rootDir, '.ts-quality', 'attestations'));
  ensureDir(path.join(rootDir, '.ts-quality', 'keys'));
  const configPath = path.join(rootDir, 'ts-quality.config.ts');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, `export default {\n  sourcePatterns: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx', 'src/**/*.mjs', 'src/**/*.cjs'],\n  testPatterns: ['test/**/*.js', 'test/**/*.mjs', 'test/**/*.cjs', 'test/**/*.ts', '**/*.test.js', '**/*.test.mjs', '**/*.test.cjs', '**/*.spec.ts'],\n  coverage: { lcovPath: 'coverage/lcov.info' },\n  mutations: { testCommand: ['node', '--test'], coveredOnly: true, timeoutMs: 15000, maxSites: 25 },\n  policy: { maxChangedCrap: 30, minMutationScore: 0.8, minMergeConfidence: 70 },\n  changeSet: { files: [] },\n  invariantsPath: '.ts-quality/invariants.ts',\n  constitutionPath: '.ts-quality/constitution.ts',\n  agentsPath: '.ts-quality/agents.ts'\n};\n`, 'utf8');
  }
  const invariantsPath = path.join(rootDir, '.ts-quality', 'invariants.ts');
  if (!fs.existsSync(invariantsPath)) {
    fs.writeFileSync(invariantsPath, `export default [\n  {\n    id: 'auth.refresh.validity',\n    title: 'Refresh token validity',\n    description: 'Expired refresh tokens must never authorize access.',\n    severity: 'high',\n    selectors: ['path:src/auth/**', 'symbol:isRefreshExpired'],\n    scenarios: [\n      { id: 'expired', description: 'expired token is denied', keywords: ['expired', 'deny'], failurePathKeywords: ['boundary', 'expiry'], expected: 'deny' }\n    ]\n  }\n];\n`, 'utf8');
  }
  const constitutionPath = path.join(rootDir, '.ts-quality', 'constitution.ts');
  if (!fs.existsSync(constitutionPath)) {
    fs.writeFileSync(constitutionPath, `export default [\n  { kind: 'risk', id: 'default-risk', paths: ['src/**'], message: 'Changed source must stay within risk budgets.', maxCrap: 30, minMutationScore: 0.8, minMergeConfidence: 70 },\n  { kind: 'approval', id: 'payments-review', paths: ['src/payments/**'], message: 'Payments changes require a maintainer approval.', minApprovals: 1, roles: ['maintainer'] }\n];\n`, 'utf8');
  }
  const agentsPath = path.join(rootDir, '.ts-quality', 'agents.ts');
  if (!fs.existsSync(agentsPath)) {
    fs.writeFileSync(agentsPath, `export default [\n  { id: 'maintainer', kind: 'human', roles: ['maintainer'], grants: [{ id: 'maintainer-merge', actions: ['merge', 'override', 'amend'], paths: ['src/**'], minMergeConfidence: 60 }] },\n  { id: 'release-bot', kind: 'automation', roles: ['ci'], grants: [{ id: 'release-bot-merge', actions: ['merge'], paths: ['src/**'], minMergeConfidence: 80, requireAttestations: ['ci.tests.passed'], requireHumanReview: true }] }\n];\n`, 'utf8');
  }
  for (const fileName of ['waivers.json', 'approvals.json', 'overrides.json']) {
    const filePath = path.join(rootDir, '.ts-quality', fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]\n', 'utf8');
    }
  }
  const keyBase = path.join(rootDir, '.ts-quality', 'keys', 'sample');
  if (!fs.existsSync(`${keyBase}.pem`) || !fs.existsSync(`${keyBase}.pub.pem`)) {
    const pair = generateKeyPair();
    fs.writeFileSync(`${keyBase}.pem`, pair.privateKeyPem, 'utf8');
    fs.writeFileSync(`${keyBase}.pub.pem`, pair.publicKeyPem, 'utf8');
  }
}

export function renderLatestReport(rootDir: string, format: 'markdown' | 'json'): string {
  const run = readLatestRun(rootDir);
  return format === 'json' ? `${stableStringify(run)}\n` : `${renderMarkdownReport(run)}\n`;
}

export function renderLatestExplain(rootDir: string): string {
  return `${renderExplainText(readLatestRun(rootDir))}\n`;
}

export function renderTrend(rootDir: string): string {
  const runIds = listRunIds(rootDir);
  if (runIds.length < 2) {
    return 'Not enough runs for trend analysis.\n';
  }
  const currentId = runIds[runIds.length - 1];
  const previousId = runIds[runIds.length - 2];
  if (!currentId || !previousId) {
    return 'Not enough runs for trend analysis.\n';
  }
  const current = loadRun(rootDir, currentId);
  const previous = loadRun(rootDir, previousId);
  const survivingCurrent = current.mutations.filter((item) => item.status === 'survived').length;
  const survivingPrevious = previous.mutations.filter((item) => item.status === 'survived').length;
  return [
    `Current run: ${current.runId}`,
    `Previous run: ${previous.runId}`,
    `Merge confidence delta: ${current.verdict.mergeConfidence - previous.verdict.mergeConfidence}`,
    `Surviving mutant delta: ${survivingCurrent - survivingPrevious}`,
    `Outcome transition: ${previous.verdict.outcome} -> ${current.verdict.outcome}`
  ].join('\n') + '\n';
}

export function renderGovernance(rootDir: string): string {
  const loaded = loadContext(rootDir);
  const run = readLatestRun(rootDir);
  const constitution = loadConstitution(rootDir, loaded.config.constitutionPath);
  const agents = loadAgents(rootDir, loaded.config.agentsPath);
  const plan = generateGovernancePlan(run, constitution, agents);
  return `${run.governance.map((item) => `${item.ruleId}: ${item.message}`).join('\n')}\n\n${plan.summary}\n`;
}

export function renderPlan(rootDir: string): string {
  const loaded = loadContext(rootDir);
  const run = readLatestRun(rootDir);
  const constitution = loadConstitution(rootDir, loaded.config.constitutionPath);
  const agents = loadAgents(rootDir, loaded.config.agentsPath);
  const plan = generateGovernancePlan(run, constitution, agents);
  return `${plan.summary}\n\n${plan.steps.map((step, index) => `${index + 1}. ${step.title}\n   ${step.rationale}\n   evidence: ${step.evidence.join('; ')}\n   tradeoffs: ${step.tradeoffs.join('; ')}`).join('\n')}\n`;
}

export function runAuthorize(rootDir: string, agentId: string, action: string): { decisionPath: string; output: string } {
  const loaded = loadContext(rootDir);
  const run = readLatestRun(rootDir);
  const agents = loadAgents(rootDir, loaded.config.agentsPath);
  const constitution = loadConstitution(rootDir, loaded.config.constitutionPath);
  const overrides = loadOverrides(rootDir, loaded.config.overridesPath);
  const { attestations } = loadVerifiedAttestations(rootDir, loaded.config.attestationsDir, loaded.config.trustedKeysDir);
  const runAttestations = attestations.filter((attestation) => attestationAppliesToRun(attestation, run.runId));
  const bundle = buildChangeBundle(rootDir, run, agentId, action);
  const decision = authorizeChange(agentId, action, bundle, run, agents, constitution, runAttestations, overrides);
  const artifactDir = path.join(rootDir, '.ts-quality', 'runs', run.runId);
  const bundlePath = path.join(artifactDir, `bundle.${agentId}.${action}.json`);
  const decisionPath = path.join(artifactDir, `authorize.${agentId}.${action}.json`);
  writeJson(bundlePath, bundle);
  writeJson(decisionPath, decision);
  return { decisionPath, output: `${stableStringify(decision)}\n` };
}

export function attestSign(rootDir: string, issuer: string, keyId: string, privateKeyPath: string, subjectFile: string, claims: string[], outputPath: string): string {
  const resolvedSubject = resolveCliPath(rootDir, subjectFile);
  const resolvedKey = resolveCliPath(rootDir, privateKeyPath);
  const subjectText = fs.readFileSync(resolvedSubject, 'utf8');
  const attestation = signAttestation({
    issuer,
    keyId,
    privateKeyPem: fs.readFileSync(resolvedKey, 'utf8'),
    subjectType: path.extname(resolvedSubject) === '.json' ? 'json-artifact' : 'file',
    subjectDigest: digestObject(subjectText),
    claims,
    payload: { subjectFile: recordSubjectPath(rootDir, resolvedSubject, subjectFile) }
  });
  const resolvedOutput = resolveCliPath(rootDir, outputPath);
  ensureDir(path.dirname(resolvedOutput));
  saveAttestation(resolvedOutput, attestation);
  return resolvedOutput;
}

export function attestVerify(rootDir: string, attestationFile: string, trustedKeysDir: string): string {
  const attestation = JSON.parse(fs.readFileSync(resolveCliPath(rootDir, attestationFile), 'utf8')) as Attestation;
  const keys = loadTrustedKeys(resolveCliPath(rootDir, trustedKeysDir));
  const result = verifyAttestationAtRoot(rootDir, attestation, keys);
  return `${attestation.issuer}: ${result.ok ? 'verified' : 'failed'} (${result.reason})\n`;
}

export function attestGenerateKey(outDir: string, keyId: string): string {
  ensureDir(outDir);
  const pair = generateKeyPair();
  const privatePath = path.join(outDir, `${keyId}.pem`);
  const publicPath = path.join(outDir, `${keyId}.pub.pem`);
  fs.writeFileSync(privatePath, pair.privateKeyPem, 'utf8');
  fs.writeFileSync(publicPath, pair.publicKeyPem, 'utf8');
  return `${privatePath}\n${publicPath}\n`;
}

export function runAmend(rootDir: string, proposalFile: string, apply = false): string {
  const loaded = loadContext(rootDir);
  const constitution = loadConstitution(rootDir, loaded.config.constitutionPath);
  const agents = loadAgents(rootDir, loaded.config.agentsPath);
  const proposal = JSON.parse(fs.readFileSync(resolveCliPath(rootDir, proposalFile), 'utf8')) as AmendmentProposal;
  const decision = evaluateAmendment(proposal, constitution, agents);
  const resultPath = path.join(rootDir, '.ts-quality', 'amendments', `${proposal.id}.result.json`);
  ensureDir(path.dirname(resultPath));
  writeJson(resultPath, decision);
  if (apply && decision.outcome === 'approved') {
    const nextConstitution = applyAmendment(proposal, constitution);
    writeModuleExport(path.join(rootDir, loaded.config.constitutionPath), nextConstitution);
  }
  return `${stableStringify(decision)}\n`;
}
