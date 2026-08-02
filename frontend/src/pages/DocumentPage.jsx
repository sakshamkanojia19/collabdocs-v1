import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDocumentById,
  updateDocument,
  shareDocument,
  removeCollaborator,
  deleteDocument,
  clearContentInsert,
  clearAnchorFocus
} from '../store/documentSlice';
import {
  setCurrentDocumentId,
  documentContentChanged,
  userJoined,
  userLeft,
  setActiveUsers
} from '../store/collaborationSlice';
import { openChatPanel, setComposerAnchor } from '../store/chatSlice';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';
import api from '../services/api';
import { getKnowledgeError } from '../lib/knowledge-errors';
import {
  appendHtmlToPaginatedEditor,
  hydratePaginatedEditor,
  paginateEditor,
  serializePaginatedContent
} from '../lib/document-pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Share2,
  MessageSquare,
  Trash2,
  Copy,
  Check,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Undo,
  Redo,
  Link2,
  Lock,
  UsersRound,
  Image as ImageIcon,
  Table as TableIcon,
  Highlighter,
  Palette,
  Type,
  Bot,
  ChevronLeft,
  FileText,
  Gavel,
  Info,
  ListTree,
  MessagesSquare,
  Network,
  PanelRight,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import DecisionLogPanel from '../components/documents/DecisionLogPanel';

const FONT_FAMILIES = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Tahoma',
  'Courier New'
];

const FONT_SIZES = [
  { label: 'Small', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Large', value: '4' },
  { label: 'Huge', value: '5' }
];

const HEADINGS = [
  { label: 'Paragraph', value: 'P' },
  { label: 'Heading 1', value: 'H1' },
  { label: 'Heading 2', value: 'H2' },
  { label: 'Heading 3', value: 'H3' }
];

const deltaToHtml = (delta) => {
  if (!delta || !Array.isArray(delta.ops)) {
    return '';
  }
  return delta.ops
    .map((op) => {
      if (typeof op.insert === 'string') {
        return op.insert.replace(/\n/g, '<br />');
      }
      return '';
    })
    .join('');
};

const deriveHtmlFromContent = (content) => {
  if (content == null) {
    return '';
  }

  if (typeof content === 'string') {
    let trimmed = content.trim();

    const startsWithQuote =
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"));

    if (startsWithQuote) {
      try {
        trimmed = JSON.parse(trimmed);
        return deriveHtmlFromContent(trimmed);
      } catch (err) {
        console.warn('Unable to parse quoted persisted document content string', err);
        return trimmed.slice(1, -1);
      }
    }

    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return deriveHtmlFromContent(parsed);
      } catch (err) {
        console.warn('Unable to parse persisted document content string', err);
        return trimmed;
      }
    }

    return trimmed;
  }

  if (typeof content === 'object') {
    if (typeof content.html === 'string') {
      return content.html;
    }
    if (Array.isArray(content.ops)) {
      return deltaToHtml(content);
    }
    if (content.html && typeof content.html === 'object') {
      return deriveHtmlFromContent(content.html);
    }
    return JSON.stringify(content);
  }

  return String(content);
};

const SERIALIZED_EMPTY_HTML_REGEX = /^\s*{\s*"html"\s*:\s*""\s*}\s*/i;

const sanitizeHtmlString = (html) => {
  if (typeof html !== 'string') {
    return '';
  }
  return html.replace(SERIALIZED_EMPTY_HTML_REGEX, '');
};

const extractSanitizedHtmlFromContent = (content) => {
  const html = deriveHtmlFromContent(content);
  return sanitizeHtmlString(typeof html === 'string' ? html : '');
};

const DocumentPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentDocument, loading, error, pendingInsert, anchorTarget } = useSelector(
    (state) => state.document
  );
  const { activeUsers } = useSelector((state) => state.collaboration);
  const { user, entitlements, account } = useSelector((state) => state.auth);
  const providerAIEntitled = Boolean(entitlements?.features?.providerAI);
  const isDocumentLoading = loading && !currentDocument;

  const [documentTitle, setDocumentTitle] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareQuery, setShareQuery] = useState('');
  const [shareResults, setShareResults] = useState([]);
  const [selectedRole, setSelectedRole] = useState('viewer');
  const [shareError, setShareError] = useState(null);
  const [shareFeedback, setShareFeedback] = useState(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isProcessingShare, setIsProcessingShare] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState('ai');
  // User-adjustable inspector width, persisted. Clamped so it can neither
  // collapse into an unreadable sliver nor swallow the editor.
  const [inspectorWidth, setInspectorWidth] = useState(() => {
    const stored = Number(window.localStorage.getItem('cd:inspector-width'));
    return Number.isFinite(stored) && stored >= 280 && stored <= 640 ? stored : 310;
  });
  const inspectorRef = useRef(null);

  const startInspectorResize = (event) => {
    event.preventDefault();
    const rightEdge = inspectorRef.current?.getBoundingClientRect().right ?? window.innerWidth;
    const clampWidth = (clientX) => Math.min(640, Math.max(280, Math.round(rightEdge - clientX)));
    const onMove = (move) => setInspectorWidth(clampWidth(move.clientX));
    const onUp = (up) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.localStorage.setItem('cd:inspector-width', String(clampWidth(up.clientX)));
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const resetInspectorWidth = () => {
    setInspectorWidth(310);
    window.localStorage.setItem('cd:inspector-width', '310');
  };
  const [aiView, setAiView] = useState('summary');
  const [aiArtifact, setAiArtifact] = useState(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [knowledgeCapabilities, setKnowledgeCapabilities] = useState(null);
  const [selection, setSelection] = useState(null);
  const [insertFeedback, setInsertFeedback] = useState('');

  const saveTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const searchDelayRef = useRef(null);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const hasInitializedContentRef = useRef(false);
  const isComposingRef = useRef(false);
  const lastSavedHtmlRef = useRef('');
  const paginationFrameRef = useRef(null);

  const shareLink = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/document/${id}`;
  }, [id]);

  const userRole = useMemo(() => {
    if (!currentDocument || !user) {
      return null;
    }
    if (currentDocument.owner?.userId === user.id) {
      return 'owner';
    }
    const collaborator = currentDocument.collaborators?.find(
      (entry) => entry.userId === user.id
    );
    return collaborator?.role || 'viewer';
  }, [currentDocument, user]);

  const canEdit = userRole === 'owner' || userRole === 'editor';
  const canShare = userRole === 'owner';

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    if (document.getElementById('doc-editor-styles')) {
      return undefined;
    }
    const style = document.createElement('style');
    style.id = 'doc-editor-styles';
    style.innerHTML = `
      .doc-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0.5rem 0;
      }
      .doc-table td,
      .doc-table th {
        border: 1px solid rgba(148, 163, 184, 0.6);
        padding: 8px;
        min-width: 80px;
        vertical-align: top;
      }
      .doc-table th {
        background: rgba(226, 232, 240, 0.6);
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
    return () => {
      // Keep the style for future mounts; do not remove to avoid flashes.
    };
  }, []);

  const participants = useMemo(() => {
    const list = Array.isArray(activeUsers) ? activeUsers : [];
    const map = new Map();
    list.forEach((participant) => {
      if (participant?.userId) {
        map.set(participant.userId, {
          userId: participant.userId,
          name: participant.name,
          email: participant.email,
          role: participant.role || 'viewer'
        });
      }
    });
    if (user?.id && userRole) {
      const existing = map.get(user.id) || {};
      map.set(user.id, {
        userId: user.id,
        name: existing.name || user?.name,
        email: existing.email || user?.email,
        role: existing.role || userRole
      });
    }
    return Array.from(map.values());
  }, [activeUsers, user, userRole]);

  const handleCopyLink = useCallback(async () => {
    if (typeof navigator === 'undefined' || !shareLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  }, [shareLink]);

  const handleShareUser = useCallback(
    async (targetUser) => {
      if (!canShare || !targetUser?._id || !currentDocument) {
        return;
      }
      setIsProcessingShare(true);
      try {
        await dispatch(
          shareDocument({
            id,
            collaborator: {
              userId: targetUser._id,
              name: targetUser.name || targetUser.email,
              email: targetUser.email,
              role: selectedRole
            }
          })
        ).unwrap();
        setShareFeedback(
          `${selectedRole === 'editor' ? 'Granted edit access to' : 'Shared with'} ${targetUser.email}`
        );
        setShareError(null);
        setShareQuery('');
        setShareResults([]);
      } catch (err) {
        setShareError(err?.error || err?.message || 'Unable to update collaborator access');
      } finally {
        setIsProcessingShare(false);
      }
    },
    [canShare, currentDocument, dispatch, id, selectedRole]
  );

  const handleRemoveCollaborator = useCallback(
    async (collaboratorId) => {
      if (!canShare || !collaboratorId) {
        return;
      }
      try {
        await dispatch(removeCollaborator({ id, collaboratorId })).unwrap();
      } catch (err) {
        console.error('Failed to remove collaborator', err);
        setShareError('Unable to remove collaborator right now.');
      }
    },
    [canShare, dispatch, id]
  );

  const handleDeleteDocument = useCallback(async () => {
    if (userRole !== 'owner' || !currentDocument) {
      return;
    }
    if (!window.confirm('Delete this document for everyone? This cannot be undone.')) {
      return;
    }
    try {
      await dispatch(deleteDocument(currentDocument._id)).unwrap();
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to delete document', err);
      alert('Unable to delete the document right now.');
    }
  }, [currentDocument, dispatch, navigate, userRole]);

  const editorCount = participants.filter(
    (participant) => participant.role === 'owner' || participant.role === 'editor'
  ).length;
  const viewerCount = participants.filter((participant) => participant.role === 'viewer').length;

  const scheduleSave = useCallback(
    (html) => {
      if (!canEdit || !currentDocument) {
        return;
      }

      const normalized = sanitizeHtmlString(html ?? '');
      if (normalized === lastSavedHtmlRef.current) {
        return;
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(() => {
        setIsSaving(true);
        dispatch(
          updateDocument({
            id: currentDocument._id,
            documentData: {
              content: { html: normalized }
            }
          })
        )
          .unwrap()
          .then(() => {
            lastSavedHtmlRef.current = normalized;
          })
          .catch((err) => {
            console.error('Failed to save document:', err);
          })
          .finally(() => {
            setIsSaving(false);
            saveTimeoutRef.current = null;
          });
      }, 1000);
    },
    [canEdit, currentDocument, dispatch]
  );

  const handleEditorInput = useCallback(() => {
    if (!editorRef.current || isComposingRef.current) {
      return;
    }

    const nextPageCount = paginateEditor(editorRef.current);
    setPageCount(nextPageCount);
    const rawHtml = serializePaginatedContent(editorRef.current);
    const sanitizedHtml = sanitizeHtmlString(rawHtml);
    const editorHtml = sanitizedHtml || '<p><br/></p>';
    setDocumentContent(editorHtml);
    scheduleSave(sanitizedHtml);
    const socket = socketRef.current || getSocket();
    if (socket && canEdit) {
      socket.emit('documentChange', {
        documentId: id,
        html: sanitizedHtml,
        source: 'user'
      });
    }
  }, [canEdit, id, scheduleSave]);

  // The native color picker, the font/size select popovers, and file dialogs
  // all steal focus, which destroys the editor's text selection before the
  // command can run. The last in-editor selection is captured continuously and
  // restored whenever a command executes against a lost selection.
  const savedSelectionRef = useRef(null);

  useEffect(() => {
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (
        selection &&
        selection.rangeCount > 0 &&
        editorRef.current?.contains(selection.anchorNode)
      ) {
        savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener('selectionchange', rememberSelection);
    return () => document.removeEventListener('selectionchange', rememberSelection);
  }, []);

  const execCommand = useCallback(
    (command, value = null) => {
      if (!canEdit) {
        return;
      }

      const selection = window.getSelection();
      const selectionInEditor =
        selection &&
        selection.rangeCount > 0 &&
        editorRef.current?.contains(selection.anchorNode);

      editorRef.current?.focus();
      if (!selectionInEditor && savedSelectionRef.current && selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }

      // Colors need styleWithCSS so they render as inline spans instead of
      // deprecated <font> tags; hiliteColor falls back to backColor where
      // unsupported (Firefox).
      const effectiveCommand =
        command === 'hiliteColor' && !document.queryCommandSupported('hiliteColor')
          ? 'backColor'
          : command;
      const isColorCommand = ['foreColor', 'hiliteColor', 'backColor'].includes(effectiveCommand);

      if (isColorCommand) {
        const activeSelection = window.getSelection();
        const range = activeSelection?.rangeCount ? activeSelection.getRangeAt(0) : null;
        if (range && range.collapsed) {
          // No text selected: color what gets typed NEXT. The browser's native
          // "typing format" state is destroyed by the pagination DOM rewrites,
          // so a zero-width styled span carries the color instead — the caret
          // moves inside it and typed text inherits the style.
          const span = document.createElement('span');
          if (effectiveCommand === 'foreColor') span.style.color = value;
          else span.style.backgroundColor = value;
          span.appendChild(document.createTextNode('​'));
          range.insertNode(span);
          const caret = document.createRange();
          caret.setStart(span.firstChild, 1);
          caret.collapse(true);
          activeSelection.removeAllRanges();
          activeSelection.addRange(caret);
          // Persistence is deferred until the user actually types: running the
          // save/pagination pass now would rewrite the DOM and eject the caret
          // from the styled span before it ever receives a character.
          return;
        }
      }

      if (isColorCommand) document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(effectiveCommand, false, value);
      if (isColorCommand) document.execCommand('styleWithCSS', false, 'false');

      handleEditorInput();
    },
    [canEdit, handleEditorInput]
  );

  // Native color inputs: React's onChange maps to the 'input' event, which
  // fires while the picker dialog is still OPEN and holding focus — applying
  // then means the editor cannot take the selection back. The native 'change'
  // event fires once, when the dialog closes; applying there lets execCommand
  // refocus the editor with the caret inside the styled span, so the user can
  // simply continue typing in the chosen color.
  const execCommandRef = useRef(null);
  useEffect(() => {
    execCommandRef.current = execCommand;
  }, [execCommand]);

  const textColorInputRef = useRef(null);
  const highlightColorInputRef = useRef(null);

  useEffect(() => {
    const textInput = textColorInputRef.current;
    const highlightInput = highlightColorInputRef.current;
    if (!textInput && !highlightInput) return undefined;

    const applyTextColor = (event) => execCommandRef.current?.('foreColor', event.target.value);
    const applyHighlight = (event) => execCommandRef.current?.('hiliteColor', event.target.value);

    textInput?.addEventListener('change', applyTextColor);
    highlightInput?.addEventListener('change', applyHighlight);
    return () => {
      textInput?.removeEventListener('change', applyTextColor);
      highlightInput?.removeEventListener('change', applyHighlight);
    };
  }, [execCommand]);

  const handleInsertLink = () => {
    if (!canEdit) return;
    const url = window.prompt('Enter URL');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleInsertImage = (event) => {
    if (!canEdit) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      execCommand('insertImage', reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleInsertTable = () => {
    if (!canEdit) return;
    const rows = parseInt(window.prompt('Rows?', '3'), 10);
    const cols = parseInt(window.prompt('Columns?', '3'), 10);
    if (!rows || !cols || rows < 1 || cols < 1 || rows > 12 || cols > 12) {
      return;
    }
    let html = '<table class="doc-table"><tbody>';
    for (let r = 0; r < rows; r += 1) {
      html += '<tr>';
      for (let c = 0; c < cols; c += 1) {
        html += '<td><br/></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br/></p>';
    execCommand('insertHTML', html);
  };

  useEffect(() => {
    if (!id) {
      return;
    }
    dispatch(fetchDocumentById(id));
    dispatch(setCurrentDocumentId(id));
    return () => {
      dispatch(setCurrentDocumentId(null));
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (!currentDocument) {
      return;
    }

    const sanitizedHtml = extractSanitizedHtmlFromContent(currentDocument.content);
    const editorHtmlValue = sanitizedHtml || '<p><br/></p>';

    setDocumentTitle(currentDocument.title || '');
    setRenameValue(currentDocument.title || '');

    const currentEditorHtml = serializePaginatedContent(editorRef.current);
    const shouldHydrate =
      !hasInitializedContentRef.current ||
      !canEdit ||
      sanitizeHtmlString(currentEditorHtml) !== sanitizeHtmlString(editorHtmlValue);

    if (shouldHydrate) {
      setDocumentContent(editorHtmlValue);
    }

    if (!hasInitializedContentRef.current) {
      hasInitializedContentRef.current = true;
    }

    lastSavedHtmlRef.current = sanitizedHtml;
  }, [canEdit, currentDocument]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const desiredHtml = documentContent || '<p><br/></p>';
    const currentHtml = serializePaginatedContent(editorRef.current);
    if (
      sanitizeHtmlString(currentHtml) !== sanitizeHtmlString(desiredHtml) ||
      currentHtml !== desiredHtml
    ) {
      setPageCount(hydratePaginatedEditor(editorRef.current, desiredHtml));
    }
  }, [documentContent]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || typeof ResizeObserver === 'undefined') return undefined;

    const schedulePagination = () => {
      if (paginationFrameRef.current) {
        cancelAnimationFrame(paginationFrameRef.current);
      }
      paginationFrameRef.current = requestAnimationFrame(() => {
        setPageCount(paginateEditor(editor, { preserveCaret: false }));
        paginationFrameRef.current = null;
      });
    };

    const observer = new ResizeObserver(schedulePagination);
    observer.observe(editor);
    window.addEventListener('resize', schedulePagination);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedulePagination);
      if (paginationFrameRef.current) {
        cancelAnimationFrame(paginationFrameRef.current);
        paginationFrameRef.current = null;
      }
    };
  }, [currentDocument?._id]);

  useEffect(() => {
    if (!isShareDialogOpen) {
      setShareQuery('');
      setShareResults([]);
      setShareFeedback(null);
      setShareError(null);
      if (searchDelayRef.current) {
        clearTimeout(searchDelayRef.current);
      }
      return undefined;
    }

    if (!shareQuery.trim()) {
      setShareResults([]);
      setShareError(null);
      return undefined;
    }

    searchDelayRef.current = setTimeout(async () => {
      try {
        setIsSearchingUsers(true);
        const response = await api.get('/auth/users/search', {
          params: { query: shareQuery.trim() }
        });
        setShareResults(response.data?.data?.users || []);
        setShareError(null);
      } catch (err) {
        setShareResults([]);
        setShareError(err.response?.data?.error || 'Unable to find matching users');
      } finally {
        setIsSearchingUsers(false);
      }
    }, 400);

    return () => {
      if (searchDelayRef.current) {
        clearTimeout(searchDelayRef.current);
      }
    };
  }, [isShareDialogOpen, shareQuery]);

  useEffect(() => {
    if (!id || !userRole) {
      return undefined;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token);
    socketRef.current = socket;

    const joinPayload = { documentId: id, role: userRole };

    const handleConnect = () => {
      socket.emit('joinDocument', joinPayload);
    };

    const handleDocumentContent = (content) => {
      const sanitizedHtml = extractSanitizedHtmlFromContent(content);
      const editorHtml = sanitizedHtml || '<p><br/></p>';
      setDocumentContent(editorHtml);
      lastSavedHtmlRef.current = sanitizedHtml;
    };

    const handleRemoteChange = ({ html, source, userId: changedUserId }) => {
      if (typeof html !== 'string') {
        return;
      }
      const sanitizedHtml = sanitizeHtmlString(html);
      const editorHtml = sanitizedHtml || '<p><br/></p>';
      setDocumentContent(editorHtml);
      lastSavedHtmlRef.current = sanitizedHtml;
      dispatch(

        documentContentChanged({
          documentId: id,
          delta: { html: sanitizedHtml },
          source,
          userId: changedUserId
        })
      );
    };

    const handleUserJoined = (payload) => {
      dispatch(userJoined({ ...payload, documentId: id }));
    };

    const handleUserLeft = (payload) => {
      dispatch(userLeft({ ...payload, documentId: id }));
    };

    const handleActiveUsers = (usersList = []) => {
      const normalized = usersList.map((item) => ({
        userId: item.userId || item.id,
        name: item.name,
        email: item.email,
        role: item.role || 'viewer'
      }));
      dispatch(setActiveUsers(normalized));
    };

    socket.on('connect', handleConnect);
    socket.on('documentContent', handleDocumentContent);
    socket.on('documentChange', handleRemoteChange);
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    socket.on('activeUsers', handleActiveUsers);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      const activeSocket = socketRef.current || getSocket();
      if (activeSocket) {
        activeSocket.emit('leaveDocument', { documentId: id });
        activeSocket.off('connect', handleConnect);
        activeSocket.off('documentContent', handleDocumentContent);
        activeSocket.off('documentChange', handleRemoteChange);
        activeSocket.off('userJoined', handleUserJoined);
        activeSocket.off('userLeft', handleUserLeft);
        activeSocket.off('activeUsers', handleActiveUsers);
      }
      socketRef.current = null;
      disconnectSocket();
    };
  }, [dispatch, id, userRole]);

  useEffect(() => {
    if (location.state?.openShare && canShare) {
      setIsShareDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [canShare, location, navigate]);

  const collaborators = useMemo(() => currentDocument?.collaborators ?? [], [currentDocument]);

  const documentChatContext = useMemo(() => {
    if (!currentDocument?._id) {
      return null;
    }
    const participantMap = new Map();
    const register = (participant) => {
      if (!participant?.userId || participantMap.has(participant.userId)) return;
      participantMap.set(participant.userId, {
        userId: participant.userId,
        name: participant.name || participant.email,
        email: participant.email
      });
    };
    register(currentDocument.owner);
    collaborators.forEach(register);

    return {
      type: 'document',
      documentId: currentDocument._id,
      documentTitle: currentDocument.title,
      defaultParticipants: Array.from(participantMap.values())
    };
  }, [collaborators, currentDocument]);

  const handleOpenDocumentChat = useCallback(() => {
    if (!documentChatContext) {
      return;
    }
    dispatch(openChatPanel({ context: documentChatContext }));
  }, [dispatch, documentChatContext]);

  /**
   * Tracks the caret selection inside the editor so a passage can be discussed.
   * Offsets are recorded for future precision, but the quote is what anchors the
   * comment today: it survives edits that shift positions.
   */
  const handleSelectionChange = useCallback(() => {
    const activeSelection = window.getSelection();
    if (!activeSelection || activeSelection.isCollapsed || !editorRef.current) {
      setSelection(null);
      return;
    }
    const range = activeSelection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }
    const quote = activeSelection.toString().replace(/\s+/g, ' ').trim();
    if (quote.length < 3) {
      setSelection(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    setSelection({
      quote: quote.slice(0, 600),
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      top: rect.top,
      left: rect.left + rect.width / 2
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const handleDiscussSelection = useCallback(() => {
    if (!selection || !documentChatContext) {
      return;
    }
    dispatch(
      setComposerAnchor({
        documentId: currentDocument._id,
        quote: selection.quote,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset
      })
    );
    dispatch(openChatPanel({ context: documentChatContext }));
    setSelection(null);
  }, [currentDocument?._id, dispatch, documentChatContext, selection]);

  /**
   * Highlights an anchored passage when a comment or decision is opened, so the
   * discussion and the text it refers to stay connected in both directions.
   */
  useEffect(() => {
    if (!anchorTarget?.quote || !editorRef.current) {
      return undefined;
    }
    if (anchorTarget.documentId && String(anchorTarget.documentId) !== String(id)) {
      return undefined;
    }

    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    const needle = anchorTarget.quote.replace(/\s+/g, ' ').trim().slice(0, 80).toLowerCase();
    let match = null;
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent?.replace(/\s+/g, ' ').toLowerCase() || '';
      if (needle && text.includes(needle)) {
        match = walker.currentNode.parentElement;
        break;
      }
    }

    if (match) {
      match.scrollIntoView({ behavior: 'smooth', block: 'center' });
      match.classList.add('anchor-flash');
      const timeout = window.setTimeout(() => {
        match.classList.remove('anchor-flash');
        dispatch(clearAnchorFocus());
      }, 2200);
      return () => window.clearTimeout(timeout);
    }

    dispatch(clearAnchorFocus());
    return undefined;
  }, [anchorTarget, dispatch, id]);

  /**
   * Applies a "insert into document" request coming from a chat message. The quote
   * keeps its attribution so the document records where the wording came from.
   */
  useEffect(() => {
    if (!pendingInsert || String(pendingInsert.documentId) !== String(id)) {
      return;
    }
    if (!canEdit || !editorRef.current) {
      setInsertFeedback('You need edit access to insert into this document.');
      dispatch(clearContentInsert());
      return;
    }

    const escapeHtml = (value = '') =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const attribution = escapeHtml(pendingInsert.author || 'Team conversation');
    const body = escapeHtml(pendingInsert.content || '').replace(/\n/g, '<br/>');
    setPageCount(appendHtmlToPaginatedEditor(
      editorRef.current,
      `<blockquote class="doc-quote"><p>${body}</p><p><em>— ${attribution}, from conversation</em></p></blockquote><p><br/></p>`
    ));
    handleEditorInput();
    setInsertFeedback('Message inserted at the end of the document.');
    dispatch(clearContentInsert());
  }, [canEdit, dispatch, handleEditorInput, id, pendingInsert]);

  useEffect(() => {
    if (!insertFeedback) return undefined;
    const timeout = window.setTimeout(() => setInsertFeedback(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [insertFeedback]);

  const handleGenerateArtifact = useCallback(
    async (type, force = false) => {
      if (!currentDocument?._id || aiLoading) return;
      setAiLoading(true);
      setAiError(null);
      setAiAnswer(null);
      setAiView(type);
      try {
        const endpoint = type === 'mind_map' ? 'mind-map' : 'summary';
        const response = await api.post(
          `/ai/documents/${currentDocument._id}/${endpoint}${force ? '?force=true' : ''}`
        );
        setAiArtifact(response.data?.artifact || null);
      } catch (requestError) {
        setAiError(getKnowledgeError(requestError));
      } finally {
        setAiLoading(false);
      }
    },
    [aiLoading, currentDocument?._id]
  );

  const handleAskDocument = useCallback(
    async (event) => {
      event.preventDefault();
      const question = aiQuestion.trim();
      if (!currentDocument?._id || !question || aiLoading) return;
      setAiLoading(true);
      setAiError(null);
      setAiView('ask');
      try {
        const response = await api.post(`/ai/documents/${currentDocument._id}/ask`, {
          question
        });
        setAiAnswer(response.data?.answer || null);
      } catch (requestError) {
        setAiError(getKnowledgeError(requestError, 'We couldn’t answer this question. Please try again.'));
      } finally {
        setAiLoading(false);
      }
    },
    [aiLoading, aiQuestion, currentDocument?._id]
  );

  useEffect(() => {
    if (!currentDocument?._id) return undefined;
    const requestedView = new URLSearchParams(location.search).get('ai');
    const artifactType = requestedView === 'mind_map' ? 'mind_map' : 'summary';
    if (requestedView) {
      setInspectorOpen(true);
      setInspectorTab('ai');
      setAiView(artifactType);
    }

    let cancelled = false;
    api
      .get(`/ai/documents/${currentDocument._id}/artifacts?type=${artifactType}`)
      .then((response) => {
        const latest = response.data?.artifacts?.[0];
        if (!cancelled && latest) {
          setAiArtifact({
            result: latest.result,
            generatedAt: latest.generatedAt,
            cached: true
          });
        }
      })
      .catch(() => {
        // A missing artifact is an expected empty state; generation remains available.
      });

    return () => {
      cancelled = true;
    };
  }, [currentDocument?._id, location.search]);

  useEffect(() => {
    let active = true;
    api
      .get('/ai/status')
      .then((response) => {
        if (active) setKnowledgeCapabilities(response.data?.capabilities || {});
      })
      .catch(() => {
        if (active) setKnowledgeCapabilities({});
      });
    return () => {
      active = false;
    };
  }, []);

  if (isDocumentLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-body text-destructive">
        Error loading document: {error.msg || error.message || 'Unknown error'}
      </div>
    );
  }

  if (!currentDocument) {
    return (
      <div className="p-8 text-center text-body text-muted-foreground">
        Document not found or not loaded.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-[620px] overflow-hidden bg-[hsl(var(--editor-canvas))]">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Card className="flex h-full flex-col rounded-none border-0 bg-transparent shadow-none">
        <CardHeader className="shrink-0 space-y-0 border-b bg-card p-0">
          <div className="flex h-14 items-center gap-3 border-b px-3 sm:px-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => navigate('/dashboard')}
              title="Back to documents"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
              <FileText className="size-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <Input
                className="h-6 max-w-xl border-none bg-transparent px-0 text-body-lg font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                value={documentTitle}
                onChange={(event) => {
                  setDocumentTitle(event.target.value);
                  setRenameValue(event.target.value);
                }}
                onBlur={() => {
                  if (canEdit && currentDocument.title !== renameValue) {
                    dispatch(updateDocument({ id: currentDocument._id, documentData: { title: renameValue } }));
                  }
                }}
                placeholder="Untitled document"
                disabled={!canEdit}
              />
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={`status-pill ${
                    isSaving ? 'status-pill--neutral animate-pulse' : 'status-pill--success'
                  }`}
                >
                  {isSaving ? 'Saving changes…' : 'Saved'}
                </span>
                <span className="hidden text-meta text-muted-foreground sm:inline">
                  {canEdit ? 'Editing' : 'Viewing'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="hidden -space-x-2 sm:flex">
                {participants.slice(0, 4).map((participant) => (
                  <span
                    key={participant.userId}
                    className="grid size-7 place-items-center rounded-full bg-primary/10 text-meta font-semibold text-primary ring-2 ring-background"
                    title={participant.name || participant.email}
                  >
                    {(participant.name || participant.email || 'U').slice(0, 2).toUpperCase()}
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                title={canShare ? 'Share document' : 'Only the owner can share this document'}
                onClick={() => canShare && setIsShareDialogOpen(true)}
                disabled={!canShare}
                className="h-8 gap-1.5 rounded-full px-3.5 text-caption font-medium shadow-raised"
              >
                <Share2 className="size-3.5" strokeWidth={1.8} />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Open document chat"
                onClick={handleOpenDocumentChat}
                className="size-8 shrink-0"
              >
                <MessageSquare className="size-4" />
              </Button>
              <Button
                variant={inspectorOpen ? 'secondary' : 'ghost'}
                size="icon"
                title="Toggle details panel"
                className="size-8 shrink-0"
                onClick={() => setInspectorOpen((open) => !open)}
              >
                <PanelRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex h-8 items-center gap-1 border-b px-3 text-caption text-muted-foreground">
            {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Help'].map((menu) => (
              <button
                key={menu}
                type="button"
                className="rounded-md px-2 py-1 transition-colors duration-control hover:bg-secondary hover:text-foreground"
              >
                {menu}
              </button>
            ))}
          </div>

          <div className="bg-card">
            <div className="workspace-scrollbar flex h-11 flex-nowrap items-center gap-1 overflow-x-auto px-3">
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('undo')}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('redo')}>
              <Redo className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border" />

            <Select
              defaultValue="P"
              onValueChange={(value) => execCommand('formatBlock', value)}
              disabled={!canEdit}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Paragraph" />
              </SelectTrigger>
              <SelectContent>
                {HEADINGS.map((heading) => (
                  <SelectItem key={heading.value} value={heading.value}>
                    {heading.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              defaultValue="Arial"
              onValueChange={(value) => execCommand('fontName', value)}
              disabled={!canEdit}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Font" />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font} value={font} className="font-sans">
                    <span style={{ fontFamily: font }}>{font}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              defaultValue="3"
              onValueChange={(value) => execCommand('fontSize', value)}
              disabled={!canEdit}
            >
              <SelectTrigger className="w-28 h-8">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-px h-6 bg-border" />

            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('bold')}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('italic')}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('underline')}>
              <Underline className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('strikeThrough')}>
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertUnorderedList')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertOrderedList')}>
              <ListOrdered className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border" />

            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('justifyLeft')}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('justifyCenter')}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('justifyRight')}>
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('justifyFull')}>
              <AlignJustify className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('indent')}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('outdent')}>
              <Minus className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border" />

            {/* Google-Docs-style split control: the swatch button APPLIES the
                current color (native color inputs fire no event when the same
                color is re-picked), the input chooses a new one. */}
            <div className="inline-flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCommand('foreColor', textColor)}
                disabled={!canEdit}
                title="Apply text color"
              >
                <span className="flex flex-col items-center">
                  <Palette className="h-3.5 w-3.5" />
                  <span
                    className="mt-0.5 h-1 w-4 rounded-full"
                    style={{ backgroundColor: textColor }}
                  />
                </span>
              </Button>
              <input
                ref={textColorInputRef}
                type="color"
                className="h-6 w-5 cursor-pointer rounded border"
                value={textColor}
                onChange={(event) => setTextColor(event.target.value)}
                disabled={!canEdit}
                title="Choose text color"
                aria-label="Choose text color"
              />
            </div>
            <div className="inline-flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCommand('hiliteColor', highlightColor)}
                disabled={!canEdit}
                title="Apply highlight color"
              >
                <span className="flex flex-col items-center">
                  <Highlighter className="h-3.5 w-3.5" />
                  <span
                    className="mt-0.5 h-1 w-4 rounded-full"
                    style={{ backgroundColor: highlightColor }}
                  />
                </span>
              </Button>
              <input
                ref={highlightColorInputRef}
                type="color"
                className="h-6 w-5 cursor-pointer rounded border"
                value={highlightColor}
                onChange={(event) => setHighlightColor(event.target.value)}
                disabled={!canEdit}
                title="Choose highlight color"
                aria-label="Choose highlight color"
              />
            </div>

            <div className="w-px h-6 bg-border" />

            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={handleInsertLink}>
              <Link2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={handleInsertTable}>
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('formatBlock', '<blockquote>')}>
              <Quote className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border" />

            <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('removeFormat')}>
              <Type className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </CardHeader>
        <CardContent className="workspace-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
          <div
            ref={editorRef}
            className={`editor-content mx-auto max-w-none ${
              canEdit ? 'cursor-text' : 'pointer-events-none opacity-90'
            }`}
            contentEditable={canEdit}
            suppressContentEditableWarning
            spellCheck
            onInput={handleEditorInput}
            onBlur={handleEditorInput}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
              handleEditorInput();
            }}
            onLoadCapture={() => {
              if (editorRef.current) {
                setPageCount(paginateEditor(editorRef.current, { preserveCaret: false }));
              }
            }}
          />
        </CardContent>

        {/* Selecting text offers the one action that turns reading into discussion. */}
        {selection && documentChatContext && (
          <div
            className="fixed z-50 -translate-x-1/2 -translate-y-full pb-2"
            style={{ top: selection.top, left: selection.left }}
          >
            <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-floating">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-caption"
                onClick={handleDiscussSelection}
              >
                <MessagesSquare className="size-3" /> Discuss
              </Button>
              <div className="h-4 w-px bg-border" />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-caption"
                onClick={() => {
                  navigator.clipboard?.writeText(selection.quote);
                  setSelection(null);
                }}
              >
                <Copy className="size-3" /> Copy
              </Button>
            </div>
          </div>
        )}

        {insertFeedback && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-caption shadow-floating"
          >
            {insertFeedback}
          </div>
        )}
        <div className="flex h-7 shrink-0 items-center justify-between border-t bg-card px-3 text-meta text-muted-foreground">
          <span>{isSaving ? 'Saving...' : 'Saved to CollabDocs'}</span>
          <div className="flex items-center gap-3">
            <span>{documentContent.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length} words</span>
            <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
            <span>{editorCount} editors</span>
            <span>{viewerCount} viewers</span>
          </div>
        </div>
      </Card>
      </div>

      {inspectorOpen && (
        <aside
          ref={inspectorRef}
          style={{ width: `min(92vw, ${inspectorWidth}px)` }}
          className="fixed bottom-0 right-0 top-14 z-40 flex shrink-0 flex-col border-l bg-card shadow-floating xl:relative xl:z-auto xl:shadow-none"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            title="Drag to resize · double-click to reset"
            onPointerDown={startInspectorResize}
            onDoubleClick={resetInspectorWidth}
            className="group absolute inset-y-0 left-0 z-10 w-2 -translate-x-1/2 cursor-col-resize touch-none"
          >
            <div className="mx-auto h-full w-[3px] rounded-full bg-transparent transition-colors duration-control group-hover:bg-primary/40 group-active:bg-primary/60" />
          </div>
          <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
            <div className="flex rounded-lg bg-secondary p-0.5">
              {[
                { value: 'ai', label: 'AI', icon: Sparkles },
                { value: 'decisions', label: 'Log', icon: Gavel },
                { value: 'outline', label: 'Outline', icon: ListTree },
                { value: 'details', label: 'Details', icon: Info }
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setInspectorTab(tab.value)}
                  className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-caption transition-colors duration-control ${
                    inspectorTab === tab.value
                      ? 'bg-card font-medium text-foreground shadow-raised'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="size-3.5" strokeWidth={1.8} />
                  {tab.label}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setInspectorOpen(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>

          <div className="workspace-scrollbar min-h-0 flex-1 overflow-y-auto">
            {inspectorTab === 'ai' && (
              <div className="p-3">
                <div className="rounded-xl border bg-[linear-gradient(145deg,hsl(var(--primary)/0.08),transparent_60%)] p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                      <Bot className="size-4" strokeWidth={1.8} />
                    </span>
                    <div>
                      <p className="text-body font-semibold">Document intelligence</p>
                      <p className="text-meta text-muted-foreground">
                        Grounded in this document
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-caption text-muted-foreground">
                    Generate a summary, explore a mind map, or ask questions when available.
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant={aiView === 'summary' ? 'default' : 'outline'}
                    className="h-8 gap-1.5 rounded-lg text-caption"
                    onClick={() => handleGenerateArtifact('summary')}
                    disabled={aiLoading}
                  >
                    <FileText className="size-3" />
                    Summarize
                  </Button>
                  <Button
                    variant={aiView === 'mind_map' ? 'default' : 'outline'}
                    className="h-8 gap-1.5 rounded-lg text-caption"
                    onClick={() => handleGenerateArtifact('mind_map')}
                    disabled={aiLoading}
                  >
                    <Network className="size-3" />
                    Mind map
                  </Button>
                </div>

                {knowledgeCapabilities?.documentQuestions &&
                  (providerAIEntitled ? (
                    <form onSubmit={handleAskDocument} className="mt-2 flex gap-1.5">
                      <Input
                        value={aiQuestion}
                        onChange={(event) => setAiQuestion(event.target.value)}
                        placeholder="Ask this document..."
                        className="h-8 rounded-lg text-caption"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="size-8 shrink-0"
                        disabled={!aiQuestion.trim() || aiLoading}
                      >
                        <SendHorizontal className="size-3.5" />
                      </Button>
                    </form>
                  ) : (
                    <div className="mt-2 rounded-lg border border-dashed px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-caption font-medium">
                        <Lock className="size-3" strokeWidth={1.8} />
                        Document Q&amp;A is a Pro / Team capability
                      </p>
                      <p className="mt-0.5 text-meta text-muted-foreground">
                        Ask your administrator for an upgrade to question this document directly.
                      </p>
                    </div>
                  ))}

                {aiLoading && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 text-caption text-muted-foreground">
                    <RefreshCw className="size-3 animate-spin" />
                    Analyzing the document and generating...
                  </div>
                )}

                {aiError && (
                  <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-caption text-destructive">
                    {aiError}
                  </div>
                )}

                {!aiLoading && aiView === 'summary' && aiArtifact?.result?.overview && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                          Summary
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => handleGenerateArtifact('summary', true)}
                          title="Regenerate summary"
                        >
                          <RefreshCw className="size-3" />
                        </Button>
                      </div>
                      <p className="mt-2 text-body">{aiArtifact.result.overview}</p>
                    </div>
                    <div>
                      <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        Key points
                      </p>
                      <ul className="mt-2 space-y-2">
                        {aiArtifact.result.keyPoints?.map((point) => (
                          <li key={point} className="flex gap-2 text-body">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {aiArtifact.result.actionItems?.length > 0 && (
                      <div>
                        <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                          Action items
                        </p>
                        <div className="mt-2 space-y-1.5">
                          {aiArtifact.result.actionItems.map((item) => (
                            <div key={item.task} className="rounded-lg border p-2.5 text-caption">
                              <p>{item.task}</p>
                              {(item.owner || item.dueDate) && (
                                <p className="mt-1 text-meta text-muted-foreground">
                                  {[item.owner, item.dueDate].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-meta text-muted-foreground">
                      {aiArtifact.cached
                        ? 'Current saved result'
                        : 'Generated from this document'}
                    </p>
                  </div>
                )}

                {!aiLoading && aiView === 'mind_map' && aiArtifact?.result?.nodes && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {aiArtifact.result.title || 'Mind map'}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => handleGenerateArtifact('mind_map', true)}
                        title="Regenerate mind map"
                      >
                        <RefreshCw className="size-3" />
                      </Button>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {aiArtifact.result.nodes.map((node) => (
                        <div
                          key={node.id}
                          className={`rounded-lg border p-2 ${
                            node.parentId ? 'ml-4 border-l-2 border-l-primary/40' : 'bg-secondary'
                          }`}
                        >
                          <p className="text-caption font-semibold">{node.label}</p>
                          <p className="mt-0.5 text-meta text-muted-foreground">
                            {node.description}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="mt-3 h-8 w-full gap-2 rounded-lg text-caption"
                      onClick={() => navigate('/mind-maps')}
                    >
                      <Network className="size-3" />
                      Open visual mind-map library
                    </Button>
                    <p className="mt-2 text-center text-meta text-muted-foreground">
                      Connected to the current document.
                    </p>
                  </div>
                )}

                {!aiLoading && aiView === 'ask' && aiAnswer?.answer && (
                  <div className="mt-4">
                    <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Answer
                    </p>
                    <p className="mt-2 text-body">{aiAnswer.answer}</p>
                    {aiAnswer.citations?.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {aiAnswer.citations.map((citation) => (
                          <blockquote
                            key={`${citation.chunkIndex}-${citation.quote}`}
                            className="border-l-2 border-primary/40 pl-2 text-meta text-muted-foreground"
                          >
                            “{citation.quote}” <span className="text-primary">[{citation.chunkIndex}]</span>
                          </blockquote>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!aiLoading && !aiArtifact && !aiAnswer && !aiError && (
                  <div className="py-10 text-center">
                    <Sparkles className="mx-auto size-5 text-muted-foreground/50" strokeWidth={1.8} />
                    <p className="mt-2 text-caption text-muted-foreground">
                      Choose a generation action to begin.
                    </p>
                  </div>
                )}
              </div>
            )}

            {inspectorTab === 'decisions' && (
              <DecisionLogPanel
                documentId={currentDocument?._id}
                chatContext={documentChatContext}
                canEdit={canEdit}
                participants={documentChatContext?.defaultParticipants || []}
              />
            )}

            {inspectorTab === 'outline' && (
              <div className="p-4">
                <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Document outline
                </p>
                <p className="mt-6 text-center text-caption text-muted-foreground">
                  Add headings to your document and they will appear here for quick navigation.
                </p>
              </div>
            )}

            {inspectorTab === 'details' && (
              <div className="p-4">
                <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  People with access
                </p>
                <div className="mt-3 space-y-2">
                  {participants.map((participant) => (
                    <div key={participant.userId} className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-meta font-semibold text-primary ring-2 ring-background">
                        {(participant.name || participant.email || 'U').slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-caption font-medium">
                          {participant.userId === user?.id ? 'You' : participant.name || participant.email}
                        </p>
                        <p className="text-meta capitalize text-muted-foreground">{participant.role}</p>
                      </div>
                      <span className="size-1.5 rounded-full bg-success" />
                    </div>
                  ))}
                </div>
                <div className="mt-5 border-t pt-4">
                  <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Document details
                  </p>
                  <dl className="mt-3 space-y-2 text-caption">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Owner</dt>
                      <dd className="truncate">{currentDocument.owner?.name || currentDocument.owner?.email}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Updated</dt>
                      <dd>{new Date(currentDocument.updatedAt).toLocaleDateString()}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Access</dt>
                      <dd className="capitalize">{userRole}</dd>
                    </div>
                  </dl>
                </div>
                {userRole === 'owner' && (
                  <Button
                    variant="ghost"
                    className="mt-6 h-8 w-full justify-start gap-2 text-caption text-destructive hover:text-destructive"
                    onClick={handleDeleteDocument}
                  >
                    <Trash2 className="size-3.5" />
                    Delete document
                  </Button>
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      <Dialog
        open={isShareDialogOpen}
        onOpenChange={(open) => setIsShareDialogOpen(canShare ? open : false)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Share "{currentDocument.title}"</DialogTitle>
            <DialogDescription>
              Invite teammates, set permissions, or copy the document link for quick sharing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label htmlFor="share-link">Shareable Link</Label>
              <div className="mt-2 flex items-center space-x-2">
                <Input id="share-link" value={shareLink} readOnly />
                <Button variant="secondary" size="icon" onClick={handleCopyLink}>
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1 text-caption text-muted-foreground">
                Anyone with the link still needs the appropriate access level.
              </p>
            </div>

            {canShare && account?.plan === 'team' && (
              <div className="flex items-start justify-between gap-3 rounded-xl border bg-secondary/40 p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-body font-semibold">
                    <UsersRound className="size-3.5" strokeWidth={1.8} />
                    Workspace access
                  </p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Everyone in {account?.name || 'your workspace'} can view this document —
                    no individual invites needed. Editing still requires an invite.
                  </p>
                </div>
                <Switch
                  checked={currentDocument.visibility === 'workspace'}
                  onCheckedChange={(checked) =>
                    dispatch(
                      updateDocument({
                        id: currentDocument._id,
                        documentData: { visibility: checked ? 'workspace' : 'private' }
                      })
                    )
                  }
                  aria-label="Toggle workspace access"
                />
              </div>
            )}

            <div className="space-y-3">
              {canShare ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <Label htmlFor="share-query">Invite collaborators</Label>
                      <Input
                        id="share-query"
                        value={shareQuery}
                        onChange={(event) => setShareQuery(event.target.value)}
                        placeholder="Search by email or name"
                        className="mt-2"
                      />
                    </div>
                    <div className="w-full sm:w-40">
                      <Label className="sr-only">Permission</Label>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="mt-2 w-full sm:mt-0">
                          <SelectValue placeholder="Permission" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isSearchingUsers && (
                    <p className="text-body text-muted-foreground">Searching for teammates...</p>
                  )}
                  {shareError && <p className="text-body text-destructive">{shareError}</p>}
                  {shareFeedback && <p className="text-body text-success">{shareFeedback}</p>}

                  {shareResults.length > 0 && (
                    <div className="divide-y rounded-lg border">
                      {shareResults.map((result) => {
                        const alreadyCollaborator = collaborators.some(
                          (collaborator) => collaborator.userId === String(result._id)
                        );
                        return (
                          <div
                            key={result._id}
                            className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="text-body">
                              <p className="font-medium">{result.name || result.email}</p>
                              <p className="text-caption text-muted-foreground">{result.email}</p>
                            </div>
                            <Button
                              size="sm"
                              className="rounded-full"
                              onClick={() => handleShareUser(result)}
                              disabled={isProcessingShare}
                            >
                              {alreadyCollaborator ? 'Update Access' : 'Share'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-body text-muted-foreground">
                  Only the document owner can invite collaborators or update access.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-body-lg font-semibold">People with access</h4>
              <ul className="space-y-2 text-body">
                <li className="flex items-center justify-between">
                  <span>
                    You ({currentDocument.owner?.email}) <span className="text-muted-foreground">- Owner</span>
                  </span>
                </li>
                {collaborators.length === 0 && (
                  <li className="text-muted-foreground">No collaborators added yet.</li>
                )}
                {collaborators.map((collaborator) => (
                  <li key={collaborator.userId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="font-medium">{collaborator.name || collaborator.email}</p>
                      <p className="text-caption text-muted-foreground">
                        {collaborator.email} - {collaborator.role === 'editor' ? 'Editor' : 'Viewer'}
                      </p>
                    </div>
                    {canShare && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove access"
                        onClick={() => handleRemoveCollaborator(collaborator.userId)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInsertImage}
      />
    </div>
  );
};

export default DocumentPage;
