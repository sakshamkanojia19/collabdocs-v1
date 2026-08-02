const { Router } = require('express');

const createStatusRouter = () => {
  const router = Router();

  router.get('/status', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  return router;
};

module.exports = { createStatusRouter };
