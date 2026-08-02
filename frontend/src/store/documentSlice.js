import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Async thunks for document operations
export const createDocument = createAsyncThunk(
  'document/createDocument',
  async (documentData, { rejectWithValue }) => {
    try {
      const response = await api.post('/documents', documentData);
      return response.data.document;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to create document'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

export const fetchDocuments = createAsyncThunk(
  'document/fetchDocuments',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/documents', { params });
      return response.data.documents;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to fetch documents'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

export const fetchDocumentById = createAsyncThunk(
  'document/fetchDocumentById',
  async (documentId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/documents/${documentId}`);
      return response.data.document;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to load document'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

export const updateDocument = createAsyncThunk(
  'document/updateDocument',
  async ({ id, documentData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/documents/${id}`, documentData);
      return response.data.document;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to update document'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'document/deleteDocument',
  async (documentId, { rejectWithValue }) => {
    try {
      await api.delete(`/documents/${documentId}`);
      return documentId;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to delete document'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

export const searchDocuments = createAsyncThunk(
  'document/searchDocuments',
  async (query, { rejectWithValue }) => {
    try {
      const response = await api.get(`/documents/search?q=${query}`);
      return response.data.results;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to search documents'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

export const shareDocument = createAsyncThunk(
  'document/shareDocument',
  async ({ id, collaborator }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/documents/${id}/collaborators`, collaborator);
      return response.data.document;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to update collaborator access'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

export const removeCollaborator = createAsyncThunk(
  'document/removeCollaborator',
  async ({ id, collaboratorId }, { rejectWithValue }) => {
    try {
      await api.delete(`/documents/${id}/collaborators/${collaboratorId}`);
      return { documentId: id, collaboratorId };
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to remove collaborator'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

const documentSlice = createSlice({
  name: 'document',
  initialState: {
    documents: [],
    currentDocument: null,
    loading: false,
    error: null,
    searchResults: [],
    // Cross-surface intents: the chat drawer lives in the workspace shell, so it
    // hands work to the editor through the store rather than a callback prop.
    pendingInsert: null,
    anchorTarget: null,
  },
  reducers: {
    clearCurrentDocument: (state) => {
      state.currentDocument = null;
    },
    requestContentInsert: (state, action) => {
      state.pendingInsert = action.payload;
    },
    clearContentInsert: (state) => {
      state.pendingInsert = null;
    },
    requestAnchorFocus: (state, action) => {
      state.anchorTarget = action.payload;
    },
    clearAnchorFocus: (state) => {
      state.anchorTarget = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.documents.push(action.payload);
      })
      .addCase(createDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchDocumentById.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        if (!state.currentDocument || state.currentDocument._id !== action.meta.arg) {
          state.currentDocument = null;
        }
      })
      .addCase(fetchDocumentById.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.currentDocument = action.payload;
        }
      })
      .addCase(fetchDocumentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDocument = action.payload;
        // Update document in the list if it exists
        const index = state.documents.findIndex(doc => doc._id === action.payload._id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      .addCase(updateDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = state.documents.filter(doc => doc._id !== action.payload);
        if (state.currentDocument && state.currentDocument._id === action.payload) {
          state.currentDocument = null;
        }
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(searchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(shareDocument.pending, (state) => {
        state.error = null;
      })
      .addCase(shareDocument.fulfilled, (state, action) => {
        state.currentDocument = action.payload;
        const index = state.documents.findIndex((doc) => doc._id === action.payload._id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      .addCase(shareDocument.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(removeCollaborator.fulfilled, (state, action) => {
        const { collaboratorId, documentId } = action.payload;
        if (state.currentDocument && state.currentDocument._id === documentId) {
          state.currentDocument.collaborators = state.currentDocument.collaborators.filter(
            (collaborator) => collaborator.userId !== collaboratorId
          );
        }
        const index = state.documents.findIndex((doc) => doc._id === documentId);
        if (index !== -1) {
          state.documents[index].collaborators = state.documents[index].collaborators.filter(
            (collaborator) => collaborator.userId !== collaboratorId
          );
        }
      })
      .addCase(removeCollaborator.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  clearCurrentDocument,
  requestContentInsert,
  clearContentInsert,
  requestAnchorFocus,
  clearAnchorFocus
} = documentSlice.actions;
export default documentSlice.reducer;
