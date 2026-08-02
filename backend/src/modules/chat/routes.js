const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const createHttpError = require('http-errors');
const {
  asyncHandler,
  authenticateRequest,
  formatValidationErrors
} = require('@collabdocs/shared');
const ChatGroup = require('./models/ChatGroup');
const ChatMessage = require('./models/ChatMessage');
const ChatNotification = require('./models/ChatNotification');
const { emitToUsers, getSocketServer } = require('./socketRegistry');
const { publishChatEvent } = require('./services/kafka');
const { loadDocumentForUser } = require('../documents/service');
const { attachEntitlements } = require('../accounts/service');

const router = Router();

const ALLOWED_REACTIONS = ['👍', '🎉', '❤️', '👀', '✅', '🙏', '😄', '🤔'];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const error = createHttpError(422, 'Validation failed');
  error.errors = formatValidationErrors(errors.array());
  return next(error);
};

const sanitizeParticipantsPayload = (payload = []) =>
  payload
    .filter((participant) => participant && participant.userId && participant.email)
    .map((participant) => ({
      userId: String(participant.userId),
      name: participant.name || participant.email,
      email: String(participant.email).toLowerCase(),
      role: participant.role && ['owner', 'admin', 'member'].includes(participant.role)
        ? participant.role
        : 'member'
    }));

const ensureGroupMembership = async (groupId, userId) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw createHttpError(404, 'Chat group not found');
  }

  if (!group.hasParticipant(userId)) {
    throw createHttpError(403, 'You do not have access to this chat group');
  }

  return group;
};

const broadcastGroupSnapshot = (group, event) => {
  group.participants.forEach((participant) => {
    emitToUsers([participant.userId], event, {
      group: group.toSummary(participant.userId)
    });
  });
};

const emitToGroupRoom = (groupId, event, payload) => {
  const io = getSocketServer();
  if (io) {
    io.to(`group:${groupId}`).emit(event, payload);
  }
};

/**
 * Real per-group unread and mention counts in a single aggregation, using each
 * participant's own read receipt as the cutoff.
 */
const countUnreadByGroup = async (groups, userId) => {
  if (groups.length === 0) {
    return new Map();
  }

  const conditions = groups.map((group) => {
    const membership = group.participants.find((participant) => participant.userId === userId);
    return {
      groupId: group._id,
      createdAt: { $gt: membership?.lastReadAt || new Date(0) }
    };
  });

  const rows = await ChatMessage.aggregate([
    {
      $match: {
        $or: conditions,
        'sender.userId': { $ne: userId },
        deletedAt: null
      }
    },
    {
      $group: {
        _id: '$groupId',
        unreadCount: { $sum: 1 },
        mentionCount: {
          $sum: {
            $cond: [{ $in: [userId, { $ifNull: ['$mentions.userId', []] }] }, 1, 0]
          }
        }
      }
    }
  ]);

  return new Map(rows.map((row) => [String(row._id), row]));
};

const loadGroupMessage = async (groupId, messageId, userId) => {
  const group = await ensureGroupMembership(groupId, userId);
  const message = await ChatMessage.findOne({ _id: messageId, groupId: group._id });
  if (!message) {
    throw createHttpError(404, 'Message not found');
  }
  return { group, message };
};

/**
 * Mentions are re-derived from group membership so a client cannot notify or name
 * users who are not in the conversation.
 */
const resolveMentions = (group, mentions = []) => {
  const requested = new Set(
    (Array.isArray(mentions) ? mentions : [])
      .map((mention) => (typeof mention === 'string' ? mention : mention?.userId))
      .filter(Boolean)
      .map(String)
  );

  return group.participants
    .filter((participant) => requested.has(participant.userId))
    .map((participant) => ({
      userId: participant.userId,
      name: participant.name
    }));
};

