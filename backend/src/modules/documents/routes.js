const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const createHttpError = require('http-errors');
const {
  asyncHandler,
  authenticateRequest
} = require('@collabdocs/shared');
const Document = require('./models/Document');
const Notification = require('./models/Notification');
const {
  userHasReadAccess,
  userHasWriteAccess,
  requireOwnership
} = require('./policy');
const { accessFilterForUser } = require('./service');
const { attachEntitlements } = require('../accounts/service');

const router = Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const SERIALIZED_EMPTY_HTML_REGEX = /^\s*{\s*"html"\s*:\s*""\s*}\s*/i;

const stripSerializedEmptyHtmlPrefix = (value = '') => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(SERIALIZED_EMPTY_HTML_REGEX, '');
};

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const error = createHttpError(422, 'Validation failed');
  error.errors = errors.array();
  return next(error);
};

const normalizeContent = (incoming) => {
  if (!incoming) {
    return { html: '' };
  }

  if (typeof incoming === 'string') {
    const withoutPlaceholder = stripSerializedEmptyHtmlPrefix(incoming);
    const trimmed = withoutPlaceholder.trim();
    if (!trimmed) {
      return { html: '' };
    }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          if (parsed.html) {
            return { html: stripSerializedEmptyHtmlPrefix(String(parsed.html)) };
          }
          return parsed;
        }
      } catch (err) {
        // fall through to treat as HTML string
      }
    }
    return { html: withoutPlaceholder };
  }

  if (typeof incoming === 'object') {
    if (incoming.html) {
      return { html: stripSerializedEmptyHtmlPrefix(String(incoming.html)) };
    }
    if (Array.isArray(incoming.ops) || incoming.ops) {
      return incoming;
    }
    return { html: JSON.stringify(incoming) };
  }

  return { html: stripSerializedEmptyHtmlPrefix(String(incoming)) };
};

const extractPlainText = (content) => {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  if (Array.isArray(content.ops)) {
    return content.ops
      .map((op) => {
        if (typeof op.insert === 'string') {
          return op.insert;
        }
        if (op.insert && typeof op.insert === 'object') {
          return Object.values(op.insert).join(' ');
        }
        return '';
      })
      .join(' ')
      .trim();
  }

  if (content.html) {
    return String(content.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return '';
};

const escapeRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/status', (req, res) => {
  res.json({
    service: 'document-service',
    message: 'Document service operational',
    timestamp: new Date().toISOString()
  });
});

router.use(authenticateRequest());
// Resolves the caller's active account so every read/write below is
// tenant-aware (req.accountId).
router.use(attachEntitlements());

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({
      userId: req.user.id
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      notifications
    });
  })
);

router.patch(
  '/notifications/:notificationId',
  [param('notificationId').isMongoId().withMessage('Invalid notification id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        userId: req.user.id
      },
      {
        status: 'read'
      },
      {
        new: true
      }
    );

    if (!notification) {
      throw createHttpError(404, 'Notification not found');
    }

    res.json({
      notification
    });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const documents = await Document.find(
      accessFilterForUser(req.user.id, req.accountId)
    )
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      documents: documents.map((doc) => {
        const { contentText, ...rest } = doc;
        return rest;
      })
    });
  })
);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('tags')
      .optional()
      .isArray({ min: 0 })
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .isString()
      .withMessage('Tags must contain strings')
      .bail()
      .trim(),
    body('content').optional(),
    body('visibility')
      .optional()
      .isIn(['private', 'workspace'])
      .withMessage('visibility must be private or workspace')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { title, content, tags = [], visibility } = req.body;
    const normalizedContent = normalizeContent(content);
    const contentText = extractPlainText(normalizedContent);

    const collaboratorProfile = {
      userId: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: 'owner'
    };

    const document = await Document.create({
      title,
      content: normalizedContent,
      contentText,
      tags,
      accountId: req.accountId,
      visibility: visibility || 'private',
      owner: collaboratorProfile,
      collaborators: [],
      lastEditedBy: collaboratorProfile
    });

    res.status(201).json({
      document: document.toResponse()
    });
  })
);

