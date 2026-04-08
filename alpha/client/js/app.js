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
                "<div class=\"session-header\">" +
                "<h4>" + game.name + "</h4>" +
                "<button class=\"btn-delete\" data-id=\"" + game.id + "\" title=\"Delete game\">&times;</button>" +
                "</div>" +
                "<div class=\"session-info\">Status: " + game.status +
                (game.hasActiveSession ? " (active)" : "") + "</div></div>"
            ).join("");

            // Add click handlers for joining games
            sessionList.querySelectorAll(".session-card").forEach(card => {
                card.addEventListener("click", (e) => {
                    // Don't join if clicking delete button
                    if (e.target.classList.contains("btn-delete")) return;
                    joinGame(card.dataset.id);
                });
            });

            // Add click handlers for delete buttons
            sessionList.querySelectorAll(".btn-delete").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    deleteGame(btn.dataset.id);
                });
            });
        } else {
            sessionList.innerHTML = "<div style=\"color: #888;\">No games found. Create one!</div>";
        }
    } catch (e) {
        sessionList.innerHTML = "<div style=\"color: #f44;\">Error loading games. Is the server running?</div>";
    }
}

async function deleteGame(gameId) {
    const confirmed = confirm("Are you sure you want to delete this game? This cannot be undone.");
    if (!confirmed) return;

    try {
        const response = await fetch("/api/v1/games/" + gameId, {
            method: "DELETE"
        });
        const data = await response.json();

        if (data.success) {
            // If we deleted the active game, clear the session
            if (sessionStorage.getItem("activeSessionId") === gameId) {
                sessionStorage.removeItem("activeSessionId");
                gamePanel.style.display = "none";
                const nav = document.getElementById("main-nav");
                if (nav) nav.style.display = "none";
            }
            await loadGames();
        } else {
            alert("Failed to delete game: " + (data.error || "Unknown error"));
        }
    } catch (e) {
        alert("Error deleting game: " + e.message);
    }
}

async function createGame(name) {
    try {
        const response = await fetch("/api/v1/games", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name || "Game " + new Date().toLocaleDateString() })
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
        // Ensure WebSocket is connected before joining
        if (!wsClient.isConnected) {
            await wsClient.connect();
        }

        const loadResponse = await fetch("/api/v1/games/" + gameId + "/load", { method: "POST" });
        const loadData = await loadResponse.json();

        if (loadData.success) {
            await wsClient.joinSession(gameId);
            gamePanel.style.display = "block";
            // Show navigation
            const nav = document.getElementById("main-nav");
            if (nav) nav.style.display = "block";
            // Store session ID for other pages
            sessionStorage.setItem("activeSessionId", gameId);
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

btnNewGame.addEventListener("click", () => {
    // Show inline name input if not already shown
    if (document.getElementById("new-game-form")) return;
    const form = document.createElement("div");
    form.id = "new-game-form";
    form.style.cssText = "display:inline-flex;gap:8px;align-items:center;margin-left:10px;";
    form.innerHTML =
        '<input id="new-game-name" type="text" maxlength="24" placeholder="Short name…" ' +
        'style="background:#2a2a2a;border:1px solid #555;color:#fff;padding:8px 10px;border-radius:4px;font-size:14px;width:160px;" />' +
        '<button id="new-game-confirm" style="background:#00d4ff;color:#000;border:none;padding:8px 14px;border-radius:4px;cursor:pointer;font-weight:bold;">Create</button>' +
        '<button id="new-game-cancel" style="background:transparent;border:1px solid #555;color:#aaa;padding:8px 12px;border-radius:4px;cursor:pointer;">✕</button>';
    btnNewGame.insertAdjacentElement("afterend", form);
    const input = document.getElementById("new-game-name");
    input.focus();

    const submit = async () => {
        const name = input.value.trim();
        form.remove();
        await createGame(name || null);
    };

    document.getElementById("new-game-confirm").addEventListener("click", submit);
    document.getElementById("new-game-cancel").addEventListener("click", () => form.remove());
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") form.remove();
    });
});

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
