import json
from pathlib import Path

import pytest

from app.game_modes import aware_imposter, drawing_imposter, guess_number, guess_the_lie, never_say_do
from app.game_modes.registry import MODES
from app.lobby.room_manager import add_player, rooms, start_round


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


def test_guess_number_round_resolves_on_correct_guess():
    round_state = guess_number.create_round(PLAYERS)
    target_id = PLAYERS[1]["id"]
    guess_number.submit_guess(round_state, PLAYERS[0]["id"], target_id, round_state["numbers"][target_id])

    result = guess_number.resolve_round(round_state)
    assert result["winnerId"] == PLAYERS[0]["id"]
    assert result["scores"][PLAYERS[0]["id"]] == 1


def test_never_say_do_round_accepts_all_statements_and_answers():
    round_state = never_say_do.create_round(PLAYERS)
    for index, player in enumerate(PLAYERS):
        never_say_do.submit_statement(round_state, player["id"], f"Statement {index}", index % 2 == 0)
    for index, player in enumerate(PLAYERS):
        never_say_do.submit_answer(round_state, player["id"], PLAYERS[index]["id"], index % 2 == 0)

    result = never_say_do.resolve_round(round_state)
    assert len(result["statements"]) == 4
    assert len(result["answers"]) == 4


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
