import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const verificationDir = path.join(root, 'verification');
fs.mkdirSync(verificationDir, { recursive: true });
const logPath = path.join(verificationDir, 'verification.log');
const lines = [];

function run(command, args) {
  lines.push(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  lines.push(result.stdout || '');
  lines.push(result.stderr || '');
  lines.push(`exit=${result.status}`);
  fs.writeFileSync(logPath, lines.join('\n'), 'utf8');
  if (result.status !== 0) {
    throw new Error(`Verification step failed: ${command} ${args.join(' ')}`);
  }
}

run('npm', ['install', '--ignore-scripts']);
run('npm', ['run', 'build', '--silent']);
run('npm', ['run', 'typecheck', '--silent']);
run('npm', ['run', 'lint', '--silent']);
run('npm', ['test', '--silent']);
run('npm', ['run', 'sample-artifacts', '--silent']);
run('npm', ['run', 'smoke', '--silent']);

const verificationMd = [
  '---',
  'summary: "Latest repo verification record produced by scripts/verify.mjs."',
  'read_when:',
  '  - "When checking which repo validation commands most recently passed"',
  '  - "When reviewing the generated verification artifact format"',
  'type: "reference"',
  '---',
  '',
  '# Verification',
  '',
  'The following commands were executed successfully:',
  '',
  '- `npm install --ignore-scripts`',
  '- `npm run build --silent`',
  '- `npm run typecheck --silent`',
  '- `npm run lint --silent`',
  '- `npm test --silent`',
  '- `npm run sample-artifacts --silent`',
  '- `npm run smoke --silent`',
  '',
  `Log: \`${path.relative(root, logPath).replace(/\\/g, '/')}\``
].join('\n');
fs.writeFileSync(path.join(root, 'VERIFICATION.md'), `${verificationMd}\n`, 'utf8');
console.log('verify: ok');
