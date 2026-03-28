import fs from 'node:fs';
import path from 'node:path';

const cacheDir = path.resolve(process.cwd(), 'node_modules', '.vite');

try {
  fs.rmSync(cacheDir, { recursive: true, force: true });
} catch (error) {
  const code = error?.code;
  if (code === 'EPERM' || code === 'EBUSY') {
    console.warn(`[vite-cache] Skipped cleanup for ${cacheDir}: ${code}`);
  } else {
    throw error;
  }
}
