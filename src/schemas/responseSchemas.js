const { z } = require("zod");

const technicalDocsResponseSchema = z.object({
    type: z.literal("TECHNICAL_WITH_DOCS"),
    priority: z.string().default("HIGH - Documentation Available"),
    responseTime: z.string().default("Immediate - Using Available Documentation"),
    answer: z.string(),
    confidence: z.number().min(0).max(1).default(0.95),
    sourcesUsed: z.number().default(1),
    relevantDocs: z.array(z.string()).default([])
});

const technicalNonDocsResponseSchema = z.object({
    type: z.literal("TECHNICAL_NO_DOCS"),
    message: z.string(),
    contactInfo: z.object({
        email: z.string(),
        phone: z.string(),
        supportHours: z.string()
    }),
    ticketPriority: z.string()
});

const billingResponseSchema = z.object({
    type: z.literal("BILLING"),
    message: z.string(),
    contactInfo: z.object({
        email: z.string(),
        phone: z.string(),
        hours: z.string()
    }),
    securityNote: z.string()
});

const irrelevantResponseSchema = z.object({
    type: z.literal("IRRELEVANT"),
    message: z.string(),
    suggestion: z.string(),
    availableCategories: z.array(z.string())
});

module.exports = {
    technicalDocsResponseSchema,
    technicalNonDocsResponseSchema,
    billingResponseSchema,
    irrelevantResponseSchema
};
