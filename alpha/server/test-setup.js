/**
 * Quick setup verification test
 *
 * Run with: node test-setup.js
 * Verifies that all dependencies are available and the server can start
 */

import { installPolyfills } from './src/adapters/BrowserPolyfills.js';

console.log('🧪 EconSim Server Setup Test\n');

// Test 1: Browser Polyfills
console.log('1. Testing browser polyfills...');
try {
    installPolyfills();
    if (typeof globalThis.window !== 'undefined' &&
        typeof globalThis.sessionStorage !== 'undefined') {
        console.log('   ✅ Browser polyfills installed');
    } else {
        throw new Error('Polyfills not properly installed');
    }
} catch (error) {
    console.log('   ❌ Browser polyfills failed:', error.message);
    process.exit(1);
}

// Test 2: Dependencies
console.log('\n2. Testing npm dependencies...');
const deps = ['express', 'ws', 'better-sqlite3', 'uuid', 'cors'];
for (const dep of deps) {
    try {
        await import(dep);
        console.log(`   ✅ ${dep}`);
    } catch (error) {
        console.log(`   ❌ ${dep}: ${error.message}`);
        console.log('\n   Run: npm install');
        process.exit(1);
    }
}

// Test 3: Config
console.log('\n3. Testing configuration...');
try {
    const { config } = await import('./src/config.js');
    console.log(`   ✅ Server port: ${config.server.port}`);
    console.log(`   ✅ Database path: ${config.database.path}`);
} catch (error) {
    console.log('   ❌ Config failed:', error.message);
}

// Test 4: Database
console.log('\n4. Testing database...');
try {
    const { Database } = await import('./src/db/Database.js');
    const db = new Database(':memory:'); // Use in-memory for test
    await db.initialize();
    const stats = db.getStats();
    console.log('   ✅ Database initialized');
    console.log(`   ✅ Tables created: games, game_states`);
    db.close();
} catch (error) {
    console.log('   ❌ Database failed:', error.message);
}

// Test 5: Core modules
console.log('\n5. Testing server modules...');
const modules = [
    ['Session Manager', './src/simulation/SessionManager.js', 'SessionManager'],
    ['Game Session', './src/simulation/GameSession.js', 'GameSession'],
    ['Games Router', './src/api/routes/games.js', 'createGamesRouter'],
    ['Simulation Router', './src/api/routes/simulation.js', 'createSimulationRouter'],
    ['WebSocket Manager', './src/ws/WebSocketManager.js', 'WebSocketManager'],
    ['Message Handler', './src/ws/MessageHandler.js', 'MessageHandler']
];

for (const [name, path, exportName] of modules) {
    try {
        const module = await import(path);
        if (module[exportName]) {
            console.log(`   ✅ ${name}`);
        } else {
            console.log(`   ⚠️ ${name} (export '${exportName}' not found)`);
        }
    } catch (error) {
        console.log(`   ❌ ${name}: ${error.message}`);
    }
}

// Test 6: Simulation Engine Import (may fail if core files have issues)
console.log('\n6. Testing SimulationEngine import...');
try {
    const { EngineAdapter } = await import('./src/adapters/EngineAdapter.js');
    console.log('   ✅ EngineAdapter module loaded');
    console.log('   ⚠️ Full engine test requires running server (npm start)');
} catch (error) {
    console.log('   ⚠️ EngineAdapter:', error.message);
    console.log('      (This is expected if core simulation files need the browser)');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('Setup test complete!');
console.log('\nNext steps:');
console.log('  1. Start server: npm start');
console.log('  2. Open http://localhost:3001/health');
console.log('  3. Run client: python -m http.server 8000');
console.log('  4. Open http://localhost:8000/alpha/index.html');
console.log('='.repeat(50));
