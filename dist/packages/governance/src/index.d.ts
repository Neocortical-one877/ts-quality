import { type Agent, type Approval, type ChangedRegion, type ConstitutionRule, type GovernanceFinding, type RunArtifact } from '../../evidence-model/src/index';
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
export declare function evaluateGovernance(options: GovernanceEvaluationOptions): GovernanceFinding[];
export declare function generateGovernancePlan(run: RunArtifact, constitution: ConstitutionRule[], agents: Agent[]): GovernancePlan;
