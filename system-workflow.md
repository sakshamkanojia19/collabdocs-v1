# CollabDocs System Workflow

> Canonical engineering context. Read this file before changing behavior. Update it whenever an API, event, model,
> environment variable, port, module responsibility, or deployment flow changes.

## Snapshot

- Last reviewed: **2026-07-31**
- Runtime: Node.js 20+, npm, MongoDB; Redis is optional for chat presence
- Architecture: separate React SPA plus Node.js modular-monolith backend
- REST and Socket.IO origin: `http://localhost:3000` locally
- Evidence order: executable source/configuration, this file, current architecture docs, then historical notes

The frontend/backend folder restructure and modular-monolith migration are currently uncommitted. Preserve unrelated
user changes when editing the working tree.

## System in one view

```text
React/Vite SPA :5173
  |
  |-- REST /api/v1/*
  `-- Socket.IO
          |
          v
Node.js backend :3000
  |-- identity        registration, login, current user, user search
  |-- users           compatibility status; profile domain is not implemented
  |-- documents       CRUD, access policy, collaborators, notifications
  |-- collaboration   document rooms, server-derived roles, presence, HTML relay
  |-- chat            groups, messages, reactions, mentions, anchored threads, decisions, presence
  |-- ai              chunking, embeddings, RAG, summaries, mind maps, workspace search/Q&A, action items
  |-- search          compatibility status; dedicated indexing is not implemented
  `-- worker          compatibility status; background jobs are not implemented
          |
          |-- MongoDB: one connection/database, existing collection names
          `-- Redis: optional; chat presence falls back to process memory
```

There is no active API gateway or service-to-service HTTP path. `backend/src/app.js` mounts every route in-process,
and `backend/src/server.js` owns the shared HTTP and Socket.IO server.

## Repository map

```text
frontend/
  src/
    components/layout/WorkspaceShell.jsx
    components/auth/AuthShell.jsx
    pages/
    services/api.js
    services/socket.js
    services/chatSocket.js
    store/
  .env.example
  package.json

backend/
  src/
    app.js                         HTTP composition root
    server.js                      startup and graceful shutdown
    platform/
      config.js                    .env loading and validation
      database.js                  single Mongoose connection/readiness
    modules/
      identity/                    User model and auth routes
      documents/                   Document/Notification models, routes, policy
      chat/                        chat models, routes, presence, optional Kafka adapter
      ai/                          RAG service, chunk/artifact models, AI routes
      status/                      compatibility status routers
    realtime/index.js              unified authenticated Socket.IO transport
  tests/                           HTTP and authorization-policy tests
  packages/shared/                 common middleware/errors/logging
  docker/docker-compose.yml        MongoDB, Redis, backend, frontend
  Dockerfile                       unified backend image
  .env.example
  package.json
```

The previous gateway and eight service entry points were removed after HTTP, database-backed workflow, and
multi-client socket authorization checks passed. Git history plus database backups are the rollback mechanism.

## Runtime lifecycle

1. `backend/src/platform/config.js` loads `backend/.env.local`, then fills missing values from `backend/.env`; process environment values take precedence.
2. Configuration validates MongoDB and JWT requirements.
3. `server.js` creates one HTTP server and attaches one Socket.IO server.
4. MongoDB connects before port 3000 starts accepting traffic.
5. REST routes and both realtime protocols share the same identity claims and document policy.
6. `SIGINT`/`SIGTERM` stop sockets, HTTP, optional Kafka/Redis clients, and MongoDB.

Liveness and readiness:

| Method | Path | Meaning |
| --- | --- | --- |
| GET | `/health` | Process is running. Does not promise database readiness. |
| GET | `/ready` | Returns 200 only while the shared Mongo connection is ready. |
| GET | `/api/v1/status` | Lists composed modules and confirms the modular runtime. |

## REST API contract

The frontend Axios base must end with `/api/v1`, locally:

```env
VITE_APP_BACKEND_URL=http://localhost:3000/api/v1
```

### Identity (`/api/v1/auth`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/status` | no | Compatibility status |
| POST | `/register` | no | Create user and return access token |
| POST | `/login` | no | Verify credentials and return access token |
| GET | `/me` | yes | Return current safe user |
| GET | `/users/search?query=&limit=` | yes | Search other users by name/email |

JWT claims are `sub`, `name`, and `email`. REST and sockets use `JWT_ACCESS_SECRET`.

