import fs from 'fs';
import path from 'path';
import { getEnv } from '../../config/env.js';

const env = getEnv();

export async function savePdfAndGetUrlLocal(filename, buffer) {
  fs.writeFileSync(path.join(env.INTERNAL_FILE_DIR, filename), buffer);
  return `${env.APP_BASE_URL}/files/${filename}`;
}