const resolveAnchor = async (group, anchor, userId, accountId = null) => {
  if (!anchor || !anchor.documentId || !anchor.quote) {
    return null;
  }

  const contextDocumentId = group.context?.documentId
    ? String(group.context.documentId)
    : null;
  if (contextDocumentId && contextDocumentId !== String(anchor.documentId)) {
    throw createHttpError(400, 'Anchors must reference the document this conversation belongs to');
  }

  await loadDocumentForUser(anchor.documentId, userId, { accountId });

  return {
    documentId: anchor.documentId,
    quote: String(anchor.quote).slice(0, 600),
    blockIndex: Number.isInteger(anchor.blockIndex) ? anchor.blockIndex : undefined,
    startOffset: Number.isInteger(anchor.startOffset) ? anchor.startOffset : undefined,
    endOffset: Number.isInteger(anchor.endOffset) ? anchor.endOffset : undefined
  };
};

const resolveReplyTo = async (group, replyToId) => {
  if (!replyToId) {
    return null;
  }
  const parent = await ChatMessage.findOne({ _id: replyToId, groupId: group._id })
    .select('sender content deletedAt')
    .lean();
  if (!parent) {
    throw createHttpError(404, 'The message being replied to was not found');
  }
  return {
    messageId: parent._id,
    senderName: parent.sender?.name,
    preview: parent.deletedAt ? 'Message deleted' : (parent.content || '').slice(0, 200)
  };
};

router.get('/status', (req, res) => {
  res.json({
    service: 'chat-service',
    message: 'Chat service operational',
    timestamp: new Date().toISOString()
  });
});

router.use(authenticateRequest());
// Resolves the caller's active account (req.accountId) so groups, messages,
// and notifications are stamped with their tenant.
router.use(attachEntitlements());

router.get(
  '/groups',
  [
    query('contextType')
      .optional()
      .isIn(['global', 'document'])
      .withMessage('contextType must be global or document'),
    query('documentId')
      .optional()
      .isMongoId()
      .withMessage('documentId must be a valid identifier'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { documentId, contextType } = req.query;
    const limit = Number(req.query.limit) || 50;

    const filter = {
      'participants.userId': req.user.id
    };

    if (contextType) {
      filter['context.type'] = contextType;
    }

    if (documentId) {
      filter['context.documentId'] = documentId;
    }

    const groups = await ChatGroup.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit);

    const unreadByGroup = await countUnreadByGroup(groups, req.user.id);

    res.json({
      groups: groups.map((group) => {
        const counts = unreadByGroup.get(String(group._id));
        return {
          ...group.toSummary(req.user.id),
          unreadCount: counts?.unreadCount || 0,
          mentionCount: counts?.mentionCount || 0
        };
      })
    });
  })
);

router.post(
  '/groups',
  [
    body('name').trim().notEmpty().withMessage('Group name is required'),
    body('participants')
      .isArray({ min: 1 })
      .withMessage('At least one participant must be provided'),
    body('participants.*.userId')
      .notEmpty()
      .withMessage('participant userId is required'),
    body('participants.*.email')
      .isEmail()
      .withMessage('participant email must be valid'),
    body('context')
      .optional()
      .custom((value) => {
        if (!value || typeof value !== 'object') {
          throw new Error('context must be an object');
        }
        if (value.type && !['global', 'document'].includes(value.type)) {
          throw new Error('context.type must be global or document');
        }
        if (value.documentId && !/^[0-9a-fA-F]{24}$/.test(value.documentId)) {
          throw new Error('context.documentId must be a valid identifier');
        }
        return true;
      })
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    const participants = sanitizeParticipantsPayload(req.body.participants);
    const context = req.body.context || { type: 'global' };

    if (!participants.some((participant) => participant.userId === req.user.id)) {
      participants.push({
        userId: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: 'owner'
      });
    }

    const dedupedParticipants = participants.reduce((acc, participant) => {
      if (!acc.some((existing) => existing.userId === participant.userId)) {
        acc.push({
          ...participant,
          role: participant.userId === req.user.id ? 'owner' : participant.role
        });
      }
      return acc;
    }, []);

    if (dedupedParticipants.length === 1) {
      throw createHttpError(400, 'Cannot create a group without additional participants');
    }

    const avatarPalette = ['#f472b6', '#6366f1', '#22d3ee', '#a855f7', '#fb7185', '#f97316'];
    const avatarColor = avatarPalette[Math.floor(Math.random() * avatarPalette.length)];

    const group = await ChatGroup.create({
      name,
      accountId: req.accountId,
      avatarColor,
      createdBy: {
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      participants: dedupedParticipants,
      context
    });

    const participantIds = dedupedParticipants
      .filter((participant) => participant.userId !== req.user.id)
      .map((participant) => participant.userId);

    if (participantIds.length > 0) {
      await ChatNotification.insertMany(
        participantIds.map((userId) => ({
          userId,
          groupId: group._id,
          groupName: group.name,
          accountId: group.accountId,
          type: 'group-invite',
          initiator: {
            userId: req.user.id,
            name: req.user.name,
            email: req.user.email
          },
          metadata: {
            context
          }
        }))
      );
    }

    broadcastGroupSnapshot(group, 'chat:group:created');

    await publishChatEvent('chat.group.created', {
      groupId: group._id.toString(),
      name: group.name,
      creator: group.createdBy,
      participantIds: dedupedParticipants.map((participant) => participant.userId),
      context
    });

    res.status(201).json({
      group: group.toSummary(req.user.id)
    });
  })
);

