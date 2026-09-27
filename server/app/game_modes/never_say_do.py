import random

from .content import choose, load_content


PROMPTS = load_content("never_say_do_prompts.json")


def create_round(players, _category_ids=None):
    target = random.choice(players)
    return {
        "target_id": target["id"],
        "prompt": choose(PROMPTS, "never-say-do"),
        "statements": [],
        "answers": {},
        "scores": {player["id"]: 0 for player in players},
        "statement_index": 0,
    }


def private_assignment(round_state, player_id):
    return {
        "mode": "never-say-do",
        "targetId": round_state["target_id"],
        "prompt": round_state["prompt"],
        "isTarget": player_id == round_state["target_id"],
    }


def submit_statement(round_state, player_id, statement, is_true):
    cleaned = statement.strip()
    if not cleaned or len(cleaned) > 160:
        raise ValueError("Write a statement up to 160 characters")
    if any(item["playerId"] == player_id for item in round_state["statements"]):
        raise ValueError("Statement already submitted")
    round_state["statements"].append({"playerId": player_id, "statement": cleaned, "isTrue": bool(is_true)})


def submit_answer(round_state, player_id, statement_id, answer):
    if player_id in round_state["answers"]:
        raise ValueError("Answer already submitted")
    statement = next((item for item in round_state["statements"] if item["playerId"] == statement_id), None)
    if statement is None:
        raise ValueError("Statement not found")
    round_state["answers"][player_id] = {"statementId": statement_id, "answer": bool(answer)}
    if bool(answer) == statement["isTrue"]:
        round_state["scores"][player_id] += 1


def resolve_round(round_state):
    return {
        "targetId": round_state["target_id"],
        "prompt": round_state["prompt"],
        "statements": round_state["statements"],
        "answers": round_state["answers"],
        "scores": round_state["scores"],
    }
