import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import { cleanExpiredSessions } from './session-manager';
import router from './routes';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use(router);

// Initialize database and start server
initDatabase();

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Periodic cleanup of expired sessions every 5 minutes
const cleanupInterval = setInterval(() => {
  const removed = cleanExpiredSessions();
  if (removed > 0) {
    console.log(`Cleaned up ${removed} expired session(s)`);
  }
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
  server.close();
});

export { app };