router.get(
  '/groups/:groupId',
  [param('groupId').isMongoId().withMessage('Invalid group id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const group = await ensureGroupMembership(req.params.groupId, req.user.id);
    res.json({
      group: group.toSummary(req.user.id)
    });
  })
);

router.post(
  '/groups/:groupId/participants',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    body('participants')
      .isArray({ min: 1 })
      .withMessage('participants array is required'),
    body('participants.*.userId')
      .notEmpty()
      .withMessage('participant userId is required'),
    body('participants.*.email')
      .isEmail()
      .withMessage('participant email must be valid')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const group = await ensureGroupMembership(req.params.groupId, req.user.id);
    const additions = sanitizeParticipantsPayload(req.body.participants).filter(
      (participant) => !group.participants.some((existing) => existing.userId === participant.userId)
    );

    if (additions.length === 0) {
      return res.json({
        group: group.toSummary(req.user.id)
      });
    }

    additions.forEach((participant) => {
      group.ensureParticipant({
        ...participant,
        role: participant.role || 'member'
      });
    });

    await group.save();

    await ChatNotification.insertMany(
      additions.map((participant) => ({
        userId: participant.userId,
        groupId: group._id,
        groupName: group.name,
        accountId: group.accountId,
        type: 'participant-added',
        initiator: {
          userId: req.user.id,
          name: req.user.name,
          email: req.user.email
        }
      }))
    );

    broadcastGroupSnapshot(group, 'chat:group:updated');

    res.status(200).json({
      group: group.toSummary(req.user.id)
    });
  })
);

router.delete(
  '/groups/:groupId/participants/:participantId',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    param('participantId').notEmpty().withMessage('participantId is required')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const group = await ensureGroupMembership(req.params.groupId, req.user.id);
    if (group.createdBy.userId !== req.user.id) {
      throw createHttpError(403, 'Only the group owner can remove participants');
    }

    const participantIndex = group.participants.findIndex(
      (participant) => participant.userId === req.params.participantId
    );

    if (participantIndex === -1) {
      throw createHttpError(404, 'Participant not found in this group');
    }

    const [removed] = group.participants.splice(participantIndex, 1);
    await group.save();

    await ChatNotification.create({
      userId: removed.userId,
      groupId: group._id,
      groupName: group.name,
      accountId: group.accountId,
      type: 'participant-removed',
      initiator: {
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email
      }
    });

    broadcastGroupSnapshot(group, 'chat:group:updated');

    emitToUsers([removed.userId], 'chat:group:removed', {
      groupId: group._id
    });

    res.status(204).send();
  })
);

