import random
import secrets

from .content import load_content


PROMPTS = load_content("never_say_do_prompts.json")


def prediction_text(action, answer):
    clean_answer = answer.strip()
    if action["predictionMode"] == "answer":
        return f"Who would never {clean_answer}?"
    if action["predictionMode"] == "say":
        return f'Who wouldn\'t say "{clean_answer}"?'
    if action["predictionMode"] == "go":
        return f"Who wouldn't go {clean_answer}?"
    return f"Who wouldn't {action['verb']} {clean_answer}?"


def create_round(players, _category_ids=None):
    player_ids = [player["id"] for player in players]
    questions = {}
    shuffled_targets = player_ids[1:] + player_ids[:1]
    prompt_pool = list(PROMPTS)
    random.shuffle(prompt_pool)

    for answer_writer_id, target_id in zip(player_ids, shuffled_targets):
        question_id = secrets.token_urlsafe(8)
        action = prompt_pool.pop() if prompt_pool else random.choice(PROMPTS)
        target = next(player for player in players if player["id"] == target_id)
        questions[question_id] = {
            "id": question_id,
            "answerWriterId": answer_writer_id,
            "targetPlayerId": target_id,
            "category": action["category"],
            "verb": action["verb"],
            "predictionMode": action["predictionMode"],
            "text": f"What would {target['name']} never {action['verb']}?",
        }

    return {
        "player_ids": player_ids,
        "questions": questions,
        "writer_questions": {question["answerWriterId"]: question_id for question_id, question in questions.items()},
        "answers": {},
        "predictions": {},
        "scores": {player["id"]: 0 for player in players},
    }


def private_assignment(round_state, player_id, players=None):
    question_id = round_state["writer_questions"].get(player_id)
    question = round_state["questions"].get(question_id)
    if not question or question["answerWriterId"] != player_id:
        raise ValueError("No question is assigned to this player")
    return {
        "mode": "never-say-do",
        "question": {
            "id": question["id"],
            "text": question["text"],
        },
    }


def submit_answer(round_state, player_id, question_id, answer):
    if player_id not in round_state["writer_questions"]:
        raise ValueError("Player is not part of this round")
    if question_id != round_state["writer_questions"][player_id]:
        raise ValueError("Answer does not belong to the current question")
    if question_id in round_state["answers"]:
        raise ValueError("Answer already submitted")
    if not isinstance(answer, str) or not answer.strip() or len(answer.strip()) > 160:
        raise ValueError("Answer must be 1-160 characters")
    round_state["answers"][question_id] = {
        "questionId": question_id,
        "answerWriterId": player_id,
        "answer": answer.strip(),
    }


def submit_prediction(round_state, predictor_id, question_id, selected_player_id, active_player_ids):
    question = round_state["questions"].get(question_id)
    answer = round_state["answers"].get(question_id)
    if not question or not answer:
        raise ValueError("Question answer is not available")
    if predictor_id not in active_player_ids:
        raise ValueError("Only active players can predict")
    if selected_player_id not in active_player_ids:
        raise ValueError("Selected player is not active")
    if question["targetPlayerId"] == predictor_id:
        raise ValueError("This question is about you")
    predictions = round_state["predictions"].setdefault(question_id, {})
    if predictor_id in predictions:
        raise ValueError("Prediction already submitted")
    predictions[predictor_id] = selected_player_id


def resolve_round(round_state, players):
    names = {player["id"]: player["name"] for player in players}
    question_results = []
    personal_results = {}

    for question_id, question in round_state["questions"].items():
        answer = round_state["answers"].get(question_id)
        if not answer:
            continue
        target_id = question["targetPlayerId"]
        predictions = round_state["predictions"].get(question_id, {})
        prediction_results = []
        for predictor_id, selected_player_id in predictions.items():
            correct = selected_player_id == target_id
            if correct:
                round_state["scores"][predictor_id] += 1
            prediction_results.append({
                "predictorId": predictor_id,
                "predictorName": names.get(predictor_id, "Player"),
                "selectedPlayerId": selected_player_id,
                "selectedPlayerName": names.get(selected_player_id, "Player"),
                "correct": correct,
                "points": 1 if correct else 0,
            })
            personal_results.setdefault(predictor_id, {})[question_id] = {
                "correct": correct,
                "points": 1 if correct else 0,
            }
        question_results.append({
            "questionId": question_id,
            "text": question["text"],
            "answer": answer["answer"],
            "predictionText": prediction_text(question, answer["answer"]),
            "correctTargetId": target_id,
            "correctTargetName": names.get(target_id, "Player"),
            "predictions": prediction_results,
        })

    return {
        "questionResults": question_results,
        "scores": round_state["scores"],
        "personalResults": personal_results,
    }


def public_predictions(round_state, players):
    active_ids = {player["id"] for player in players}
    options = [
        {
            "id": player["id"],
            "name": player["name"],
            "avatar": player.get("avatar", "😀"),
            "avatarColor": player.get("avatarColor", "cyan"),
        }
        for player in players
    ]
    return [
        {"questionId": question_id, "text": round_state["questions"][question_id]["text"], "predictionText": prediction_text(round_state["questions"][question_id], answer["answer"]), "answer": answer["answer"], "options": options}
        for question_id, answer in round_state["answers"].items()
        if answer["answerWriterId"] in active_ids and round_state["questions"][question_id]["targetPlayerId"] in active_ids
    ]
