#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("../../crap4ts/src/index");
const index_2 = require("./index");
function argument(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}
const rootDir = argument('--root') ?? process.cwd();
const lcovPath = argument('--lcov');
const changedFiles = (argument('--changed') ?? '').split(',').filter(Boolean);
const command = (argument('--test-command') ?? 'node,--test').split(',').filter(Boolean);
const coverage = lcovPath ? (0, index_1.parseLcov)(fs_1.default.readFileSync(path_1.default.resolve(rootDir, lcovPath), 'utf8')) : [];
const run = (0, index_2.runMutations)({
    repoRoot: rootDir,
    changedFiles,
    coverage,
    testCommand: command,
    coveredOnly: process.argv.includes('--covered-only'),
    manifestPath: path_1.default.join(rootDir, '.ts-quality', 'mutation-manifest.json')
});
process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
//# sourceMappingURL=cli.js.map