router.get(
  '/groups/:groupId/messages',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    query('before')
      .optional()
      .isISO8601()
      .withMessage('before must be a valid ISO timestamp'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const group = await ensureGroupMembership(req.params.groupId, req.user.id);
    const limit = Number(req.query.limit) || 50;
    const before = req.query.before ? new Date(req.query.before) : null;

    const messageQuery = {
      groupId: group._id
    };

    if (before) {
      messageQuery.createdAt = { $lt: before };
    }

    const messages = await ChatMessage.find(messageQuery)
      .sort({ createdAt: -1 })
      .limit(limit);

    group.updateReadReceipt(req.user.id, new Date());
    await group.save();

    res.json({
      messages: messages.reverse().map((message) => message.toDto(req.user.id))
    });
  })
);

router.post(
  '/groups/:groupId/messages',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Message content is required'),
    body('attachments')
      .optional()
      .isArray()
      .withMessage('attachments must be an array'),
    body('mentions')
      .optional()
      .isArray()
      .withMessage('mentions must be an array'),
    body('replyToId')
      .optional()
      .isMongoId()
      .withMessage('replyToId must be a valid message id'),
    body('anchor')
      .optional()
      .custom((value) => {
        if (value === null) {
          return true;
        }
        if (typeof value !== 'object') {
          throw new Error('anchor must be an object');
        }
        if (!/^[0-9a-fA-F]{24}$/.test(String(value.documentId || ''))) {
          throw new Error('anchor.documentId must be a valid identifier');
        }
        if (!value.quote || String(value.quote).trim().length === 0) {
          throw new Error('anchor.quote is required');
        }
        return true;
      })
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const group = await ensureGroupMembership(req.params.groupId, req.user.id);
    const { content } = req.body;
    const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    const mentions = resolveMentions(group, req.body.mentions);
    const anchor = await resolveAnchor(group, req.body.anchor, req.user.id, req.accountId);
    const replyTo = await resolveReplyTo(group, req.body.replyToId);

    const message = await ChatMessage.create({
      groupId: group._id,
      accountId: group.accountId || req.accountId,
      sender: {
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      content,
      attachments,
      mentions,
      ...(anchor ? { anchor } : {}),
      ...(replyTo ? { replyTo } : {})
    });

    group.messageCount += 1;
    group.lastMessage = {
      messageId: message._id,
      preview: content.slice(0, 120),
      sentAt: message.createdAt,
      sender: {
        userId: req.user.id,
        name: req.user.name
      }
    };
    group.updateReadReceipt(req.user.id, message.createdAt);
    await group.save();

    const dto = message.toDto(req.user.id);

    const io = getSocketServer();
    if (io) {
      io.to(`group:${group._id}`).emit('chat:message:new', {
        message: dto
      });

      group.participants.forEach((participant) => {
        emitToUsers([participant.userId], 'chat:group:activity', {
          groupId: group._id.toString(),
          lastMessage: {
            ...group.lastMessage,
            messageId: group.lastMessage?.messageId?.toString()
          }
        });
      });
    }

    const mentionedOthers = mentions.filter((mention) => mention.userId !== req.user.id);
    if (mentionedOthers.length > 0) {
      await ChatNotification.insertMany(
        mentionedOthers.map((mention) => ({
          userId: mention.userId,
          groupId: group._id,
          groupName: group.name,
          accountId: group.accountId,
          type: 'mention',
          initiator: {
            userId: req.user.id,
            name: req.user.name,
            email: req.user.email
          },
          metadata: {
            messageId: message._id.toString(),
            preview: content.slice(0, 120)
          }
        }))
      );
      emitToUsers(
        mentionedOthers.map((mention) => mention.userId),
        'chat:mention',
        {
          groupId: group._id.toString(),
          groupName: group.name,
          messageId: message._id.toString(),
          preview: content.slice(0, 120),
          sender: { userId: req.user.id, name: req.user.name }
        }
      );
    }

    await publishChatEvent('chat.message.created', {
      messageId: message._id,
      groupId: group._id.toString(),
      sender: message.sender,
      createdAt: message.createdAt
    });

    res.status(201).json({
      message: dto
    });
  })
);

