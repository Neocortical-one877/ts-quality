import {
  type BehaviorClaim,
  type ComplexityEvidence,
  type GovernanceFinding,
  type MutationResult,
  type PolicyFinding,
  type TrendDelta,
  type RunArtifact,
  type Verdict,
  type Waiver,
  clamp,
  isFindingWaived,
  summarizeMutationScore
} from '../../evidence-model/src/index';

export interface PolicyConfig {
  maxChangedCrap: number;
  minMutationScore: number;
  minMergeConfidence: number;
}

export interface PolicyInput {
  nowIso: string;
  policy: PolicyConfig;
  changedComplexity: ComplexityEvidence[];
  mutations: MutationResult[];
  behaviorClaims: BehaviorClaim[];
  governance: GovernanceFinding[];
  waivers: Waiver[];
  previousRun?: Pick<RunArtifact, 'runId' | 'verdict' | 'mutations' | 'complexity'>;
}

export function defaultPolicy(): PolicyConfig {
  return {
    maxChangedCrap: 30,
    minMutationScore: 0.8,
    minMergeConfidence: 70
  };
}

function finding(id: string, code: string, level: PolicyFinding['level'], message: string, scope: string[], evidence: string[], ruleId?: string): PolicyFinding {
  const result: PolicyFinding = { id, code, level, message, scope, evidence };
  if (ruleId) {
    result.ruleId = ruleId;
  }
  return result;
}

export function evaluatePolicy(input: PolicyInput): { verdict: Verdict; trend?: TrendDelta } {
  let mergeConfidence = 100;
  const findings: PolicyFinding[] = [];
  const reasons: string[] = [];
  const warnings: string[] = [];
  const blockedBy: string[] = [];

  const maxChangedCrap = input.changedComplexity.reduce((max, item) => Math.max(max, item.crap), 0);
  const hotspot = input.changedComplexity.sort((left, right) => right.crap - left.crap)[0];
  if (maxChangedCrap > input.policy.maxChangedCrap) {
    const delta = Math.ceil((maxChangedCrap - input.policy.maxChangedCrap) * 1.2);
    mergeConfidence -= Math.min(delta, 25);
    findings.push(finding('policy:crap', 'changed-crap-budget', 'error', `Changed code exceeds CRAP budget ${input.policy.maxChangedCrap}`, hotspot ? [hotspot.filePath] : [], hotspot ? [`${hotspot.symbol} CRAP=${hotspot.crap}`] : []));
    reasons.push(`CRAP hotspot ${hotspot?.symbol ?? 'unknown'} is ${maxChangedCrap.toFixed(2)} in changed code.`);
  }

  const mutationSummary = summarizeMutationScore(input.mutations);
  if (mutationSummary.score < input.policy.minMutationScore) {
    const penalty = Math.ceil((input.policy.minMutationScore - mutationSummary.score) * 40);
    mergeConfidence -= penalty;
    findings.push(finding('policy:mutation-score', 'mutation-score-budget', 'error', `Mutation score ${mutationSummary.score.toFixed(2)} is below budget ${input.policy.minMutationScore.toFixed(2)}`, input.mutations.map((item) => item.filePath), [`Killed ${mutationSummary.killed}, survived ${mutationSummary.survived}`]));
    reasons.push(`Mutation score is ${Math.round(mutationSummary.score * 100)}/100 with ${mutationSummary.survived} surviving mutants.`);
  }

  const survivingMutants = input.mutations.filter((result) => result.status === 'survived');
  if (survivingMutants.length > 0) {
    mergeConfidence -= Math.min(12 * survivingMutants.length, 24);
    for (const mutant of survivingMutants) {
      findings.push(finding(`policy:surviving:${mutant.siteId}`, 'surviving-mutant', 'error', `Surviving mutant in ${mutant.filePath}`, [mutant.filePath], [mutant.details ?? mutant.siteId]));
    }
    reasons.push(`${survivingMutants.length} surviving mutant(s) remain in changed or covered logic.`);
  }

  const riskyClaims = input.behaviorClaims.filter((claim) => claim.status !== 'supported');
  if (riskyClaims.length > 0) {
    mergeConfidence -= Math.min(10 * riskyClaims.length, 20);
    for (const claim of riskyClaims) {
      findings.push(finding(`policy:invariant:${claim.invariantId}`, 'invariant-risk', claim.status === 'at-risk' ? 'error' : 'warn', `Invariant ${claim.invariantId} is ${claim.status}`, [claim.invariantId], [...claim.evidence, ...claim.obligations.map((item) => item.description)]));
    }
    reasons.push(`${riskyClaims.length} invariant(s) need stronger test evidence or failure-path coverage.`);
  }

  for (const governanceFinding of input.governance) {
    mergeConfidence -= governanceFinding.level === 'error' ? 20 : 8;
    findings.push(finding(`policy:governance:${governanceFinding.id}`, 'governance', governanceFinding.level, governanceFinding.message, governanceFinding.scope, governanceFinding.evidence, governanceFinding.ruleId));
    reasons.push(governanceFinding.message);
  }

  for (const item of findings) {
    const waiver = isFindingWaived(item, input.waivers, input.nowIso);
    if (waiver) {
      item.waived = true;
      item.waiverId = waiver.id;
      warnings.push(`Applied waiver ${waiver.id} to ${item.code}`);
      mergeConfidence += item.level === 'error' ? 10 : 4;
    }
  }

  mergeConfidence = clamp(Math.round(mergeConfidence), 0, 100);
  if (mergeConfidence < input.policy.minMergeConfidence) {
    blockedBy.push(`Merge confidence ${mergeConfidence} below minimum ${input.policy.minMergeConfidence}`);
  }
  for (const item of findings.filter((entry) => entry.level === 'error' && !entry.waived)) {
    blockedBy.push(item.message);
  }

  const bestNextAction = survivingMutants.length > 0
    ? `Add or tighten an assertion covering ${survivingMutants[0]?.filePath} around the surviving mutant.`
    : riskyClaims[0]?.obligations[0]?.description ?? (hotspot ? `Refactor or cover ${hotspot.symbol} in ${hotspot.filePath}.` : undefined);

  const outcome: Verdict['outcome'] = blockedBy.length > 0 ? 'fail' : warnings.length > 0 || mergeConfidence < 85 ? 'warn' : 'pass';
  const verdict: Verdict = {
    mergeConfidence,
    outcome,
    reasons,
    warnings,
    blockedBy,
    findings
  };
  if (bestNextAction) {
    verdict.bestNextAction = bestNextAction;
  }

  const result: { verdict: Verdict; trend?: TrendDelta } = { verdict };
  if (input.previousRun) {
    result.trend = {
      previousRunId: input.previousRun.runId,
      mergeConfidenceDelta: verdict.mergeConfidence - input.previousRun.verdict.mergeConfidence,
      survivingMutantDelta: survivingMutants.length - input.previousRun.mutations.filter((item) => item.status === 'survived').length,
      hotspotDelta: maxChangedCrap - input.previousRun.complexity.reduce((max, item) => Math.max(max, item.crap), 0)
    };
  }

  return result;
}

