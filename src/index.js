// src/index.js
import 'dotenv/config';
import express from 'express';
import fs from 'fs';

import { commonMiddleware } from '../lib/security.js';
import { getEnv } from '../config/env.js';
import healthRouter from '../routes/health.js';
import visionRouter from '../routes/vision.js';
import jsaRouter from '../routes/jsa.js';

const app = express();
const env = getEnv();

app.use(express.json({ limit: '5mb' }));
commonMiddleware.forEach((mw) => app.use(mw));

// Serve local files (dev + fine for Render)
fs.mkdirSync(env.INTERNAL_FILE_DIR, { recursive: true });
app.use('/files', express.static(env.INTERNAL_FILE_DIR, { maxAge: '1h' }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/vision', visionRouter);
app.use('/api/jsa', jsaRouter);

// Start
const port = env.PORT || 8080;
app.listen(port, () => {
  console.log(`JSA API listening on :${port}`);
  console.log(`Health: ${env.APP_BASE_URL}/api/health`);
});