router.patch(
  '/groups/:groupId/messages/:messageId',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    param('messageId').isMongoId().withMessage('Invalid message id'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 4000 })
      .withMessage('Message content is required')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { group, message } = await loadGroupMessage(
      req.params.groupId,
      req.params.messageId,
      req.user.id
    );

    if (message.sender.userId !== req.user.id) {
      throw createHttpError(403, 'You can only edit your own messages');
    }
    if (message.deletedAt) {
      throw createHttpError(409, 'This message was deleted');
    }

    message.content = req.body.content;
    message.mentions = resolveMentions(group, req.body.mentions ?? message.mentions);
    message.editedAt = new Date();
    await message.save();

    if (String(group.lastMessage?.messageId || '') === String(message._id)) {
      group.lastMessage.preview = message.content.slice(0, 120);
      await group.save();
    }

    const dto = message.toDto(req.user.id);
    emitToGroupRoom(group._id, 'chat:message:updated', { message: dto });

    res.json({ message: dto });
  })
);

router.delete(
  '/groups/:groupId/messages/:messageId',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    param('messageId').isMongoId().withMessage('Invalid message id')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { group, message } = await loadGroupMessage(
      req.params.groupId,
      req.params.messageId,
      req.user.id
    );

    const isSender = message.sender.userId === req.user.id;
    const isGroupOwner = group.createdBy.userId === req.user.id;
    if (!isSender && !isGroupOwner) {
      throw createHttpError(403, 'You can only delete your own messages');
    }

    if (!message.deletedAt) {
      message.deletedAt = new Date();
      message.reactions = [];
      await message.save();
    }

    if (String(group.lastMessage?.messageId || '') === String(message._id)) {
      group.lastMessage.preview = 'Message deleted';
      await group.save();
    }

    const dto = message.toDto(req.user.id);
    emitToGroupRoom(group._id, 'chat:message:updated', { message: dto });

    res.json({ message: dto });
  })
);

router.post(
  '/groups/:groupId/messages/:messageId/reactions',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    param('messageId').isMongoId().withMessage('Invalid message id'),
    body('emoji')
      .isIn(ALLOWED_REACTIONS)
      .withMessage(`emoji must be one of ${ALLOWED_REACTIONS.join(' ')}`)
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { group, message } = await loadGroupMessage(
      req.params.groupId,
      req.params.messageId,
      req.user.id
    );

    if (message.deletedAt) {
      throw createHttpError(409, 'This message was deleted');
    }

    const { emoji } = req.body;
    const existing = message.reactions.find((reaction) => reaction.emoji === emoji);

    if (!existing) {
      message.reactions.push({ emoji, userIds: [req.user.id] });
    } else if (existing.userIds.includes(req.user.id)) {
      existing.userIds = existing.userIds.filter((userId) => userId !== req.user.id);
      if (existing.userIds.length === 0) {
        message.reactions = message.reactions.filter((reaction) => reaction.emoji !== emoji);
      }
    } else {
      existing.userIds.push(req.user.id);
    }

    await message.save();

    const dto = message.toDto(req.user.id);
    emitToGroupRoom(group._id, 'chat:message:updated', { message: dto });

    res.json({ message: dto });
  })
);

router.post(
  '/groups/:groupId/read',
  [param('groupId').isMongoId().withMessage('Invalid group id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const group = await ensureGroupMembership(req.params.groupId, req.user.id);
    group.updateReadReceipt(req.user.id, new Date());
    await group.save();
    res.status(204).send();
  })
);

router.patch(
  '/groups/:groupId',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 180 })
      .withMessage('Group name must contain between 1 and 180 characters')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const group = await ensureGroupMembership(req.params.groupId, req.user.id);
    const membership = group.participants.find(
      (participant) => participant.userId === req.user.id
    );
    if (!['owner', 'admin'].includes(membership?.role)) {
      throw createHttpError(403, 'Only group owners and admins can rename a conversation');
    }

    group.name = req.body.name;
    await group.save();
    broadcastGroupSnapshot(group, 'chat:group:updated');

    res.json({ group: group.toSummary(req.user.id) });
  })
);

