import random
import secrets

from .content import load_content


PROMPTS = load_content("never_say_do_prompts.json")


def create_round(players, _category_ids=None):
    player_ids = [player["id"] for player in players]
    questions = {}
    shuffled_targets = player_ids[1:] + player_ids[:1]
    prompt_pool = list(PROMPTS)
    random.shuffle(prompt_pool)

    for recipient_id, target_id in zip(player_ids, shuffled_targets):
        question_id = secrets.token_urlsafe(8)
        prompt = prompt_pool.pop() if prompt_pool else random.choice(PROMPTS)
        questions[recipient_id] = {
            "id": question_id,
            "recipientId": recipient_id,
            "targetPlayerId": target_id,
            "text": f"Who would never {prompt}?",
        }

    return {
        "player_ids": player_ids,
        "questions": questions,
        "answers": {},
        "scores": {player["id"]: 0 for player in players},
    }


def private_assignment(round_state, player_id, players=None):
    question = round_state["questions"].get(player_id)
    if not question:
        raise ValueError("No question is assigned to this player")
    return {
        "mode": "never-say-do",
        "question": {
            "id": question["id"],
            "text": question["text"],
            "options": [
                {
                    "id": player["id"],
                    "name": player["name"],
                    "avatar": player.get("avatar", "😀"),
                    "avatarColor": player.get("avatarColor", "cyan"),
                }
                for player in (players or [])
                if player["id"] != player_id
            ],
        },
    }


def submit_answer(round_state, player_id, question_id, target_player_id):
    if player_id not in round_state["questions"]:
        raise ValueError("Player is not part of this round")
    if player_id in round_state["answers"]:
        raise ValueError("Answer already submitted")
    question = round_state["questions"][player_id]
    if question_id != question["id"]:
        raise ValueError("Answer does not belong to the current question")
    if target_player_id not in round_state["player_ids"]:
        raise ValueError("Selected player is not part of this round")
    if target_player_id == player_id:
        raise ValueError("You cannot select yourself")

    correct = target_player_id == question["targetPlayerId"]
    round_state["answers"][player_id] = {
        "questionId": question_id,
        "targetPlayerId": target_player_id,
        "correct": correct,
    }
    if correct:
        round_state["scores"][player_id] += 1


def resolve_round(round_state, players):
    names = {player["id"]: player["name"] for player in players}
    question_results = []
    personal_results = {}

    for recipient_id, question in round_state["questions"].items():
        answer = round_state["answers"].get(recipient_id)
        question_results.append({
            "questionId": question["id"],
            "text": question["text"],
            "correctPlayerId": question["targetPlayerId"],
            "correctPlayerName": names.get(question["targetPlayerId"], "Player"),
            "answers": [{
                "playerId": recipient_id,
                "playerName": names.get(recipient_id, "Player"),
                "selectedPlayerId": answer["targetPlayerId"] if answer else None,
                "selectedPlayerName": names.get(answer["targetPlayerId"], "Player") if answer else None,
                "correct": answer["correct"] if answer else False,
                "points": 1 if answer and answer["correct"] else 0,
            }],
        })
        if answer:
            personal_results[recipient_id] = {
                "questionId": question["id"],
                "selectedPlayerId": answer["targetPlayerId"],
                "selectedPlayerName": names.get(answer["targetPlayerId"], "Player"),
                "correctPlayerId": question["targetPlayerId"],
                "correctPlayerName": names.get(question["targetPlayerId"], "Player"),
                "correct": answer["correct"],
                "points": 1 if answer["correct"] else 0,
            }

    return {
        "questionResults": question_results,
        "scores": round_state["scores"],
        "personalResults": personal_results,
    }
