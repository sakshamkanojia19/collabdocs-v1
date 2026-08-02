const PAGE_ATTRIBUTE = 'data-document-page';
const CARET_ATTRIBUTE = 'data-pagination-caret';
const CONTINUATION_ATTRIBUTE = 'data-pagination-continuation';
const EMPTY_DOCUMENT_HTML = '<p><br></p>';
const OVERFLOW_TOLERANCE_PX = 2;
const MAX_PAGES = 500;

const SPLITTABLE_BLOCKS = new Set([
  'ADDRESS',
  'BLOCKQUOTE',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'PRE'
]);

const isPage = (node) =>
  node?.nodeType === Node.ELEMENT_NODE && node.getAttribute(PAGE_ATTRIBUTE) === 'true';

const isMeaningfullyEmpty = (element) => {
  if (!element) return true;
  if (element.querySelector('img, table, hr, iframe, video, audio, canvas, svg')) return false;
  return !element.textContent?.replace(/\u200b/g, '').trim();
};

const createPage = (ownerDocument) => {
  const page = ownerDocument.createElement('div');
  page.className = 'editor-page';
  page.setAttribute(PAGE_ATTRIBUTE, 'true');
  return page;
};

const mergeBlockContinuations = (root) => {
  root.querySelectorAll?.(`[${CONTINUATION_ATTRIBUTE}]`).forEach((continuation) => {
    const previous = continuation.previousElementSibling;
    if (previous?.tagName === continuation.tagName) {
      while (continuation.firstChild) previous.appendChild(continuation.firstChild);
      continuation.remove();
      return;
    }
    continuation.removeAttribute(CONTINUATION_ATTRIBUTE);
  });
};

const pageOverflows = (page) =>
  page.scrollHeight > page.clientHeight + OVERFLOW_TOLERANCE_PX;

/**
 * Browser editing commands can occasionally place nodes beside a page wrapper.
 * Flattening every wrapper first gives the paginator one canonical document flow.
 */
const collectDocumentNodes = (editor) => {
  const fragment = editor.ownerDocument.createDocumentFragment();
  Array.from(editor.childNodes).forEach((node) => {
    if (isPage(node)) {
      while (node.firstChild) fragment.appendChild(node.firstChild);
      return;
    }
    fragment.appendChild(node);
  });
  mergeBlockContinuations(fragment);
  return fragment;
};

const insertCaretMarker = (editor) => {
  const selection = editor.ownerDocument.defaultView?.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return null;

  const marker = editor.ownerDocument.createElement('span');
  marker.setAttribute(CARET_ATTRIBUTE, 'true');
  marker.setAttribute('aria-hidden', 'true');
  marker.textContent = '\u200b';
  range.insertNode(marker);
  return marker;
};

const restoreCaret = (marker) => {
  if (!marker?.isConnected) return;
  const selection = marker.ownerDocument.defaultView?.getSelection();
  if (!selection) {
    marker.remove();
    return;
  }

  const range = marker.ownerDocument.createRange();
  range.setStartBefore(marker);
  range.collapse(true);
  marker.remove();
  selection.removeAllRanges();
  selection.addRange(range);
};

const findLastFittingTextPosition = (page, block) => {
  if (!SPLITTABLE_BLOCKS.has(block.tagName)) return null;

  const view = page.ownerDocument.defaultView;
  const computedStyle = view?.getComputedStyle(page);
  const bottomPadding = Number.parseFloat(computedStyle?.paddingBottom || '0');
  const contentBottom = page.getBoundingClientRect().bottom - bottomPadding;
  const walker = page.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.length) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest(`[${CARET_ATTRIBUTE}]`)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let lastFitting = null;
  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    const length = textNode.textContent.length;
    const fullRange = page.ownerDocument.createRange();
    fullRange.setStart(textNode, 0);
    fullRange.setEnd(textNode, length);
    const fullRect = fullRange.getBoundingClientRect();

    if (fullRect.height && fullRect.bottom <= contentBottom + OVERFLOW_TOLERANCE_PX) {
      lastFitting = { node: textNode, offset: length };
      continue;
    }

    let low = 0;
    let high = length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      const range = page.ownerDocument.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, middle);
      const rect = range.getBoundingClientRect();
      if (rect.height && rect.bottom <= contentBottom + OVERFLOW_TOLERANCE_PX) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }

    if (low > 0) {
      const fittingText = textNode.textContent.slice(0, low);
      const wordBoundary = Math.max(
        fittingText.lastIndexOf(' '),
        fittingText.lastIndexOf('\n'),
        fittingText.lastIndexOf('\t')
      );
      lastFitting = {
        node: textNode,
        offset: wordBoundary > 0 ? wordBoundary + 1 : low
      };
    }
    break;
  }

  return lastFitting;
};

/**
 * Split a text block at the last rendered character that fits on the current
 * page. Range.extractContents preserves nested inline formatting in the tail.
 */
