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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(cors());
app.use(helmet());
app.use(morgan('tiny'));

/** API key + rate limit **/
const allowlist = (process.env.API_KEY_ALLOWLIST || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const requireApiKey = (req, res, next) => {
  const key = req.header('x-api-key');
  if (!key || !allowlist.includes(key)) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

const limiter = new RateLimiterMemory({ points: 50, duration: 60 }); // 50 req/min per key
const rateLimit = async (req, res, next) => {
  try {
    const key = req.header('x-api-key') || req.ip;
    await limiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too Many Requests' });
  }
};

/** Local file hosting for dev **/
const filesDir = path.resolve(process.env.INTERNAL_FILE_DIR || './files');
fs.mkdirSync(filesDir, { recursive: true });
app.use('/files', express.static(filesDir, { maxAge: '1h' }));

const signedUrlFor = (filename) => {
  const base = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 8080}`;
  return `${base}/files/${filename}`;
};

/** Schemas **/
const HazardItem = z.object({
  category: z.string(),
  specific_risk: z.string(),
  likelihood: z.enum(['low','medium','high']).optional(),
  potential_severity: z.enum(['low','medium','high']).optional(),
  recommended_controls: z.array(z.string()),
  required_PPE: z.array(z.string()),
  references: z.array(z.string()).optional()
});

const PhotoAnalysisRequest = z.object({
  fileUrls: z.array(z.string().url()).min(1),
  jobContext: z.object({
    task: z.string().optional(),
    location: z.string().optional(),
    environment: z.string().optional(),
    equipment: z.array(z.string()).optional()
  }).optional()
});

const RenderJsaRequest = z.object({
  job: z.object({
    company: z.string(),
    task: z.string(),
    date: z.string(), // yyyy-mm-dd
    location: z.string(),
    supervisor: z.string().optional(),
    crew: z.array(z.string()).optional()
  }),
  hazards: z.array(HazardItem).min(1),
  verificationChecklist: z.array(z.string()).optional(),
  notes: z.string().optional()
});

/** Optional: server-side vision stub (safe default) **/
async function serverSideVisionAnalyze(fileUrls, jobContext) {
  const summary = `Analyzed ${fileUrls.length} photo(s)` + (jobContext?.task ? ` for task: ${jobContext.task}` : '');
  return {
    summary,
    hazards: [{
      category: 'General',
      specific_risk: 'Unverified site conditions',
      likelihood: 'medium',
      potential_severity: 'high',
      recommended_controls: [
        'Conduct site walk with competent person',
        'Establish exclusion zones and signage',
        'Brief crew on specific hazards before start'
      ],
      required_PPE: ['Hard hat','Hi-vis vest','Safety boots','Safety glasses'],
      references: ['Plan per OSHA topic relevant to task (falls, electrical, etc.)']
    }]
  };
}

/** Routes **/
app.post('/api/vision/analyze', requireApiKey, rateLimit, async (req, res) => {
  const parsed = PhotoAnalysisRequest.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { fileUrls, jobContext } = parsed.data;
  const result = await serverSideVisionAnalyze(fileUrls, jobContext);
  res.json(result);
});

app.post('/api/jsa/render', requireApiKey, rateLimit, async (req, res) => {
  const parsed = RenderJsaRequest.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { job, hazards, verificationChecklist = [], notes } = parsed.data;
  const filename = `JSA_${job.company.replace(/\W+/g,'_')}_${Date.now()}.pdf`;
  const filepath = path.join(filesDir, filename);

  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  doc.fontSize(18).text('JOB SAFETY ANALYSIS (JSA)', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text('Disclaimer: AI-generated guidance. Not a legal determination or guaranteed compliance. Verify with a qualified safety professional and current OSHA/ANSI/NIOSH standards.', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text('Job Information', { underline: true }).moveDown(0.25);
  doc.fontSize(11)
    .text(`Company: ${job.company}`)
    .text(`Task: ${job.task}`)
    .text(`Date: ${job.date}`)
    .text(`Location: ${job.location}`);
  if (job.supervisor) doc.text(`Supervisor: ${job.supervisor}`);
  if (job.crew?.length) doc.text(`Crew: ${job.crew.join(', ')}`);
  doc.moveDown();

  doc.fontSize(12).text('Hazards & Controls', { underline: true }).moveDown(0.25);
  hazards.forEach((h, idx) => {
    doc.fontSize(11).text(`${idx + 1}. Category: ${h.category}`);
    doc.text(`   Risk: ${h.specific_risk}`);
    if (h.likelihood) doc.text(`   Likelihood: ${h.likelihood}`);
    if (h.potential_severity) doc.text(`   Severity: ${h.potential_severity}`);
    doc.text(`   Controls:`); h.recommended_controls.forEach(c => doc.text(`     • ${c}`));
    doc.text(`   Required PPE: ${h.required_PPE.join(', ')}`);
    if (h.references?.length) doc.text(`   Notes: ${h.references.join('; ')}`);
    doc.moveDown(0.5);
  });

  if (verificationChecklist.length) {
    doc.fontSize(12).text('Field Verification Checklist', { underline: true }).moveDown(0.25);
    verificationChecklist.forEach((item, i) => doc.fontSize(11).text(`[  ] ${i + 1}. ${item}`));
    doc.moveDown();
  }

  doc.fontSize(12).text('Sign-off', { underline: true }).moveDown(0.5);
  const line = () => {
    const y = doc.y + 20;
    doc.moveTo(50, y).lineTo(300, y).stroke();
    doc.moveTo(320, y).lineTo(560, y).stroke();
    doc.y = y + 10;
  };
  doc.fontSize(11).text('Supervisor Signature:').moveDown(0.2); line();
  doc.text('Employee Signature(s):').moveDown(0.2); line();
  doc.text('Date:').moveDown(0.2); line();

  if (notes) {
    doc.addPage();
    doc.fontSize(12).text('Additional Notes', { underline: true }).moveDown(0.5);
    doc.fontSize(11).text(notes);
  }

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const fileUrl = signedUrlFor(filename);
  res.json({ fileUrl });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`JSA API listening on :${port}`));
