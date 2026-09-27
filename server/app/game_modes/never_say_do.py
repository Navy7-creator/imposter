import random
import secrets

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
    if any(item["authorId"] == player_id for item in round_state["statements"]):
        raise ValueError("Statement already submitted")
    round_state["statements"].append({
        "statementId": secrets.token_urlsafe(8),
        "authorId": player_id,
        "statement": cleaned,
        "isTrue": bool(is_true),
    })


def submit_answers(round_state, player_id, answers):
    if player_id in round_state["answers"]:
        raise ValueError("Answer already submitted")
    if not isinstance(answers, dict):
        raise ValueError("Answers must be an object")
    statement_ids = {item["statementId"] for item in round_state["statements"]}
    if set(answers) != statement_ids or any(not isinstance(answer, bool) for answer in answers.values()):
        raise ValueError("Answer every statement exactly once")
    round_state["answers"][player_id] = {statement_id: answers[statement_id] for statement_id in statement_ids}
    round_state["scores"][player_id] += sum(
        answers[item["statementId"]] == item["isTrue"]
        for item in round_state["statements"]
    )


def resolve_round(round_state):
    statement_results = []
    for item in round_state["statements"]:
        statement_id = item["statementId"]
        true_votes = sum(answers.get(statement_id) is True for answers in round_state["answers"].values())
        false_votes = sum(answers.get(statement_id) is False for answers in round_state["answers"].values())
        statement_results.append({
            "statementId": statement_id,
            "statement": item["statement"],
            "author": item["authorId"],
            "isTrue": item["isTrue"],
            "voteDistribution": {"true": true_votes, "false": false_votes},
        })
    return {
        "targetId": round_state["target_id"],
        "prompt": round_state["prompt"],
        "statementResults": statement_results,
        "scores": round_state["scores"],
        "personalResults": {
            player_id: {
                item["statementId"]: {
                    "answer": answers[item["statementId"]],
                    "correct": answers[item["statementId"]] == item["isTrue"],
                }
                for item in round_state["statements"]
            }
            for player_id, answers in round_state["answers"].items()
        },
    }
