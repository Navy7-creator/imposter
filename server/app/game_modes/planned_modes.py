"""Starter contract for games whose rules will be added without changing lobby transport."""


def create_round(players, category_id="everyday-objects"):
    return {
        "players": [player["id"] for player in players],
        "actions": [],
        "scores": {player["id"]: 0 for player in players},
    }


def private_assignment(round_state, player_id):
    return {"mode": "planned", "playerId": player_id}


def resolve_round(round_state):
    return {"scores": round_state["scores"], "actions": round_state["actions"]}
