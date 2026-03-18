/**
 * app.js - Main client application
 */

import { wsClient } from "./WebSocketClient.js";
import { stateManager } from "./StateManager.js";

stateManager.init(wsClient);

const sessionList = document.getElementById("session-list");
const btnNewGame = document.getElementById("btn-new-game");
const gamePanel = document.getElementById("game-panel");
const connectionStatus = document.getElementById("connection-status");

function updateConnectionStatus() {
    const connected = stateManager.get("connected");
    const sessionId = stateManager.get("sessionId");

    if (!connected) {
        connectionStatus.className = "connection-status status-disconnected";
        connectionStatus.textContent = "Disconnected";
    } else if (!sessionId) {
        connectionStatus.className = "connection-status status-connecting";
        connectionStatus.textContent = "Connected (select a game)";
    } else {
        connectionStatus.className = "connection-status status-connected";
        connectionStatus.textContent = "Connected";
    }
}

async function loadGames() {
    try {
        const response = await fetch("/api/v1/games");
        const data = await response.json();

        if (data.success && data.games.length > 0) {
            sessionList.innerHTML = data.games.map(game => 
                "<div class=\"session-card\" data-id=\"" + game.id + "\">" +
                "<h4>" + game.name + "</h4>" +
                "<div class=\"session-info\">Status: " + game.status + 
                (game.hasActiveSession ? " (active)" : "") + "</div></div>"
            ).join("");

            sessionList.querySelectorAll(".session-card").forEach(card => {
                card.addEventListener("click", () => joinGame(card.dataset.id));
            });
        } else {
            sessionList.innerHTML = "<div style=\"color: #888;\">No games found. Create one!</div>";
        }
    } catch (e) {
        sessionList.innerHTML = "<div style=\"color: #f44;\">Error loading games. Is the server running?</div>";
    }
}

async function createGame() {
    try {
        const response = await fetch("/api/v1/games", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Game " + new Date().toLocaleDateString() })
        });
        const data = await response.json();
        if (data.success) {
            await loadGames();
            await joinGame(data.game.id);
        }
    } catch (e) {
        alert("Error creating game: " + e.message);
    }
}

async function joinGame(gameId) {
    try {
        const loadResponse = await fetch("/api/v1/games/" + gameId + "/load", { method: "POST" });
        const loadData = await loadResponse.json();

        if (loadData.success) {
            await wsClient.joinSession(gameId);
            gamePanel.style.display = "block";
            sessionList.querySelectorAll(".session-card").forEach(card => {
                card.classList.toggle("active", card.dataset.id === gameId);
            });
        }
    } catch (e) {
        console.error("Error joining game:", e);
    }
}

document.getElementById("btn-play").addEventListener("click", () => wsClient.resume());
document.getElementById("btn-pause").addEventListener("click", () => wsClient.pause());

document.querySelectorAll(".btn-speed").forEach(btn => {
    btn.addEventListener("click", () => {
        wsClient.setSpeed(parseInt(btn.dataset.speed));
        document.querySelectorAll(".btn-speed").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    });
});

btnNewGame.addEventListener("click", createGame);

stateManager.subscribe(["connected", "sessionId"], updateConnectionStatus);
stateManager.subscribe("clockFormatted", f => { document.getElementById("game-date").textContent = f || "--"; });
stateManager.subscribe("totalHours", h => { document.getElementById("stat-hours").textContent = h?.toLocaleString() || "0"; });
stateManager.subscribeAll((state) => {
    const fc = Object.keys(state.firms || {}).length;
    document.getElementById("stat-firms").textContent = fc || state.firmCount || "--";
    document.getElementById("stat-corps").textContent = state.corporations?.length || "--";
});
stateManager.subscribe("speed", s => {
    document.querySelectorAll(".btn-speed").forEach(b => b.classList.toggle("active", parseInt(b.dataset.speed) === s));
});
stateManager.subscribe("isPaused", p => { document.getElementById("status-text").textContent = p ? "PAUSED" : "RUNNING"; });

async function init() {
    try {
        await wsClient.connect();
        updateConnectionStatus();
        await loadGames();
    } catch (e) {
        console.error("Connection error:", e);
        sessionList.innerHTML = "<div style=\"color: #f44;\">Failed to connect. Start server with: npm start</div>";
    }
}

window.wsClient = wsClient;
window.stateManager = stateManager;
init();
