const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(6).max(128),
  role: z.enum(['CUSTOMER', 'AGENT', 'ADMIN']).optional()
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(128)
});

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().or(z.literal(''))
});

const ticketSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(4000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
});

const statusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'])
});

const assignSchema = z.object({
  assignedAgentId: z.coerce.number().int().positive().nullable()
});

const commentSchema = z.object({
  comment: z.string().trim().min(2).max(2000)
});

const adminUserSchema = z.object({
  role: z.enum(['CUSTOMER', 'AGENT', 'ADMIN']).optional(),
  isActive: z.boolean().optional()
}).refine((value) => value.role !== undefined || value.isActive !== undefined, {
  message: 'At least one user field must be provided.'
});

const ticketQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z.coerce.number().int().positive().optional(),
  assignedAgent: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(['id', 'title', 'status', 'priority', 'created_at', 'updated_at', 'sla_deadline']).optional(),
  sortOrder: z.enum(['ASC', 'DESC', 'asc', 'desc']).optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  categorySchema,
  ticketSchema,
  statusSchema,
  assignSchema,
  commentSchema,
  adminUserSchema,
  ticketQuerySchema
};