### Documents (`/api/v1/documents`)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/status` | Compatibility status |
| GET | `/` | List owned/shared non-archived documents |
| POST | `/` | Create document |
| GET | `/search?q=&limit=` | Owner-only regex search |
| GET | `/:id` | Read an accessible document |
| PUT | `/:id` | Update as owner/editor |
| DELETE | `/:id` | Delete as owner |
| POST | `/:id/collaborators` | Owner adds/updates viewer/editor |
| DELETE | `/:id/collaborators/:collaboratorId` | Owner removes collaborator |
| GET | `/notifications` | Current user's document notifications |
| PATCH | `/notifications/:notificationId` | Mark notification read |

The shared policy in `backend/src/modules/documents/policy.js` is authoritative for both REST and socket access.

### Chat (`/api/v1/chat`)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/status` | Compatibility status |
| GET/POST | `/groups` | List (with real unread/mention counts) or create groups |
| GET | `/groups/:groupId` | Group detail |
| PATCH | `/groups/:groupId` | Rename group (owner/admin) |
| POST | `/groups/:groupId/leave` | Leave a group (owner cannot) |
| POST | `/groups/:groupId/participants` | Add participants |
| DELETE | `/groups/:groupId/participants/:participantId` | Owner removes participant |
| GET/POST | `/groups/:groupId/messages` | Paginate or create messages (mentions, replyToId, anchor) |
| PATCH | `/groups/:groupId/messages/:messageId` | Edit own message |
| DELETE | `/groups/:groupId/messages/:messageId` | Soft delete (sender or group owner) |
| POST | `/groups/:groupId/messages/:messageId/reactions` | Toggle a reaction from the server allowlist |
| POST/DELETE | `/groups/:groupId/messages/:messageId/decision` | Promote/demote a message to a decision |
| POST | `/groups/:groupId/messages/:messageId/resolve` | Resolve or reopen an anchored thread |
| POST | `/groups/:groupId/read` | Update read receipt |
| GET | `/documents/:documentId/decisions` | Document decision log |
| GET | `/documents/:documentId/threads` | Anchored discussion for a document |
| GET | `/mentions` | Recent mentions of the current user |
| GET | `/notifications` | List chat notifications |
| PATCH | `/notifications/:notificationId` | Mark chat notification read |

`GET /chat/groups` computes `unreadCount` and `mentionCount` in one aggregation using each participant's own
`lastReadAt` as the cutoff. Mentions posted to a message are re-derived from group membership server-side, so a
client cannot notify or name a non-member. Anchors require read access to the referenced document and must match
the group's document when the group is document-scoped. Promoting a message to a decision requires **write**
access to the linked document.

Decision-log visibility is deliberately asymmetric: any reader of a document sees promoted decision summaries,
because a decision is explicitly published to the document's record. The original message content and anchor quote
are returned only to members of that conversation (`canOpenThread`). Anchored threads are restricted to
conversations the requester belongs to.

All document and chat routes after their public status routes require a valid access token.

### Document AI (`/api/v1/ai`)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/status` | Safe configuration status; never returns the API key |
| GET | `/artifacts` | Artifacts across every readable document |
| GET | `/artifacts/:artifactId/sources` | Source passages behind mind-map nodes |
| PATCH | `/artifacts/:artifactId` | Manual mind-map edit (requires document write) |
| PATCH | `/artifacts/:artifactId/layout` | Persist dragged node positions only |
| GET | `/documents/:documentId/artifacts` | Artifacts for one document |
| POST | `/documents/:documentId/summary` | Cached, cited document summary |
| POST | `/documents/:documentId/mind-map` | Cached flat node/edge mind-map graph |
| POST | `/documents/:documentId/ask` | Retrieval-grounded document question answering |
| GET | `/search` | Workspace search across documents and conversations |
| POST | `/ask` | Workspace-wide cited question answering |
| GET | `/knowledge-graph` | Cross-document map built from shared summary themes |
| GET | `/action-items` | Open work across every readable document |
| GET/POST | `/documents/:documentId/action-items` | List or add tracked work |
| POST | `/documents/:documentId/action-items/sync` | Promote extracted summary tasks into tracked work |
| PATCH/DELETE | `/action-items/:itemId` | Update status/assignee/due, or remove |

`knowledgeService.js` owns workspace scope. Search is semantic when a provider key exists and chunks are already
indexed, and lexical otherwise; it never triggers a bulk re-index. `POST /ai/ask` synthesises a cited answer
through the provider when configured and otherwise returns a ranked extractive answer from the same retrieved
passages, labelled `mode: 'local'` — the capability never disappears. The model cites passages by index and the
server maps each index back to its document, so document ids are never handed to the model.

