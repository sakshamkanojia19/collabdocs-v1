import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import api from '../services/api';

const initialState = {
  isPanelOpen: false,
  context: null,
  loading: false,
  error: null,
  groups: [],
  activeGroupId: null,
  messages: {},
  notifications: [],
  notificationsLoading: false,
  notificationsError: null,
  creatingGroup: false,
  createError: null,
  // Ephemeral realtime state, keyed by group id
  typing: {},
  presence: {},
  // Reply/anchor draft for the active composer
  composer: { replyTo: null, anchor: null },
  sendError: null
};

const getErrorPayload = (error, fallbackMessage) => {
  const fallback = {
    message: error.message || fallbackMessage
  };
  return error.response?.data || fallback;
};

export const fetchChatGroups = createAsyncThunk(
  'chat/fetchGroups',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/chat/groups', {
        params
      });
      return response.data.groups;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to load chat groups'));
    }
  }
);

export const createChatGroup = createAsyncThunk(
  'chat/createGroup',
  async ({ name, participants, context }, { rejectWithValue }) => {
    try {
      const response = await api.post('/chat/groups', {
        name,
        participants,
        context
      });
      return response.data.group;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to create chat group'));
    }
  }
);

export const addParticipantsToGroup = createAsyncThunk(
  'chat/addParticipants',
  async ({ groupId, participants }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/chat/groups/${groupId}/participants`, {
        participants
      });
      return response.data.group;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to add participants'));
    }
  }
);

export const fetchChatMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ groupId, before, limit = 50 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/chat/groups/${groupId}/messages`, {
        params: {
          before,
          limit
        }
      });
      return {
        groupId,
        messages: response.data.messages
      };
    } catch (error) {
      return rejectWithValue(
        getErrorPayload(error, 'Unable to load messages for this chat group')
      );
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    { groupId, content, attachments, mentions, replyToId, anchor },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/chat/groups/${groupId}/messages`, {
        content,
        attachments,
        mentions,
        replyToId,
        anchor
      });
      return response.data.message;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to send message'));
    }
  }
);

export const editChatMessage = createAsyncThunk(
  'chat/editMessage',
  async ({ groupId, messageId, content, mentions }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/chat/groups/${groupId}/messages/${messageId}`, {
        content,
        mentions
      });
      return response.data.message;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to edit message'));
    }
  }
);

export const deleteChatMessage = createAsyncThunk(
  'chat/deleteMessage',
  async ({ groupId, messageId }, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/chat/groups/${groupId}/messages/${messageId}`);
      return response.data.message;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to delete message'));
    }
  }
);

export const toggleMessageReaction = createAsyncThunk(
  'chat/toggleReaction',
  async ({ groupId, messageId, emoji }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/chat/groups/${groupId}/messages/${messageId}/reactions`,
        { emoji }
      );
      return response.data.message;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to update reaction'));
    }
  }
);

export const renameChatGroup = createAsyncThunk(
  'chat/renameGroup',
  async ({ groupId, name }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/chat/groups/${groupId}`, { name });
      return response.data.group;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to rename conversation'));
    }
  }
);

export const removeParticipantFromGroup = createAsyncThunk(
  'chat/removeParticipant',
  async ({ groupId, participantId }, { rejectWithValue }) => {
    try {
      await api.delete(`/chat/groups/${groupId}/participants/${participantId}`);
      return { groupId, participantId };
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to remove participant'));
    }
  }
);

export const leaveChatGroup = createAsyncThunk(
  'chat/leaveGroup',
  async ({ groupId }, { rejectWithValue }) => {
    try {
      await api.post(`/chat/groups/${groupId}/leave`);
      return groupId;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to leave conversation'));
    }
  }
);

export const markMessageAsDecision = createAsyncThunk(
  'chat/markDecision',
  async ({ groupId, messageId, summary }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/chat/groups/${groupId}/messages/${messageId}/decision`,
        { summary }
      );
      return response.data.message;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to record this decision'));
    }
  }
);

export const unmarkMessageDecision = createAsyncThunk(
  'chat/unmarkDecision',
  async ({ groupId, messageId }, { rejectWithValue }) => {
    try {
      const response = await api.delete(
        `/chat/groups/${groupId}/messages/${messageId}/decision`
      );
      return response.data.message;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to remove this decision'));
    }
  }
);

