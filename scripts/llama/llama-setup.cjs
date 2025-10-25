/*
  Llama server setup helper for Windows/macOS/Linux
  - Creates a Python venv in .llama-venv
  - Installs llama-cpp-python (CPU). For NVIDIA CUDA, set LLAMA_CUBLAS=1 before running to install cuBLAS wheels.

  Usage:
    npm run llama:setup

  Optional env:
    LLAMA_CUBLAS=1   -> install CUDA/cuBLAS wheel (requires NVIDIA GPU and compatible drivers)
*/

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VENV_DIR = path.join(ROOT, '.llama-venv');

function log(msg) { console.log(`[llama:setup] ${msg}`); }
function fail(msg) { console.error(`[llama:setup] ${msg}`); process.exit(1); }

function which(cmd) {
  const isWin = process.platform === 'win32';
  const ext = isWin ? ['.exe', '.cmd', '.bat', ''] : [''];
  const paths = (process.env.PATH || '').split(path.delimiter);
  for (const p of paths) {
    for (const e of ext) {
      const full = path.join(p, cmd + e);
      if (fs.existsSync(full)) return full;
    }
  }
  return null;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.status !== 0) {
    fail(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

function findPythonLauncher() {
  // Prefer Windows py launcher if present
  const py = which('py');
  if (py) {
    // Ensure Python3 is available
    const check = spawnSync(py, ['-3', '-V']);
    if (check.status === 0) return { cmd: py, args: ['-3'] };
  }
  // Fallback to python3 or python
  const py3 = which('python3');
  if (py3) return { cmd: py3, args: [] };
  const py2 = which('python');
  if (py2) return { cmd: py2, args: [] };
  fail('Python not found. Please install Python 3.8+ and ensure it is on your PATH.');
}

function makeVenv(python) {
  if (fs.existsSync(VENV_DIR)) {
    log('Virtual environment already exists. Skipping creation.');
    return;
  }
  log('Creating virtual environment (.llama-venv)...');
  run(python.cmd, [...python.args, '-m', 'venv', VENV_DIR]);
}

function venvPythonPath() {
  return process.platform === 'win32'
    ? path.join(VENV_DIR, 'Scripts', 'python.exe')
    : path.join(VENV_DIR, 'bin', 'python');
}

function installLlamaCppPython(pyPath) {
  log('Upgrading pip...');
  run(pyPath, ['-m', 'pip', 'install', '--upgrade', 'pip', 'wheel', 'setuptools']);

  const useCuBLAS = process.env.LLAMA_CUBLAS === '1';
  if (useCuBLAS) {
    log('Installing llama-cpp-python (cuBLAS wheel) ...');
    run(pyPath, ['-m', 'pip', 'install', '--extra-index-url', 'https://jllllll.github.io/llama-cpp-python-cuBLAS-wheels/', 'llama-cpp-python']);
  } else {
    log('Installing llama-cpp-python (CPU) ...');
    run(pyPath, ['-m', 'pip', 'install', 'llama-cpp-python']);
  }
}

function ensureConfig() {
  const cfgPath = path.join(ROOT, 'llama.config.json');
  if (fs.existsSync(cfgPath)) {
    log('llama.config.json already exists.');
    return;
  }
  const defaultCfg = {
    modelPath: "", // Set path to your .gguf file here
    host: "127.0.0.1",
    port: 8080,
    n_ctx: 4096,
    n_threads: Math.max(2, require('os').cpus().length - 1),
    n_gpu_layers: 0
  };
  fs.writeFileSync(cfgPath, JSON.stringify(defaultCfg, null, 2));
  log('Created llama.config.json. Please edit modelPath to point to your GGUF file.');
}

(function main() {
  log('Starting setup...');
  const py = findPythonLauncher();
  makeVenv(py);
  const pyPath = venvPythonPath();
  if (!fs.existsSync(pyPath)) fail('Virtual environment python not found.');
  installLlamaCppPython(pyPath);
  ensureConfig();
  log('Setup complete. Next: edit llama.config.json (set modelPath), then run: npm run dev:llama');
})();
