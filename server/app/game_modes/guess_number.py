import random


def create_round(players, _category_ids=None):
    numbers = random.sample(range(1, 101), len(players))
    player_order = [player["id"] for player in players]
    return {
        "numbers": {player["id"]: number for player, number in zip(players, numbers)},
        "player_names": {player["id"]: player["name"] for player in players},
        "guesses": [],
        "scores": {player["id"]: 0 for player in players},
        "winner_id": None,
        "turn_index": 0,
        "player_order": player_order,
        "guarded_player_id": {player_order[index - 1]: player_order[index] for index in range(len(player_order))},
        "pending_confirmation": None,
    }


def private_assignment(round_state, player_id):
    guarded_player_id = round_state["guarded_player_id"][player_id]
    return {
        "mode": "guess-number",
        "playerId": player_id,
        "guardedPlayerId": guarded_player_id,
        "guardedPlayerName": round_state["player_names"][guarded_player_id],
        "number": round_state["numbers"][guarded_player_id],
    }


def submit_guess(round_state, player_id, target_id, guess):
    if round_state["winner_id"] or round_state["pending_confirmation"]:
        raise ValueError("This round is already complete")
    if target_id != player_id:
        raise ValueError("You can only guess your own number")
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
    if guess == round_state["numbers"][player_id]:
        round_state["pending_confirmation"] = {
            "guardianId": next(guardian_id for guardian_id, guarded_id in round_state["guarded_player_id"].items() if guarded_id == player_id),
            "targetId": player_id,
            "guesserId": player_id,
            "number": guess,
        }
    else:
        round_state["turn_index"] += 1


def confirm_guess(round_state, player_id):
    confirmation = round_state.get("pending_confirmation")
    if not confirmation:
        raise ValueError("There is no guess waiting for confirmation")
    if confirmation["guardianId"] != player_id:
        raise ValueError("Only the number guardian can confirm this guess")
    round_state["winner_id"] = confirmation["guesserId"]
    round_state["scores"][confirmation["guesserId"]] += 1
    round_state["pending_confirmation"] = None


def resolve_round(round_state):
    winner_target_id = round_state["guesses"][-1]["targetId"] if round_state["winner_id"] and round_state["guesses"] else None
    return {
        "winnerId": round_state["winner_id"],
        "winnerTargetId": winner_target_id,
        "numbers": round_state["numbers"],
        "guesses": round_state["guesses"],
        "scores": round_state["scores"],
        "currentPlayerId": None if round_state["winner_id"] else round_state["player_order"][round_state["turn_index"] % len(round_state["player_order"])],
        "pendingConfirmation": round_state["pending_confirmation"],
    }
