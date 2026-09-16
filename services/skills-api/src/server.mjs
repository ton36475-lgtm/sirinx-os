// Skills API Server
// Runs on port 3800

import express from 'express';
import cors from 'cors';
import skillsRouter from './skills-router.mjs';

const app = express();
const PORT = process.env.SKILLS_API_PORT || 3800;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());
app.use('/api/skills', skillsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'skills-api', dry_run: true });
});

// Ready check
app.get('/ready', (req, res) => {
  res.json({ ready: true, skills_loaded: 23 });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Skills API running on port ${PORT} (dry-run mode)`);
  });
}

export default app;