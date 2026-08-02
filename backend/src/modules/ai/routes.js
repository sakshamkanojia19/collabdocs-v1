const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const createHttpError = require('http-errors');
const { asyncHandler, authenticateRequest } = require('@collabdocs/shared');
const { config } = require('../../platform/config');
const Document = require('../documents/models/Document');
const AIArtifact = require('./models/AIArtifact');
const { mindMapLayoutSchema } = require('./schemas');
const {
  userHasReadAccess,
  userHasWriteAccess
} = require('../documents/policy');
const { accessFilterForUser } = require('../documents/service');
const {
  generateArtifact,
  answerDocumentQuestion
} = require('./ragService');
const {
  searchDocuments,
  searchConversations,
  answerWorkspaceQuestion,
  resolveArtifactSources,
  buildKnowledgeGraph,
  requireQuery
} = require('./knowledgeService');
const ChatGroup = require('../chat/models/ChatGroup');
const ChatMessage = require('../chat/models/ChatMessage');
const actionItems = require('./actionItemService');
const { attachEntitlements, requireFeature } = require('../accounts/service');

const router = Router();
const requestWindows = new Map();
const RATE_WINDOW_MS = 60000;

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const error = createHttpError(422, 'Validation failed');
  error.errors = errors.array();
  return next(error);
};

const loadReadableDocument = async (documentId, userId, accountId = null) => {
  const document = await Document.findById(documentId);
  if (!document || document.isArchived) {
    throw createHttpError(404, 'Document not found');
  }
  if (!userHasReadAccess(document, userId, accountId)) {
    throw createHttpError(403, 'You do not have access to this document');
  }
  return document;
};

router.get('/status', (req, res) => {
  res.json({
    service: 'knowledge',
    available: true,
    capabilities: {
      summaries: true,
      mindMaps: true,
      knowledgeGraph: true,
      workspaceSearch: true,
      semanticSearch: Boolean(config.openaiApiKey),
      workspaceQuestions: true,
      documentQuestions: Boolean(config.openaiApiKey)
    }
  });
});

router.use(authenticateRequest());
// Provider AI (OpenAI-backed answers, synthesized artifacts, semantic search)
// is a paid capability; the resolved entitlements decide per request whether
// the provider path may run. Local generation stays available to every plan.
router.use(attachEntitlements());
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  const now = Date.now();
  if (requestWindows.size > 1000) {
    requestWindows.forEach((value, key) => {
      if (now - value.startedAt >= RATE_WINDOW_MS) requestWindows.delete(key);
    });
  }
  const current = requestWindows.get(req.user.id);
  const windowState =
    !current || now - current.startedAt >= RATE_WINDOW_MS
      ? { startedAt: now, count: 0 }
      : current;

  windowState.count += 1;
  requestWindows.set(req.user.id, windowState);
  res.set('X-RateLimit-Limit', String(config.aiRequestsPerMinute));
  res.set(
    'X-RateLimit-Remaining',
    String(Math.max(0, config.aiRequestsPerMinute - windowState.count))
  );

  if (windowState.count > config.aiRequestsPerMinute) {
    const retryAfterSeconds = Math.ceil(
      (RATE_WINDOW_MS - (now - windowState.startedAt)) / 1000
    );
    res.set('Retry-After', String(retryAfterSeconds));
    return next(createHttpError(429, 'Too many AI requests. Please try again shortly.'));
  }

  return next();
});

const serializeArtifacts = async (artifacts, userId) => {
  const documentIds = [...new Set(artifacts.map((artifact) => String(artifact.documentId)))];
  const documents = await Document.find({ _id: { $in: documentIds } })
    .select('title updatedAt owner collaborators')
    .lean();
  const documentMap = new Map(documents.map((document) => [String(document._id), document]));

  return artifacts
    .map((artifact) => {
      const sourceDocument = documentMap.get(String(artifact.documentId));
      if (!sourceDocument) return null;
      return {
        id: String(artifact._id),
        documentId: String(artifact.documentId),
        documentTitle: sourceDocument.title,
        documentUpdatedAt: sourceDocument.updatedAt,
        type: artifact.type,
        result: artifact.payload,
        generatedAt: artifact.updatedAt,
        canEdit: userHasWriteAccess(sourceDocument, userId)
      };
    })
    .filter(Boolean);
};

