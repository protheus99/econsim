/**
 * Database - SQLite wrapper for game persistence
 *
 * Uses sql.js (pure JavaScript SQLite implementation)
 */

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(__dirname, '../../data/econsim.db');
        this.db = null;
        this.SQL = null;
        this._saveTimer = null;
    }

    /**
     * Open database connection and run migrations
     */
    async initialize() {
        console.log(`📂 Opening database: ${this.dbPath}`);

        // Ensure data directory exists
        const dataDir = path.dirname(this.dbPath);
        await mkdir(dataDir, { recursive: true });

        // Initialize sql.js
        this.SQL = await initSqlJs();

        // Load existing database or create new one
        if (existsSync(this.dbPath)) {
            const fileBuffer = readFileSync(this.dbPath);
            this.db = new this.SQL.Database(fileBuffer);
            console.log('📂 Loaded existing database');
        } else {
            this.db = new this.SQL.Database();
            console.log('📂 Created new database');
        }

        // Run migrations
        await this.runMigrations();

        // Auto-save periodically (every 30 seconds)
        this._saveTimer = setInterval(() => this._saveToDisk(), 30000);

        console.log('✅ Database initialized');
    }

    /**
     * Save database to disk
     */
    _saveToDisk() {
        if (!this.db) return;
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            writeFileSync(this.dbPath, buffer);
        } catch (e) {
            console.error('Error saving database:', e);
        }
    }

    /**
     * Run SQL migration files
     */
    async runMigrations() {
        const migrationPath = path.join(__dirname, 'migrations', '001_initial.sql');
        console.log('📄 Loading migrations from:', migrationPath);

        let sql;
        try {
            sql = readFileSync(migrationPath, 'utf8');
            console.log('📄 Migration file loaded, length:', sql.length);
        } catch (e) {
            console.error('❌ Failed to read migration file:', e.message);
            throw e;
        }

        // Remove comment lines and split by semicolons
        const cleanedSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        const statements = cleanedSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`📄 Found ${statements.length} SQL statements to execute`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            try {
                console.log(`  Executing statement ${i + 1}:`, statement.substring(0, 50) + '...');
                this.db.run(statement);
                console.log(`  ✓ Statement ${i + 1} succeeded`);
            } catch (error) {
                // Ignore "already exists" errors
                if (error.message.includes('already exists')) {
                    console.log(`  ⏭ Statement ${i + 1} skipped (already exists)`);
                } else {
                    console.error(`  ❌ Statement ${i + 1} failed:`, error.message);
                    console.error('  Full statement:', statement);
                }
            }
        }

        this._saveToDisk();
        console.log('✅ Migrations complete');
    }

    /**
     * Execute a query and return all results as objects
     */
    _query(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            if (params && params.length > 0) {
                stmt.bind(params);
            }

            const results = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                results.push(row);
            }
            stmt.free();
            return results;
        } catch (error) {
            console.error('Database query error:', error.message);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw error;
        }
    }

    /**
     * Execute a query and return first result as object
     */
    _queryOne(sql, params = []) {
        const results = this._query(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Execute a statement (INSERT/UPDATE/DELETE)
     */
    _execute(sql, params = []) {
        try {
            this.db.run(sql, params);
            return {
                changes: this.db.getRowsModified(),
                lastInsertRowid: this._getLastInsertRowId()
            };
        } catch (error) {
            console.error('Database execute error:', error.message);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw error;
        }
    }

    /**
     * Get last inserted row ID
     */
    _getLastInsertRowId() {
        const result = this._queryOne('SELECT last_insert_rowid() as id');
        return result ? result.id : 0;
    }

    // ==================== Game CRUD ====================

    /**
     * Create a new game record
     */
    createGame(id, name, seed, config = null, userId = null) {
        this._execute(
            `INSERT INTO games (id, name, seed, config, user_id) VALUES (?, ?, ?, ?, ?)`,
            [id, name, seed, config ? JSON.stringify(config) : null, userId]
        );
        this._saveToDisk();
        return this.getGame(id);
    }

    /**
     * Get game by ID
     */
    getGame(id) {
        const game = this._queryOne('SELECT * FROM games WHERE id = ?', [id]);

        if (game && game.config) {
            game.config = JSON.parse(game.config);
        }

        return game || null;
    }

    /**
     * List all games
     */
    listGames(userId = null, status = 'active') {
        let games;

        if (userId) {
            games = this._query(
                `SELECT * FROM games WHERE user_id = ? AND status = ? ORDER BY updated_at DESC`,
                [userId, status]
            );
        } else {
            games = this._query(
                `SELECT * FROM games WHERE status = ? ORDER BY updated_at DESC`,
                [status]
            );
        }

        return games.map(game => {
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
        this._execute(
            `UPDATE games SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );
        this._saveToDisk();
        return this.getGame(id);
    }

    /**
     * Delete game and all saves
     */
    deleteGame(id) {
        // Delete saves first (foreign key)
        this._execute('DELETE FROM game_states WHERE game_id = ?', [id]);
        const result = this._execute('DELETE FROM games WHERE id = ?', [id]);
        this._saveToDisk();
        return result.changes > 0;
    }

    // ==================== Game State (Saves) ====================

    /**
     * Save game state
     */
    saveGameState(gameId, gameHour, stateJson, isAutosave = false, slotName = null) {
        const result = this._execute(
            `INSERT INTO game_states (game_id, game_hour, state_json, is_autosave, slot_name) VALUES (?, ?, ?, ?, ?)`,
            [gameId, gameHour, stateJson, isAutosave ? 1 : 0, slotName]
        );

        // Clean up old autosaves (keep last 10)
        if (isAutosave) {
            this._cleanupOldAutosaves(gameId);
        }

        this._saveToDisk();
        return result.lastInsertRowid;
    }

    /**
     * Get specific save by ID
     */
    getGameState(saveId) {
        return this._queryOne('SELECT * FROM game_states WHERE id = ?', [saveId]);
    }

    /**
     * Get latest save for a game
     */
    getLatestGameState(gameId) {
        return this._queryOne(
            `SELECT * FROM game_states WHERE game_id = ? ORDER BY saved_at DESC LIMIT 1`,
            [gameId]
        );
    }

    /**
     * List all saves for a game
     */
    listGameStates(gameId) {
        return this._query(
            `SELECT id, game_id, saved_at, game_hour, is_autosave, slot_name,
                    LENGTH(state_json) as state_size
             FROM game_states
             WHERE game_id = ?
             ORDER BY saved_at DESC`,
            [gameId]
        );
    }

    /**
     * Delete a save
     */
    deleteGameState(saveId) {
        const result = this._execute('DELETE FROM game_states WHERE id = ?', [saveId]);
        this._saveToDisk();
        return result.changes > 0;
    }

    /**
     * Clean up old autosaves, keeping the most recent N
     */
    _cleanupOldAutosaves(gameId, keepCount = 10) {
        // Get IDs to keep
        const keepers = this._query(
            `SELECT id FROM game_states WHERE game_id = ? AND is_autosave = 1 ORDER BY saved_at DESC LIMIT ?`,
            [gameId, keepCount]
        );

        if (keepers.length === 0) return;

        const keepIds = keepers.map(r => r.id);
        const placeholders = keepIds.map(() => '?').join(',');

        this._execute(
            `DELETE FROM game_states WHERE game_id = ? AND is_autosave = 1 AND id NOT IN (${placeholders})`,
            [gameId, ...keepIds]
        );
    }

    // ==================== Utility ====================

    /**
     * Get database statistics
     */
    getStats() {
        const games = this._queryOne('SELECT COUNT(*) as count FROM games');
        const saves = this._queryOne('SELECT COUNT(*) as count FROM game_states');
        const totalSize = this._queryOne('SELECT SUM(LENGTH(state_json)) as total_bytes FROM game_states');

        return {
            totalGames: games?.count || 0,
            totalSaves: saves?.count || 0,
            totalStateBytes: totalSize?.total_bytes || 0,
            dbPath: this.dbPath
        };
    }

    /**
     * Close database connection
     */
    close() {
        if (this._saveTimer) {
            clearInterval(this._saveTimer);
            this._saveTimer = null;
        }

        if (this.db) {
            this._saveToDisk();
            this.db.close();
            this.db = null;
            console.log('📂 Database closed');
        }
    }
}
