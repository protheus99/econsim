# EconSim Alpha - Server-Driven Architecture

This is the refactored server-side version of the economic simulation. The simulation runs on a Node.js backend with real-time updates via WebSocket.

## Architecture

```
alpha/
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── index.js       # Express + WebSocket entry point
│   │   ├── api/routes/    # REST API endpoints
│   │   ├── ws/            # WebSocket handlers
│   │   ├── db/            # SQLite database layer
│   │   ├── simulation/    # Game session management
│   │   └── adapters/      # SimulationEngine adapter for Node.js
│   └── package.json
└── client/                 # Browser client
    ├── index.html         # Main UI
    └── js/
        ├── WebSocketClient.js  # WebSocket connection
        ├── StateManager.js     # Client-side state
        └── app.js              # Main application
```

## Quick Start

### 1. Install Dependencies

```bash
cd alpha/server
npm install
```

### 2. Start the Server

```bash
npm start
```

Server will start at:
- HTTP: http://localhost:3000
- WebSocket: ws://localhost:3000/ws
- API: http://localhost:3000/api/v1

### 3. Open the Client

Open http://localhost:3000 in your browser.

## API Endpoints

### Games

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/games | Create new game |
| GET | /api/v1/games | List all games |
| GET | /api/v1/games/:id | Get game details |
| PATCH | /api/v1/games/:id | Update game |
| DELETE | /api/v1/games/:id | Delete game |
| POST | /api/v1/games/:id/load | Load game into active session |
| POST | /api/v1/games/:id/save | Save game state |
| GET | /api/v1/games/:id/saves | List saves |

### Simulation Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/games/:id/status | Get session status |
| POST | /api/v1/games/:id/start | Start simulation |
| POST | /api/v1/games/:id/pause | Pause simulation |
| POST | /api/v1/games/:id/resume | Resume simulation |
| POST | /api/v1/games/:id/speed | Set speed (body: {speed: 1|2|4|8|24|168}) |

## WebSocket Protocol

### Client -> Server

```javascript
// Join a game session
{ type: "JOIN_SESSION", sessionId: "uuid" }

// Leave session
{ type: "LEAVE_SESSION" }

// Send command
{ type: "COMMAND", command: "PAUSE" }
{ type: "COMMAND", command: "RESUME" }
{ type: "COMMAND", command: "SET_SPEED", payload: { speed: 4 } }

// Request data
{ type: "GET_STATE" }
{ type: "GET_DISPLAY_DATA" }
{ type: "LIST_SESSIONS" }
```

### Server -> Client

```javascript
// Connection established
{ type: "CONNECTED", payload: { clientId, activeSessions } }

// Joined session - includes full state
{ type: "INITIAL_STATE", payload: { sessionId, clock, firms, cities, ... } }

// Real-time tick updates
{ type: "TICK_UPDATE", payload: { clock, totalHours, stats, ... } }

// Control state changes
{ type: "CONTROL_UPDATE", payload: { isPaused, speed } }
```

## Database

SQLite database stored at `server/data/econsim.db`

Tables:
- `games` - Game metadata (id, name, seed, config)
- `game_states` - Saved game states (JSON blobs)

## Development

### Run in watch mode

```bash
npm run dev
```

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Differences from Original

1. **Simulation runs server-side** - No more browser-only execution
2. **Persistent state** - Games saved to SQLite, survive browser refresh
3. **Multi-session support** - Multiple games can run simultaneously
4. **Real-time sync** - All connected clients see same state via WebSocket
5. **Display-only client** - Browser receives updates, doesn't run simulation

## Troubleshooting

### "better-sqlite3" build errors

On Windows, you may need:
```bash
npm install --global windows-build-tools
```

Or use WSL/Linux for development.

### WebSocket connection fails

1. Check server is running
2. Check port 3000 is not in use
3. Check CORS settings if running client separately
