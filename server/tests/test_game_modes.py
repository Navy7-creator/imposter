import json
from pathlib import Path

import pytest

from app.game_modes import aware_imposter, drawing_imposter, guess_number, guess_the_lie, never_say_do
from app.game_modes.content import choose, choose_imposter_round
from app.game_modes.registry import MODES
from app.lobby.room_manager import active_players, add_player, exit_game, leave_player, public_room, rooms, start_round


PLAYERS = [{"id": f"player-{index}", "name": f"Player {index}", "avatar": "sun", "connected": True} for index in range(4)]
ACTIVE_MODE_IDS = ("aware-imposter", "unaware-imposter", "guess-number", "never-say-do", "drawing-imposter", "guess-the-lie")


@pytest.mark.parametrize("mode_id", ACTIVE_MODE_IDS)
def test_active_mode_factory_and_assignments(mode_id):
    mode = MODES[mode_id]
    round_state = mode.create_round(PLAYERS, ["everyday-objects"])

    assert isinstance(round_state, dict)
    for player in PLAYERS:
        assignment = mode.private_assignment(round_state, player["id"])
        assert assignment["mode"] == mode_id


def test_start_round_contract_for_every_active_mode():
    for mode_id in ACTIVE_MODE_IDS:
        room_code = f"TEST-{mode_id}"
        room = {"code": room_code, "phase": "lobby", "modeId": mode_id, "categoryIds": ["everyday-objects"], "players": [], "round": None, "chat": [], "settings": {}}
        rooms[room_code] = room
        try:
            for player in PLAYERS:
                add_player(room, player.copy())
            start_round(room, PLAYERS[0]["id"])
            assert room["round"] is not None
            assert room["phase"] != "lobby"
        finally:
            rooms.pop(room_code, None)


def test_two_players_can_start_and_one_left_player_ends_game():
    room = {"code": "TEST-TWO", "phase": "lobby", "modeId": "aware-imposter", "categoryIds": ["food"], "players": [], "round": None, "chat": [], "settings": {}}
    rooms[room["code"]] = room
    try:
        add_player(room, {"id": "player-0", "name": "One", "avatar": "😀", "connected": True})
        add_player(room, {"id": "player-1", "name": "Two", "avatar": "😎", "connected": True})
        start_round(room, "player-0")
        assert len(active_players(room)) == 2

        leave_player(room, "player-1")

        assert room["phase"] == "ended"
        assert len(active_players(room)) == 1
        assert room["players"][1]["left"] is True
    finally:
        rooms.pop(room["code"], None)


def test_disconnected_players_are_not_active_but_remain_in_room():
    room = {"code": "TEST-DISCONNECT", "phase": "lobby", "modeId": "aware-imposter", "categoryIds": ["food"], "players": [], "round": None, "chat": [], "settings": {}}
    add_player(room, {"id": "player-0", "name": "One", "avatar": "😀", "connected": True})
    add_player(room, {"id": "player-1", "name": "Two", "avatar": "😎", "connected": True})
    add_player(room, {"id": "player-2", "name": "Three", "avatar": "🤓", "connected": True})

    room["players"][1]["connected"] = False

    assert len(active_players(room)) == 2
    assert len(room["players"]) == 3

    leave_player(room, "player-0")

    assert len(active_players(room)) == 1


def test_leaving_admin_transfers_admin_and_preserves_score():
    room = {"code": "TEST-ADMIN", "phase": "lobby", "modeId": "aware-imposter", "categoryIds": ["food"], "players": [], "round": None, "chat": [], "settings": {}}
    add_player(room, {"id": "player-0", "name": "Admin", "avatar": "😀", "connected": True})
    add_player(room, {"id": "player-1", "name": "Next", "avatar": "😎", "connected": True})
    room["players"][0]["score"] = 7
    start_round(room, "player-0")

    leave_player(room, "player-0")

    assert room["players"][1]["isAdmin"] is True
    assert room["players"][0]["score"] == 7
    assert room["players"][0]["left"] is True


def test_exit_game_returns_persistent_room_to_lobby():
    room = {"code": "TEST-EXIT", "phase": "lobby", "modeId": "aware-imposter", "categoryIds": ["food"], "players": [], "round": None, "chat": [], "settings": {}}
    add_player(room, {"id": "player-0", "name": "One", "avatar": "😀", "connected": True})
    add_player(room, {"id": "player-1", "name": "Two", "avatar": "😎", "connected": True})
    room["phase"] = "results"
    room["round"] = {"scores": {}}

    exit_game(room, "player-1")

    assert room["phase"] == "lobby"
    assert room["round"] is None
    assert len(room["players"]) == 2


def test_public_room_handles_rounds_without_descriptions():
    room = {
        "code": "TEST-PUBLIC",
        "phase": "guessing",
        "modeId": "guess-number",
        "categoryIds": ["everyday-objects"],
        "clueMode": "text",
        "players": [
            {**player, "isAdmin": index == 0}
            for index, player in enumerate(PLAYERS)
        ],
        "round": guess_number.create_round(PLAYERS),
        "chat": [],
        "settings": {},
    }

    public_state = public_room(room)

    assert public_state["descriptions"] == []


