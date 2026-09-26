import json
import os
import sqlite3
from pathlib import Path


DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[1] / "data" / "imposter.db"
DEFAULT_SQLITE_URL = "sqlite:///./imposter_game.db"


def _database_path():
    database_path = os.getenv("DATABASE_PATH")
    if database_path:
        return Path(database_path)

    database_url = os.getenv("SQLALCHEMY_DATABASE_URL", DEFAULT_SQLITE_URL)
    if database_url.startswith("sqlite:///"):
        relative_path = database_url.removeprefix("sqlite:///")
        return Path(relative_path)
    return DEFAULT_DATABASE_PATH


def _connect():
    database_path = _database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(database_path)


def connect_database():
    """Create the SQLite tables used by completed rounds and the leaderboard."""
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS game_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_code TEXT NOT NULL,
                mode TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS leaderboard (
                player_id TEXT PRIMARY KEY,
                player_name TEXT NOT NULL,
                avatar TEXT NOT NULL,
                total_points INTEGER NOT NULL DEFAULT 0,
                games_played INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def save_result(room, result):
    try:
        connect_database()
        with _connect() as connection:
            connection.execute(
                "INSERT INTO game_results (room_code, mode, result) VALUES (?, ?, ?)",
                (room["code"], room["modeId"], json.dumps(result)),
            )
            for player in room["players"]:
                points = result.get("scores", {}).get(player["id"], 0)
                connection.execute(
                    """
                    INSERT INTO leaderboard (player_id, player_name, avatar, total_points, games_played)
                    VALUES (?, ?, ?, ?, 1)
                    ON CONFLICT(player_id) DO UPDATE SET
                        player_name = excluded.player_name,
                        avatar = excluded.avatar,
                        total_points = leaderboard.total_points + excluded.total_points,
                        games_played = leaderboard.games_played + 1,
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    (player["id"], player["name"], player["avatar"], points),
                )
    except sqlite3.Error as error:
        print(f"Could not save game result to SQLite: {error}")


def get_leaderboard(limit=25):
    connect_database()
    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT player_id, player_name, avatar, total_points, games_played
            FROM leaderboard
            ORDER BY total_points DESC, games_played DESC, player_name ASC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [
        {
            "playerId": row[0],
            "name": row[1],
            "avatar": row[2],
            "points": row[3],
            "gamesPlayed": row[4],
        }
        for row in rows
    ]
