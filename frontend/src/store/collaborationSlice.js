import { createSlice } from '@reduxjs/toolkit';

const collaborationSlice = createSlice({
  name: 'collaboration',
  initialState: {
    activeUsers: [],
    documentChanges: [],
    comments: [],
    notifications: [],
    currentDocumentId: null,
  },
  reducers: {
    // Real-time updates from Socket.IO
    userJoined: (state, action) => {
      const { userId, documentId, name, email, role } = action.payload;
      if (
        state.currentDocumentId === documentId &&
        !state.activeUsers.some((user) => user.userId === userId)
      ) {
        state.activeUsers.push({ userId, name, email, role });
      }
    },
    userLeft: (state, action) => {
      const { userId, documentId } = action.payload;
      if (state.currentDocumentId === documentId) {
        state.activeUsers = state.activeUsers.filter((user) => user.userId !== userId);
      }
    },
    documentContentChanged: (state, action) => {
      const { documentId, delta, source, userId } = action.payload;
      if (state.currentDocumentId === documentId) {
        // In a real app, you'd apply the delta to the current document content
        // For simplicity, we're just storing the changes for now.
        state.documentChanges.push({ delta, source, userId, timestamp: new Date().toISOString() });
      }
    },
    cursorActivity: () => {
      // Handle cursor position updates
      // This would typically involve updating a map of userId to cursor position
    },
    userPresence: () => {
      // Handle user typing status, online/offline, etc.
    },
    // Actions for managing comments
    addComment: (state, action) => {
      state.comments.push(action.payload);
    },
    addReplyToComment: (state, action) => {
      const { commentId, reply } = action.payload;
      const comment = state.comments.find(c => c._id === commentId);
      if (comment) {
        comment.replies.push(reply);
      }
    },
    // Actions for managing notifications
    addNotification: (state, action) => {
      state.notifications.push(action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setActiveUsers: (state, action) => {
      state.activeUsers = Array.isArray(action.payload) ? action.payload : [];
    },
    // Set current document ID for context
    setCurrentDocumentId: (state, action) => {
      state.currentDocumentId = action.payload;
      state.activeUsers = []; // Clear active users when changing document
      state.documentChanges = []; // Clear changes
    },
  },
});

export const {
  userJoined,
  userLeft,
  documentContentChanged,
  cursorActivity,
  userPresence,
  addComment,
  addReplyToComment,
  addNotification,
  clearNotifications,
  setActiveUsers,
  setCurrentDocumentId,
} = collaborationSlice.actions;

export default collaborationSlice.reducer;
