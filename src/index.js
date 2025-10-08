import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { commonMiddleware } from '../lib/security.js';
import { getEnv } from '../config/env.js';
import healthRouter from '../routes/health.js';
import visionRouter from '../routes/vision.js';
import jsaRouter from '../routes/jsa.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const env = getEnv();

app.use(express.json({ limit: '5mb' }));
commonMiddleware.forEach(mw => app.use(mw));

/** Local static serving in dev (optional; harmless in prod) */
fs.mkdirSync(env.INTERNAL_FILE_DIR, { recursive: true });
app.use('/files', express.static(env.INTERNAL_FILE_DIR, { maxAge: '1h' }));

/** Routes */
app.use('/api/health', healthRouter);
app.use('/api/vision', visionRouter);
app.use('/api/jsa', jsaRouter);

/** Start server */
const port = env.PORT;
app.listen(port, () => {
  console.log(`JSA API listening on :${port}`);
  console.log(`Health: ${env.APP_BASE_URL}/api/health`);
});
