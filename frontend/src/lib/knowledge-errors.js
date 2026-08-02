const DEFAULT_MESSAGE = 'We couldn’t complete this action. Please try again.';

export const getKnowledgeError = (error, fallback = DEFAULT_MESSAGE) => {
  if (!error?.response) {
    return 'We couldn’t reach the workspace service. Check your connection and try again.';
  }

  const status = error.response.status;

  if (status === 401 || status === 403) {
    return 'You don’t have permission to use this feature.';
  }
  if (status === 404) {
    return 'This feature is temporarily unavailable. Refresh the application and try again.';
  }
  if (status === 413) {
    return 'This document is too large to process at once.';
  }
  if (status === 422) {
    return 'Add more document content and try again.';
  }
  if (status === 429) {
    return 'This feature is busy right now. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return 'We couldn’t generate this right now. Please try again.';
  }

  return fallback;
};