router.post(
  '/groups/:groupId/leave',
  [param('groupId').isMongoId().withMessage('Invalid group id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const group = await ensureGroupMembership(req.params.groupId, req.user.id);
    if (group.createdBy.userId === req.user.id) {
      throw createHttpError(
        400,
        'The group owner cannot leave. Transfer ownership or remove the group instead.'
      );
    }

    group.participants = group.participants.filter(
      (participant) => participant.userId !== req.user.id
    );
    await group.save();

    broadcastGroupSnapshot(group, 'chat:group:updated');
    emitToUsers([req.user.id], 'chat:group:removed', { groupId: group._id.toString() });

    res.status(204).send();
  })
);

/**
 * Decisions promote a message into the linked document's durable record, so the
 * document keeps the reasoning behind its current state.
 */
router.post(
  '/groups/:groupId/messages/:messageId/decision',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    param('messageId').isMongoId().withMessage('Invalid message id'),
    body('summary')
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage('summary must be 300 characters or fewer')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { group, message } = await loadGroupMessage(
      req.params.groupId,
      req.params.messageId,
      req.user.id
    );

    if (message.deletedAt) {
      throw createHttpError(409, 'This message was deleted');
    }

    const documentId = message.anchor?.documentId || group.context?.documentId;
    if (!documentId) {
      throw createHttpError(
        400,
        'Decisions must belong to a document. Open this conversation from a document or anchor the message first.'
      );
    }

    const { document } = await loadDocumentForUser(documentId, req.user.id, {
      requireWrite: true
    });

    const summary =
      (req.body.summary || '').trim() || (message.content || '').slice(0, 300);
    if (!summary) {
      throw createHttpError(422, 'A decision needs a summary');
    }

    message.decision = {
      summary,
      markedAt: new Date(),
      markedBy: { userId: req.user.id, name: req.user.name },
      documentId: document._id
    };
    await message.save();

    const dto = message.toDto(req.user.id);
    emitToGroupRoom(group._id, 'chat:message:updated', { message: dto });

    const others = group.participants
      .filter((participant) => participant.userId !== req.user.id)
      .map((participant) => participant.userId);
    if (others.length > 0) {
      await ChatNotification.insertMany(
        others.map((userId) => ({
          userId,
          groupId: group._id,
          groupName: group.name,
          accountId: group.accountId,
          type: 'decision',
          initiator: { userId: req.user.id, name: req.user.name, email: req.user.email },
          metadata: {
            messageId: message._id.toString(),
            documentId: document._id.toString(),
            documentTitle: document.title,
            summary
          }
        }))
      );
    }

    res.status(201).json({ message: dto });
  })
);

router.delete(
  '/groups/:groupId/messages/:messageId/decision',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    param('messageId').isMongoId().withMessage('Invalid message id')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { group, message } = await loadGroupMessage(
      req.params.groupId,
      req.params.messageId,
      req.user.id
    );

    if (!message.decision) {
      throw createHttpError(404, 'This message is not a decision');
    }
    await loadDocumentForUser(message.decision.documentId, req.user.id, {
      requireWrite: true
    });

    message.decision = undefined;
    await message.save();

    const dto = message.toDto(req.user.id);
    emitToGroupRoom(group._id, 'chat:message:updated', { message: dto });

    res.json({ message: dto });
  })
);

/**
 * A document's decision log. Any reader of the document sees the promoted decision
 * summaries; the underlying conversation stays limited to group members.
 */
router.get(
  '/documents/:documentId/decisions',
  [param('documentId').isMongoId().withMessage('Invalid document id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    await loadDocumentForUser(req.params.documentId, req.user.id, { accountId: req.accountId });

    const messages = await ChatMessage.find({
      'decision.documentId': req.params.documentId,
      deletedAt: null
    })
      .sort({ 'decision.markedAt': -1 })
      .limit(200)
      .lean();

    const groupIds = [...new Set(messages.map((message) => String(message.groupId)))];
    const groups = await ChatGroup.find({ _id: { $in: groupIds } })
      .select('name participants')
      .lean();
    const groupMap = new Map(groups.map((group) => [String(group._id), group]));

    res.json({
      decisions: messages.map((message) => {
        const group = groupMap.get(String(message.groupId));
        const isMember = Boolean(
          group?.participants?.some((participant) => participant.userId === req.user.id)
        );
        return {
          messageId: String(message._id),
          groupId: String(message.groupId),
          groupName: group?.name || 'Conversation',
          summary: message.decision.summary,
          markedAt: message.decision.markedAt,
          markedBy: message.decision.markedBy,
          author: message.sender,
          discussedAt: message.createdAt,
          anchorQuote: isMember ? message.anchor?.quote || null : null,
          content: isMember ? message.content : null,
          canOpenThread: isMember
        };
      })
    });
  })
);