`resolveArtifactSources` interprets a node's `sourceChunks` according to the artifact's `model`: local artifacts
index fixed `SOURCE_CHUNK_SIZE` character windows, provider artifacts index stored embedding chunks. These are
two different index spaces and must not be conflated.

Action items are identified by a fingerprint of their normalised task text, so re-running extraction updates
rather than duplicates, and a user's status/assignee edits survive regeneration.

Two mind-map schemas exist and must not be merged. `mindMapSchema` is the generation contract and stays strict,
because the provider's structured-output mode rejects optional fields. `mindMapLayoutSchema` extends it with
optional per-node `x`/`y` and is used only to validate stored/manual edits. Node positions are optional: absent
coordinates fall back to the automatic tidy layout in `frontend/src/components/ai/mind-map-layout.js`.

Document read access is checked before any AI operation. `ragService.js` converts editor content to text, creates
overlapping chunks, stores OpenAI embeddings in MongoDB, performs cosine retrieval with document-coverage sampling,
and requests schema-validated outputs through the OpenAI Responses API. Summary and mind-map artifacts are cached by
document checksum and model. AI requests are rate-limited per authenticated user in-process.

The OpenAI key is backend-only. With no key, the application still starts normally and AI endpoints return a clear
503 configuration response.

### Compatibility-only modules

`GET /api/v1/users/status`, `/collaboration/status`, `/search/status`, and `/worker/status` remain available. They do
not prove that profile, search-indexing, or worker features are implemented.

## Socket.IO contract

Both frontend clients connect to the unified backend:

```env
VITE_APP_SOCKET_URL=http://localhost:3000
VITE_APP_CHAT_SOCKET_URL=http://localhost:3000
```

Authentication uses `handshake.auth.token` or an Authorization header. The server derives the user from the JWT.

### Document collaboration events

| Direction | Event | Behavior |
| --- | --- | --- |
| client -> server | `joinDocument` | Loads the document and derives owner/editor/viewer from MongoDB |
| client -> server | `leaveDocument` | Leaves the document room |
| client -> server | `documentChange` | Relays HTML only for server-approved owner/editor |
| server -> clients | `activeUsers` | Current unique users and roles |
| server -> clients | `userJoined`, `userLeft` | Presence changes |
| server -> clients | `documentChange` | Relayed remote HTML |
| server -> client | `collaboration:error` | Access or validation failure |

The client-supplied role is ignored. Presence tracks multiple sockets for the same user. Realtime content remains
whole-document HTML relay, not OT/CRDT, and persistence still occurs through document REST autosave.

### Chat events

| Direction | Event |
| --- | --- |
| client -> server | `chat:join`, `chat:leave`, `chat:typing`, `chat:read` |
| server -> client | `chat:connected`, `chat:group:joined` (carries `onlineUserIds` roster), `chat:error`, `chat:mention` |
| server -> clients | `chat:message:new`, `chat:message:updated`, `chat:group:activity`, `chat:group:created`, `chat:group:updated`, `chat:group:removed`, `chat:presence`, `chat:typing`, `chat:read:receipt` |

Group membership is checked before socket room join. Typing/read operations require a successfully joined group.
`chat:join` returns the existing online roster to the joiner and announces only the delta to peers.
`chat:typing` and `chat:presence` carry the user's display name. Every message mutation — edit, soft delete,
reaction, decision change, anchor resolution — is broadcast as `chat:message:updated`.

Unread counting rule for clients: increment on `chat:group:activity` (which reaches every participant, including
those with the conversation closed) and **not** on `chat:message:new` (which only fires for joined rooms).
Counting in both places double-counts.

## Data ownership

One Mongo database connection preserves these existing collections:

- `users`
- `documents`
- document notifications
- chat groups
- chat messages
- chat notifications

Important embedded snapshots:

- documents store owner/collaborator identity and roles;
- documents store `content`, derived `contentText`, tags, last editor, and archive state;
- chat groups store participant snapshots, document/global context, last message, and read receipts;
- chat messages store sender snapshot, content, attachments, reactions, mentions, reply snapshot, document
  anchor, decision promotion, edit timestamp, and soft-delete timestamp;
- document AI chunks store revision checksums, chunk text, embedding model, and embedding vectors;
- AI artifacts store the latest checksum-scoped summary or mind-map output and generation model;
- action items store the document link, task fingerprint, status, assignee, suggested owner, due text,
  provenance, and completion metadata.

Cross-module access goes through `backend/src/modules/documents/service.js`. Chat and AI depend on that interface
instead of importing the `Document` model, which keeps authorization in one place. Retrieval filters by access
**before** searching, so a query can never surface a document the user cannot read.

