#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const index_1 = require("../../evidence-model/src/index");
const index_2 = require("./index");
function args() {
    return process.argv.slice(2);
}
const OPTION_KINDS = new Map([
    ['--root', 'value'],
    ['--changed', 'value'],
    ['--run-id', 'value'],
    ['--config', 'value'],
    ['--out-dir', 'value'],
    ['--agent', 'value'],
    ['--action', 'value'],
    ['--issuer', 'value'],
    ['--key-id', 'value'],
    ['--private-key', 'value'],
    ['--subject', 'value'],
    ['--out', 'value'],
    ['--claims', 'value'],
    ['--attestation', 'value'],
    ['--trusted-keys', 'value'],
    ['--proposal', 'value'],
    ['--json', 'flag'],
    ['--help', 'flag'],
    ['--apply', 'flag']
]);
const COMMAND_CONTRACTS = new Map([
    ['init', { allowedValues: ['--root'], allowedFlags: [], maxPositionals: 1 }],
    ['materialize', { allowedValues: ['--root', '--config', '--out-dir'], allowedFlags: [], maxPositionals: 1 }],
    ['check', { allowedValues: ['--root', '--config', '--changed', '--run-id'], allowedFlags: [], maxPositionals: 1 }],
    ['explain', { allowedValues: ['--root'], allowedFlags: [], maxPositionals: 1 }],
    ['report', { allowedValues: ['--root'], allowedFlags: ['--json'], maxPositionals: 1 }],
    ['trend', { allowedValues: ['--root'], allowedFlags: [], maxPositionals: 1 }],
    ['plan', { allowedValues: ['--root', '--config'], allowedFlags: [], maxPositionals: 1 }],
    ['govern', { allowedValues: ['--root', '--config'], allowedFlags: [], maxPositionals: 1 }],
    ['authorize', { allowedValues: ['--root', '--config', '--agent', '--action'], allowedFlags: [], maxPositionals: 1 }],
    ['attest sign', { allowedValues: ['--root', '--issuer', '--key-id', '--private-key', '--subject', '--out', '--claims'], allowedFlags: [], maxPositionals: 2 }],
    ['attest verify', { allowedValues: ['--root', '--attestation', '--trusted-keys'], allowedFlags: ['--json'], maxPositionals: 2 }],
    ['attest keygen', { allowedValues: ['--root', '--out-dir', '--key-id'], allowedFlags: [], maxPositionals: 2 }],
    ['amend', { allowedValues: ['--root', '--proposal', '--config'], allowedFlags: ['--apply'], maxPositionals: 1 }]
]);
function parseArgs(argv) {
    const positionals = [];
    const values = new Map();
    const flags = new Set();
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === undefined) {
            break;
        }
        if (token === '--') {
            positionals.push(...argv.slice(index + 1));
            break;
        }
        if (!token.startsWith('--')) {
            positionals.push(token);
            continue;
        }
        const equalsIndex = token.indexOf('=');
        const name = equalsIndex >= 0 ? token.slice(0, equalsIndex) : token;
        const optionKind = OPTION_KINDS.get(name);
        if (!optionKind) {
            throw new Error(`unknown option ${name}`);
        }
        if (equalsIndex >= 0) {
            if (optionKind === 'flag') {
                throw new Error(`${name} does not take a value`);
            }
            values.set(name, token.slice(equalsIndex + 1));
            continue;
        }
        if (optionKind === 'flag') {
            flags.add(name);
            continue;
        }
        const value = argv[index + 1];
        if (value === undefined || value.startsWith('--')) {
            continue;
        }
        values.set(name, value);
        index += 1;
    }
    return { positionals, values, flags };
}
function commandContractKey(command, subcommand) {
    if (!command) {
        return undefined;
    }
    if (command === 'attest') {
        return subcommand ? `${command} ${subcommand}` : command;
    }
    return command;
}
function commandLabel(command, subcommand) {
    if (!command) {
        return 'ts-quality';
    }
    return command === 'attest' && subcommand ? `${command} ${subcommand}` : command;
}
function validateParsedArgs(parsed) {
    const [command, subcommand] = parsed.positionals;
    if (!command || command === 'help' || command === '--help') {
        return;
    }
    if (parsed.flags.has('--help') || subcommand === 'help') {
        return;
    }
    const contract = COMMAND_CONTRACTS.get(commandContractKey(command, subcommand) ?? '');
    if (!contract) {
        return;
    }
    if (parsed.positionals.length > contract.maxPositionals) {
        throw new Error(`unexpected positional arguments for ${commandLabel(command, subcommand)}`);
    }
    const allowedValues = new Set(contract.allowedValues);
    for (const name of parsed.values.keys()) {
        if (!allowedValues.has(name)) {
            throw new Error(`unexpected option ${name} for ${commandLabel(command, subcommand)}`);
        }
    }
    const allowedFlags = new Set(contract.allowedFlags);
    for (const name of parsed.flags) {
        if (!allowedFlags.has(name)) {
            throw new Error(`unexpected option ${name} for ${commandLabel(command, subcommand)}`);
        }
    }
}
function takeOption(parsed, name) {
    return parsed.values.get(name);
}
function hasFlag(parsed, name) {
    return parsed.flags.has(name);
}
function rootDir(parsed) {
    return path_1.default.resolve(takeOption(parsed, '--root') ?? process.cwd());
}
function changedFiles(parsed) {
    const value = takeOption(parsed, '--changed');
    return value ? value.split(',').filter(Boolean) : undefined;
}
function runId(parsed) {
    return takeOption(parsed, '--run-id');
}
function configPath(parsed) {
    return takeOption(parsed, '--config');
}
function outDir(parsed) {
    return takeOption(parsed, '--out-dir');
}
function usage(command, subcommand) {
    if (!command) {
        return `ts-quality commands:\n- init\n- materialize [--out-dir <dir>]\n- check\n- explain\n- report [--json]\n- trend\n- plan\n- govern\n- authorize --agent <id> [--action merge]\n- attest sign|verify|keygen\n- amend --proposal <file> [--apply]\n`;
    }
    if (command === 'materialize') {
        return 'Usage: ts-quality materialize [--root <dir>] [--config <file>] [--out-dir <dir>]\n';
    }
    if (command === 'check') {
        return 'Usage: ts-quality check [--root <dir>] [--config <file>] [--changed <a,b,c>] [--run-id <id>]\n';
    }
    if (command === 'authorize') {
        return 'Usage: ts-quality authorize --agent <id> [--action merge] [--root <dir>] [--config <file>]\n';
    }
    if (command === 'attest' && subcommand === 'sign') {
        return 'Usage: ts-quality attest sign --issuer <id> --key-id <id> --private-key <file> --subject <file> --out <file> [--claims <a,b>] [--root <dir>]\n';
    }
    if (command === 'attest' && subcommand === 'verify') {
        return 'Usage: ts-quality attest verify --attestation <file> [--trusted-keys <dir>] [--json] [--root <dir>]\n';
    }
    if (command === 'attest' && subcommand === 'keygen') {
        return 'Usage: ts-quality attest keygen [--out-dir <dir>] [--key-id <id>] [--root <dir>]\n';
    }
    if (command === 'amend') {
        return 'Usage: ts-quality amend --proposal <file> [--apply] [--root <dir>] [--config <file>]\n';
    }
    return `Usage: ts-quality ${command} [--root <dir>]\n`;
}
function main() {
    const parsed = parseArgs(args());
    const [command, subcommand] = parsed.positionals;
    if (!command || command === 'help' || command === '--help') {
        process.stdout.write(usage());
        return;
    }
    if (hasFlag(parsed, '--help') || subcommand === 'help') {
        process.stdout.write(usage(command, subcommand === 'help' ? undefined : subcommand));
        return;
    }
    validateParsedArgs(parsed);
    const cwd = rootDir(parsed);
    if (command === 'init') {
        (0, index_2.initProject)(cwd);
        process.stdout.write(`Initialized ts-quality in ${cwd}\n`);
        return;
    }
    if (command === 'materialize') {
        const explicitConfigPath = configPath(parsed);
        const requestedOutDir = outDir(parsed);
        const materializeOptions = {};
        if (explicitConfigPath) {
            materializeOptions.configPath = explicitConfigPath;
        }
        if (requestedOutDir) {
            materializeOptions.outDir = requestedOutDir;
        }
        const result = (0, index_2.materializeProject)(cwd, materializeOptions);
        process.stdout.write(`Materialized runtime config: ${result.configPath}\nOutput dir: ${result.outDir}\nFiles:\n- ${result.files.join('\n- ')}\n`);
        return;
    }
    if (command === 'check') {
        const changed = changedFiles(parsed);
        const explicitConfigPath = configPath(parsed);
        const checkOptions = {};
        if (changed) {
            checkOptions.changedFiles = changed;
        }
        const requestedRunId = runId(parsed);
        if (requestedRunId) {
            checkOptions.runId = requestedRunId;
        }
        if (explicitConfigPath) {
            checkOptions.configPath = explicitConfigPath;
        }
        const result = (0, index_2.runCheck)(cwd, checkOptions);
        process.stdout.write(`Merge confidence: ${result.run.verdict.mergeConfidence}/100\nOutcome: ${result.run.verdict.outcome}\nArtifacts: ${result.artifactDir}\n`);
        return;
    }
    if (command === 'explain') {
        process.stdout.write((0, index_2.renderLatestExplain)(cwd));
        return;
    }
    if (command === 'report') {
        process.stdout.write((0, index_2.renderLatestReport)(cwd, hasFlag(parsed, '--json') ? 'json' : 'markdown'));
        return;
    }
    if (command === 'trend') {
        process.stdout.write((0, index_2.renderTrend)(cwd));
        return;
    }
    if (command === 'plan') {
        const explicitConfigPath = configPath(parsed);
        process.stdout.write((0, index_2.renderPlan)(cwd, explicitConfigPath ? { configPath: explicitConfigPath } : undefined));
        return;
    }
    if (command === 'govern') {
        const explicitConfigPath = configPath(parsed);
        process.stdout.write((0, index_2.renderGovernance)(cwd, explicitConfigPath ? { configPath: explicitConfigPath } : undefined));
        return;
    }
    if (command === 'authorize') {
        const agentId = takeOption(parsed, '--agent');
        if (!agentId) {
            throw new Error('authorize requires --agent <id>');
        }
        const action = takeOption(parsed, '--action') ?? 'merge';
        const explicitConfigPath = configPath(parsed);
        const result = (0, index_2.runAuthorize)(cwd, agentId, action, explicitConfigPath ? { configPath: explicitConfigPath } : undefined);
        process.stdout.write(result.output);
        return;
    }
    if (command === 'attest') {
        if (subcommand === 'sign') {
            const issuer = takeOption(parsed, '--issuer');
            const keyId = takeOption(parsed, '--key-id');
            const privateKey = takeOption(parsed, '--private-key');
            const subject = takeOption(parsed, '--subject');
            const output = takeOption(parsed, '--out');
            const claims = (takeOption(parsed, '--claims') ?? '').split(',').filter(Boolean);
            if (issuer === undefined || !keyId || !privateKey || !subject || !output) {
                throw new Error('attest sign requires --issuer --key-id --private-key --subject --out');
            }
            process.stdout.write(`${(0, index_2.attestSign)(cwd, issuer, keyId, privateKey, subject, claims, output)}\n`);
            return;
        }
        if (subcommand === 'verify') {
            const attestation = takeOption(parsed, '--attestation');
            const trusted = takeOption(parsed, '--trusted-keys') ?? '.ts-quality/keys';
            if (!attestation) {
                throw new Error('attest verify requires --attestation <file>');
            }
            process.stdout.write((0, index_2.attestVerify)(cwd, attestation, trusted, hasFlag(parsed, '--json') ? 'json' : 'text'));
            return;
        }
        if (subcommand === 'keygen') {
            const out = path_1.default.resolve(cwd, takeOption(parsed, '--out-dir') ?? path_1.default.join('.ts-quality', 'keys'));
            const keyId = takeOption(parsed, '--key-id') ?? 'generated';
            process.stdout.write((0, index_2.attestGenerateKey)(out, keyId));
            return;
        }
        throw new Error('attest requires subcommand sign|verify|keygen');
    }
    if (command === 'amend') {
        const proposal = takeOption(parsed, '--proposal');
        if (!proposal) {
            throw new Error('amend requires --proposal <file>');
        }
        const explicitConfigPath = configPath(parsed);
        process.stdout.write((0, index_2.runAmend)(cwd, proposal, hasFlag(parsed, '--apply'), explicitConfigPath ? { configPath: explicitConfigPath } : undefined));
        return;
    }
    throw new Error(`Unknown command ${command}`);
}
try {
    main();
}
catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${(0, index_1.renderSafeText)(message)}\n`);
    process.exitCode = 1;
}
//# sourceMappingURL=cli.js.map