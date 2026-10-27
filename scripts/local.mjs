// Levanta la API en local con la arquitectura del host, así Docker no emula.
// Los argumentos extra son overrides de parámetros de la plantilla:
//   npm run local -- ForecastBaseUrl=http://10.255.255.1
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const architecture = process.arch === 'arm64' ? 'arm64' : 'x86_64';
const overrides = ['--parameter-overrides', [`Architecture=${architecture}`, ...process.argv.slice(2)].join(' ')];

const steps = [
  ['npm', ['run', 'build']],
  ['sam', ['build', ...overrides]],
  ['sam', ['local', 'start-api', '--port', '3000', ...overrides]],
];

for (const [command, args] of steps) {
  const { status } = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (status !== 0) {
    process.exit(status ?? 1);
  }
}
