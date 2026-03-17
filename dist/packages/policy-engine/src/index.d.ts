import { type BehaviorClaim, type ComplexityEvidence, type GovernanceFinding, type MutationResult, type TrendDelta, type RunArtifact, type Verdict, type Waiver } from '../../evidence-model/src/index';
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
export declare function defaultPolicy(): PolicyConfig;
export declare function evaluatePolicy(input: PolicyInput): {
    verdict: Verdict;
    trend?: TrendDelta;
};
export declare function renderPrSummary(run: Pick<RunArtifact, 'changedFiles' | 'behaviorClaims' | 'mutations' | 'complexity' | 'verdict'>): string;
export declare function renderExplainText(run: Pick<RunArtifact, 'runId' | 'changedFiles' | 'behaviorClaims' | 'governance' | 'verdict'>): string;
export declare function renderMarkdownReport(run: RunArtifact): string;
