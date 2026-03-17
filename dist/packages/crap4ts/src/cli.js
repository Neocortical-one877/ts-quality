#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("./index");
function argument(name) {
    const index = process.argv.indexOf(name);
    if (index >= 0) {
        return process.argv[index + 1];
    }
    return undefined;
}
const rootDir = argument('--root') ?? process.cwd();
const lcovPath = argument('--lcov');
const outputJson = process.argv.includes('--json');
const changedFiles = (argument('--changed') ?? '').split(',').filter(Boolean);
const coverage = lcovPath ? (0, index_1.parseLcov)(fs_1.default.readFileSync(path_1.default.resolve(rootDir, lcovPath), 'utf8')) : [];
const report = (0, index_1.analyzeCrap)({ rootDir, coverage, changedFiles });
if (outputJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
else {
    process.stdout.write(`${(0, index_1.formatCrapText)(report)}\n`);
}
//# sourceMappingURL=cli.js.map