/*
  CommonJS version for ESM project
  - Reads llama.config.json
  - Starts the local server using the venv's python: python -m llama_cpp.server ...
*/

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VENV_DIR = path.join(ROOT, '.llama-venv');

function log(msg) { console.log(`[llama:start] ${msg}`); }
function fail(msg) { console.error(`[llama:start] ${msg}`); process.exit(1); }

function venvPythonPath() {
  return process.platform === 'win32'
    ? path.join(VENV_DIR, 'Scripts', 'python.exe')
    : path.join(VENV_DIR, 'bin', 'python');
}

function readConfig() {
  const cfgPath = path.join(ROOT, 'llama.config.json');
  if (!fs.existsSync(cfgPath)) {
    fail('llama.config.json not found. Run "npm run llama:setup" first, then set modelPath.');
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  if (!cfg.modelPath || !fs.existsSync(cfg.modelPath)) {
    fail('modelPath is missing or invalid in llama.config.json. Please set it to your .gguf file.');
  }
  cfg.host = cfg.host || '127.0.0.1';
  cfg.port = cfg.port || 8080;
  cfg.n_ctx = cfg.n_ctx || 4096;
  cfg.n_threads = cfg.n_threads || Math.max(2, require('os').cpus().length - 1);
  cfg.n_gpu_layers = cfg.n_gpu_layers || 0;
  return cfg;
}

(function main() {
  const pyPath = venvPythonPath();
  if (!fs.existsSync(pyPath)) {
    fail('Venv python not found. Run "npm run llama:setup" first.');
  }

  const cfg = readConfig();
  const args = [
    '-m', 'llama_cpp.server',
    '--model', cfg.modelPath,
    '--host', cfg.host,
    '--port', String(cfg.port),
    '--n_ctx', String(cfg.n_ctx),
    '--n_threads', String(cfg.n_threads)
  ];
  if (cfg.n_gpu_layers && Number(cfg.n_gpu_layers) > 0) {
    args.push('--n_gpu_layers', String(cfg.n_gpu_layers));
  }

  log(`Starting server at http://${cfg.host}:${cfg.port} ...`);
  const child = spawn(pyPath, args, { stdio: 'inherit' });

  child.on('exit', (code) => {
    log(`Server process exited with code ${code}`);
    process.exit(code || 0);
  });
})();
