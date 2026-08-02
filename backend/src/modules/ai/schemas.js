const { z } = require('zod');

const sourceReference = z.object({
  chunkIndex: z.number().int().nonnegative(),
  quote: z.string()
});

const summarySchema = z.object({
  title: z.string(),
  overview: z.string(),
  keyPoints: z.array(z.string()).max(10),
  actionItems: z
    .array(
      z.object({
        task: z.string(),
        owner: z.string().nullable(),
        dueDate: z.string().nullable()
      })
    )
    .max(12),
  themes: z.array(z.string()).max(8),
  sources: z.array(sourceReference).max(10)
});

const mindMapSchema = z.object({
  title: z.string(),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string(),
        parentId: z.string().nullable(),
        sourceChunks: z.array(z.number().int().nonnegative())
      })
    )
    .max(40),
  edges: z
    .array(
      z.object({
        source: z.string(),
        target: z.string(),
        label: z.string()
      })
    )
    .max(60)
});

const answerSchema = z.object({
  answer: z.string(),
  citations: z.array(sourceReference).max(10),
  followUpQuestions: z.array(z.string()).max(4)
});

/**
 * Storage-side mind-map schema. Generation uses `mindMapSchema`, which must stay
 * strict because the provider's structured-output mode rejects optional fields.
 * Manual edits additionally carry a saved canvas position per node.
 */
const mindMapLayoutSchema = mindMapSchema.extend({
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string(),
        parentId: z.string().nullable(),
        sourceChunks: z.array(z.number().int().nonnegative()),
        x: z.number().finite().optional(),
        y: z.number().finite().optional()
      })
    )
    .max(40)
});

// Workspace answers cite retrieved passages by index; the server maps each index
// back to the document it came from so the model never handles document ids.
const workspaceAnswerSchema = z.object({
  answer: z.string(),
  citations: z
    .array(
      z.object({
        sourceIndex: z.number().int().nonnegative(),
        quote: z.string()
      })
    )
    .max(10),
  followUpQuestions: z.array(z.string()).max(4)
});

module.exports = {
  summarySchema,
  mindMapSchema,
  mindMapLayoutSchema,
  answerSchema,
  workspaceAnswerSchema
};
