const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let envLoaded = false;

const loadEnv = ({ cwd = process.cwd(), files = ['.env', '.env.local'] } = {}) => {
  if (envLoaded) {
    return;
  }

  const targets = Array.isArray(files) ? files : [files];

  targets.forEach((file) => {
    const envPath = path.resolve(cwd, file);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
  });

  envLoaded = true;
};

module.exports = { loadEnv };
