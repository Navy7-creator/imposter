import random

from .content import choose_imposter_round


def create_round(players, category_id="everyday-objects", history=None):
    selection = choose_imposter_round(players, category_id if isinstance(category_id, list) else [category_id], history)
    return {
        "category_id": selection["category"],
        "target_word": selection["normal_word"],
        "alternate_word": selection["imposter_word"],
        "imposter_id": selection["imposter_id"],
        "selection": selection,
        "descriptions": {},
        "votes": {},
        "scores": {player["id"]: 0 for player in players},
    }


def private_assignment(round_state, player_id):
    is_imposter = player_id == round_state["imposter_id"]
    return {
        "mode": "aware-imposter",
        "isImposter": is_imposter,
        "word": round_state["alternate_word"] if is_imposter else round_state["target_word"],
        "category": round_state["category_id"],
    }


def submit_description(round_state, player_id, description, clue_mode="text"):
    if player_id in round_state["descriptions"]:
        raise ValueError("Description already submitted")
    cleaned = description.strip()
    if clue_mode not in ("text", "act") or clue_mode == "text" and not cleaned:
        raise ValueError("A description is required")
    round_state["descriptions"][player_id] = {"type": clue_mode, "description": cleaned[:160] if clue_mode == "text" else "Acted it out"}


def submit_vote(round_state, player_id, target_id):
    if player_id in round_state["votes"]:
        raise ValueError("Vote already submitted")
    if target_id not in round_state["scores"]:
        raise ValueError("Vote target is not part of this round")
    if player_id == target_id:
        raise ValueError("You cannot vote for yourself")
    round_state["votes"][player_id] = target_id


def resolve_round(round_state):
    counts = {}
    for target_id in round_state["votes"].values():
        counts[target_id] = counts.get(target_id, 0) + 1
    accused_id = max(counts, key=counts.get) if counts else None
    caught = accused_id == round_state["imposter_id"]

    if caught:
        for player_id in round_state["scores"]:
            if player_id != round_state["imposter_id"]:
                round_state["scores"][player_id] += 100
    else:
        round_state["scores"][round_state["imposter_id"]] += 150

    return {
        "accusedId": accused_id,
        "imposterId": round_state["imposter_id"],
        "targetWord": round_state["target_word"],
        "category": round_state["category_id"],
        "caught": caught,
        "scores": round_state["scores"],
    }