router.get(
  '/artifacts',
  [
    query('type')
      .optional()
      .isIn(['summary', 'mind_map'])
      .withMessage('type must be summary or mind_map'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const readableDocuments = await Document.find(
      accessFilterForUser(req.user.id, req.accountId)
    )
      .select('_id')
      .lean();
    const documentIds = readableDocuments.map((document) => document._id);
    const filter = { documentId: { $in: documentIds } };
    if (req.query.type) filter.type = req.query.type;

    const artifacts = await AIArtifact.find(filter)
      .sort({ updatedAt: -1 })
      .limit(Number(req.query.limit) || 50)
      .lean();

    res.json({
      artifacts: await serializeArtifacts(artifacts, req.user.id)
    });
  })
);

router.get(
  '/documents/:documentId/artifacts',
  [
    param('documentId').isMongoId().withMessage('Invalid document id'),
    query('type')
      .optional()
      .isIn(['summary', 'mind_map'])
      .withMessage('type must be summary or mind_map')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    await loadReadableDocument(req.params.documentId, req.user.id, req.accountId);
    const filter = { documentId: req.params.documentId };
    if (req.query.type) filter.type = req.query.type;
    const artifacts = await AIArtifact.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({
      artifacts: await serializeArtifacts(artifacts, req.user.id)
    });
  })
);

const validateMindMapStructure = (payload) => {
  const parsed = mindMapLayoutSchema.safeParse(payload);
  if (!parsed.success) {
    throw createHttpError(422, 'Mind-map data is invalid');
  }
  const nodes = parsed.data.nodes;
  const ids = new Set(nodes.map((node) => node.id));
  if (ids.size !== nodes.length) {
    throw createHttpError(422, 'Mind-map node ids must be unique');
  }
  const roots = nodes.filter((node) => node.parentId === null);
  if (roots.length !== 1) {
    throw createHttpError(422, 'A mind map must contain exactly one root node');
  }

  nodes.forEach((node) => {
    if (node.parentId && !ids.has(node.parentId)) {
      throw createHttpError(422, `Parent node ${node.parentId} does not exist`);
    }
    const visited = new Set([node.id]);
    let parentId = node.parentId;
    while (parentId) {
      if (visited.has(parentId)) {
        throw createHttpError(422, 'Mind-map nodes cannot contain parent cycles');
      }
      visited.add(parentId);
      parentId = nodes.find((candidate) => candidate.id === parentId)?.parentId || null;
    }
  });

  return {
    ...parsed.data,
    edges: nodes
      .filter((node) => node.parentId)
      .map((node) => ({
        source: node.parentId,
        target: node.id,
        label: 'contains'
      }))
  };
};

router.patch(
  '/artifacts/:artifactId',
  [
    param('artifactId').isMongoId().withMessage('Invalid artifact id'),
    body('payload').isObject().withMessage('Mind-map payload is required')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const artifact = await AIArtifact.findById(req.params.artifactId);
    if (!artifact || artifact.type !== 'mind_map') {
      throw createHttpError(404, 'Mind map not found');
    }
    const document = await loadReadableDocument(artifact.documentId, req.user.id, req.accountId);
    if (!userHasWriteAccess(document, req.user.id)) {
      throw createHttpError(403, 'You need edit access to change this mind map');
    }

    artifact.payload = validateMindMapStructure(req.body.payload);
    artifact.model = 'manual-v1';
    artifact.createdBy = req.user.id;
    await artifact.save();

    const [serialized] = await serializeArtifacts([artifact.toObject()], req.user.id);
    res.json({ artifact: serialized });
  })
);

/**
 * Canvas positions only. Dragging a node is a frequent, low-stakes edit, so it does
 * not re-validate or rewrite the whole graph and never changes the artifact's model.
 */
router.patch(
  '/artifacts/:artifactId/layout',
  [
    param('artifactId').isMongoId().withMessage('Invalid artifact id'),
    body('positions').isArray({ min: 1, max: 40 }).withMessage('positions array is required'),
    body('positions.*.id').isString().notEmpty().withMessage('position id is required'),
    body('positions.*.x').isFloat().withMessage('position x must be a number'),
    body('positions.*.y').isFloat().withMessage('position y must be a number')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const artifact = await AIArtifact.findById(req.params.artifactId);
    if (!artifact || artifact.type !== 'mind_map') {
      throw createHttpError(404, 'Mind map not found');
    }
    const document = await loadReadableDocument(artifact.documentId, req.user.id, req.accountId);
    if (!userHasWriteAccess(document, req.user.id)) {
      throw createHttpError(403, 'You need edit access to rearrange this mind map');
    }

    const byId = new Map(
      req.body.positions.map((position) => [
        String(position.id),
        { x: Number(position.x), y: Number(position.y) }
      ])
    );

    const payload = artifact.payload || {};
    const nodes = (payload.nodes || []).map((node) => {
      const position = byId.get(String(node.id));
      return position ? { ...node, x: position.x, y: position.y } : node;
    });

    artifact.payload = { ...payload, nodes };
    artifact.markModified('payload');
    await artifact.save();

    const [serialized] = await serializeArtifacts([artifact.toObject()], req.user.id);
    res.json({ artifact: serialized });
  })
);

