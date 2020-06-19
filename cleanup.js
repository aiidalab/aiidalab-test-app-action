const path = require('path');
const compose = require('docker-compose');

const folder = path.join(__dirname, 'aiidalabtests');

async function cleanup() {
  return compose.down({ cwd: folder, log: true})
}

cleanup()
