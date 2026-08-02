const test = require('node:test');
const assert = require('node:assert/strict');
const ChatMessage = require('../src/modules/chat/models/ChatMessage');
const { fingerprintOf } = require('../src/modules/ai/actionItemService');

const buildMessage = (overrides = {}) =>
  new ChatMessage({
    groupId: '507f1f77bcf86cd799439011',
    sender: { userId: 'author-id', name: 'Author', email: 'author@example.com' },
    content: 'We ship on Friday',
    ...overrides
  });

test('message DTO exposes per-viewer reaction and mention state', () => {
  const message = buildMessage({
    reactions: [{ emoji: '👍', userIds: ['author-id', 'viewer-id'] }],
    mentions: [{ userId: 'viewer-id', name: 'Viewer' }]
  });

  const viewerDto = message.toDto('viewer-id');
  assert.equal(viewerDto.reactions[0].count, 2);
  assert.equal(viewerDto.reactions[0].reacted, true);
  assert.equal(viewerDto.mentionsMe, true);
  assert.equal(viewerDto.isOwn, false);

  const strangerDto = message.toDto('stranger-id');
  assert.equal(strangerDto.reactions[0].reacted, false);
  assert.equal(strangerDto.mentionsMe, false);

  // userIds travel with the payload so one broadcast serves every recipient.
  assert.deepEqual(viewerDto.reactions[0].userIds, ['author-id', 'viewer-id']);
});

test('deleted messages withhold content, attachments, and reactions', () => {
  const message = buildMessage({
    deletedAt: new Date(),
    attachments: [{ name: 'plan.pdf' }],
    reactions: [{ emoji: '👍', userIds: ['viewer-id'] }]
  });

  const dto = message.toDto('viewer-id');
  assert.equal(dto.isDeleted, true);
  assert.equal(dto.content, '');
  assert.deepEqual(dto.attachments, []);
  assert.deepEqual(dto.reactions, []);
});

test('edited messages are flagged without losing their content', () => {
  const message = buildMessage({ content: 'We ship on Monday', editedAt: new Date() });
  const dto = message.toDto('author-id');
  assert.equal(dto.isEdited, true);
  assert.equal(dto.content, 'We ship on Monday');
  assert.equal(dto.isOwn, true);
});

test('anchors and decisions serialize with their document link', () => {
  const message = buildMessage({
    anchor: {
      documentId: '507f1f77bcf86cd799439012',
      quote: 'the launch date is provisional'
    },
    decision: {
      summary: 'Launch moves to Friday',
      markedBy: { userId: 'author-id', name: 'Author' },
      documentId: '507f1f77bcf86cd799439012'
    }
  });

  const dto = message.toDto('author-id');
  assert.equal(dto.anchor.documentId, '507f1f77bcf86cd799439012');
  assert.equal(dto.anchor.quote, 'the launch date is provisional');
  assert.equal(dto.decision.summary, 'Launch moves to Friday');
  assert.equal(dto.decision.documentId, '507f1f77bcf86cd799439012');
});

test('action item fingerprints are stable across formatting differences', () => {
  assert.equal(
    fingerprintOf('Send  the  Q3 report'),
    fingerprintOf('send the q3 report')
  );
  assert.equal(fingerprintOf('  Draft the brief  '), fingerprintOf('Draft the brief'));
  assert.notEqual(fingerprintOf('Draft the brief'), fingerprintOf('Approve the brief'));
});
