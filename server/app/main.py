import asyncio
import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import connect_database, get_leaderboard, save_result
from app.game_modes.catalog import GAME_CATALOG
from app.game_modes.categories import CATEGORY_CATALOG
from app.game_modes.registry import get_game_mode
from app.lobby.room_manager import (
    add_player,
    advance_after_descriptions,
    advance_after_votes,
    get_or_create_room,
    join_room,
    public_room,
    start_round,
    start_voting,
    set_mode,
    set_categories,
    set_clue_mode,
    set_mystery_settings,
    add_chat_message,
    chat_recipients,
    active_players,
    exit_game,
    leave_player,
    return_to_lobby,
    transfer_admin,
    rooms,
)

load_dotenv()
app = FastAPI(title="Imposter Object API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)
connections = {}
NEVER_SAY_DO_VOTING_TIMEOUT_SECONDS = 90


@app.on_event("startup")
def startup():
    try:
        connect_database()
    except Exception as error:
        print(f"PostgreSQL unavailable: {error}")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/games")
def games():
    return {"games": GAME_CATALOG}


@app.get("/categories")
def categories():
    return {"categories": CATEGORY_CATALOG}


@app.get("/leaderboard")
def leaderboard():
    return {"players": get_leaderboard()}


async def send_event(websocket, event, data):
    await websocket.send_json({"event": event, "data": data})


async def broadcast(room, event="room:updated", data=None):
    message_for = lambda player_id: {"event": event, "data": public_room(room, player_id) if data is None else data}
    await asyncio.gather(
        *(websocket.send_json(message_for(player_id)) for player_id, websocket in connections.get(room["code"], {}).items()),
        return_exceptions=True,
    )


async def assignments(room):
    mode = get_game_mode(room["modeId"])
    for player in active_players(room):
        websocket = connections.get(room["code"], {}).get(player["id"])
        if websocket:
            assignment = mode.private_assignment(room["round"], player["id"], active_players(room)) if room["modeId"] == "never-say-do" else mode.private_assignment(room["round"], player["id"])
            await send_event(websocket, "round:assignment", assignment)


async def prediction_ownership(room):
    round_state = room["round"]
    for player in active_players(room):
        websocket = connections.get(room["code"], {}).get(player["id"])
        if websocket:
            question_ids = [
                question_id
                for question_id, question in round_state["questions"].items()
                if question["authorId"] == player["id"] and question_id in round_state["answers"]
            ]
            await send_event(websocket, "round:prediction-ownership", {"questionIds": question_ids})


def finalize_result(room, result):
    for player in room["players"]:
        player["score"] = player.get("score", 0) + result.get("scores", {}).get(player["id"], 0)
    result["scores"] = {player["id"]: player.get("score", 0) for player in room["players"]}
    save_result(room, result)
    return result


async def broadcast_never_say_do_results(room, result):
    personal_results = result.pop("personalResults", {})
    finalize_result(room, result)
    await broadcast(room)
    await broadcast(room, "round:results", result)
    for player_id, player_result in personal_results.items():
        websocket = connections.get(room["code"], {}).get(player_id)
        if websocket:
            await send_event(websocket, "round:personal-results", player_result)


def never_say_do_vote_counts(room):
    active_ids = {player["id"] for player in active_players(room)}
    round_state = room["round"]
    answered_questions = {
        question_id
        for question_id, answer in round_state["answers"].items()
        if answer["authorId"] in active_ids
        and round_state["questions"][question_id]["targetId"] in active_ids
    }
    required_votes = sum(
        len(active_ids - {round_state["answers"][question_id]["authorId"]})
        for question_id in answered_questions
    )
    submitted_votes = sum(
        len(set(votes) & active_ids)
        for question_id, votes in round_state["votes"].items()
        if question_id in answered_questions
    )
    return submitted_votes, required_votes


async def finish_never_say_do_voting(room):
    if room["phase"] != "predictions":
        return False
    submitted_votes, required_votes = never_say_do_vote_counts(room)
    if submitted_votes < required_votes:
        return False
    room["phase"] = "results"
    result = get_game_mode(room["modeId"]).resolve_round(room["round"], room["players"])
    await broadcast_never_say_do_results(room, result)
    return True


async def expire_never_say_do_voting(room, round_state):
    await asyncio.sleep(NEVER_SAY_DO_VOTING_TIMEOUT_SECONDS)
    if room.get("round") is round_state:
        await finish_never_say_do_voting(room)


async def handle_event(websocket, event, payload):
    room_code = websocket.scope.get("room_code")
    player_id = websocket.scope.get("player_id")
    room = rooms.get(room_code) if room_code else None

    if event == "room:join":
        room = join_room(payload.get("code"))
        player = {
            "id": payload.get("playerId") or secrets_token(),
            "name": payload.get("name", "").strip()[:24],
            "avatar": payload.get("avatar") or "😀",
            "avatarColor": payload.get("avatarColor") or "cyan",
            "connected": True,
        }
        if not player["name"]:
            raise ValueError("A player name is required")
        add_player(room, player)
        websocket.scope["room_code"], websocket.scope["player_id"] = room["code"], player["id"]
        connections.setdefault(room["code"], {})[player["id"]] = websocket
        await send_event(websocket, "room:joined", {"room": public_room(room, player["id"]), "player": player})
        await broadcast(room)
        return

    if room is None:
        raise ValueError("Join a room first")
    mode = get_game_mode(room["modeId"])
    if event == "room:leave":
        leave_player(room, player_id)
        connections.get(room["code"], {}).pop(player_id, None)
        await broadcast(room)
        return
    if event == "room:return-lobby":
        return_to_lobby(room, player_id)
        await broadcast(room)
    elif event == "room:play-again":
        start_round(room, player_id)
        await assignments(room)
        await broadcast(room)
    elif event == "room:exit-game":
        exit_game(room, player_id)
        await broadcast(room)
    elif event == "room:mode":
        set_mode(room, payload.get("modeId"), player_id)
        await broadcast(room)
    elif event == "room:categories":
        set_categories(room, payload.get("categoryIds"), player_id)
        await broadcast(room)
    elif event == "room:clue-mode":
        set_clue_mode(room, payload.get("clueMode"), player_id)
        await broadcast(room)
    elif event == "room:mystery-settings":
        set_mystery_settings(room, payload.get("settings"), player_id)
        await broadcast(room)
    elif event == "room:chat":
        room_id = payload.get("roomId")
        if room_id and room_id != room["code"]:
            raise ValueError("Chat room does not match the current room")
        message = add_chat_message(
            room,
            player_id,
            payload.get("text", payload.get("message", "")),
            payload.get("audienceType", "ALL"),
            payload.get("targetIds", []),
        )
        recipients = chat_recipients(room, message)
        await asyncio.gather(
            *(
                send_event(connections[room["code"]][recipient_id], "room:chat", message)
                for recipient_id in recipients
                if recipient_id in connections.get(room["code"], {})
            ),
            return_exceptions=True,
        )
    elif event == "round:start":
        start_round(room, player_id)
        await assignments(room)
        await broadcast(room)
    elif event == "round:description" and room["modeId"] in ("aware-imposter", "unaware-imposter"):
        mode.submit_description(room["round"], player_id, payload.get("description", ""), room["clueMode"])
        advance_after_descriptions(room)
        await broadcast(room)
    elif event == "round:start-voting" and room["modeId"] in ("aware-imposter", "unaware-imposter"):
        start_voting(room)
        await broadcast(room)
    elif event == "round:drawing:stroke" and room["modeId"] == "drawing-imposter":
        if room["phase"] != "drawing":
            raise ValueError("Drawing is no longer open")
        if not next((player for player in active_players(room) if player["id"] == player_id), None):
            raise ValueError("Only active players can draw")
        stroke = payload.get("stroke")
        mode.submit_stroke(room["round"], player_id, stroke)
        await broadcast(room, "round:drawing:stroke", {"playerId": player_id, "stroke": stroke})
    elif event == "round:vote" and room["modeId"] in ("aware-imposter", "unaware-imposter", "drawing-imposter"):
        if room["phase"] != "voting":
            raise ValueError("Voting is not open")
        if not any(player["id"] == player_id for player in active_players(room)):
            raise ValueError("Only active players can vote")
        target_id = payload.get("targetId")
        if not any(player["id"] == target_id for player in active_players(room)):
            raise ValueError("Vote target is not an active player")
        mode.submit_vote(room["round"], player_id, target_id)
        advance_after_votes(room)
        await broadcast(room)
        if room["phase"] == "results":
            result = mode.resolve_round(room["round"])
            finalize_result(room, result)
            await broadcast(room, "round:results", result)
    elif event == "round:guess" and room["modeId"] == "guess-number":
        mode.submit_guess(room["round"], player_id, payload.get("targetId"), payload.get("guess"))
        if room["round"]["pending_confirmation"]:
            room["phase"] = "confirmation"
            await broadcast(room)
        elif room["round"]["winner_id"]:
            room["phase"] = "results"
            result = mode.resolve_round(room["round"])
            finalize_result(room, result)
            await broadcast(room, "round:results", result)
        else:
            await broadcast(room)
    elif event == "round:confirm-guess" and room["modeId"] == "guess-number":
        if room["phase"] != "confirmation":
            raise ValueError("There is no guess waiting for confirmation")
        mode.confirm_guess(room["round"], player_id)
        room["phase"] = "results"
        result = mode.resolve_round(room["round"])
        finalize_result(room, result)
        await broadcast(room, "round:results", result)
    elif event == "round:answer" and room["modeId"] == "never-say-do":
        if room["phase"] != "questions":
            raise ValueError("Questions are no longer open")
        if not any(player["id"] == player_id for player in active_players(room)):
            raise ValueError("Only active players can answer")
        mode.submit_answer(room["round"], player_id, payload.get("questionId"), payload.get("answer"))
        required_writers = {player["id"] for player in active_players(room)} & set(room["round"]["player_ids"])
        answered_writers = {
            question["answerWriterId"]
            for question_id, question in room["round"]["questions"].items()
            if question_id in room["round"]["answers"]
        }
        if required_writers <= answered_writers:
            room["phase"] = "predictions"
            await broadcast(room)
            await prediction_ownership(room)
            asyncio.create_task(expire_never_say_do_voting(room, room["round"]))
        else:
            await broadcast(room)
    elif event == "round:prediction" and room["modeId"] == "never-say-do":
        if room["phase"] != "predictions":
            raise ValueError("Predictions are not open")
        active_ids = {player["id"] for player in active_players(room)}
        mode.submit_prediction(room["round"], player_id, payload.get("questionId"), payload.get("selectedPlayerId"), active_ids)
        if not await finish_never_say_do_voting(room):
            await broadcast(room)
    elif event == "round:drawing" and room["modeId"] == "drawing-imposter":
        if room["phase"] != "drawing":
            raise ValueError("Drawing is no longer open")
        if not any(player["id"] == player_id for player in active_players(room)):
            raise ValueError("Only active players can submit a drawing")
        mode.submit_drawing(room["round"], player_id, payload.get("drawing"))
        if len(room["round"]["drawings"]) == len(active_players(room)):
            room["phase"] = "voting"
        await broadcast(room)
    elif event == "round:guess-lie-statements" and room["modeId"] == "guess-the-lie":
        if not any(player["id"] == player_id for player in active_players(room)):
            raise ValueError("Only active players can submit statements")
        mode.submit_statements(room["round"], player_id, payload.get("statements"))
        if len(room["round"]["statements"]) == len(active_players(room)):
            room["phase"] = "voting"
        await broadcast(room)
    elif event == "round:guess-lie-vote" and room["modeId"] == "guess-the-lie":
        if room["phase"] != "voting":
            raise ValueError("Voting is not open")
        if not any(player["id"] == player_id for player in active_players(room)):
            raise ValueError("Only active players can vote")
        mode.submit_vote(room["round"], player_id, payload.get("targetId"), payload.get("statementIndex"))
        if len(room["round"]["votes"]) == len(active_players(room)):
            room["phase"] = "results"
            result = mode.resolve_round(room["round"])
            finalize_result(room, result)
            await broadcast(room, "round:results", result)
        else:
            await broadcast(room)
    elif event == "round:mafia-night" and room["modeId"] == "mafia-mystery":
        mode.submit_night_action(room["round"], player_id, payload.get("targetId"))
        if mode.night_complete(room["round"]):
            mode.resolve_night(room["round"])
            winning = mode.winner(room["round"], room["settings"]["suddenDeath"])
            if winning:
                room["phase"] = "results"
                room["round"]["winner"] = winning
                result = mode.results(room["round"])
                finalize_result(room, result)
                await broadcast(room, "round:results", result)
                return
            room["phase"] = "day"
            await assignments(room)
        await broadcast(room)
    elif event == "round:mafia-start-vote" and room["modeId"] == "mafia-mystery":
        if room["phase"] != "day":
            raise ValueError("Voting can only start during the day")
        if not next((player for player in room["players"] if player["id"] == player_id and player["isAdmin"]), None):
            raise ValueError("Only the host can open voting")
        room["phase"] = "voting"
        await broadcast(room)
    elif event == "round:mafia-vote" and room["modeId"] == "mafia-mystery":
        mode.submit_vote(room["round"], player_id, payload.get("targetId"))
        if mode.votes_complete(room["round"]):
            mode.resolve_vote(room["round"], room["settings"]["eliminateTies"])
            winning = mode.winner(room["round"], room["settings"]["suddenDeath"])
            if winning:
                room["phase"] = "results"
                room["round"]["winner"] = winning
                result = mode.results(room["round"])
                finalize_result(room, result)
                await broadcast(room, "round:results", result)
            else:
                room["phase"] = "night"
                room["round"]["round"] += 1
                await assignments(room)
                await broadcast(room)
        else:
            await broadcast(room)
    else:
        raise ValueError(f"Unknown event: {event}")


def secrets_token():
    return os.urandom(8).hex()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            message = json.loads(await websocket.receive_text())
            request_id = message.get("id")
            try:
                await handle_event(websocket, message.get("event"), message.get("payload") or {})
                if request_id:
                    await websocket.send_json({"response": {"id": request_id, "ok": True}})
            except (ValueError, KeyError) as error:
                if request_id:
                    await websocket.send_json({"response": {"id": request_id, "error": str(error)}})
    except WebSocketDisconnect:
        room_code = websocket.scope.get("room_code")
        player_id = websocket.scope.get("player_id")
        if room_code in connections:
            connections[room_code].pop(player_id, None)
        if room_code in rooms:
            room = rooms[room_code]
            leaving_player = next((player for player in room["players"] if player["id"] == player_id), None)
            for player in room["players"]:
                if player["id"] == player_id:
                    player["connected"] = False
            round_state = room.get("round")
            if round_state and player_id in round_state.get("player_order", []):
                turn_index = round_state.get("turn_index", 0)
                removed_index = round_state["player_order"].index(player_id)
                round_state["player_order"].remove(player_id)
                if removed_index < turn_index:
                    round_state["turn_index"] = turn_index - 1
            if leaving_player and leaving_player.get("isAdmin"):
                transfer_admin(room)
            if room["phase"] not in ("lobby", "results", "ended") and len(active_players(room)) < 2:
                room["phase"] = "ended"
            if room["phase"] == "predictions":
                await finish_never_say_do_voting(room)
            await broadcast(room)
