import os

import psycopg
from psycopg.types.json import Jsonb


def connect_database():
    """Connect to PostgreSQL and create the table used by completed rounds."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return

    with psycopg.connect(database_url) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS game_results (
                id BIGSERIAL PRIMARY KEY,
                room_code VARCHAR(6) NOT NULL,
                mode VARCHAR(64) NOT NULL,
                result JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS leaderboard (
                player_id VARCHAR(128) PRIMARY KEY,
                player_name VARCHAR(24) NOT NULL,
                avatar VARCHAR(32) NOT NULL,
                total_points INTEGER NOT NULL DEFAULT 0,
                games_played INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )


def save_result(room, result):
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return

    try:
        with psycopg.connect(database_url) as connection:
            connection.execute(
                "INSERT INTO game_results (room_code, mode, result) VALUES (%s, %s, %s)",
                (room["code"], room["modeId"], Jsonb(result)),
            )
            for player in room["players"]:
                points = result.get("scores", {}).get(player["id"], 0)
                connection.execute(
                    """
                    INSERT INTO leaderboard (player_id, player_name, avatar, total_points, games_played)
                    VALUES (%s, %s, %s, %s, 1)
                    ON CONFLICT (player_id) DO UPDATE SET
                        player_name = EXCLUDED.player_name,
                        avatar = EXCLUDED.avatar,
                        total_points = leaderboard.total_points + EXCLUDED.total_points,
                        games_played = leaderboard.games_played + 1,
                        updated_at = NOW()
                    """,
                    (player["id"], player["name"], player["avatar"], points),
                )
    except psycopg.Error as error:
        print(f"Could not save game result to PostgreSQL: {error}")


def get_leaderboard(limit=25):
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return []
    with psycopg.connect(database_url) as connection:
        rows = connection.execute(
            """
            SELECT player_id, player_name, avatar, total_points, games_played
            FROM leaderboard
            ORDER BY total_points DESC, games_played DESC, player_name ASC
            LIMIT %s
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