def test_public_room_does_not_expose_never_say_do_truth_values():
    room = {
        "code": "TEST-TRUTH",
        "phase": "voting",
        "modeId": "never-say-do",
        "categoryIds": ["everyday-objects"],
        "clueMode": "text",
        "players": [],
        "round": {
            "statements": [{"statementId": "statement-0", "authorId": "player-0", "statement": "A hidden claim", "isTrue": True}],
            "answers": {},
        },
        "chat": [],
        "settings": {},
    }

    public_state = public_room(room)

    assert public_state["statements"] == [{"statementId": "statement-0", "statement": "A hidden claim"}]


def test_content_selector_uses_fresh_items_before_repeating():
    pool = [f"item-{index}" for index in range(10)]

    selected = [choose(pool, "test-fresh-content") for _ in range(9)]

    assert len(set(selected)) == 9


def test_imposter_selector_rejects_reversed_pairs():
    history = [{
        "category": "food",
        "normal_word": "pizza",
        "imposter_word": "burger",
        "relationship": "confusing",
        "difficulty": "easy",
        "imposter_id": "player-0",
    }]

    selection = choose_imposter_round(PLAYERS, ["food"], history)

    assert frozenset((selection["normal_word"], selection["imposter_word"])) != frozenset(("pizza", "burger"))
    assert selection["used_before"] is False


def test_imposter_selector_favors_least_used_player():
    history = [
        {"normal_word": "one", "imposter_word": "two", "imposter_id": "player-0"},
        {"normal_word": "three", "imposter_word": "four", "imposter_id": "player-0"},
        {"normal_word": "five", "imposter_word": "six", "imposter_id": "player-1"},
    ]

    selection = choose_imposter_round(PLAYERS, ["food"], history)

    assert selection["imposter_id"] in {"player-2", "player-3"}


def test_drawing_imposter_uses_history_aware_pair_selection():
    history = [{
        "category": "food",
        "normal_word": "pizza",
        "imposter_word": "burger",
        "relationship": "confusing",
        "difficulty": "easy",
        "imposter_id": "player-0",
    }]

    round_state = drawing_imposter.create_round(PLAYERS, ["food"], history)

    assert round_state["selection"]["used_before"] is False
    assert {round_state["prompt"], round_state["alternate_prompt"]} != {"pizza", "burger"}
    assert round_state["imposter_id"] != "player-0"
    assert round_state["selection"]["relationship"] in {"confusing", "deceptively_similar"}


def test_drawing_imposter_accepts_strokes_and_clear():
    round_state = drawing_imposter.create_round(PLAYERS, ["food"])
    drawing_imposter.submit_stroke(round_state, "player-0", {"type": "start", "strokeId": "stroke-1", "point": {"x": 0.2, "y": 0.3}})
    drawing_imposter.submit_stroke(round_state, "player-0", {"type": "move", "strokeId": "stroke-1", "point": {"x": 0.4, "y": 0.5}})

    assert round_state["live_drawings"]["player-0"]["stroke-1"]["points"][-1] == {"x": 0.4, "y": 0.5}

    drawing_imposter.submit_stroke(round_state, "player-0", {"type": "clear"})

    assert round_state["live_drawings"]["player-0"] == {}


def test_drawing_imposter_preserves_color_and_eraser_stroke_metadata():
    round_state = drawing_imposter.create_round(PLAYERS, ["food"])

    drawing_imposter.submit_stroke(round_state, "player-0", {
        "type": "start",
        "strokeId": "stroke-ink",
        "point": {"x": 0.1, "y": 0.1},
        "color": "#ef5350",
        "erase": True,
    })

    stroke = round_state["live_drawings"]["player-0"]["stroke-ink"]
    assert stroke["color"] == "#ef5350"
    assert stroke["erase"] is True


def test_aware_imposter_round_resolves_after_all_votes():
    round_state = aware_imposter.create_round(PLAYERS, ["everyday-objects"])
    for player in PLAYERS:
        aware_imposter.submit_description(round_state, player["id"], "A careful clue")
    for index, player in enumerate(PLAYERS):
        aware_imposter.submit_vote(round_state, player["id"], PLAYERS[(index + 1) % len(PLAYERS)]["id"])

    result = aware_imposter.resolve_round(round_state)
    assert len(round_state["descriptions"]) == 4
    assert len(round_state["votes"]) == 4
    assert result["accusedId"] in {player["id"] for player in PLAYERS}