/**
 * Workspace-wide retrieval. Semantic when embeddings are configured and already
 * indexed, lexical otherwise, so search never depends on a provider being present.
 */
router.get(
  '/search',
  [
    query('q').trim().isLength({ min: 2, max: 300 }).withMessage('Enter a search query'),
    query('limit').optional().isInt({ min: 1, max: 25 }).withMessage('limit must be 1-25'),
    query('scope')
      .optional()
      .isIn(['all', 'documents', 'conversations'])
      .withMessage('scope must be all, documents, or conversations')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const search = requireQuery(req.query.q);
    const limit = Number(req.query.limit) || 10;
    const scope = req.query.scope || 'all';

    const [documentResults, conversationResults] = await Promise.all([
      scope === 'conversations'
        ? Promise.resolve({ mode: 'lexical', results: [] })
        : searchDocuments({
            userId: req.user.id,
            query: search,
            limit,
            allowProvider: req.entitlements.features.providerAI,
            accountId: req.accountId
          }),
      scope === 'documents'
        ? Promise.resolve([])
        : searchConversations({
            ChatGroup,
            ChatMessage,
            userId: req.user.id,
            query: search,
            limit
          })
    ]);

    res.json({
      query: search,
      mode: documentResults.mode,
      documents: documentResults.results,
      conversations: conversationResults
    });
  })
);

/**
 * Answers a question across every document the user can read, with citations back
 * to the source documents.
 */
router.post(
  '/ask',
  [
    body('question')
      .trim()
      .isLength({ min: 2, max: 2000 })
      .withMessage('Question must contain between 2 and 2000 characters'),
    body('documentIds').optional().isArray().withMessage('documentIds must be an array'),
    body('documentIds.*').optional().isMongoId().withMessage('Invalid document id')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const answer = await answerWorkspaceQuestion({
      userId: req.user.id,
      question: req.body.question,
      documentIds: req.body.documentIds || [],
      allowProvider: req.entitlements.features.providerAI,
      accountId: req.accountId
    });
    res.json({ answer });
  })
);

router.get(
  '/knowledge-graph',
  asyncHandler(async (req, res) => {
    res.json({ graph: await buildKnowledgeGraph(req.user.id, req.accountId) });
  })
);

/**
 * Resolves the passages behind mind-map nodes so a node can point back at the text
 * it was derived from.
 */
router.get(
  '/artifacts/:artifactId/sources',
  [
    param('artifactId').isMongoId().withMessage('Invalid artifact id'),
    query('indexes').notEmpty().withMessage('indexes is required')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const artifact = await AIArtifact.findById(req.params.artifactId);
    if (!artifact) {
      throw createHttpError(404, 'Artifact not found');
    }
    const document = await loadReadableDocument(artifact.documentId, req.user.id, req.accountId);

    const indexes = String(req.query.indexes)
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value))
      .slice(0, 10);

    res.json({
      documentId: String(document._id),
      documentTitle: document.title,
      sources: await resolveArtifactSources({ document, artifact, indexes })
    });
  })
);

/**
 * Action items. The summary engine already extracts {task, owner, dueDate}; these
 * routes promote that output into work that can be assigned and completed.
 */
router.get(
  '/action-items',
  [
    query('status')
      .optional()
      .isIn(['open', 'in_progress', 'done', 'dismissed', 'all'])
      .withMessage('Unsupported status filter'),
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be 1-200')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    res.json({
      actionItems: await actionItems.listForUser({
        userId: req.user.id,
        status: req.query.status || 'open',
        limit: Number(req.query.limit) || 100,
        accountId: req.accountId
      })
    });
  })
);

router.get(
  '/documents/:documentId/action-items',
  [param('documentId').isMongoId().withMessage('Invalid document id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await loadReadableDocument(req.params.documentId, req.user.id, req.accountId);
    res.json({ actionItems: await actionItems.listForDocument(document._id) });
  })
);