/**
 * Anchored discussion for a document, grouped by the quoted range. Restricted to
 * conversations the requester belongs to.
 */
router.get(
  '/documents/:documentId/threads',
  [
    param('documentId').isMongoId().withMessage('Invalid document id'),
    query('includeResolved')
      .optional()
      .isBoolean()
      .withMessage('includeResolved must be a boolean')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    await loadDocumentForUser(req.params.documentId, req.user.id, { accountId: req.accountId });

    const memberGroups = await ChatGroup.find({
      'participants.userId': req.user.id
    })
      .select('_id name')
      .lean();
    const groupMap = new Map(memberGroups.map((group) => [String(group._id), group]));

    const filter = {
      'anchor.documentId': req.params.documentId,
      groupId: { $in: memberGroups.map((group) => group._id) },
      deletedAt: null
    };
    if (req.query.includeResolved !== 'true') {
      filter['anchor.resolvedAt'] = null;
    }

    const messages = await ChatMessage.find(filter).sort({ createdAt: 1 }).limit(300);

    res.json({
      threads: messages.map((message) => ({
        ...message.toDto(req.user.id),
        groupName: groupMap.get(String(message.groupId))?.name || 'Conversation'
      }))
    });
  })
);

router.post(
  '/groups/:groupId/messages/:messageId/resolve',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    param('messageId').isMongoId().withMessage('Invalid message id')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { group, message } = await loadGroupMessage(
      req.params.groupId,
      req.params.messageId,
      req.user.id
    );

    if (!message.anchor) {
      throw createHttpError(400, 'Only anchored discussion can be resolved');
    }

    if (message.anchor.resolvedAt) {
      message.anchor.resolvedAt = undefined;
      message.anchor.resolvedBy = undefined;
    } else {
      message.anchor.resolvedAt = new Date();
      message.anchor.resolvedBy = { userId: req.user.id, name: req.user.name };
    }
    await message.save();

    const dto = message.toDto(req.user.id);
    emitToGroupRoom(group._id, 'chat:message:updated', { message: dto });

    res.json({ message: dto });
  })
);

router.get(
  '/mentions',
  [query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const messages = await ChatMessage.find({
      'mentions.userId': req.user.id,
      deletedAt: null
    })
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 30)
      .lean();

    const groupIds = [...new Set(messages.map((message) => String(message.groupId)))];
    const groups = await ChatGroup.find({ _id: { $in: groupIds } })
      .select('name')
      .lean();
    const groupMap = new Map(groups.map((group) => [String(group._id), group.name]));

    res.json({
      mentions: messages.map((message) => ({
        messageId: String(message._id),
        groupId: String(message.groupId),
        groupName: groupMap.get(String(message.groupId)) || 'Conversation',
        sender: message.sender,
        preview: (message.content || '').slice(0, 200),
        createdAt: message.createdAt
      }))
    });
  })
);

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const notifications = await ChatNotification.find({
      userId: req.user.id
    })
      .sort({ createdAt: -1 })
      .lean();

    const normalized = notifications.map((notification) => ({
      ...notification,
      _id: notification._id?.toString(),
      groupId: notification.groupId?.toString()
    }));

    res.json({
      notifications: normalized
    });
  })
);

router.patch(
  '/notifications/:notificationId',
  [param('notificationId').isMongoId().withMessage('Invalid notification id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const notification = await ChatNotification.findOneAndUpdate(
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

    const normalized = {
      ...notification.toObject(),
      _id: notification._id?.toString(),
      groupId: notification.groupId?.toString()
    };

    res.json({
      notification: normalized
    });
  })
);

module.exports = router;
