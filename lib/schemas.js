import { z } from 'zod';

export const HazardItem = z.object({
  category: z.string(),
  specific_risk: z.string(),
  likelihood: z.enum(['low','medium','high']).optional(),
  potential_severity: z.enum(['low','medium','high']).optional(),
  recommended_controls: z.array(z.string()),
  required_PPE: z.array(z.string()),
  references: z.array(z.string()).optional
