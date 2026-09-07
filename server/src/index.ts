import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import path from 'path';

import songRoutes from './routes/songs.js';
import playlistRoutes from './routes/playlists.js';
import sessionRoutes from './routes/sessions.js';
import { registerSocketHandlers } from './socket/handlers.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

// Socket.io with CORS for dev
const io = new SocketServer(httpServer, {
  cors: {
    origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

// API Routes
app.use('/api', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/session', sessionRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve built client in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  // Only serve index.html if it exists (production build)
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

// Socket.io
registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`🎸 ChordSync server running at http://localhost:${PORT}`);
  console.log(`   Socket.io ready`);
  console.log(`   Accepting client from: ${CLIENT_ORIGIN}`);
});
