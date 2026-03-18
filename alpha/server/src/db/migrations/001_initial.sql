-- Initial database schema for EconSim

-- Games table - stores game metadata
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,                    -- Future: multi-user support
    status TEXT DEFAULT 'active',    -- active, archived, deleted
    seed INTEGER NOT NULL,
    config TEXT                      -- JSON config overrides
);

-- Game states table - stores saved game states
CREATE TABLE IF NOT EXISTS game_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    game_hour INTEGER NOT NULL,      -- In-game hour for ordering
    state_json TEXT NOT NULL,        -- Full serialized state
    is_autosave BOOLEAN DEFAULT FALSE,
    slot_name TEXT                   -- Named save slot (e.g., 'save1', 'autosave', 'quicksave')
);

-- Index for fast lookup of saves by game
CREATE INDEX IF NOT EXISTS idx_game_states_game ON game_states(game_id, saved_at DESC);

-- Index for finding latest save per game
CREATE INDEX IF NOT EXISTS idx_game_states_latest ON game_states(game_id, is_autosave, saved_at DESC);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_games_timestamp
AFTER UPDATE ON games
BEGIN
    UPDATE games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Cleanup old autosaves (keep last 10 per game)
-- This would be done in application code, but documented here
-- DELETE FROM game_states
-- WHERE is_autosave = TRUE
-- AND id NOT IN (
--     SELECT id FROM game_states
--     WHERE game_id = ? AND is_autosave = TRUE
--     ORDER BY saved_at DESC LIMIT 10
-- );
