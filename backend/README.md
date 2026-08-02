# CollabDocs Backend

Node.js/CommonJS modular monolith for CollabDocs.

```text
src/
  app.js                 Express composition root
  server.js              MongoDB, HTTP, Socket.IO, shutdown
  platform/              configuration and database lifecycle
  modules/
    identity/
    documents/
    chat/
    ai/                    document RAG, structured summaries, mind maps, Q&A
    status/
  realtime/              document collaboration and chat sockets
packages/shared/          shared middleware, errors, and logging
tests/                    HTTP, policy, database, and realtime tests
docker/                   local Compose stack
```

## Develop

```bash
npm install
npm run dev
```

The backend listens on port 3000 and loads `.env.local` after respecting existing process environment variables.

Enable document AI by setting `OPENAI_API_KEY` in `.env.local` and restarting the backend. Model, embedding model,
document size, and request-limit defaults are already supplied in `.env.example`; no frontend secret is required.

## Validate

```bash
npm run check
npm test
```

When a disposable local MongoDB is available:

```powershell
$env:RUN_DB_TESTS="true"
$env:TEST_MONGO_URI="mongodb://127.0.0.1:27017/collabdocs_smoke"
npm run test:db
```

The database tests replace the database name with dedicated smoke databases and drop only those databases afterward.

See `../system-workflow.md` for the complete contract.
