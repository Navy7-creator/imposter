import random


def create_round(players, _category_ids=None):
    numbers = random.sample(range(1, 101), len(players))
    return {
        "numbers": {player["id"]: number for player, number in zip(players, numbers)},
        "guesses": [],
        "scores": {player["id"]: 0 for player in players},
        "winner_id": None,
        "turn_index": 0,
        "player_order": [player["id"] for player in players],
    }


def private_assignment(round_state, player_id):
    return {"mode": "guess-number", "number": round_state["numbers"][player_id]}


def submit_guess(round_state, player_id, target_id, guess):
    if round_state["winner_id"]:
        raise ValueError("This round is already complete")
    if player_id == target_id:
        raise ValueError("You cannot guess your own number")
    if player_id != round_state["player_order"][round_state["turn_index"] % len(round_state["player_order"])]:
        raise ValueError("Wait for your turn")
    if target_id not in round_state["numbers"]:
        raise ValueError("That player is not in this round")
    try:
        guess = int(guess)
    except (TypeError, ValueError) as error:
        raise ValueError("A whole number is required") from error
    if not 1 <= guess <= 100:
        raise ValueError("Guess must be between 1 and 100")
    round_state["guesses"].append({"playerId": player_id, "targetId": target_id, "guess": guess})
    if guess == round_state["numbers"][target_id]:
        round_state["winner_id"] = player_id
        round_state["scores"][player_id] += 1
    else:
        round_state["turn_index"] += 1


def resolve_round(round_state):
    return {
        "winnerId": round_state["winner_id"],
        "numbers": round_state["numbers"],
        "guesses": round_state["guesses"],
        "scores": round_state["scores"],
        "currentPlayerId": None if round_state["winner_id"] else round_state["player_order"][round_state["turn_index"] % len(round_state["player_order"])],
    }
