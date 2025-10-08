// lib/pdf.js
import PDFDocument from 'pdfkit';

/**
 * Build the JSA PDF and return a Buffer.
 * @param {object} payload - { job, hazards, verificationChecklist?, notes? }
 */
export async function buildJsaPdfBuffer(payload) {
  const { job, hazards, verificationChecklist = [], notes } = payload;

  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  const chunks = [];
  doc.on('data', (d) => chunks.push(d));
  const done = new Promise((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);
  });

  // Header
  doc.fontSize(18).text('JOB SAFETY ANALYSIS (JSA)', { align: 'center' });
  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .text(
      'Disclaimer: AI-generated guidance. Not a legal determination or guaranteed compliance. Verify with a qualified safety professional and current OSHA/ANSI/NIOSH standards.',
      { align: 'center' }
    );
  doc.moveDown();

  // Job info
  doc.fontSize(12).text('Job Information', { underline: true }).moveDown(0.25);
  doc
    .fontSize(11)
    .text(`Company: ${job.company}`)
    .text(`Task: ${job.task}`)
    .text(`Date: ${job.date}`)
    .text(`Location: ${job.location}`);
  if (job.supervisor) doc.text(`Supervisor: ${job.supervisor}`);
  if (job.crew?.length) doc.text(`Crew: ${job.crew.join(', ')}`);
  doc.moveDown();

  // Hazards
  doc.fontSize(12).text('Hazards & Controls', { underline: true }).moveDown(0.25);
  hazards.forEach((h, idx) => {
    doc.fontSize(11).text(`${idx + 1}. Category: ${h.category}`);
    doc.text(`   Risk: ${h.specific_risk}`);
    if (h.likelihood) doc.text(`   Likelihood: ${h.likelihood}`);
    if (h.potential_severity) doc.text(`   Severity: ${h.potential_severity}`);
    doc.text('   Controls:');
    h.recommended_controls.forEach((c) => doc.text(`     • ${c}`));
    doc.text(`   Required PPE: ${h.required_PPE.join(', ')}`);
    if (h.references?.length) doc.text(`   Notes: ${h.references.join('; ')}`);
    doc.moveDown(0.5);
  });

  if (verificationChecklist.length) {
    doc.fontSize(12).text('Field Verification Checklist', { underline: true }).moveDown(0.25);
    verificationChecklist.forEach((item, i) => {
      doc.fontSize(11).text(`[  ] ${i + 1}. ${item}`);
    });
    doc.moveDown();
  }

  // Sign-off
  doc.fontSize(12).text('Sign-off', { underline: true }).moveDown(0.5);
  const line = () => {
    const y = doc.y + 20;
    doc.moveTo(50, y).lineTo(300, y).stroke();
    doc.moveTo(320, y).lineTo(560, y).stroke();
    doc.y = y + 10;
  };
  doc.fontSize(11).text('Supervisor Signature:').moveDown(0.2);
  line();
  doc.text('Employee Signature(s):').moveDown(0.2);
  line();
  doc.text('Date:').moveDown(0.2);
  line();

  if (notes) {
    doc.addPage();
    doc.fontSize(12).text('Additional Notes', { underline: true }).moveDown(0.5);
    doc.fontSize(11).text(notes);
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}