The monolith now makes cross-module transactions possible, but current handlers have not yet been converted to Mongo
transactions or an outbox.

## Frontend

Public routes:

- `/`
- `/login`
- `/signup`

Protected routes inside `WorkspaceShell`:

- `/dashboard`, `/documents`, `/shared`
- `/document/:id`
- `/messages` (accepts `?group=<id>`)
- `/mind-maps` (accepts `?selected=<artifactId>`)
- `/ai`
- `/profile`, `/settings`

Redux slices remain `auth`, `document`, `collaboration`, `notifications`, `chat`, and `theme`. `App.jsx` lazy-loads
major routes and the chat drawer. The protected experience uses a global product bar, compact workspace sidebar,
list-first document dashboard, paper-based editor canvas, contextual AI/record inspector, and a half-viewport
desktop messaging drawer that becomes full-screen on mobile. `index.css` owns semantic light/dark tokens, editor
surfaces, typography, focus behavior, reduced-motion behavior, and shared scrollbars.

Messaging is built from one shared set of components under `src/components/chat/`: `ChatThread`,
`ConversationList`, `ConversationDialog`, `MessageBubble`, `MessageComposer`, and `chat-utils.js`. Both the
`/messages` page and the workspace drawer (`ChatSidebar`) render those same components, so the two entry points
cannot diverge. Sends are optimistic — a pending message appears immediately and is either replaced by the server
copy or flagged for retry.

The chat drawer lives in `WorkspaceShell` while the editor lives in `DocumentPage`, so they exchange intents
through `documentSlice`: `requestContentInsert` (promote a message into the document as an attributed blockquote)
and `requestAnchorFocus` (scroll to and flash the passage a comment or decision refers to). Selecting editor text
raises a floating "Discuss" action that attaches the quote to the chat composer as an anchor.

The editor uses a paginated `contentEditable` surface with fixed-height visual sheets and automatic overflow into the
next sheet. Page wrappers and paragraph continuations are presentation-only: autosave and Socket.IO still exchange
one continuous HTML string, so existing stored documents remain compatible. Pagination reflows after edits, remote
updates, viewport changes, and media loads while preserving the active caret. The editor still relies on deprecated
`document.execCommand`, HTML strings, and one-second REST autosave.

## Environment

Backend:

| Variable | Required | Notes |
| --- | --- | --- |
| `PORT` | no | Default 3000 |
| `NODE_ENV` | no | Default development |
| `FRONTEND_URL` | yes in deployment | Comma-separated exact browser origins |
| `MONGO_URI` | yes | One monolith database |
| `MONGO_MAX_POOL_SIZE` | no | Default 20 |
| `REDIS_URL` | no | Chat presence falls back to memory |
| `JWT_ACCESS_SECRET` | yes | Minimum 32 characters in production |
| `JWT_REFRESH_SECRET` | future | Configured but refresh lifecycle is not implemented |
| `AUTH_TOKEN_TTL` | no | Default 15m |
| `OPENAI_API_KEY` | only for AI | Server-only; blank disables document AI without breaking startup |
| `OPENAI_MODEL` | no | Default `gpt-5.6-terra` |
| `OPENAI_EMBEDDING_MODEL` | no | Default `text-embedding-3-small` |
| `AI_MAX_DOCUMENT_CHARS` | no | Default 500000 |
| `AI_REQUESTS_PER_MINUTE` | no | Default 10 per authenticated user |
| `KAFKA_BROKERS` | no | Empty disables useful publishing; Kafka is not core runtime |

Frontend:

| Variable | Local value |
| --- | --- |
| `VITE_APP_BACKEND_URL` | `http://localhost:3000/api/v1` |
| `VITE_APP_SOCKET_URL` | `http://localhost:3000` |
| `VITE_APP_CHAT_SOCKET_URL` | `http://localhost:3000` |

`.env.local` files are ignored. `.env.example` files contain no production secrets.

## Local development

From the repository root:

```powershell
docker compose -f backend/docker/docker-compose.yml up -d mongodb redis
```

Terminal 1:

```powershell
cd backend
npm install
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Or run everything:

```powershell
docker compose -f backend/docker/docker-compose.yml up --build
```

## Validation

```powershell
cd backend
npm run check
npm test

cd ../frontend
npm run lint
npm run build

