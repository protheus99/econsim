-- Initial database schema for EconSim

-- Games table - stores game metadata
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    status TEXT DEFAULT 'active',
    seed INTEGER NOT NULL,
    config TEXT
);

-- Game states table - stores saved game states
CREATE TABLE IF NOT EXISTS game_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    game_hour INTEGER NOT NULL,
    state_json TEXT NOT NULL,
    is_autosave INTEGER DEFAULT 0,
    slot_name TEXT,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Index for fast lookup of saves by game
CREATE INDEX IF NOT EXISTS idx_game_states_game ON game_states(game_id, saved_at DESC);

-- Index for finding latest save per game
CREATE INDEX IF NOT EXISTS idx_game_states_latest ON game_states(game_id, is_autosave, saved_at DESC)
