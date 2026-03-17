import { type ChangedRegion, type ComplexityEvidence, type CoverageEvidence, type LineSpan } from '../../evidence-model/src/index';
export interface CrapOptions {
    rootDir: string;
    sourceFiles?: string[];
    coverage?: CoverageEvidence[];
    changedFiles?: string[];
    changedRegions?: ChangedRegion[];
}
export interface CrapAnalysis {
    files: Array<{
        filePath: string;
        functions: ComplexityEvidence[];
        averageCrap: number;
        maxCrap: number;
    }>;
    hotspots: ComplexityEvidence[];
    summary: {
        fileCount: number;
        functionCount: number;
        averageCrap: number;
        maxCrap: number;
    };
}
export declare function parseLcov(lcovText: string): CoverageEvidence[];
export declare function lineCoverage(lineMap: Record<string, number>, span: LineSpan, sourceText: string): number;
export declare function crapScore(complexity: number, coveragePct: number): number;
export declare function analyzeSource(filePath: string, sourceText: string, coverage: CoverageEvidence[], changed: Set<string>, changedRegions: ChangedRegion[]): ComplexityEvidence[];
export declare function analyzeCrap(options: CrapOptions): CrapAnalysis;
export declare function formatCrapText(report: CrapAnalysis): string;
