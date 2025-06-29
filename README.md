# Real-time Inventory WebSocket Server with Redis

A Node.js WebSocket server that provides real-time inventory updates and alerts by subscribing to Redis channels. This server acts as a bridge between Laravel backend events and frontend clients, enabling real-time notifications for inventory management systems.

## 🚀 Features

- **Real-time WebSocket Communication** - Instant bidirectional communication with connected clients
- **Redis Channel Subscription** - Listens to multiple Redis channels for different types of events
- **Multi-device Access** - Accessible via localhost and network IP for testing across devices
- **Room-based Broadcasting** - Clients can subscribe to specific event types
- **Inventory Alerts** - Handles critical inventory alerts like count exceeded warnings
- **CORS Configuration** - Properly configured for cross-origin requests
- **Automatic IP Detection** - Displays both local and network URLs on startup

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **Redis Server** (running on localhost:6379)
- **Laravel Application** (that publishes to Redis channels)

## 🛠️ Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd NODE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Redis server**
   ```bash
   # On Ubuntu/Debian
   sudo service redis-server start
   
   # On macOS with Homebrew
   brew services start redis
   
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

4. **Run the server**
   ```bash
   npm start
   # or
   npm run dev
   ```

## 📡 Server Configuration

The server listens on:
- **Port**: 3001
- **Host**: 0.0.0.0 (all interfaces)
- **Redis**: localhost:6379

### Network Access

When started, the server displays:
```
🚀 WebSocket server started!
📡 Local:    http://localhost:3001
🌐 Network:  http://192.168.1.100:3001

CORS enabled for:
  - http://localhost:3000
  - http://127.0.0.1:3000
  - http://192.168.1.100:3000
```

## 🔄 Redis Channel Integration

### Subscribed Channels

1. **`inventory`** - General inventory updates
2. **`inventory-alerts`** - Critical alerts (e.g., ItemCountExeed events from Laravel)

### Laravel Event Integration

This server is designed to work with Laravel events that broadcast to Redis. Example Laravel event:

```php
// Laravel Event: ItemCountExeed
class ItemCountExeed implements ShouldBroadcastNow
{
    public function broadcastOn()
    {
        return new Channel('inventory-alerts');
    }
    
    public function broadcastAs()
    {
        return 'item.count.exceeded';
    }
}
```

## 🌐 WebSocket Events

### Client → Server Events

| Event | Description |
|-------|-------------|
| `join-inventory-updates` | Join room for inventory updates |
| `join-inventory-alerts` | Join room for inventory alerts |
| `leave-inventory-updates` | Leave inventory updates room |
| `leave-inventory-alerts` | Leave inventory alerts room |

### Server → Client Events

| Event | Description | Data Structure |
|-------|-------------|----------------|
| `inventory-update` | General inventory changes | `{ ...data }` |
| `inventory-alert` | Critical inventory alerts | See structure below |

#### Inventory Alert Data Structure

```javascript
{
  type: 'count_exceeded',
  message: 'Item count exceeded the limit.',
  current_count: 150,
  threshold: 100,
  severity: 'warning',
  timestamp: '2025-06-29T10:30:00.000Z'
}
```

## 💻 Client Usage Examples

### Basic WebSocket Connection

```javascript
import io from 'socket.io-client';

// Connect to the server
const socket = io('http://localhost:3001');

// Listen for inventory updates
socket.on('inventory-update', (data) => {
  console.log('Inventory updated:', data);
  // Update your inventory UI
});

// Listen for critical alerts
socket.on('inventory-alert', (alert) => {
  console.log('🚨 Alert:', alert.message);
  
  if (alert.severity === 'critical') {
    // Show critical alert in UI
    showCriticalAlert(alert);
  }
});

// Join specific rooms for targeted notifications
socket.emit('join-inventory-alerts');
socket.emit('join-inventory-updates');
```

### React.js Integration Example

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function InventoryDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('inventory-alert', (alert) => {
      setAlerts(prev => [...prev, alert]);
    });

    newSocket.emit('join-inventory-alerts');

    return () => newSocket.close();
  }, []);

  return (
    <div>
      <h2>Inventory Alerts</h2>
      {alerts.map((alert, index) => (
        <div key={index} className={`alert ${alert.severity}`}>
          <p>{alert.message}</p>
          <small>Current: {alert.current_count} | Threshold: {alert.threshold}</small>
        </div>
      ))}
    </div>
  );
}
```

### Vue.js Integration Example

```vue
<template>
  <div>
    <h2>Live Inventory Status</h2>
    <div v-for="alert in alerts" :key="alert.timestamp" 
         :class="['alert', alert.severity]">
      {{ alert.message }}
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';

export default {
  data() {
    return {
      socket: null,
      alerts: []
    };
  },
  mounted() {
    this.socket = io('http://localhost:3001');
    
    this.socket.on('inventory-alert', (alert) => {
      this.alerts.push(alert);
    });
    
    this.socket.emit('join-inventory-alerts');
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.close();
    }
  }
};
</script>
```

## 🏗️ Project Structure

```
NODE/
├── package.json          # Project dependencies and scripts
├── server.js             # Main WebSocket server file
└── README.md             # Project documentation
```

## 🔧 Configuration Options

### Environment Variables (Optional)

You can create a `.env` file to customize configuration:

```env
PORT=3001
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CORS_ORIGIN=http://localhost:3000
```

### Modifying CORS Origins

To add more allowed origins, update the CORS configuration in `server.js`:

```javascript
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-production-domain.com',
      `http://${getLocalIP()}:3000`
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:6379
   ```
   **Solution**: Make sure Redis server is running

2. **CORS Error in Browser**
   ```
   Access to XMLHttpRequest has been blocked by CORS policy
   ```
   **Solution**: Add your client's URL to the CORS origins list

3. **WebSocket Connection Failed**
   ```
   WebSocket connection to 'ws://localhost:3001/' failed
   ```
   **Solution**: Ensure the server is running and the port is not blocked

### Debugging

Enable detailed logging by uncommenting debug lines in `server.js`:

```javascript
// Uncomment for detailed alert logging
console.log(`🚨 INVENTORY ALERT: ${alertData.message}`, {
  current: alertData.current_count,
  threshold: alertData.threshold,
  severity: alertData.severity
});
```

## 🚀 Deployment

### Production Deployment

1. **Set environment to production**
   ```bash
   export NODE_ENV=production
   ```

2. **Use PM2 for process management**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "inventory-websocket"
   pm2 startup
   pm2 save
   ```

3. **Configure reverse proxy (Nginx)**
   ```nginx
   location /socket.io/ {
     proxy_pass http://localhost:3001;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
     proxy_set_header Host $host;
   }
   ```

## 📚 Technologies Used

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework for HTTP server
- **Socket.IO** - Real-time bidirectional event-based communication
- **ioredis** - Redis client for Node.js
- **Redis** - In-memory data structure store for pub/sub messaging

## 🤝 Integration with Laravel

This server is designed to work seamlessly with Laravel applications using:

- **Laravel Broadcasting** - For publishing events to Redis
- **Redis Queue Driver** - For reliable message delivery
- **Laravel Echo** - For frontend WebSocket connections

### Laravel Setup Required

1. Configure Redis broadcasting in Laravel
2. Create events that implement `ShouldBroadcastNow`
3. Set up broadcasting routes and channels
4. Use Laravel Echo on the frontend to connect to this server

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Related Projects

- [Laravel Broadcasting Documentation](https://laravel.com/docs/broadcasting)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Redis Documentation](https://redis.io/documentation)

---

sachin karunarathna (codewolf)
**Happy coding! 🎉**
