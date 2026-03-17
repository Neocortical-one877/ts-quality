import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const build = spawnSync('tsc', ['-p', 'tsconfig.json'], { cwd: root, stdio: 'inherit' });
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}
const result = spawnSync('node', ['--test', 'test/*.test.mjs'], { cwd: root, stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
