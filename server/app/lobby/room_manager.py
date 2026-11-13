import datetime
import secrets
import base64
import time

from app.game_modes.registry import get_game_mode

rooms = {}


def create_code():
    """Generate a secure, readable room code (8 characters, base32).
    Uses only A-Z and 2-7, avoiding confusing characters like 0/O or 1/I/L."""
    while True:
        # Generate 5 random bytes and encode to base32 (40 bits → 8 base32 chars)
        random_bytes = secrets.token_bytes(5)
        code = base64.b32encode(random_bytes).decode('ascii').rstrip('=').upper()
        if code not in rooms:
            return code


def get_or_create_room(requested_code):
    code = (requested_code or "").strip().upper() or create_code()
    if code not in rooms:
        rooms[code] = {"code": code, "phase": "lobby", "modeId": "aware-imposter", "categoryIds": ["everyday-objects"], "clueMode": "text", "players": [], "round": None, "roundHistory": [], "chat": [], "lastResult": None, "settings": {"eliminateTies": False, "suddenDeath": True}}
    return rooms[code]


def create_room():
    return get_or_create_room(create_code())


def join_room(room_code):
    code = (room_code or "").strip().upper()
    if not code:
        return create_room()
    if code not in rooms:
        raise ValueError("Room not found. Check the room code and try again.")
    return rooms[code]


def add_player(room, player):
    existing = next((item for item in room["players"] if item["id"] == player["id"]), None)
    if existing:
        if room["phase"] != "lobby" and not existing.get("left"):
            raise ValueError("This player is already in the room. Open a new tab or use a different player.")
        existing.update({"name": player["name"], "avatar": player["avatar"], "avatarColor": player["avatarColor"], "connected": True, "left": False})
        return existing
    if room["phase"] != "lobby":
        raise ValueError("This room is already playing")
    if len(room["players"]) >= 10:
        raise ValueError("Room is full")
    player.setdefault("avatarColor", "cyan")
    player.setdefault("score", 0)
    player.setdefault("connected", True)
    player.setdefault("left", False)
    player["isAdmin"] = not room["players"]
    room["players"].append(player)
    return player


def rejoin_player(room, player_id, name, avatar, avatar_color):
    player = next((item for item in room["players"] if item["id"] == player_id), None)
    if player is None or player.get("left"):
        raise ValueError("Your room session has expired. Join again from the home screen.")
    player.update({"name": str(name or "").strip()[:24] or player["name"], "avatar": avatar or player["avatar"], "avatarColor": avatar_color or player.get("avatarColor", "cyan"), "connected": True, "disconnected_at": None})
    return player


def active_players(room):
    now = time.monotonic()
    return [
        player for player in room["players"]
        if not player.get("left")
        and (player.get("connected", True) or now - player.get("disconnected_at", -31) < 30)
    ]


def transfer_admin(room):
    next_admin = next((player for player in room["players"] if not player.get("left") and player.get("connected", True)), None)
    next_admin = next_admin or next((player for player in room["players"] if player.get("connected", True) and not player.get("left")), None)
    for player in room["players"]:
        player["isAdmin"] = bool(next_admin and player["id"] == next_admin["id"])
    return next_admin


def leave_player(room, player_id):
    player = next((item for item in room["players"] if item["id"] == player_id), None)
    if player is None:
        raise ValueError("Player is not in this room")
    if room["phase"] == "lobby":
        room["players"].remove(player)
    else:
        player["left"] = True
        player["connected"] = False
    if player.get("isAdmin") or not any(item.get("isAdmin") and not item.get("left") for item in room["players"]):
        transfer_admin(room)
    if room["phase"] != "lobby" and len(active_players(room)) < 2:
        room["phase"] = "ended"
    return player


def return_to_lobby(room, player_id):
    if room["phase"] not in ("results", "ended"):
        raise ValueError("The current game has not ended")
    if not next((player for player in active_players(room) if player["id"] == player_id and player.get("isAdmin")), None):
        raise ValueError("Only the admin can return the room to the lobby")
    room["phase"] = "lobby"
    room["round"] = None
    room["lastResult"] = None


def exit_game(room, player_id):
    if room["phase"] not in ("results", "ended"):
        raise ValueError("The current game has not ended")
    if not next((player for player in active_players(room) if player["id"] == player_id), None):
        raise ValueError("Only an active player can exit the game")
    room["phase"] = "lobby"
    room["round"] = None
    room["lastResult"] = None


