import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import {
  type Agent,
  type Approval,
  type ApprovalRule,
  type ChangedRegion,
  type ConstitutionRule,
  type GovernanceFinding,
  type RiskBudgetRule,
  type RollbackRule,
  type RunArtifact,
  matchPattern,
  matchesAny,
  normalizePath,
  summarizeMutationScore
} from '../../evidence-model/src/index';

export interface GovernanceEvaluationOptions {
  rootDir: string;
  constitution: ConstitutionRule[];
  changedFiles: string[];
  changedRegions: ChangedRegion[];
  approvals?: Approval[];
  attestationsClaims?: string[];
  run?: Pick<RunArtifact, 'complexity' | 'mutations' | 'verdict'>;
  runId?: string;
}

export interface GovernancePlan {
  summary: string;
  steps: Array<{
    type: 'test' | 'approval' | 'rollback' | 'boundary' | 'risk';
    title: string;
    rationale: string;
    evidence: string[];
    tradeoffs: string[];
  }>;
}

function importsForFile(filePath: string, sourceText: string): string[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const imports: string[] = [];
  function visit(node: any): void {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier?.text;
      if (typeof specifier === 'string') {
        imports.push(specifier);
      }
    }
    if (ts.isCallExpression(node) && node.expression?.getText(sourceFile) === 'require' && node.arguments.length === 1) {
      const argument = node.arguments[0];
      if (ts.isStringLiteral(argument)) {
        imports.push(argument.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return imports;
}

function resolveImport(importerPath: string, specifier: string, rootDir: string): string | undefined {
  if (!specifier.startsWith('.')) {
    return undefined;
  }
  const importerDir = path.dirname(importerPath);
  const base = path.resolve(rootDir, importerDir, specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
    path.join(base, 'index.mjs'),
    path.join(base, 'index.cjs')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return normalizePath(path.relative(rootDir, candidate));
    }
  }
  return normalizePath(path.relative(rootDir, base));
}

function evaluateBoundaryRule(rootDir: string, rule: ConstitutionRule, changedFiles: string[]): GovernanceFinding[] {
  if (rule.kind !== 'boundary') {
    return [];
  }
  const findings: GovernanceFinding[] = [];
  for (const filePath of changedFiles) {
    if (!matchesAny(rule.from, filePath)) {
      continue;
    }
    const absolutePath = path.join(rootDir, filePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }
    const imports = importsForFile(filePath, fs.readFileSync(absolutePath, 'utf8'));
    for (const specifier of imports) {
      const resolved = resolveImport(filePath, specifier, rootDir);
      if (resolved && matchesAny(rule.to, resolved)) {
        findings.push({
          id: `${rule.id}:${filePath}:${resolved}`,
          ruleId: rule.id,
          level: rule.severity ?? 'error',
          message: rule.message,
          evidence: [`${filePath} imports ${specifier} -> ${resolved}`],
          scope: [filePath, resolved]
        });
      }
    }
  }
  return findings;
}

function evaluateRiskRule(rule: RiskBudgetRule, options: GovernanceEvaluationOptions): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const files = options.changedFiles.filter((filePath) => matchesAny(rule.paths, filePath));
  if (files.length === 0 || !options.run) {
    return findings;
  }
  const changedComplexity = options.run.complexity.filter((item) => files.includes(item.filePath) && item.changed);
  const maxCrap = changedComplexity.reduce((max, item) => Math.max(max, item.crap), 0);
  const mutationScore = summarizeMutationScore(options.run.mutations.filter((item) => files.includes(item.filePath))).score;
  if (typeof rule.maxCrap === 'number' && maxCrap > rule.maxCrap) {
    findings.push({
      id: `${rule.id}:crap`,
      ruleId: rule.id,
      level: rule.severity ?? 'error',
      message: rule.message,
      evidence: [`Max changed CRAP ${maxCrap} exceeded budget ${rule.maxCrap}`],
      scope: files
    });
  }
  if (typeof rule.minMutationScore === 'number' && mutationScore < rule.minMutationScore) {
    findings.push({
      id: `${rule.id}:mutation`,
      ruleId: rule.id,
      level: rule.severity ?? 'error',
      message: rule.message,
      evidence: [`Mutation score ${mutationScore.toFixed(2)} below budget ${rule.minMutationScore.toFixed(2)}`],
      scope: files
    });
  }
  if (typeof rule.minMergeConfidence === 'number' && options.run.verdict.mergeConfidence < rule.minMergeConfidence) {
    findings.push({
      id: `${rule.id}:confidence`,
      ruleId: rule.id,
      level: rule.severity ?? 'error',
      message: rule.message,
      evidence: [`Merge confidence ${options.run.verdict.mergeConfidence} below minimum ${rule.minMergeConfidence}`],
      scope: files
    });
  }
  return findings;
}

function evaluateApprovalRule(rule: ApprovalRule, options: GovernanceEvaluationOptions): GovernanceFinding[] {
  const files = options.changedFiles.filter((filePath) => matchesAny(rule.paths, filePath));
  if (files.length === 0) {
    return [];
  }
  const runId = options.runId;
  const approvals = options.approvals ?? [];
  const accepted = new Map<string, Approval>();
  for (const approval of approvals) {
    const roleMatches = rule.roles.length === 0 || rule.roles.includes(approval.role ?? '');
    const targetMatches = approval.targetId === rule.id || (runId ? approval.targetId === runId || approval.targetId === `${runId}:${rule.id}` : false);
    if (!roleMatches || !targetMatches || accepted.has(approval.by)) {
      continue;
    }
    accepted.set(approval.by, approval);
  }
  if (accepted.size >= rule.minApprovals) {
    return [];
  }
  return [{
    id: `${rule.id}:approval`,
    ruleId: rule.id,
    level: rule.severity ?? 'error',
    message: rule.message,
    evidence: [`Approvals present ${accepted.size}/${rule.minApprovals}; roles required: ${rule.roles.join(', ') || 'any'}; target must match ${rule.id}${runId ? ` or ${runId}` : ''}`],
    scope: files
  }];
}

function evaluateRollbackRule(rule: RollbackRule, options: GovernanceEvaluationOptions): GovernanceFinding[] {
  const files = options.changedFiles.filter((filePath) => matchesAny(rule.paths, filePath));
  if (files.length === 0) {
    return [];
  }
  const claims = new Set(options.attestationsClaims ?? []);
  const missing = rule.requireEvidence.filter((claim) => !claims.has(claim));
  if (missing.length === 0) {
    return [];
  }
  return [{
    id: `${rule.id}:rollback`,
    ruleId: rule.id,
    level: rule.severity ?? 'error',
    message: rule.message,
    evidence: [`Missing required evidence claims: ${missing.join(', ')}`],
    scope: files
  }];
}

export function evaluateGovernance(options: GovernanceEvaluationOptions): GovernanceFinding[] {
  const changedFiles = options.changedFiles.map((item) => normalizePath(item));
  const findings: GovernanceFinding[] = [];
  for (const rule of options.constitution) {
    if (rule.kind === 'boundary') {
      findings.push(...evaluateBoundaryRule(options.rootDir, rule, changedFiles));
    }
    if (rule.kind === 'risk') {
      findings.push(...evaluateRiskRule(rule, { ...options, changedFiles }));
    }
    if (rule.kind === 'approval') {
      findings.push(...evaluateApprovalRule(rule, { ...options, changedFiles }));
    }
    if (rule.kind === 'rollback') {
      findings.push(...evaluateRollbackRule(rule, { ...options, changedFiles }));
    }
  }
  return findings;
}

export function generateGovernancePlan(run: RunArtifact, constitution: ConstitutionRule[], agents: Agent[]): GovernancePlan {
  const steps: GovernancePlan['steps'] = [];
  const approvalsRequired = constitution.filter((rule) => rule.kind === 'approval' && run.changedFiles.some((filePath) => matchesAny(rule.paths, filePath))) as ApprovalRule[];
  const rollbackRules = constitution.filter((rule) => rule.kind === 'rollback' && run.changedFiles.some((filePath) => matchesAny(rule.paths, filePath))) as RollbackRule[];
  const riskRules = constitution.filter((rule) => rule.kind === 'risk' && run.changedFiles.some((filePath) => matchesAny(rule.paths, filePath))) as RiskBudgetRule[];

  const survivingMutants = run.mutations.filter((result) => result.status === 'survived');
  if (survivingMutants.length > 0) {
    steps.push({
      type: 'test',
      title: 'Tighten tests around surviving mutants',
      rationale: 'Surviving mutants show behavior that current tests do not constrain.',
      evidence: survivingMutants.map((result) => `${result.filePath}:${result.siteId}`),
      tradeoffs: ['Improves merge confidence', 'May increase test runtime slightly']
    });
  }

  for (const rule of approvalsRequired) {
    const approvers = agents.filter((agent) => agent.kind === 'human' && agent.roles.some((role) => rule.roles.includes(role))).map((agent) => agent.id);
    steps.push({
      type: 'approval',
      title: `Obtain ${rule.minApprovals} approval(s) for ${rule.id}`,
      rationale: rule.message,
      evidence: [`Eligible approvers: ${approvers.join(', ') || 'none configured'}`],
      tradeoffs: ['Slows merge velocity', 'Protects high-sensitivity domains']
    });
  }

  for (const rule of rollbackRules) {
    steps.push({
      type: 'rollback',
      title: `Attach rollback evidence for ${rule.id}`,
      rationale: rule.message,
      evidence: rule.requireEvidence,
      tradeoffs: ['Adds CI or operational work', 'Preserves safe rollback authority']
    });
  }

  for (const rule of riskRules) {
    steps.push({
      type: 'risk',
      title: `Reduce risk budget pressure for ${rule.id}`,
      rationale: rule.message,
      evidence: [
        `Current merge confidence: ${run.verdict.mergeConfidence}`,
        `Current outcome: ${run.verdict.outcome}`
      ],
      tradeoffs: ['May require refactoring or more tests', 'Reduces policy exceptions later']
    });
  }

  const boundaryFindings = run.governance.filter((finding) => constitution.some((rule) => rule.kind === 'boundary' && rule.id === finding.ruleId));
  if (boundaryFindings.length > 0) {
    steps.push({
      type: 'boundary',
      title: 'Remove or isolate forbidden boundary crossings',
      rationale: 'Architectural drift weakens constitutional guarantees over time.',
      evidence: boundaryFindings.flatMap((finding) => finding.evidence),
      tradeoffs: ['May require adapter layers', 'Prevents hidden coupling growth']
    });
  }

  return {
    summary: `Generated ${steps.length} governance step(s) from ${run.governance.length} finding(s) and ${run.mutations.length} mutation result(s).`,
    steps
  };
}
