import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { pool } from './config/db.js';
import './config/cache.js'; // initialize cache (logs backend)

import { notFound, errorHandler } from './middleware/error.js';
import { usersRouter } from './modules/users.js';
import { locationsRouter } from './modules/locations.js';
import { weatherRouter } from './modules/weather.js';
import { alertsRouter } from './modules/alerts.js';
import { dashboardRouter } from './modules/dashboard.js';
import { historyRouter } from './modules/history.js';
import { publicRouter, webhooksRouter } from './modules/integration.js';
import { attachWebsocket } from './realtime/hub.js';
import { startScheduler } from './jobs/scheduler.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: env.clientOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Global rate limit (NFR 4.1 / abuse protection).
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Health check (NFR 4.3 monitoring).
app.get('/api/health', async (_req, res) => {
  let db = 'down';
  try {
    await pool.query('SELECT 1');
    db = 'up';
  } catch {
    /* db down */
  }
  res.json({ status: 'ok', db, time: new Date().toISOString() });
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/history', historyRouter);
app.use('/api/webhooks', webhooksRouter);
// Public, documented API for third parties (FR-44).
app.use('/api/public/v1', publicRouter);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
attachWebsocket(server); // SRS §9.2 live updates

server.listen(env.port, () => {
  console.log(`\nDalili API running on http://localhost:${env.port}`);
  console.log(`CORS origin: ${env.clientOrigin}`);
  startScheduler();
});

// Graceful shutdown
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n[server] ${sig} received, shutting down…`);
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