cd ..
docker compose -f backend/docker/docker-compose.yml config --quiet
```

Current automated backend coverage checks liveness, module/status compatibility, AI status safety, RAG text
normalization/chunking/vector math, error shape, CORS rejection, document authorization policy, chat message DTO
visibility rules (per-viewer reactions/mentions, deleted-message withholding, edit flags, anchor/decision
serialization), and action-item fingerprint stability. Optional database tests cover registration, current user,
document creation/sharing, collaborator read access, chat creation/messages, socket authentication, persisted
socket roles, and viewer rejection. Live OpenAI calls require a user-provided key and are not run in CI.

Not yet covered: database-backed integration tests for the decision, anchor, reaction, and action-item endpoints;
browser E2E; and Docker runtime verification.

Docker image/runtime validation was not completed on 2026-07-23 because Docker Desktop's Linux engine was stopped.

## Known risks

1. Stored document HTML is not sanitized and can enable stored XSS.
2. JWT access tokens are stored in browser localStorage; refresh rotation/revocation is not implemented.
3. Realtime documents use last-write whole-HTML relay, not CRDT/OT. Visual pagination does not change this conflict
   model.
4. AI endpoints have a per-process user limit; general API rate limiting and brute-force protection are not implemented.
5. Workspace/organization membership and policy middleware are not implemented.
6. Chat participant invitations trust supplied participant snapshots.
7. Redis presence has an in-process fallback and is not sufficient for horizontal scaling.
8. Optional Kafka publishing is best effort and has no outbox guarantee.
9. Live-looking credentials were removed from current docs, but any previously committed values must be rotated and
   purged from Git history before deployment.
10. Database-backed integration, socket, accessibility, and E2E coverage is incomplete.
11. Dependency audits are clean locally, but continued scanning and careful compatibility testing remain mandatory.

## Change map

| Change | Primary files | Also verify |
| --- | --- | --- |
| App lifecycle/routes | `backend/src/app.js`, `server.js` | health, readiness, CORS, errors |
| Configuration/database | `backend/src/platform/*`, `backend/.env.example` | Compose and deployment secrets |
| Login/JWT/users | `backend/src/modules/identity/*` | REST/socket claims and frontend auth slice |
| Documents/sharing | `backend/src/modules/documents/*` | notification slice, dashboard, editor |
| Document authorization | `documents/policy.js`, `realtime/index.js` | REST plus socket joins/edits |
| Chat REST/models | `backend/src/modules/chat/*` | chat slice, `ChatThread`, `ConversationList` |
| Decisions/anchors | `chat/routes.js`, `documents/service.js` | `DecisionLogPanel`, `DocumentPage` intents |
| Document AI/RAG | `backend/src/modules/ai/ragService.js` | document policy, editor inspector, OpenAI env |
| Workspace AI | `ai/knowledgeService.js`, `ai/routes.js` | `WorkspaceAskPanel`, `MindMapsPage`, `NodeSourcePanel` |
| Action items | `ai/actionItemService.js`, `ai/models/ActionItem.js` | `ActionItemsPanel`, `MyWorkSection` |
| Cross-module access | `documents/service.js` | every consumer's authorization path |
| Realtime | `backend/src/realtime/index.js` | both frontend socket clients |
| Editor pagination | `frontend/src/lib/document-pagination.js`, `frontend/src/pages/DocumentPage.jsx` | semantic HTML serialization, caret behavior, realtime/autosave |
| Frontend runtime URLs | `frontend/.env.example`, `src/services/*` | port 3000 for all clients |
| Local Docker | `backend/docker/docker-compose.yml`, Dockerfiles | health and persistent volumes |
| CI | `.github/workflows/build-images.yml` | backend tests and frontend build |

## Invariants

- Keep public REST paths under `/api/v1` unless frontend, tests, docs, and deployment change together.
- Keep JWT claims `sub`, `name`, and `email` until every consumer migrates.
- Enforce roles server-side from persisted membership.
- Do not import another domain's model; expose a policy/service interface.
- Keep frontend and backend package lifecycles separate.
- Do not reintroduce infrastructure without a measured requirement and an owned operational plan.
- Never commit real credentials.

## Planned next architecture phases

1. Add mocked OpenAI contract tests and opt-in live AI evaluation fixtures.
2. Introduce workspaces, memberships, invitations, and centralized policies.
3. Replace localStorage-only auth with session/refresh rotation.
4. Replace HTML synchronization with a structured editor and CRDT.
5. Move high-volume AI retrieval to a vector index when document scale warrants it.
6. Add durable jobs/outbox for long AI indexing and other real asynchronous workflows.
7. Add observability, backups, secret scanning, deployment smoke tests, and restore drills.

The detailed decision and rollback plan is in `docs/MODULAR_MONOLITH_MIGRATION.md`. The broader production roadmap is
in `docs/PRODUCTION_ARCHITECTURE_AUDIT.md`.