const splitOverflowingBlock = (page, block) => {
  const split = findLastFittingTextPosition(page, block);
  if (!split) return null;

  const tailRange = page.ownerDocument.createRange();
  tailRange.setStart(split.node, split.offset);
  tailRange.setEnd(block, block.childNodes.length);
  const tail = tailRange.extractContents();
  if (!tail.textContent?.replace(/\u200b/g, '').trim() && !tail.querySelector?.('*')) {
    block.appendChild(tail);
    return null;
  }

  const continuation = block.cloneNode(false);
  continuation.removeAttribute('id');
  continuation.setAttribute(CONTINUATION_ATTRIBUTE, 'true');
  continuation.appendChild(tail);
  return continuation;
};

const removeEmptyTrailingPages = (editor) => {
  const pages = Array.from(editor.children).filter(isPage);
  for (let index = pages.length - 1; index > 0; index -= 1) {
    if (!isMeaningfullyEmpty(pages[index])) break;
    pages[index].remove();
  }
};

/**
 * Reflows the editor's semantic block nodes into fixed-height visual pages.
 * Page wrappers are presentation-only and are never returned by serialization.
 */
export const paginateEditor = (editor, { preserveCaret = true } = {}) => {
  if (!editor) return 1;

  const marker = preserveCaret ? insertCaretMarker(editor) : null;
  const documentNodes = collectDocumentNodes(editor);
  const firstPage = createPage(editor.ownerDocument);
  firstPage.appendChild(documentNodes);
  editor.replaceChildren(firstPage);

  let page = firstPage;
  let pageCount = 1;
  let paginationOperations = 0;

  while (
    page &&
    pageOverflows(page) &&
    pageCount < MAX_PAGES &&
    paginationOperations < MAX_PAGES * 100
  ) {
    paginationOperations += 1;
    let nextPage = page.nextElementSibling;
    if (!isPage(nextPage)) {
      nextPage = createPage(editor.ownerDocument);
      page.after(nextPage);
      pageCount += 1;
    }

    const overflowBlock = page.lastElementChild || page.lastChild;
    if (!overflowBlock) break;

    const onlyBlock = page.childNodes.length === 1;
    const continuation =
      overflowBlock.nodeType === Node.ELEMENT_NODE
        ? splitOverflowingBlock(page, overflowBlock)
        : null;

    if (continuation) {
      nextPage.insertBefore(continuation, nextPage.firstChild);
    } else if (!onlyBlock) {
      nextPage.insertBefore(overflowBlock, nextPage.firstChild);
    } else {
      // Large tables/images cannot be safely divided without changing content.
      // Keep the object intact and expose the overflow instead of losing data.
      page.classList.add('editor-page--oversized-content');
      page = nextPage;
      continue;
    }

    if (!pageOverflows(page)) page = nextPage;
  }

  removeEmptyTrailingPages(editor);
  const pages = Array.from(editor.children).filter(isPage);
  if (pages.length === 0) {
    const emptyPage = createPage(editor.ownerDocument);
    emptyPage.innerHTML = EMPTY_DOCUMENT_HTML;
    editor.appendChild(emptyPage);
  }

  restoreCaret(marker);
  return editor.querySelectorAll(`:scope > [${PAGE_ATTRIBUTE}="true"]`).length;
};

export const serializePaginatedContent = (editor) => {
  if (!editor) return '';
  const clone = editor.cloneNode(true);
  clone.querySelectorAll(`[${CARET_ATTRIBUTE}]`).forEach((marker) => marker.remove());
  const pages = Array.from(clone.children).filter(isPage);
  if (pages.length === 0) return clone.innerHTML;

  const semanticContent = clone.ownerDocument.createElement('div');
  pages.forEach((page) => {
    while (page.firstChild) semanticContent.appendChild(page.firstChild);
  });
  mergeBlockContinuations(semanticContent);
  semanticContent
    .querySelectorAll(`[${CONTINUATION_ATTRIBUTE}]`)
    .forEach((continuation) => continuation.removeAttribute(CONTINUATION_ATTRIBUTE));
  return semanticContent.innerHTML;
};

export const hydratePaginatedEditor = (editor, html) => {
  if (!editor) return 1;
  const firstPage = createPage(editor.ownerDocument);
  firstPage.innerHTML = html || EMPTY_DOCUMENT_HTML;
  editor.replaceChildren(firstPage);
  return paginateEditor(editor, { preserveCaret: false });
};

export const appendHtmlToPaginatedEditor = (editor, html) => {
  if (!editor || !html) return 1;
  let lastPage = Array.from(editor.children).filter(isPage).at(-1);
  if (!lastPage) {
    lastPage = createPage(editor.ownerDocument);
    editor.appendChild(lastPage);
  }
  lastPage.insertAdjacentHTML('beforeend', html);
  return paginateEditor(editor, { preserveCaret: false });
};
