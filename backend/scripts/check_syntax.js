const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const backendRoot = path.resolve(__dirname, '..');
const roots = ['src', 'packages/shared/src', 'scripts', 'tests'];

const collectJavaScript = (target, files = []) => {
  const absolute = path.join(backendRoot, target);
  if (!fs.existsSync(absolute)) {
    return files;
  }

  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    if (absolute.endsWith('.js') && absolute !== __filename) {
      files.push(absolute);
    }
    return files;
  }

  fs.readdirSync(absolute, { withFileTypes: true }).forEach((entry) => {
    collectJavaScript(path.join(target, entry.name), files);
  });
  return files;
};

const files = roots.flatMap((root) => collectJavaScript(root));
const failures = [];

files.forEach((file) => {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    failures.push({
      file: path.relative(backendRoot, file),
      error: result.stderr.trim()
    });
  }
});

if (failures.length > 0) {
  failures.forEach(({ file, error }) => {
    console.error(`Syntax check failed: ${file}`);
    console.error(error);
  });
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