router.get(
  '/search',
  [
    query('q')
      .trim()
      .notEmpty()
      .withMessage('Search query is required'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const searchTerm = req.query.q;
    const limit = Number(req.query.limit) || 20;
    const regex = new RegExp(escapeRegex(searchTerm), 'i');

    const results = await Document.find({
      isArchived: false,
      'owner.userId': req.user.id,
      $or: [
        { title: regex },
        { contentText: regex },
        { tags: regex }
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      results: results.map((doc) => {
        const { contentText, ...rest } = doc;
        return rest;
      })
    });
  })
);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid document id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
      throw createHttpError(404, 'Document not found');
    }

    if (!userHasReadAccess(document, req.user.id, req.accountId)) {
      throw createHttpError(403, 'You do not have access to this document');
    }

    res.json({
      document: document.toResponse()
    });
  })
);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid document id'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty'),
    body('tags')
      .optional()
      .isArray({ min: 0 })
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .isString()
      .withMessage('Tags must contain strings')
      .bail()
      .trim(),
    body('content').optional(),
    body('visibility')
      .optional()
      .isIn(['private', 'workspace'])
      .withMessage('visibility must be private or workspace')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
      throw createHttpError(404, 'Document not found');
    }

    if (!userHasWriteAccess(document, req.user.id)) {
      throw createHttpError(403, 'You do not have permission to update this document');
    }

    const updates = {};
    if (typeof req.body.visibility !== 'undefined') {
      // Widening a document to the whole workspace is an owner decision, and
      // only meaningful when the document belongs to a tenant.
      if (document.owner?.userId !== req.user.id) {
        throw createHttpError(403, 'Only the owner can change document visibility');
      }
      updates.visibility = req.body.visibility;
      if (req.body.visibility === 'workspace' && !document.accountId) {
        updates.accountId = req.accountId;
      }
    }
    if (typeof req.body.title !== 'undefined') {
      updates.title = req.body.title;
    }
    if (typeof req.body.tags !== 'undefined') {
      updates.tags = req.body.tags;
    }
    if (typeof req.body.content !== 'undefined') {
      const normalizedContent = normalizeContent(req.body.content);
      updates.content = normalizedContent;
      updates.contentText = extractPlainText(normalizedContent);
      updates.lastEditedBy = {
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: document.owner?.userId === req.user.id ? 'owner' : 'editor'
      };
    }

    if (!Object.keys(updates).length) {
      return res.json({
        document: document.toResponse()
      });
    }

    Object.assign(document, updates);
    await document.save();

    res.json({
      document: document.toResponse()
    });
  })
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid document id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
      throw createHttpError(404, 'Document not found');
    }

    if (document.owner?.userId !== req.user.id) {
      throw createHttpError(403, 'Only the owner can delete this document');
    }

    await document.deleteOne();

    res.status(204).send();
  })
);

router.post(
  '/:id/collaborators',
  [
    param('id').isMongoId().withMessage('Invalid document id'),
    body('userId').isString().trim().notEmpty().withMessage('Collaborator user id is required'),
    body('email').isEmail().withMessage('Valid collaborator email is required'),
    body('name').trim().notEmpty().withMessage('Collaborator name is required'),
    body('role').isIn(['viewer', 'editor']).withMessage('Role must be viewer or editor')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
      throw createHttpError(404, 'Document not found');
    }

    requireOwnership(document, req.user.id);

    const { userId, name, email, role } = req.body;
    if (userId === document.owner?.userId) {
      throw createHttpError(400, 'Owner already has full access to the document');
    }

    const collaboratorPayload = {
      userId,
      name,
      email,
      role
    };

    const existingIndex = document.collaborators.findIndex((collaborator) => collaborator.userId === userId);
    if (existingIndex >= 0) {
      document.collaborators[existingIndex] = collaboratorPayload;
    } else {
      document.collaborators.push(collaboratorPayload);
    }

    await document.save();

    await Notification.findOneAndUpdate(
      {
        userId,
        documentId: document._id,
        type: 'share'
      },
      {
        userId,
        accountId: document.accountId || req.accountId,
        documentId: document._id,
        documentTitle: document.title,
        sender: {
          userId: req.user.id,
          name: req.user.name,
          email: req.user.email
        },
        role,
        status: 'pending'
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      document: document.toResponse()
    });
  })
);

router.delete(
  '/:id/collaborators/:collaboratorId',
  [
    param('id').isMongoId().withMessage('Invalid document id'),
    param('collaboratorId').isString().notEmpty().withMessage('Collaborator id is required')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
      throw createHttpError(404, 'Document not found');
    }

    requireOwnership(document, req.user.id);

    const collaboratorIndex = document.collaborators.findIndex(
      (collaborator) => collaborator.userId === req.params.collaboratorId
    );

    if (collaboratorIndex === -1) {
      throw createHttpError(404, 'Collaborator not found on this document');
    }

    const [removed] = document.collaborators.splice(collaboratorIndex, 1);
    await document.save();

    await Notification.deleteMany({
      userId: removed.userId,
      documentId: document._id,
      type: 'share'
    });

    res.status(204).send();
  })
);


module.exports = router;
