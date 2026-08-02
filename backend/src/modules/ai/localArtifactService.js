const { summarySchema, mindMapSchema } = require('./schemas');

const LOCAL_MODEL = 'local-extractive-v1';
const MAX_NODES = 40;
const SOURCE_CHUNK_SIZE = 1800;

const STOP_WORDS = new Set(
  [
    'about', 'after', 'again', 'against', 'also', 'among', 'and', 'any', 'are',
    'because', 'been', 'before', 'being', 'between', 'both', 'but', 'can',
    'could', 'did', 'does', 'doing', 'done', 'each', 'for', 'from', 'further',
    'had', 'has', 'have', 'having', 'here', 'how', 'into', 'its', 'itself',
    'just', 'more', 'most', 'not', 'now', 'of', 'off', 'once', 'only', 'other',
    'our', 'out', 'over', 'same', 'should', 'some', 'such', 'than', 'that',
    'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'too', 'under', 'until', 'very', 'was', 'were', 'what', 'when',
    'where', 'which', 'while', 'who', 'will', 'with', 'would', 'you', 'your'
  ]
);

const decodeHtmlEntities = (value = '') =>
  String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

const cleanText = (value = '') =>
  decodeHtmlEntities(String(value).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const contentSource = (content) => {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content.html === 'string') return content.html;
  return '';
};

const extractDeltaBlocks = (operations) => {
  const blocks = [];
  operations.forEach((operation) => {
    if (typeof operation.insert !== 'string') return;
    const lines = operation.insert.split(/\n+/).map(cleanText).filter(Boolean);
    lines.forEach((text) => {
      const headingLevel = Number(operation.attributes?.header) || null;
      blocks.push({
        type: headingLevel ? 'heading' : operation.attributes?.list ? 'list' : 'paragraph',
        level: headingLevel,
        text
      });
    });
  });
  return blocks;
};

const extractStructuredBlocks = (content) => {
  if (Array.isArray(content?.ops)) return extractDeltaBlocks(content.ops);
  const source = contentSource(content);
  if (!source) return [];

  const blocks = [];
  const blockPattern = /<(h[1-6]|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = blockPattern.exec(source))) {
    const tag = match[1].toLowerCase();
    const text = cleanText(match[2]);
    if (!text) continue;
    blocks.push({
      type: tag.startsWith('h') ? 'heading' : tag === 'li' ? 'list' : 'paragraph',
      level: tag.startsWith('h') ? Number(tag.slice(1)) : null,
      text
    });
  }

  if (blocks.length) return blocks;
  return decodeHtmlEntities(source.replace(/<[^>]+>/g, ' '))
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(cleanText)
    .filter(Boolean)
    .map((text) => ({ type: 'paragraph', level: null, text }));
};

const plainTextFromContent = (content) => {
  if (Array.isArray(content?.ops)) {
    return content.ops
      .map((operation) => (typeof operation.insert === 'string' ? operation.insert : ' '))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return cleanText(contentSource(content));
};

const splitSentences = (text) =>
  String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(cleanText)
    .filter((sentence) => sentence.length >= 20);

const words = (text) =>
  String(text || '')
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}][\p{L}\p{N}'’-]{2,}/gu) || [];

const significantWords = (text) =>
  words(text).filter((word) => !STOP_WORDS.has(word) && !/^\d+$/.test(word));

const buildTermFrequency = (text) => {
  const frequency = new Map();
  significantWords(text).forEach((word) => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });
  return frequency;
};

const topThemes = (text, limit = 6) =>
  [...buildTermFrequency(text).entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

const rankSentences = (text) => {
  const sentences = splitSentences(text);
  const frequency = buildTermFrequency(text);
  const maxFrequency = Math.max(1, ...frequency.values());
  return sentences
    .map((sentence, index) => {
      const tokens = significantWords(sentence);
      const lexicalScore = tokens.reduce(
        (score, token) => score + (frequency.get(token) || 0) / maxFrequency,
        0
      ) / Math.max(tokens.length, 1);
      const lengthScore = sentence.length >= 45 && sentence.length <= 220 ? 0.25 : 0;
      const positionScore = index < 3 ? 0.2 - index * 0.05 : 0;
      return { sentence, index, score: lexicalScore + lengthScore + positionScore };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);
};

const uniqueText = (values, limit) => {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const normalized = value.toLocaleLowerCase();
    if (!normalized || seen.has(normalized) || result.length >= limit) return;
    seen.add(normalized);
    result.push(value);
  });
  return result;
};

