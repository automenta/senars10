// ui/shared/models/AgentSchema.js
import { z } from 'zod';

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['idle', 'reasoning', 'blocked', 'active']),
  tasks: z.array(z.string()),
  created_at: z.string().datetime(),
  last_updated: z.string().datetime(),
});