def public_room(room, viewer_id=None):
    round_state = room.get("round")
    prediction_questions = []
    if room["modeId"] == "never-say-do" and room["phase"] == "predictions" and round_state:
        prediction_questions = get_game_mode(room["modeId"]).public_predictions(round_state, active_players(room))

    descriptions = []
    raw_descriptions = round_state.get("descriptions", {}) if round_state else {}
    if isinstance(raw_descriptions, dict):
        descriptions = [
            {"playerId": player_id, "type": clue.get("type", "text"), "description": clue.get("description", "")}
            for player_id, clue in raw_descriptions.items()
        ]

    statements = []
    if round_state:
        raw_statements = round_state.get("statements", [])
        if isinstance(raw_statements, dict):
            statements = [
                {"playerId": player_id, "statement": item["statement"]}
                for player_id, items in raw_statements.items()
                for item in (items if isinstance(items, list) else [])
            ]
        elif isinstance(raw_statements, list):
            statements = [
                {"statementId": item.get("statementId"), "statement": item.get("statement")}
                for item in raw_statements
            ]

    return {
        "code": room["code"],
        "phase": room["phase"],
        "modeId": room["modeId"],
        "categoryIds": room["categoryIds"],
        "clueMode": room["clueMode"],
        "players": [
            {key: player.get(key) for key in ("id", "name", "avatar", "avatarColor", "connected", "left", "isAdmin", "score")}
            for player in room["players"]
        ],
        "activePlayerCount": len(active_players(room)),
        "gameEnded": room["phase"] == "ended",
        "lastResult": room.get("lastResult"),
        "descriptions": descriptions,
        "votesSubmitted": len(round_state.get("votes", {})) if round_state and isinstance(round_state.get("votes", {}), dict) else 0,
        "votedPlayerIds": list(round_state.get("votes", {}).keys()) if round_state and isinstance(round_state.get("votes", {}), dict) else [],
        "guessesSubmitted": len(round_state.get("guesses", [])) if round_state and isinstance(round_state.get("guesses", []), list) else 0,
        "statements": statements,
        "answersSubmitted": len(round_state.get("answers", {})) if round_state and isinstance(round_state.get("answers", {}), dict) else 0,
        "predictionsSubmitted": sum(len(item) for item in round_state.get("predictions", {}).values()) if round_state and isinstance(round_state.get("predictions", {}), dict) else 0,
        "predictionQuestions": prediction_questions,
        "pendingConfirmation": (
            {
                "targetId": round_state["pending_confirmation"]["targetId"],
                "guesserId": round_state["pending_confirmation"]["guesserId"],
            }
            if round_state and round_state.get("pending_confirmation")
            else None
        ),
        "currentPlayerId": (
            round_state.get("player_order", [None])[round_state.get("turn_index", 0) % len(round_state.get("player_order", [None]))]
            if round_state and round_state.get("player_order")
            else None
        ),
        "alive": round_state.get("alive", []) if round_state else [],
        "dayReveal": round_state.get("dayReveal") if round_state else None,
        "nightActionsSubmitted": len(round_state.get("nightActions", {})) if round_state else 0,
        "nightActors": len(get_game_mode(room["modeId"]).night_actors(round_state)) if round_state and room["modeId"] == "mafia-mystery" else 0,
        "script": round_state.get("script") if round_state else None,
        "settings": room["settings"],
        "drawings": round_state.get("drawings", {}) if round_state else {},
        "liveDrawings": {
            player_id: list(strokes.values())
            for player_id, strokes in (round_state.get("live_drawings", {}) if round_state else {}).items()
        },
        "chat": [
            message for message in room["chat"][-100:]
            if viewer_id is None or viewer_id in chat_recipients(room, message)
        ],
    }


def start_round(room, player_id):
    players = active_players(room)
    if len(players) < 2:
        raise ValueError("At least 2 active players are required")
    if not next((player for player in players if player["id"] == player_id and player["isAdmin"]), None):
        raise ValueError("Only the room admin can start the game")
    mode = get_game_mode(room["modeId"])
    room["lastResult"] = None
    history = room.setdefault("roundHistory", [])
    if room["modeId"] in ("aware-imposter", "unaware-imposter", "drawing-imposter"):
        room["round"] = mode.create_round(players, room["categoryIds"], history)
        history.append(room["round"]["selection"])
    else:
        room["round"] = mode.create_round(players, room["categoryIds"])
    room["phase"] = {"guess-number": "guessing", "never-say-do": "questions", "drawing-imposter": "drawing", "guess-the-lie": "statements", "mafia-mystery": "night"}.get(room["modeId"], "descriptions")


