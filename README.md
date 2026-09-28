# Imposter & Friends

A modular multiplayer party game for 4-10 players.

## Architecture

```text
imposter-object/
  client/                 React browser client
    src/
      App.jsx             Lobby and game state UI
      main.jsx            React entry point
      styles.css           Visual system
  server/                 Python + FastAPI application
    app/
      main.py             HTTP/WebSocket bootstrap and event routing
      database.py         PostgreSQL connection boundary
      lobby/              Room lifecycle and in-memory active state
      game_modes/         Pluggable game rules
        registry.py       Mode lookup and shared contract
        aware_imposter.py Sample mode implementation
  package.json            Workspace scripts
```

### Runtime responsibilities

- **React client:** renders lobby, word assignment, clue submission, discussion, voting, and results; sends JSON messages over a WebSocket.
- **Python + FastAPI:** owns authoritative room state, validates transitions, broadcasts updates, and invokes the selected game mode.
- **SQLite:** stores completed game results and leaderboard rows in a local SQLite database. Active rooms remain in memory for low-latency play; use a shared database or Redis when horizontal scaling is needed.
- **Game mode contract:** each mode owns round creation, private assignments, action validation, and result resolution. The registry and `/games` endpoint expose modes without changing lobby transport code.

### Game extension map

| Game | Private state | Player action | Result scoring |
| --- | --- | --- | --- |
| Imposter Object | Word and role | Clue, vote | Deduction or successful bluff |
| Guess the Number | Secret number | Guess another player | 100 points for an exact guess |
| Never Say/Do | Private question assignment | Text answer, then predict the answer writer | 1 point for each correct writer prediction |
| Word Spy | Secret word and spy | Natural use, catch claim | Spy earns stealth points; catches earn deduction points |
| Emoji Clues | Hidden phrase | Emoji clue, guess | Clue quality and correct guesses |
| Quick Debate | Assigned side | Argument, audience vote | Winner earns debate points |
| Drawing Imposter | Drawing prompt | Drawing, vote | Correct detection plus drawing creativity |
| Guess the Lie | Three private statements | Submit statements, vote | Correct lie detection and convincing bonus |
| Mafia Mystery | Role and night state | Night action, day vote | Survival, investigation, and team victory points |

Every mode can use the same WebSocket envelope:

```json
{"id":"42","event":"round:action-name","payload":{}}
```

The server responds with an acknowledgement and broadcasts public room state. Private assignments are sent only to the player's WebSocket. REST endpoints provide `/games`, `/health`, and `/leaderboard`; chat uses `room:chat` and room mode selection uses `room:mode`.

### Scoring

Use a common score ledger so every game contributes to the leaderboard: `deduction` rewards correct reads, `creativity` rewards authored clues/statements/drawings, and `luck` rewards high-variance events such as exact number guesses. A mode resolves these components into its result JSON, while PostgreSQL stores the total points per stable player ID.

## Run

Prerequisites: Node.js 20+ and Python 3.11+. SQLite is included with Python.

```bash
npm install
python -m pip install -r server\\requirements.txt
copy server\\.env.example server\\.env
npm run dev
```

For backend tests, install the development requirements and run:

```bash
python -m pip install -r server\\requirements-dev.txt
python -m pytest server/tests -q
```

The FastAPI server creates `imposter_game.db` and its tables on startup. The client runs at http://localhost:5173 and connects to the WebSocket server at http://localhost:3001/ws.

Open multiple browser windows, join the same room code, and use 4-10 players to start a round.