def test_drawing_imposter_round_resolves_after_drawings_and_votes():
    round_state = drawing_imposter.create_round(PLAYERS, ["everyday-objects"])
    for index, player in enumerate(PLAYERS):
        drawing_imposter.submit_drawing(round_state, player["id"], f"drawing-{index}")
        drawing_imposter.submit_vote(round_state, player["id"], PLAYERS[(index + 1) % len(PLAYERS)]["id"])

    result = drawing_imposter.resolve_round(round_state)
    assert len(round_state["drawings"]) == 4
    assert len(round_state["votes"]) == 4
    assert result["scores"]


@pytest.mark.parametrize("mode", [aware_imposter, drawing_imposter])
def test_imposter_votes_reject_unknown_targets(mode):
    round_state = mode.create_round(PLAYERS, ["everyday-objects"])

    with pytest.raises(ValueError, match="not part of this round"):
        mode.submit_vote(round_state, PLAYERS[0]["id"], "missing-player")


def test_guess_number_round_resolves_on_correct_guess():
    round_state = guess_number.create_round(PLAYERS)
    target_id = PLAYERS[1]["id"]
    guess_number.submit_guess(round_state, PLAYERS[0]["id"], target_id, round_state["numbers"][target_id])

    result = guess_number.resolve_round(round_state)
    assert result["winnerId"] == PLAYERS[0]["id"]
    assert result["scores"][PLAYERS[0]["id"]] == 1


def test_never_say_do_assigns_private_questions_to_different_players():
    round_state = never_say_do.create_round(PLAYERS)
    player_ids = {player["id"] for player in PLAYERS}

    assert set(round_state["questions"]) == player_ids
    assert all(question["targetPlayerId"] != recipient_id for recipient_id, question in round_state["questions"].items())
    assert {question["targetPlayerId"] for question in round_state["questions"].values()} == player_ids

    for player in PLAYERS:
        assignment = never_say_do.private_assignment(round_state, player["id"], PLAYERS)
        assert assignment["question"]["id"] == round_state["questions"][player["id"]]["id"]
        assert "correctPlayerId" not in assignment["question"]


def test_never_say_do_scores_only_the_server_known_target():
    round_state = never_say_do.create_round(PLAYERS)
    player_id = PLAYERS[0]["id"]
    question = round_state["questions"][player_id]

    never_say_do.submit_answer(round_state, player_id, question["id"], question["targetPlayerId"])

    assert round_state["scores"][player_id] == 1
    assert round_state["answers"][player_id]["correct"] is True


def test_never_say_do_rejects_invalid_question_and_duplicate_answers():
    round_state = never_say_do.create_round(PLAYERS)
    player_id = PLAYERS[0]["id"]
    question = round_state["questions"][player_id]

    with pytest.raises(ValueError, match="current question"):
        never_say_do.submit_answer(round_state, player_id, "wrong-question", PLAYERS[1]["id"])
    with pytest.raises(ValueError, match="You cannot select yourself"):
        never_say_do.submit_answer(round_state, player_id, question["id"], player_id)

    never_say_do.submit_answer(round_state, player_id, question["id"], question["targetPlayerId"])
    with pytest.raises(ValueError, match="already submitted"):
        never_say_do.submit_answer(round_state, player_id, question["id"], question["targetPlayerId"])


def test_public_room_hides_never_say_do_questions_and_correct_targets():
    room = {
        "code": "TEST-NEVER",
        "phase": "questions",
        "modeId": "never-say-do",
        "categoryIds": ["everyday-objects"],
        "clueMode": "text",
        "players": [
            {**player, "isAdmin": index == 0}
            for index, player in enumerate(PLAYERS)
        ],
        "round": never_say_do.create_round(PLAYERS),
        "chat": [],
        "settings": {},
    }

    public_state = public_room(room)

    assert "questions" not in public_state
    assert "targetPlayerId" not in public_state
    assert public_state["answersSubmitted"] == 0


def test_guess_the_lie_round_accepts_statements_and_votes():
    round_state = guess_the_lie.create_round(PLAYERS)
    for index, player in enumerate(PLAYERS):
        guess_the_lie.submit_statements(round_state, player["id"], [f"Truth {index} A", f"Truth {index} B", f"Lie {index}"])
    for index, player in enumerate(PLAYERS):
        target_id = PLAYERS[(index + 1) % len(PLAYERS)]["id"]
        guess_the_lie.submit_vote(round_state, player["id"], target_id, 0)

    result = guess_the_lie.resolve_round(round_state)
    assert len(result["statements"]) == 4
    assert len(result["votes"]) == 4


def test_script_json_files_have_shared_schema():
    scripts_path = Path(__file__).parents[1] / "app" / "game_modes" / "scripts"
    required_keys = {"id", "title", "macguffin", "intro", "cast"}

    for script_path in scripts_path.glob("*.json"):
        script = json.loads(script_path.read_text(encoding="utf-8"))
        assert required_keys <= script.keys(), script_path.name
        assert script["cast"], script_path.name
        for character in script["cast"]:
            assert {"name", "personality", "alibi", "fact"} <= character.keys(), script_path.name
