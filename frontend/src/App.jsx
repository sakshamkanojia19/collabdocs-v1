import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loadUser } from './store/authSlice';
import PrivateRoute from './components/common/PrivateRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LandingPage from './pages/LandingPage';
import {
  connectChatSocket,
  disconnectChatSocket
} from './services/chatSocket';
import {
  receiveChatMessage,
  receiveMentionAlert,
  applyMessageUpdate,
  setTypingState,
  setPresenceState,
  setPresenceRoster,
  upsertChatGroup,
  removeChatGroup,
  updateGroupActivity,
  applyReadReceipt,
  fetchChatGroups,
  fetchChatNotifications
} from './store/chatSlice';
import './App.css';

// The sign-in screen is the application entry point ("/" redirects to it), so it
// ships in the main bundle. Lazy-loading it would cost an extra round trip before
// the first meaningful paint.
const SecurityFlowPage = lazy(() => import('./pages/SecurityFlowPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DocumentPage = lazy(() => import('./pages/DocumentPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const MindMapsPage = lazy(() => import('./pages/MindMapsPage'));
const AIWorkspacePage = lazy(() => import('./pages/AIWorkspacePage'));
const WorkspaceShell = lazy(() => import('./components/layout/WorkspaceShell'));

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, token, user } = useSelector((state) => state.auth);
  const userId = user?.id;
  const { currentTheme } = useSelector((state) => state.theme);

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const shouldUseDark = currentTheme === 'dark' || (currentTheme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', shouldUseDark);
      document.documentElement.dataset.theme = currentTheme;
      document.documentElement.style.colorScheme = shouldUseDark ? 'dark' : 'light';
    };

    applyTheme();
    if (currentTheme === 'system') {
      media.addEventListener('change', applyTheme);
      return () => media.removeEventListener('change', applyTheme);
    }
    return undefined;
  }, [currentTheme]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectChatSocket();
      return;
    }

    const socket = connectChatSocket(token);
    if (!socket) {
      return;
    }

    const handleGroupCreated = (payload) => {
      if (payload?.group) {
        dispatch(upsertChatGroup(payload.group));
        dispatch(fetchChatNotifications());
      }
    };

    const handleGroupUpdated = (payload) => {
      if (payload?.group) {
        dispatch(upsertChatGroup(payload.group));
      }
    };

    const handleGroupRemoved = (payload) => {
      if (payload?.groupId) {
        dispatch(removeChatGroup(payload.groupId));
      }
    };

    const handleMessage = (payload) => {
      if (payload?.message) {
        dispatch(receiveChatMessage(payload.message));
      }
    };

    const handleActivity = (payload) => {
      if (payload?.groupId) {
        dispatch(
          updateGroupActivity({
            groupId: payload.groupId,
            lastMessage: payload.lastMessage,
            updatedAt: payload.lastMessage?.sentAt,
            currentUserId: userId
          })
        );
      }
    };

    const handleReadReceipt = (payload) => {
      if (payload?.groupId && payload?.userId) {
        dispatch(applyReadReceipt(payload));
      }
    };

    const handleMessageUpdated = (payload) => {
      if (payload?.message) {
        dispatch(applyMessageUpdate(payload.message));
      }
    };

    const handleTyping = (payload) => {
      if (payload?.groupId) {
        dispatch(setTypingState(payload));
      }
    };

    const handlePresence = (payload) => {
      if (payload?.groupId) {
        dispatch(setPresenceState(payload));
      }
    };

    const handleGroupJoined = (payload) => {
      if (payload?.group?.id) {
        dispatch(upsertChatGroup(payload.group));
        dispatch(
          setPresenceRoster({
            groupId: payload.group.id,
            userIds: payload.onlineUserIds || []
          })
        );
      }
    };

    const handleMention = (payload) => {
      if (payload?.groupId) {
        dispatch(receiveMentionAlert(payload));
        dispatch(fetchChatNotifications());
      }
    };

    socket.on('chat:group:created', handleGroupCreated);
    socket.on('chat:group:updated', handleGroupUpdated);
    socket.on('chat:group:removed', handleGroupRemoved);
    socket.on('chat:group:joined', handleGroupJoined);
    socket.on('chat:message:new', handleMessage);
    socket.on('chat:message:updated', handleMessageUpdated);
    socket.on('chat:group:activity', handleActivity);
    socket.on('chat:read:receipt', handleReadReceipt);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:presence', handlePresence);
    socket.on('chat:mention', handleMention);

    dispatch(fetchChatGroups());
    dispatch(fetchChatNotifications());

    return () => {
      socket.off('chat:group:created', handleGroupCreated);
      socket.off('chat:group:updated', handleGroupUpdated);
      socket.off('chat:group:removed', handleGroupRemoved);
      socket.off('chat:group:joined', handleGroupJoined);
      socket.off('chat:message:new', handleMessage);
      socket.off('chat:message:updated', handleMessageUpdated);
      socket.off('chat:group:activity', handleActivity);
      socket.off('chat:read:receipt', handleReadReceipt);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:presence', handlePresence);
      socket.off('chat:mention', handleMention);
    };
  }, [dispatch, isAuthenticated, token, userId]);

  // Only reached when a stored token is being verified. Anonymous visitors fall
  // straight through to the sign-in screen on the first frame.
  if (loading) {
    return <LoadingSpinner label="Restoring your session…" />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<SecurityFlowPage />} />
            <Route path="/reset-password" element={<SecurityFlowPage />} />
            <Route path="/verify-email" element={<SecurityFlowPage />} />
            <Route path="/two-factor" element={<SecurityFlowPage />} />
            <Route
              element={
                <PrivateRoute>
                  <WorkspaceShell />
                </PrivateRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/documents" element={<Dashboard forcedView="mine" />} />
              <Route path="/shared" element={<Dashboard forcedView="shared" />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/mind-maps" element={<MindMapsPage />} />
              <Route path="/ai" element={<AIWorkspacePage />} />
              <Route path="/document/:id" element={<DocumentPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
