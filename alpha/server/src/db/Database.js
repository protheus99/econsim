/**
 * Database - SQLite wrapper for game persistence
 *
 * Uses better-sqlite3 for synchronous, high-performance SQLite access
 */

import BetterSqlite3 from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(__dirname, '../../data/econsim.db');
        this.db = null;
    }

    /**
     * Open database connection and run migrations
     */
    async initialize() {
        console.log(`📂 Opening database: ${this.dbPath}`);

        // Ensure data directory exists
        const dataDir = path.dirname(this.dbPath);
        const fs = await import('fs/promises');
        await fs.mkdir(dataDir, { recursive: true });

        // Open database
        this.db = new BetterSqlite3(this.dbPath, {
            verbose: process.env.NODE_ENV === 'development' ? console.log : null
        });

        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');

        // Run migrations
        await this.runMigrations();

        console.log('✅ Database initialized');
    }

    /**
     * Run SQL migration files
     */
    async runMigrations() {
        const migrationPath = path.join(__dirname, 'migrations', '001_initial.sql');
        const sql = readFileSync(migrationPath, 'utf8');

        // Split by semicolons and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            try {
                this.db.exec(statement);
            } catch (error) {
                // Ignore "already exists" errors
                if (!error.message.includes('already exists')) {
                    console.warn('Migration warning:', error.message);
                }
            }
        }

        console.log('✅ Migrations complete');
    }

    // ==================== Game CRUD ====================

    /**
     * Create a new game record
     */
    createGame(id, name, seed, config = null, userId = null) {
        const stmt = this.db.prepare(`
            INSERT INTO games (id, name, seed, config, user_id)
            VALUES (?, ?, ?, ?, ?)
        `);

        stmt.run(id, name, seed, config ? JSON.stringify(config) : null, userId);

        return this.getGame(id);
    }

    /**
     * Get game by ID
     */
    getGame(id) {
        const stmt = this.db.prepare('SELECT * FROM games WHERE id = ?');
        const game = stmt.get(id);

        if (game && game.config) {
            game.config = JSON.parse(game.config);
        }

        return game || null;
    }

    /**
     * List all games
     */
    listGames(userId = null, status = 'active') {
        let stmt;
        let params;

        if (userId) {
            stmt = this.db.prepare(`
                SELECT * FROM games
                WHERE user_id = ? AND status = ?
                ORDER BY updated_at DESC
            `);
            params = [userId, status];
        } else {
            stmt = this.db.prepare(`
                SELECT * FROM games
                WHERE status = ?
                ORDER BY updated_at DESC
            `);
            params = [status];
        }

        return stmt.all(...params).map(game => {
            if (game.config) {
                game.config = JSON.parse(game.config);
            }
            return game;
        });
    }

    /**
     * Update game metadata
     */
    updateGame(id, updates) {
        const allowedFields = ['name', 'status', 'config'];
        const setClause = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = ?`);
                values.push(key === 'config' ? JSON.stringify(value) : value);
            }
        }

        if (setClause.length === 0) return this.getGame(id);

        values.push(id);
        const stmt = this.db.prepare(`
            UPDATE games SET ${setClause.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values);
        return this.getGame(id);
    }

    /**
     * Delete game and all saves
     */
    deleteGame(id) {
        const stmt = this.db.prepare('DELETE FROM games WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    // ==================== Game State (Saves) ====================

    /**
     * Save game state
     */
    saveGameState(gameId, gameHour, stateJson, isAutosave = false, slotName = null) {
        const stmt = this.db.prepare(`
            INSERT INTO game_states (game_id, game_hour, state_json, is_autosave, slot_name)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(gameId, gameHour, stateJson, isAutosave ? 1 : 0, slotName);

        // Clean up old autosaves (keep last 10)
        if (isAutosave) {
            this._cleanupOldAutosaves(gameId);
        }

        return result.lastInsertRowid;
    }

    /**
     * Get specific save by ID
     */
    getGameState(saveId) {
        const stmt = this.db.prepare('SELECT * FROM game_states WHERE id = ?');
        return stmt.get(saveId) || null;
    }

    /**
     * Get latest save for a game
     */
    getLatestGameState(gameId) {
        const stmt = this.db.prepare(`
            SELECT * FROM game_states
            WHERE game_id = ?
            ORDER BY saved_at DESC
            LIMIT 1
        `);
        return stmt.get(gameId) || null;
    }

    /**
     * List all saves for a game
     */
    listGameStates(gameId) {
        const stmt = this.db.prepare(`
            SELECT id, game_id, saved_at, game_hour, is_autosave, slot_name,
                   LENGTH(state_json) as state_size
            FROM game_states
            WHERE game_id = ?
            ORDER BY saved_at DESC
        `);
        return stmt.all(gameId);
    }

    /**
     * Delete a save
     */
    deleteGameState(saveId) {
        const stmt = this.db.prepare('DELETE FROM game_states WHERE id = ?');
        const result = stmt.run(saveId);
        return result.changes > 0;
    }

    /**
     * Clean up old autosaves, keeping the most recent N
     */
    _cleanupOldAutosaves(gameId, keepCount = 10) {
        const stmt = this.db.prepare(`
            DELETE FROM game_states
            WHERE game_id = ? AND is_autosave = 1
            AND id NOT IN (
                SELECT id FROM game_states
                WHERE game_id = ? AND is_autosave = 1
                ORDER BY saved_at DESC
                LIMIT ?
            )
        `);
        stmt.run(gameId, gameId, keepCount);
    }

    // ==================== Utility ====================

    /**
     * Get database statistics
     */
    getStats() {
        const games = this.db.prepare('SELECT COUNT(*) as count FROM games').get();
        const saves = this.db.prepare('SELECT COUNT(*) as count FROM game_states').get();
        const totalSize = this.db.prepare(`
            SELECT SUM(LENGTH(state_json)) as total_bytes FROM game_states
        `).get();

        return {
            totalGames: games.count,
            totalSaves: saves.count,
            totalStateBytes: totalSize.total_bytes || 0,
            dbPath: this.dbPath
        };
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('📂 Database closed');
        }
    }
}
