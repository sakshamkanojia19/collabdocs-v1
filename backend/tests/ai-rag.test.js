const test = require('node:test');
const assert = require('node:assert/strict');
const {
  documentToPlainText,
  chunkText,
  cosineSimilarity
} = require('../src/modules/ai/ragService');
const {
  LOCAL_MODEL,
  generateLocalSummary,
  generateLocalMindMap,
  plainTextFromContent
} = require('../src/modules/ai/localArtifactService');

test('AI indexing converts editor HTML into readable text', () => {
  const result = documentToPlainText({
    html: '<h1>Launch plan</h1><p>Ship the product &amp; notify customers.</p>'
  });

  assert.match(result, /Launch plan/);
  assert.match(result, /Ship the product & notify customers/);
  assert.doesNotMatch(result, /<h1>/);
});

test('AI chunking is deterministic and keeps every segment within the limit', () => {
  const text = Array.from(
    { length: 18 },
    (_, index) => `Section ${index + 1}. ${'Useful project context. '.repeat(12)}`
  ).join('\n\n');

  const first = chunkText(text, 500, 60);
  const second = chunkText(text, 500, 60);

  assert.deepEqual(first, second);
  assert.ok(first.length > 1);
  assert.ok(first.every((chunk) => chunk.length <= 500));
});

test('cosine similarity ranks aligned vectors above unrelated vectors', () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.ok(cosineSimilarity([1, 1], [1, 0]) > 0);
});

test('local summary generation is deterministic and extracts actions without an API', () => {
  const document = {
    title: 'Launch plan',
    content: {
      html: [
        '<h1>Launch plan</h1>',
        '<p>The product launch focuses on onboarding and reliability for enterprise customers.</p>',
        '<p>The team must finish the migration checklist before launch. Owner: Priya. Due: Friday.</p>',
        '<p>Customer communication will explain the new workflow and support options.</p>'
      ].join('')
    }
  };
  const plainText = plainTextFromContent(document.content);
  const first = generateLocalSummary(document, plainText);
  const second = generateLocalSummary(document, plainText);

  assert.equal(LOCAL_MODEL, 'local-extractive-v1');
  assert.deepEqual(first, second);
  assert.match(first.overview, /launch/i);
  assert.ok(first.keyPoints.length >= 1);
  assert.equal(first.actionItems[0].owner, 'Priya');
  assert.equal(first.actionItems[0].dueDate, 'Friday');
});

test('local mind-map generation preserves heading hierarchy and list details', () => {
  const document = {
    title: 'Project Northstar',
    content: {
      html: [
        '<h1>Project Northstar</h1>',
        '<p>Northstar improves the collaborative editing workflow.</p>',
        '<h2>Goals</h2>',
        '<ul><li>Reduce document setup time for new teams.</li><li>Keep decisions connected to their source.</li></ul>',
        '<h3>Success measures</h3>',
        '<p>Teams should complete onboarding in less than ten minutes.</p>',
        '<h2>Delivery</h2>',
        '<p>The rollout starts with a controlled workspace pilot.</p>'
      ].join('')
    }
  };
  const plainText = plainTextFromContent(document.content);
  const result = generateLocalMindMap(document, plainText);
  const goals = result.nodes.find((node) => node.label === 'Goals');
  const success = result.nodes.find((node) => node.label === 'Success measures');
  const delivery = result.nodes.find((node) => node.label === 'Delivery');

  assert.equal(result.nodes[0].id, 'root');
  assert.equal(goals.parentId, 'root');
  assert.equal(success.parentId, goals.id);
  assert.equal(delivery.parentId, 'root');
  assert.ok(result.nodes.some((node) => /Reduce document setup time/i.test(node.label)));
  assert.ok(result.edges.every((edge) =>
    result.nodes.some((node) => node.id === edge.source) &&
    result.nodes.some((node) => node.id === edge.target)
  ));
});