export function renderPrSummary(run: Pick<RunArtifact, 'changedFiles' | 'behaviorClaims' | 'mutations' | 'complexity' | 'verdict'>): string {
  const lines: string[] = [];
  const survivingMutants = run.mutations.filter((result) => result.status === 'survived').length;
  const changedHotspot = run.complexity.filter((item) => item.changed).sort((left, right) => right.crap - left.crap)[0];
  lines.push(`# ts-quality summary`);
  lines.push('');
  lines.push(`- Merge confidence: **${run.verdict.mergeConfidence}/100**`);
  lines.push(`- Outcome: **${run.verdict.outcome}**`);
  if (changedHotspot) {
    lines.push(`- Highest-risk changed hotspot: \
\`${changedHotspot.filePath}\` ${changedHotspot.symbol} with CRAP ${changedHotspot.crap}`);
  }
  lines.push(`- Surviving mutants: **${survivingMutants}**`);
  const riskyInvariant = run.behaviorClaims.find((claim) => claim.status !== 'supported');
  if (riskyInvariant) {
    lines.push(`- Invariant at risk: **${riskyInvariant.invariantId}**`);
  }
  if (run.verdict.bestNextAction) {
    lines.push(`- Best next action: ${run.verdict.bestNextAction}`);
  }
  if (run.verdict.blockedBy.length > 0) {
    lines.push('');
    lines.push('## Blocking findings');
    for (const reason of run.verdict.blockedBy) {
      lines.push(`- ${reason}`);
    }
  }
  return lines.join('\n');
}

export function renderExplainText(run: Pick<RunArtifact, 'runId' | 'changedFiles' | 'behaviorClaims' | 'governance' | 'verdict'>): string {
  const lines: string[] = [];
  lines.push(`Run ${run.runId}`);
  lines.push(`Changed files: ${run.changedFiles.join(', ') || 'none detected'}`);
  lines.push(`Merge confidence: ${run.verdict.mergeConfidence}/100 (${run.verdict.outcome})`);
  lines.push('');
  lines.push('Reasons:');
  for (const reason of run.verdict.reasons) {
    lines.push(`- ${reason}`);
  }
  if (run.behaviorClaims.length > 0) {
    lines.push('');
    lines.push('Invariant impact:');
    for (const claim of run.behaviorClaims) {
      lines.push(`- ${claim.invariantId}: ${claim.status}`);
      for (const evidence of claim.evidence) {
        lines.push(`  - ${evidence}`);
      }
      for (const obligation of claim.obligations) {
        lines.push(`  - obligation: ${obligation.description}`);
      }
    }
  }
  if (run.governance.length > 0) {
    lines.push('');
    lines.push('Governance findings:');
    for (const finding of run.governance) {
      lines.push(`- ${finding.ruleId}: ${finding.message}`);
      for (const evidence of finding.evidence) {
        lines.push(`  - ${evidence}`);
      }
    }
  }
  return lines.join('\n');
}

export function renderMarkdownReport(run: RunArtifact): string {
  const lines: string[] = [];
  lines.push('# ts-quality report');
  lines.push('');
  lines.push(`- Run: \`${run.runId}\``);
  lines.push(`- Merge confidence: **${run.verdict.mergeConfidence}/100**`);
  lines.push(`- Outcome: **${run.verdict.outcome}**`);
  lines.push(`- Changed files: ${run.changedFiles.join(', ') || 'none'}`);
  lines.push('');
  lines.push('## Findings');
  for (const item of run.verdict.findings) {
    lines.push(`- [${item.level}] ${item.message}`);
    for (const evidence of item.evidence) {
      lines.push(`  - ${evidence}`);
    }
    if (item.waived && item.waiverId) {
      lines.push(`  - waived by ${item.waiverId}`);
    }
  }
  lines.push('');
  lines.push('## Invariants');
  for (const claim of run.behaviorClaims) {
    lines.push(`- ${claim.invariantId}: ${claim.status}`);
    for (const obligation of claim.obligations) {
      lines.push(`  - obligation: ${obligation.description}`);
    }
  }
  lines.push('');
  lines.push('## Governance');
  for (const item of run.governance) {
    lines.push(`- [${item.level}] ${item.ruleId}: ${item.message}`);
  }
  return lines.join('\n');
}