router.post(
  '/documents/:documentId/action-items/sync',
  [param('documentId').isMongoId().withMessage('Invalid document id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await loadReadableDocument(req.params.documentId, req.user.id, req.accountId);
    if (!userHasWriteAccess(document, req.user.id)) {
      throw createHttpError(403, 'You need edit access to track work on this document');
    }
    res.json(await actionItems.syncFromSummary({ document, user: req.user }));
  })
);

router.post(
  '/documents/:documentId/action-items',
  [
    param('documentId').isMongoId().withMessage('Invalid document id'),
    body('task').trim().isLength({ min: 3, max: 400 }).withMessage('Describe the task'),
    body('assignee').optional().isObject().withMessage('assignee must be an object'),
    body('dueDate').optional().isString().withMessage('dueDate must be a string'),
    body('evidence').optional().isObject().withMessage('evidence must be an object')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await loadReadableDocument(req.params.documentId, req.user.id, req.accountId);
    if (!userHasWriteAccess(document, req.user.id)) {
      throw createHttpError(403, 'You need edit access to add work to this document');
    }
    const item = await actionItems.createManualItem({
      document,
      user: req.user,
      task: req.body.task,
      assignee: req.body.assignee,
      dueDate: req.body.dueDate,
      evidence: req.body.evidence,
      source: req.body.source === 'chat' ? 'chat' : 'manual'
    });
    res.status(201).json({ actionItem: item });
  })
);

router.patch(
  '/action-items/:itemId',
  [
    param('itemId').isMongoId().withMessage('Invalid action item id'),
    body('status')
      .optional()
      .isIn(['open', 'in_progress', 'done', 'dismissed'])
      .withMessage('Unsupported status'),
    body('task').optional().trim().isLength({ min: 3, max: 400 }).withMessage('Describe the task'),
    body('assignee').optional({ nullable: true }),
    body('dueDate').optional({ nullable: true })
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const documentId = await actionItems.getItemDocumentId(req.params.itemId);
    const document = await loadReadableDocument(documentId, req.user.id, req.accountId);
    if (!userHasWriteAccess(document, req.user.id)) {
      throw createHttpError(403, 'You need edit access to change this work item');
    }

    const changes = {};
    ['status', 'task', 'assignee', 'dueDate'].forEach((field) => {
      if (req.body[field] !== undefined) changes[field] = req.body[field];
    });

    res.json({
      actionItem: await actionItems.updateItem({
        itemId: req.params.itemId,
        user: req.user,
        changes
      })
    });
  })
);

router.delete(
  '/action-items/:itemId',
  [param('itemId').isMongoId().withMessage('Invalid action item id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const documentId = await actionItems.getItemDocumentId(req.params.itemId);
    const document = await loadReadableDocument(documentId, req.user.id, req.accountId);
    if (!userHasWriteAccess(document, req.user.id)) {
      throw createHttpError(403, 'You need edit access to remove this work item');
    }
    await actionItems.deleteItem(req.params.itemId);
    res.status(204).send();
  })
);

router.post(
  '/documents/:documentId/summary',
  [
    param('documentId').isMongoId().withMessage('Invalid document id'),
    query('force').optional().isBoolean().withMessage('force must be a boolean')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await loadReadableDocument(req.params.documentId, req.user.id, req.accountId);
    const artifact = await generateArtifact({
      document,
      type: 'summary',
      userId: req.user.id,
      force: req.query.force === 'true',
      mode: req.entitlements.features.providerAI ? 'auto' : 'local'
    });
    res.json({ artifact });
  })
);

router.post(
  '/documents/:documentId/mind-map',
  [
    param('documentId').isMongoId().withMessage('Invalid document id'),
    query('force').optional().isBoolean().withMessage('force must be a boolean')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await loadReadableDocument(req.params.documentId, req.user.id, req.accountId);
    const artifact = await generateArtifact({
      document,
      type: 'mind_map',
      userId: req.user.id,
      force: req.query.force === 'true',
      mode: req.entitlements.features.providerAI ? 'auto' : 'local'
    });
    res.json({ artifact });
  })
);

router.post(
  '/documents/:documentId/ask',
  requireFeature('providerAI'),
  [
    param('documentId').isMongoId().withMessage('Invalid document id'),
    body('question')
      .trim()
      .isLength({ min: 2, max: 2000 })
      .withMessage('Question must contain between 2 and 2000 characters')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await loadReadableDocument(req.params.documentId, req.user.id, req.accountId);
    const answer = await answerDocumentQuestion({
      document,
      question: req.body.question
    });
    res.json({ answer });
  })
);

module.exports = router;
