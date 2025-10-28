// ui/shared/models/TaskSchema.js
import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in-progress', 'completed', 'failed']),
  priority: z.number().min(0).max(10),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
});