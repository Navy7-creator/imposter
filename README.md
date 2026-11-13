# 🕵️ Imposter — Real-Time Multiplayer Social Deduction & Party Game

**Imposter** is a full-stack, real-time multiplayer party web game designed for friends playing together in live rooms. It combines social deduction mechanics, custom circular seating-ring logic, and server-filtered secret chat channels with persistent match history and leaderboards.

🔗 **Live Demo:** [https://imposter-1-2b90.onrender.com/](https://imposter-1-2b90.onrender.com/)  
> *(Note: Hosted on Render's free tier — initial load may take ~30–45 seconds if the server is waking up from sleep.)*

---

## ✨ Key Features

### 🎮 Multiple Party Game Modes
* **Who Would Never? (Target & Guess):** Players secretly submit prompts about other players in the room (e.g., *"What is something [Player] would never do?"*). During the voting poll, both the author and target identities remain hidden to prevent spoilers before a dramatic reveal and tiered point payout.
* **Chain Guess the Number:** The host arranges players in a custom circular seating ring matching their physical or logical order. Each player acts as the **Guardian** for their neighbor's secret number while interrogating the room to deduce their own—earning ranked points based on how fast they solve it.

### 💬 Server-Filtered Secret In-Game Chat
* **Public Room Feed:** Real-time room-wide chat synced across game phases.
* **1-on-1 Whispers:** Send private direct messages to individual players.
* **Exclusion Channels:** Broadcast messages to the room while selectively hiding them from specific players (e.g., excluding a round's target or suspected imposter).
* **Zero Client-Side Leaks:** Audience routing is enforced strictly on the backend so excluded clients never receive restricted payloads over the network.

### 🏆 Persistent Leaderboards & Match History
* Tracks cumulative player points, games played, and match result snapshots across sessions using SQLite (`sqlite3`).

---

## 🛠️ Tech Stack

* **Frontend:** React, Vite, WebSockets client
* **Backend:** Python 3, WebSockets / ASGI server
* **Database:** SQLite (`sqlite3`)
* **Deployment:** Render (Web Service)

---

## 🏗️ Architecture & State Lifecycle

Active gameplay runs on an event-driven, in-memory state machine for low-latency turn transitions, while completed match summaries persist to disk:

    LOBBY ──▶ PROMPT_ASSIGNMENT ──▶ QUESTION_INPUT ──▶ VOTING_POLL ──▶ REVEAL_RESULTS ──▶ SCOREBOARD

* **In-Memory Session State:** Active room codes, player seating arrays, socket mappings, live timers, and eligible voter counts (dynamically excluding round authors to prevent deadlocks).
* **Persistent Storage (`imposter_game.db`):**
  * `game_results`: Stores completed room codes, game modes, JSON match summaries, and timestamps.
  * `leaderboard`: Upserts lifetime player scores, avatars, and match counts.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* **Python 3.9+**
* **Node.js 18+** & **npm**

### 1. Clone the Repository
    git clone https://github.com/<your-username>/<your-repo>.git
    cd <your-repo>

### 2. Backend Setup
    # Create and activate a virtual environment (optional)
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate

    # Install Python dependencies
    pip install -r requirements.txt

    # Start the Python server
    python app.py  # Or: uvicorn main:app --reload --port 8000

### 3. Frontend Setup
Open a second terminal window:
    cd frontend  # Adjust if your React/Vite files are in the root directory
    npm install
    npm run dev

Open the local Vite URL (typically `http://localhost:5173`) in multiple browser tabs to test multiplayer rooms locally.

---

## ⚙️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Port the backend server binds to | `8000` |
| `DATABASE_PATH` | File path for the SQLite database | `./imposter_game.db` |
| `VITE_API_URL` | Backend HTTP/WebSocket URL for frontend builds | `http://localhost:8000` |

---

## 🔮 Future Improvements
* Migrate SQLite storage to a managed cloud PostgreSQL database (e.g., Supabase or Neon) so leaderboard stats persist across Render redeploys.
* Add quick-reaction emoji bursts and anonymous "Imposter Echo" chat power-ups during voting phases.
* Add automatic reconnection recovery if a player refreshes mid-round.
