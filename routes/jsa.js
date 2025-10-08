import { Router } from 'express';
import { RenderJsaRequest } from '../lib/schemas.js';
import { requireApiKey, rateLimit } from '../lib/security.js';
import { buildJsaPdfBuffer } from '../lib/pdf.js';
import { savePdfAndGetUrl } from '../src/storage/index.js'; // <-- this path matters

const router = Router();

router.post('/render', requireApiKey, rateLimit, async (req, res) => {
  const parsed = RenderJsaRequest.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { job, hazards, verificationChecklist = [], notes } = parsed.data;
  const filename = `JSA_${job.company.replace(/\W+/g,'_')}_${Date.now()}.pdf`;

  try {
    const buffer = await buildJsaPdfBuffer({ job, hazards, verificationChecklist, notes });
    const fileUrl = await savePdfAndGetUrl(filename, buffer);
    res.json({ fileUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