export const toggleAnchorResolved = createAsyncThunk(
  'chat/toggleAnchorResolved',
  async ({ groupId, messageId }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/chat/groups/${groupId}/messages/${messageId}/resolve`
      );
      return response.data.message;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to update this thread'));
    }
  }
);

export const markChatGroupRead = createAsyncThunk(
  'chat/markGroupRead',
  async ({ groupId }, { rejectWithValue }) => {
    try {
      await api.post(`/chat/groups/${groupId}/read`);
      return {
        groupId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to update read status'));
    }
  }
);

export const fetchChatNotifications = createAsyncThunk(
  'chat/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/chat/notifications');
      return response.data.notifications;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to load chat notifications'));
    }
  }
);

export const markChatNotificationRead = createAsyncThunk(
  'chat/markNotificationRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/chat/notifications/${notificationId}`);
      return response.data.notification;
    } catch (error) {
      return rejectWithValue(getErrorPayload(error, 'Unable to update notification'));
    }
  }
);

const ensureBucket = (state, groupId) => {
  if (!state.messages[groupId]) {
    state.messages[groupId] = {
      items: [],
      hasMore: true,
      loading: false,
      error: null
    };
  }
  return state.messages[groupId];
};

/**
 * Replaces a message in place when it already exists, so realtime edits, deletes,
 * reactions, and decision changes all converge on one code path.
 */
const applyMessageChange = (state, message) => {
  if (!message?.groupId || !message.id) {
    return;
  }
  const bucket = ensureBucket(state, message.groupId);
  const index = bucket.items.findIndex((item) => item.id === message.id);
  if (index >= 0) {
    bucket.items[index] = { ...bucket.items[index], ...message, pending: false };
  } else {
    bucket.items.push(message);
  }
};

