// Usage:
// node scripts/check_deploy.js --backend https://api.example.com
// Optional: --token <JWT> to verify GET /api/v1/auth/me.

const args = Object.fromEntries(
  process.argv.slice(2).reduce((entries, current, index, values) => {
    if (current.startsWith('--')) {
      const candidate = values[index + 1];
      entries.push([
        current.slice(2),
        candidate && !candidate.startsWith('--') ? candidate : 'true'
      ]);
    }
    return entries;
  }, [])
);

const backend = args.backend?.replace(/\/$/, '');
const token = args.token;

if (!backend) {
  console.error('Provide --backend https://your-backend-domain');
  process.exit(1);
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  try {
    return {
      ok: response.ok,
      status: response.status,
      body: JSON.parse(text)
    };
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      body: text
    };
  }
};

const run = async () => {
  const checks = [
    ['health', '/health'],
    ['readiness', '/ready'],
    ['API status', '/api/v1/status'],
    ['auth status', '/api/v1/auth/status'],
    ['document status', '/api/v1/documents/status'],
    ['chat status', '/api/v1/chat/status']
  ];

  let failed = false;
  for (const [name, path] of checks) {
    const result = await fetchJson(`${backend}${path}`);
    console.log(name, result);
    failed ||= !result.ok;
  }

  if (token) {
    const result = await fetchJson(`${backend}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('authenticated user', result);
    failed ||= !result.ok;
  }

  const socketResponse = await fetch(`${backend}/socket.io/?EIO=4&transport=polling`);
  const socketPayload = await socketResponse.text();
  console.log('Socket.IO handshake', {
    ok: socketResponse.ok,
    status: socketResponse.status,
    opened: socketPayload.startsWith('0')
  });
  failed ||= !socketResponse.ok || !socketPayload.startsWith('0');

  if (failed) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
