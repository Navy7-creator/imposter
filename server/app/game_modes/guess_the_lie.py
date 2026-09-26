import random


def create_round(players, category_id="everyday-objects"):
    return {"statements": {}, "votes": {}, "scores": {player["id"]: 0 for player in players}, "player_order": [player["id"] for player in players], "current_index": 0}


def private_assignment(round_state, player_id):
    return {"mode": "guess-the-lie", "playerId": player_id}


def submit_statements(round_state, player_id, statements):
    if player_id in round_state["statements"]:
        raise ValueError("Statements already submitted")
    if not isinstance(statements, list) or len(statements) != 3 or any(not str(item).strip() for item in statements):
        raise ValueError("Submit exactly three statements")
    round_state["statements"][player_id] = [{"text": str(item).strip()[:160], "isLie": index == random.randrange(3)} for index, item in enumerate(statements)]


def submit_vote(round_state, player_id, target_id, statement_index):
    if player_id in round_state["votes"]:
        raise ValueError("Vote already submitted")
    if target_id not in round_state["statements"] or statement_index not in (0, 1, 2):
        raise ValueError("Invalid lie vote")
    round_state["votes"][player_id] = {"targetId": target_id, "statementIndex": statement_index}
    if round_state["statements"][target_id][statement_index]["isLie"]:
        round_state["scores"][player_id] += 1


def resolve_round(round_state):
    return {"statements": round_state["statements"], "votes": round_state["votes"], "scores": round_state["scores"]}