const upsertMessages = (state, groupId, incomingMessages, { prepend = false } = {}) => {
  if (!incomingMessages || incomingMessages.length === 0) {
    return;
  }

  if (!state.messages[groupId]) {
    state.messages[groupId] = {
      items: [],
      hasMore: true,
      loading: false,
      error: null
    };
  }

  const existing = state.messages[groupId].items;
  const existingIds = new Set(existing.map((message) => message.id));
  const filtered = incomingMessages.filter((message) => !existingIds.has(message.id));

  if (filtered.length === 0) {
    return;
  }

  if (prepend) {
    state.messages[groupId].items = [...filtered, ...existing];
  } else {
    state.messages[groupId].items = [...existing, ...filtered];
  }
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    openChatPanel: (state, action) => {
      state.isPanelOpen = true;
      if (action.payload?.context) {
        state.context = action.payload.context;
      }
    },
    closeChatPanel: (state) => {
      state.isPanelOpen = false;
      state.context = null;
    },
    toggleChatPanel: (state) => {
      state.isPanelOpen = !state.isPanelOpen;
      if (!state.isPanelOpen) {
        state.context = null;
      }
    },
    setActiveChatGroup: (state, action) => {
      state.activeGroupId = action.payload;
      state.composer = { replyTo: null, anchor: null };
      state.sendError = null;
      const group = state.groups.find((item) => item.id === action.payload);
      if (group) {
        group.unreadCount = 0;
        group.mentionCount = 0;
      }
    },
    setComposerReply: (state, action) => {
      state.composer.replyTo = action.payload;
    },
    setComposerAnchor: (state, action) => {
      state.composer.anchor = action.payload;
    },
    clearComposerDraft: (state) => {
      state.composer = { replyTo: null, anchor: null };
    },
    setTypingState: (state, action) => {
      const { groupId, userId, name, isTyping } = action.payload || {};
      if (!groupId || !userId) {
        return;
      }
      const current = state.typing[groupId] || {};
      if (isTyping) {
        current[userId] = { name, at: Date.now() };
      } else {
        delete current[userId];
      }
      state.typing[groupId] = current;
    },
    setPresenceState: (state, action) => {
      const { groupId, userId, status } = action.payload || {};
      if (!groupId || !userId) {
        return;
      }
      const current = state.presence[groupId] || {};
      if (status === 'online') {
        current[userId] = true;
      } else {
        delete current[userId];
      }
      state.presence[groupId] = current;
    },
    setPresenceRoster: (state, action) => {
      const { groupId, userIds } = action.payload || {};
      if (!groupId) {
        return;
      }
      state.presence[groupId] = (userIds || []).reduce((acc, userId) => {
        acc[userId] = true;
        return acc;
      }, {});
    },
    applyMessageUpdate: (state, action) => {
      applyMessageChange(state, action.payload);
    },
    receiveChatMessage: (state, action) => {
      const message = action.payload;
      if (!message?.groupId) {
        return;
      }

      upsertMessages(state, message.groupId, [message]);

      const groupIndex = state.groups.findIndex((group) => group.id === message.groupId);
      if (groupIndex >= 0) {
        const group = state.groups[groupIndex];
        group.lastMessage = {
          messageId: message.id,
          preview: message.content,
          sentAt: message.createdAt,
          sender: message.sender
        };
        group.updatedAt = message.createdAt;
        state.groups.splice(groupIndex, 1);
        state.groups.unshift(group);
      }

      // A message from a sender clears their typing indicator immediately.
      if (state.typing[message.groupId]) {
        delete state.typing[message.groupId][message.sender?.userId];
      }
    },
    upsertChatGroup: (state, action) => {
      const group = action.payload;
      if (!group?.id) {
        return;
      }
      const existingIndex = state.groups.findIndex((item) => item.id === group.id);
      if (existingIndex >= 0) {
        state.groups[existingIndex] = group;
      } else {
        state.groups.unshift(group);
      }
    },
    receiveMentionAlert: (state, action) => {
      const { groupId } = action.payload || {};
      const group = state.groups.find((item) => item.id === groupId);
      if (group && state.activeGroupId !== groupId) {
        group.mentionCount = (group.mentionCount || 0) + 1;
      }
    },
    updateGroupActivity: (state, action) => {
      const { groupId, lastMessage, updatedAt, currentUserId } = action.payload;
      const index = state.groups.findIndex((group) => group.id === groupId);
      if (index < 0) {
        return;
      }
      const group = state.groups[index];
      // `chat:group:activity` reaches every participant, including those with the
      // conversation closed, so unread counting lives here rather than in
      // `receiveChatMessage` (which only fires for joined rooms).
      const fromSomeoneElse =
        !currentUserId || lastMessage?.sender?.userId !== currentUserId;
      if (state.activeGroupId !== groupId && fromSomeoneElse) {
        group.unreadCount = (group.unreadCount || 0) + 1;
      }
      if (lastMessage) {
        group.lastMessage = {
          ...group.lastMessage,
          ...lastMessage,
          messageId: lastMessage.messageId || lastMessage.id || group.lastMessage?.messageId,
          sentAt: lastMessage.sentAt || group.lastMessage?.sentAt
        };
      }
      group.updatedAt = updatedAt || lastMessage?.sentAt || group.updatedAt;
      state.groups.splice(index, 1);
      state.groups.unshift(group);
    },
    applyReadReceipt: (state, action) => {
      const { groupId, userId, timestamp } = action.payload;
      const groupIndex = state.groups.findIndex((group) => group.id === groupId);
      if (groupIndex < 0) {
        return;
      }
      const group = state.groups[groupIndex];
      if (!group.participants) {
        return;
      }
      group.participants = group.participants.map((participant) =>
        participant.userId === userId
          ? {
              ...participant,
              lastReadAt: timestamp
            }
          : participant
      );
    },
    removeChatGroup: (state, action) => {
      const groupId = action.payload;
      state.groups = state.groups.filter((group) => group.id !== groupId);
      delete state.messages[groupId];
      if (state.activeGroupId === groupId) {
        state.activeGroupId = null;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = Array.isArray(action.payload)
          ? action.payload.sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )
          : [];
      })
      .addCase(fetchChatGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createChatGroup.pending, (state) => {
        state.creatingGroup = true;
        state.createError = null;
      })
      .addCase(createChatGroup.fulfilled, (state, action) => {
        state.creatingGroup = false;
        state.groups.unshift(action.payload);
        state.activeGroupId = action.payload.id;
      })
      .addCase(createChatGroup.rejected, (state, action) => {
        state.creatingGroup = false;
        state.createError = action.payload;
      })
      .addCase(addParticipantsToGroup.pending, (state) => {
        state.creatingGroup = true;
        state.createError = null;
      })
      .addCase(addParticipantsToGroup.fulfilled, (state, action) => {
        state.creatingGroup = false;
        const updatedGroup = action.payload;
        const index = state.groups.findIndex((group) => group.id === updatedGroup.id);
        if (index >= 0) {
          state.groups[index] = updatedGroup;
        }
      })
      .addCase(addParticipantsToGroup.rejected, (state, action) => {
        state.creatingGroup = false;
        state.createError = action.payload;
      })
      .addCase(fetchChatMessages.pending, (state, action) => {
        const { groupId } = action.meta.arg;
        if (!state.messages[groupId]) {
          state.messages[groupId] = {
            items: [],
            hasMore: true,
            loading: true,
            error: null
          };
        } else {
          state.messages[groupId].loading = true;
          state.messages[groupId].error = null;
        }
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        const { groupId, messages } = action.payload;
        const shouldPrepend = Boolean(action.meta.arg?.before);

        upsertMessages(state, groupId, messages, { prepend: shouldPrepend });

        const messageState = state.messages[groupId];
        if (messageState) {
          messageState.loading = false;
          messageState.hasMore = Array.isArray(messages) && messages.length >= (action.meta.arg?.limit || 50);
        }
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        const { groupId } = action.meta.arg;
        if (!state.messages[groupId]) {
          state.messages[groupId] = {
            items: [],
            hasMore: true,
            loading: false,
            error: action.payload
          };
        } else {
          state.messages[groupId].loading = false;
          state.messages[groupId].error = action.payload;
        }
      })
      // Optimistic send: the message appears immediately as pending, then the
      // server copy replaces it (or it is flagged so the user can retry).
      .addCase(sendChatMessage.pending, (state, action) => {
        const { groupId, content, sender, replyTo, anchor, mentions } = action.meta.arg || {};
        if (!groupId || !sender) {
          return;
        }
        state.sendError = null;
        ensureBucket(state, groupId).items.push({
          id: action.meta.requestId,
          groupId,
          sender,
          content,
          type: 'text',
          reactions: [],
          mentions: mentions || [],
          replyTo: replyTo || null,
          anchor: anchor || null,
          decision: null,
          attachments: [],
          createdAt: new Date().toISOString(),
          isOwn: true,
          pending: true,
          failed: false
        });
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        const message = action.payload;
        if (!message?.groupId) {
          return;
        }
        const bucket = ensureBucket(state, message.groupId);
        const pendingIndex = bucket.items.findIndex((item) => item.id === action.meta.requestId);
        if (pendingIndex >= 0) {
          bucket.items[pendingIndex] = message;
        } else {
          upsertMessages(state, message.groupId, [message]);
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        const { groupId } = action.meta.arg || {};
        state.sendError = action.payload;
        if (!groupId) {
          return;
        }
        const bucket = ensureBucket(state, groupId);
        const pendingIndex = bucket.items.findIndex((item) => item.id === action.meta.requestId);
        if (pendingIndex >= 0) {
          bucket.items[pendingIndex].pending = false;
          bucket.items[pendingIndex].failed = true;
        }
      })
      .addCase(markChatGroupRead.fulfilled, (state, action) => {
        const { groupId, timestamp } = action.payload;
        const { userId } = action.meta.arg || {};
        const groupIndex = state.groups.findIndex((group) => group.id === groupId);
        if (groupIndex >= 0) {
          const group = state.groups[groupIndex];
          group.unreadCount = 0;
          group.mentionCount = 0;
          if (userId) {
            group.participants = group.participants.map((participant) =>
              participant.userId === userId
                ? { ...participant, lastReadAt: timestamp }
                : participant
            );
          }
        }
      })
      .addCase(renameChatGroup.fulfilled, (state, action) => {
        const index = state.groups.findIndex((group) => group.id === action.payload.id);
        if (index >= 0) {
          state.groups[index] = { ...state.groups[index], ...action.payload };
        }
      })
      .addCase(removeParticipantFromGroup.fulfilled, (state, action) => {
        const { groupId, participantId } = action.payload;
        const group = state.groups.find((item) => item.id === groupId);
        if (group) {
          group.participants = group.participants.filter(
            (participant) => participant.userId !== participantId
          );
          group.participantCount = group.participants.length;
        }
      })
      .addCase(leaveChatGroup.fulfilled, (state, action) => {
        const groupId = action.payload;
        state.groups = state.groups.filter((group) => group.id !== groupId);
        delete state.messages[groupId];
        if (state.activeGroupId === groupId) {
          state.activeGroupId = null;
        }
      })
      .addCase(fetchChatNotifications.pending, (state) => {
        state.notificationsLoading = true;
        state.notificationsError = null;
      })
      .addCase(fetchChatNotifications.fulfilled, (state, action) => {
        state.notificationsLoading = false;
        state.notifications = action.payload;
      })
      .addCase(fetchChatNotifications.rejected, (state, action) => {
        state.notificationsLoading = false;
        state.notificationsError = action.payload;
      })
      .addCase(markChatNotificationRead.fulfilled, (state, action) => {
        const updated = action.payload;
        state.notifications = state.notifications.map((notification) =>
          notification._id === updated._id ? updated : notification
        );
      })
      // Every mutation that returns a message converges on one update path.
      .addMatcher(
        isAnyOf(
          editChatMessage.fulfilled,
          deleteChatMessage.fulfilled,
          toggleMessageReaction.fulfilled,
          markMessageAsDecision.fulfilled,
          unmarkMessageDecision.fulfilled,
          toggleAnchorResolved.fulfilled
        ),
        (state, action) => {
          applyMessageChange(state, action.payload);
        }
      );
  }
});

export const {
  openChatPanel,
  closeChatPanel,
  toggleChatPanel,
  setActiveChatGroup,
  setComposerReply,
  setComposerAnchor,
  clearComposerDraft,
  setTypingState,
  setPresenceState,
  setPresenceRoster,
  applyMessageUpdate,
  receiveChatMessage,
  receiveMentionAlert,
  upsertChatGroup,
  updateGroupActivity,
  applyReadReceipt,
  removeChatGroup
} = chatSlice.actions;

export default chatSlice.reducer;
