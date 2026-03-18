# EconSim Alpha - Server-Driven Architecture

This is the refactored version of EconSim using a Node.js backend with WebSocket for real-time updates.

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│    Browser      │ ◄─────────────────► │  Node.js Server │
│  (Display Only) │    REST API        │  (Simulation)   │
└─────────────────┘                     └─────────────────┘
                                               │
                                               ▼
                                        ┌─────────────────┐
                                        │     SQLite      │
                                        │  (Persistence)  │
                                        └─────────────────┘
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
# or for development with auto-reload:
npm run dev
```

The server will start on:
- HTTP: http://localhost:3001
- WebSocket: ws://localhost:3001/ws

### 3. Open the Client

Start a local web server from the project root:
```bash
cd ..  # Back to econsim root
python -m http.server 8000
```

Open http://localhost:8000/alpha/index.html in your browser.

## API Endpoints

### Games

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/games | Create new game |
| GET | /api/v1/games | List all games |
| GET | /api/v1/games/:id | Get game details |
| DELETE | /api/v1/games/:id | Delete game |
| POST | /api/v1/games/:id/load | Load game into session |
| POST | /api/v1/games/:id/save | Save game state |
| GET | /api/v1/games/:id/saves | List saves |

### Simulation Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/games/:id/status | Get session status |
| POST | /api/v1/games/:id/start | Start simulation |
| POST | /api/v1/games/:id/pause | Pause simulation |
| POST | /api/v1/games/:id/resume | Resume simulation |
| POST | /api/v1/games/:id/speed | Set speed (body: `{speed: 1\|2\|4\|8\|24\|168}`) |

## WebSocket Protocol

### Client → Server

```javascript
// Connect to session
{ type: "JOIN_SESSION", sessionId: "..." }

// Commands
{ type: "COMMAND", command: "PAUSE" }
{ type: "COMMAND", command: "RESUME" }
{ type: "COMMAND", command: "SET_SPEED", payload: { speed: 4 } }
{ type: "COMMAND", command: "SAVE", payload: { slot: "save1" } }

// Queries
{ type: "GET_STATE" }
{ type: "GET_DISPLAY_DATA" }
{ type: "LIST_SESSIONS" }

// Heartbeat
{ type: "PING", timestamp: 1234567890 }
```

### Server → Client

```javascript
// Initial connection
{ type: "CONNECTED", payload: { clientId, activeSessions } }

// Session joined
{ type: "SESSION_JOINED", payload: { sessionId, session } }

// Full state (after joining)
{ type: "INITIAL_STATE", payload: { clock, firms, cities, ... } }

// Tick updates (every game hour)
{ type: "TICK_UPDATE", payload: { clock, stats, ... } }

// Control changes
{ type: "CONTROL_UPDATE", payload: { isPaused, speed } }

// Errors
{ type: "ERROR", payload: { message } }
```

## Project Structure

```
alpha/
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js              # Entry point
│   │   ├── api/routes/
│   │   │   ├── games.js          # Game CRUD
│   │   │   └── simulation.js     # Control endpoints
│   │   ├── ws/
│   │   │   ├── WebSocketManager.js
│   │   │   └── MessageHandler.js
│   │   ├── db/
│   │   │   ├── Database.js       # SQLite wrapper
│   │   │   └── migrations/
│   │   ├── simulation/
│   │   │   ├── GameSession.js    # Per-game session
│   │   │   └── SessionManager.js # Manages sessions
│   │   └── adapters/
│   │       ├── BrowserPolyfills.js
│   │       └── EngineAdapter.js
│   └── data/
│       └── econsim.db           # SQLite database (created on first run)
│
├── client/
│   └── js/
│       ├── WebSocketClient.js    # WebSocket client
│       ├── StateManager.js       # State synchronization
│       └── pages/
│           └── shared.js         # Replaces original shared.js
│
└── index.html                    # Test client UI
```

## Development

### Running Tests

```bash
cd alpha/server
npm test
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| DB_PATH | ./data/econsim.db | SQLite database path |
| CORS_ORIGIN | http://localhost:8000 | Allowed CORS origin |
| NODE_ENV | development | Environment mode |

## Migration from Frontend-Only

The alpha client maintains API compatibility where possible:

| Original | Alpha |
|----------|-------|
| `getSimulation()` | `getStateManager()` |
| `simulation.firms` | `stateManager.firms` |
| `simulation.clock` | `stateManager.getClock()` |
| `onUpdate(cb)` | `stateManager.subscribe(...)` |

### Key Differences

1. **State is read-only**: Client can't modify state directly, must send commands
2. **Async everything**: All operations that affect state are async
3. **No direct engine access**: Use WebSocket commands instead
4. **Real-time sync**: State updates push from server automatically

## Troubleshooting

### Server won't start
- Check if port 3001 is available
- Ensure `npm install` completed successfully
- Check for error messages in console

### WebSocket connection fails
- Verify server is running
- Check CORS settings if running on different port
- Look for errors in browser console

### Simulation doesn't load
- Check `alpha/server/data/` for database file
- Try creating a new game
- Check server logs for errors