const truncate = (value, limit) => {
  const text = cleanText(value);
  if (text.length <= limit) return text;
  const shortened = text.slice(0, limit - 1);
  const boundary = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, boundary > limit * 0.6 ? boundary : undefined)}…`;
};

const nodeLabel = (value) => {
  const text = cleanText(value).replace(/[.!?]+$/, '');
  const tokens = text.split(/\s+/);
  return truncate(tokens.slice(0, 8).join(' '), 64);
};

const sourceChunkIndex = (plainText, quote) => {
  const position = plainText.toLocaleLowerCase().indexOf(quote.toLocaleLowerCase());
  return position < 0 ? 0 : Math.floor(position / SOURCE_CHUNK_SIZE);
};

const extractActionItem = (sentence) => {
  const ownerMatch = sentence.match(/(?:owner|assigned to)\s*[:\-]\s*([^,.;]+)/i);
  const dueMatch = sentence.match(/(?:due|deadline)\s*[:\-]?\s*([^,.;]+)/i);
  return {
    task: truncate(sentence, 220),
    owner: ownerMatch ? truncate(ownerMatch[1], 80) : null,
    dueDate: dueMatch ? truncate(dueMatch[1], 60) : null
  };
};

const generateLocalSummary = (document, plainText) => {
  const ranked = rankSentences(plainText);
  const overviewSentences = ranked
    .slice(0, 2)
    .sort((left, right) => left.index - right.index)
    .map((item) => item.sentence);
  const overview =
    overviewSentences.join(' ') ||
    `This document, “${document.title},” does not yet contain enough prose for an extractive overview.`;
  const keyPoints = uniqueText(
    ranked.slice(0, 8).map((item) => truncate(item.sentence, 220)),
    6
  );
  const actionItems = uniqueText(
    extractStructuredBlocks(document.content)
      .map((block) => block.text)
      .filter((text) =>
        /\b(action|todo|must|should|need(?:s)? to|next step|follow[- ]?up|deadline|due)\b/i.test(text)
      ),
    8
  ).map(extractActionItem);
  const sources = ranked.slice(0, 4).map((item) => ({
    chunkIndex: sourceChunkIndex(plainText, item.sentence),
    quote: truncate(item.sentence, 240)
  }));

  return summarySchema.parse({
    title: `Summary of ${document.title}`,
    overview,
    keyPoints,
    actionItems,
    themes: topThemes(plainText),
    sources
  });
};

const createMindMapBuilder = (plainText) => {
  const nodes = [];
  const edges = [];
  let nextId = 1;
  const addNode = ({ label, description, parentId = null, sourceText = '' }) => {
    if (nodes.length >= MAX_NODES) return null;
    const id = parentId ? `node-${nextId++}` : 'root';
    nodes.push({
      id,
      label: truncate(label, 64) || 'Untitled topic',
      description: truncate(description || label, 180),
      parentId,
      sourceChunks: [sourceChunkIndex(plainText, sourceText || description || label)]
    });
    if (parentId) edges.push({ source: parentId, target: id, label: 'contains' });
    return id;
  };
  return { nodes, edges, addNode };
};

const generateHeadingMindMap = (document, plainText, blocks) => {
  const builder = createMindMapBuilder(plainText);
  const rootId = builder.addNode({
    label: document.title,
    description: rankSentences(plainText)[0]?.sentence || `Key ideas from ${document.title}`,
    sourceText: plainText.slice(0, 200)
  });
  const headingStack = [];
  let currentParent = rootId;

  blocks.forEach((block) => {
    if (builder.nodes.length >= MAX_NODES) return;
    if (block.type === 'heading') {
      while (headingStack.length && headingStack.at(-1).level >= block.level) {
        headingStack.pop();
      }
      if (
        headingStack.length === 0 &&
        block.text.toLocaleLowerCase() === document.title.toLocaleLowerCase()
      ) {
        headingStack.push({ level: block.level, id: rootId });
        currentParent = rootId;
        return;
      }
      const parentId = headingStack.at(-1)?.id || rootId;
      const id = builder.addNode({
        label: block.text,
        description: `Section from ${document.title}`,
        parentId,
        sourceText: block.text
      });
      if (id) headingStack.push({ level: block.level, id });
      currentParent = id || parentId;
      return;
    }

    const sentences = splitSentences(block.text);
    const source = sentences[0] || block.text;
    const id = builder.addNode({
      label: nodeLabel(source),
      description: source,
      parentId: currentParent || rootId,
      sourceText: block.text
    });
    if (block.type === 'list' && sentences.length > 1 && id) {
      sentences.slice(1, 3).forEach((sentence) => {
        builder.addNode({
          label: nodeLabel(sentence),
          description: sentence,
          parentId: id,
          sourceText: sentence
        });
      });
    }
  });

  return mindMapSchema.parse({
    title: `${document.title} mind map`,
    nodes: builder.nodes,
    edges: builder.edges
  });
};

const generateThemeMindMap = (document, plainText) => {
  const builder = createMindMapBuilder(plainText);
  const ranked = rankSentences(plainText);
  const rootId = builder.addNode({
    label: document.title,
    description: ranked[0]?.sentence || `Key ideas from ${document.title}`,
    sourceText: plainText.slice(0, 200)
  });
  const themes = topThemes(plainText, 5);
  const assigned = new Set();

  themes.forEach((theme) => {
    const normalizedTheme = theme.toLocaleLowerCase();
    const related = ranked.filter((item) =>
      significantWords(item.sentence).includes(normalizedTheme)
    );

    // A single broad sentence can match every theme. Claiming it as this theme's
    // description would repeat the same text across the whole map, so each theme
    // takes the best sentence no other theme has taken yet.
    const ownSentence = related.find((item) => !assigned.has(item.sentence));
    const description = ownSentence
      ? ownSentence.sentence
      : `Recurring reference across ${related.length || 'several'} passages.`;
    if (ownSentence) assigned.add(ownSentence.sentence);

    const themeId = builder.addNode({
      label: theme,
      description,
      parentId: rootId,
      sourceText: ownSentence?.sentence || theme
    });

    let children = 0;
    related.forEach((item) => {
      if (!themeId || children >= 3 || assigned.has(item.sentence)) return;
      if (builder.nodes.length >= MAX_NODES) return;
      assigned.add(item.sentence);
      children += 1;
      builder.addNode({
        label: nodeLabel(item.sentence),
        description: item.sentence,
        parentId: themeId,
        sourceText: item.sentence
      });
    });
  });

  ranked.slice(0, 8).forEach((item) => {
    if (assigned.has(item.sentence) || builder.nodes.length >= MAX_NODES) return;
    builder.addNode({
      label: nodeLabel(item.sentence),
      description: item.sentence,
      parentId: rootId,
      sourceText: item.sentence
    });
  });

  return mindMapSchema.parse({
    title: `${document.title} mind map`,
    nodes: builder.nodes,
    edges: builder.edges
  });
};

const generateLocalMindMap = (document, plainText) => {
  const blocks = extractStructuredBlocks(document.content);
  const hasHeadings = blocks.some((block) => block.type === 'heading');
  return hasHeadings
    ? generateHeadingMindMap(document, plainText, blocks)
    : generateThemeMindMap(document, plainText);
};

const generateLocalArtifact = ({ document, type }) => {
  const plainText = plainTextFromContent(document.content);
  if (!plainText) {
    const error = new Error('Add some content to the document before generating knowledge.');
    error.status = 422;
    throw error;
  }
  if (type === 'summary') return generateLocalSummary(document, plainText);
  if (type === 'mind_map') return generateLocalMindMap(document, plainText);
  const error = new Error('Unsupported local artifact type.');
  error.status = 400;
  throw error;
};

module.exports = {
  LOCAL_MODEL,
  SOURCE_CHUNK_SIZE,
  STOP_WORDS,
  splitSentences,
  extractStructuredBlocks,
  plainTextFromContent,
  rankSentences,
  generateLocalSummary,
  generateLocalMindMap,
  generateLocalArtifact
};
