// lib/schemas.js
import { z } from 'zod';

export const HazardItem = z.object({
  category: z.string(),
  specific_risk: z.string(),
  likelihood: z.enum(['low', 'medium', 'high']).optional(),
  potential_severity: z.enum(['low', 'medium', 'high']).optional(),
  recommended_controls: z.array(z.string()),
  required_PPE: z.array(z.string()),
  references: z.array(z.string()).optional(),
});

export const PhotoAnalysisRequest = z.object({
  fileUrls: z.array(z.string().url()).min(1),
  jobContext: z
    .object({
      task: z.string().optional(),
      location: z.string().optional(),
      environment: z.string().optional(),
      equipment: z.array(z.string()).optional(),
    })
    .optional(),
});

export const RenderJsaRequest = z.object({
  job: z.object({
    company: z.string(),
    task: z.string(),
    date: z.string(), // yyyy-mm-dd
    location: z.string(),
    supervisor: z.string().optional(),
    crew: z.array(z.string()).optional(),
  }),
  hazards: z.array(HazardItem).min(1),
  verificationChecklist: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