def set_mode(room, mode_id, player_id):
    if room["phase"] != "lobby":
        raise ValueError("Game mode can only be changed in the lobby")
    if not next((player for player in room["players"] if player["id"] == player_id and player["isAdmin"]), None):
        raise ValueError("Only the room admin can choose the game")
    get_game_mode(mode_id)
    room["modeId"] = mode_id


def set_categories(room, category_ids, player_id):
    from app.game_modes.categories import CATEGORIES

    if room["phase"] != "lobby":
        raise ValueError("Category can only be changed in the lobby")
    if not next((player for player in room["players"] if player["id"] == player_id and player["isAdmin"]), None):
        raise ValueError("Only the room admin can choose the category")
    if not isinstance(category_ids, list) or not category_ids or any(category_id not in CATEGORIES for category_id in category_ids):
        raise ValueError("Choose at least one valid category")
    room["categoryIds"] = list(dict.fromkeys(category_ids))


def set_clue_mode(room, clue_mode, player_id):
    if room["phase"] != "lobby":
        raise ValueError("Clue style can only be changed in the lobby")
    if not next((player for player in room["players"] if player["id"] == player_id and player["isAdmin"]), None):
        raise ValueError("Only the room admin can choose the clue style")
    if clue_mode not in ("text", "act"):
        raise ValueError("Choose text or act it out")
    room["clueMode"] = clue_mode


def set_mystery_settings(room, settings, player_id):
    if room["phase"] != "lobby" or room["modeId"] != "mafia-mystery":
        raise ValueError("Mystery Room settings can only be changed in its lobby")
    if not next((player for player in room["players"] if player["id"] == player_id and player["isAdmin"]), None):
        raise ValueError("Only the room admin can change settings")
    if not isinstance(settings, dict):
        raise ValueError("Invalid settings")
    for key in ("eliminateTies", "suddenDeath"):
        if key in settings and not isinstance(settings[key], bool):
            raise ValueError("Settings must be true or false")
    room["settings"].update({key: settings[key] for key in ("eliminateTies", "suddenDeath") if key in settings})


def add_chat_message(room, player_id, message, audience_type="ALL", target_ids=None):
    cleaned = message.strip()
    if not cleaned or len(cleaned) > 240:
        raise ValueError("Chat messages must be 1-240 characters")
    player = next((item for item in room["players"] if item["id"] == player_id), None)
    if player is None:
        raise ValueError("Player is not in this room")
    if audience_type not in ("ALL", "WHISPER", "EXCLUDE"):
        raise ValueError("Invalid chat audience")
    active_ids = {item["id"] for item in active_players(room)}
    target_ids = list(dict.fromkeys(target_ids or []))
    if any(target_id not in active_ids for target_id in target_ids):
        raise ValueError("Chat recipient is not active")
    if audience_type == "WHISPER" and len(target_ids) != 1:
        raise ValueError("Choose one whisper recipient")
    if audience_type == "EXCLUDE" and not target_ids:
        raise ValueError("Choose at least one player to exclude")
    message_data = {
        "roomId": room["code"],
        "senderId": player_id,
        "senderName": player["name"],
        "senderAvatar": player.get("avatar", "😀"),
        "senderAvatarColor": player.get("avatarColor", "cyan"),
        "text": cleaned,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "audienceType": audience_type,
        "targetIds": target_ids,
    }
    room["chat"].append(message_data)
    room["chat"] = room["chat"][-100:]
    return message_data


def chat_recipients(room, message):
    active_ids = {player["id"] for player in active_players(room)}
    if message["audienceType"] == "WHISPER":
        return active_ids & ({message["senderId"]} | set(message["targetIds"]))
    if message["audienceType"] == "EXCLUDE":
        return active_ids - set(message["targetIds"])
    return active_ids


def advance_after_descriptions(room):
    players = active_players(room)
    if room["phase"] == "descriptions" and all(player["id"] in room["round"]["descriptions"] for player in players):
        room["phase"] = "discussion"


def start_voting(room):
    if room["phase"] != "discussion":
        raise ValueError("Discussion is not complete")
    room["phase"] = "voting"


def advance_after_votes(room):
    players = active_players(room)
    if room["phase"] == "voting" and all(player["id"] in room["round"]["votes"] for player in players):
        room["phase"] = "results"
