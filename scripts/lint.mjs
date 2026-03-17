import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const banned = [
  new RegExp(['TO', 'DO'].join(''), 'i'),
  new RegExp(['FIX', 'ME'].join(''), 'i'),
  new RegExp(['place', 'holderfunction'].join(''), 'i'),
  new RegExp(['place', 'holder', '\\b'].join(''), 'i'),
  new RegExp(['Not ', 'implemented'].join(''), 'i'),
  new RegExp(['N', 'YI'].join(''), 'i'),
  new RegExp(['fake ', 'success'].join(''), 'i')
];
const includeExt = /\.(ts|js|mjs|md|json)$/;
const excludeDirs = new Set(['dist', 'node_modules', '.git', 'examples/artifacts', 'verification', '.ts-quality/runs']);
const issues = [];

function visit(currentDir) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const absolute = path.join(currentDir, entry.name);
    const relative = path.relative(root, absolute).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (excludeDirs.has(relative) || excludeDirs.has(entry.name) || relative.includes('examples/artifacts') || relative.includes('/.ts-quality/runs')) {
        continue;
      }
      visit(absolute);
      continue;
    }
    if (relative === 'scripts/lint.mjs') {
      continue;
    }
    if (!includeExt.test(relative)) {
      continue;
    }
    const text = fs.readFileSync(absolute, 'utf8');
    for (const pattern of banned) {
      if (pattern.test(text)) {
        issues.push(`${relative}: matched ${pattern}`);
      }
    }
  }
}

visit(root);
if (issues.length > 0) {
  console.error(issues.join('\n'));
  process.exit(1);
}
console.log('lint: ok');
