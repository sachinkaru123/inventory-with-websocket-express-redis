import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { networkInterfaces } from 'os';

const app = express();
const server = http.createServer(app);

// Function to get local IP address
function getLocalIP() {
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results[0] || 'localhost';
}

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      `http://${getLocalIP()}:3000`
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const redis = new Redis({ host: '127.0.0.1', port: 6379 });

// Subscribe to multiple channels
redis.subscribe('inventory', 'inventory-alerts', (err, count) => {
  if (err) {
    console.error('Failed to subscribe: %s', err.message);
  } else {
    console.log(`Subscribed to ${count} channel(s). Listening for updates on the 'inventory' and 'inventory-alerts' channels.`);
  }
});

// Handle incoming messages from Redis channels
redis.on('message', (channel, message) => {
  try {
    const data = JSON.parse(message);
    console.log(`Received message from ${channel}:`, data);
    
    if (channel === 'inventory') {
      // Handle inventory updates
      io.emit('inventory-update', data);
      io.to('inventory-updates').emit('inventory-update', data);
    } else if (channel === 'inventory-alerts') {
      // Handle inventory alerts (item count exceeded)
      const alertData = {
        type: 'count_exceeded',
        message: data.message || 'Item count exceeded the limit.',
        current_count: data.current_count,
        threshold: data.threshold,
        severity: data.severity || 'warning',
        timestamp: data.timestamp || new Date().toISOString(),
        ...data
      };
      
      io.emit('inventory-alert', alertData);
      io.to('inventory-alerts').emit('inventory-alert', alertData);
      
      // Log the alert for debugging
      // console.log(`-------- INVENTORY ALERT : ${alertData.message}`, {
      //  alertData
      // });
    }
  } catch (error) {
    console.error('Error parsing message from Redis:', error);
    console.log('Raw message:', message);
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Allow clients to join specific rooms for targeted notifications
  socket.on('join-inventory-updates', () => {
    socket.join('inventory-updates');
    console.log(`Client ${socket.id} joined inventory-updates room`);
  });
  
  socket.on('join-inventory-alerts', () => {
    socket.join('inventory-alerts');
    console.log(`Client ${socket.id} joined inventory-alerts room`);
  });
  
  socket.on('leave-inventory-updates', () => {
    socket.leave('inventory-updates');
    console.log(`Client ${socket.id} left inventory-updates room`);
  });
  
  socket.on('leave-inventory-alerts', () => {
    socket.leave('inventory-alerts');
    console.log(`Client ${socket.id} left inventory-alerts room`);
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = 3001;
const HOST = '0.0.0.0'; // Listen on all interfaces
const localIP = getLocalIP();

server.listen(PORT, HOST, () => {
  console.log('🚀 WebSocket server started!');
  console.log(`📡 Local:    http://localhost:${PORT}`);
  console.log(`🌐 Network:  http://${localIP}:${PORT}`);
  console.log('');
  console.log('CORS enabled for:');
  console.log(`  - http://localhost:3000`);
  console.log(`  - http://127.0.0.1:3000`);
  console.log(`  - http://${localIP}:3000`);
});
