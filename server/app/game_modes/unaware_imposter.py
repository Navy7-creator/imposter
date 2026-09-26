import random

from .categories import CATEGORIES


def create_round(players, category_id="everyday-objects"):
    category_ids = category_id if isinstance(category_id, list) else [category_id]
    category_id = random.choice(category_ids)
    words = CATEGORIES.get(category_id, CATEGORIES["everyday-objects"])
    target_word = random.choice(words)
    alternate_words = [word for word in words if word != target_word]
    imposter_id = random.choice(players)["id"]
    return {
        "target_word": target_word,
        "category_id": category_id,
        "alternate_word": random.choice(alternate_words),
        "imposter_id": imposter_id,
        "descriptions": {},
        "votes": {},
        "scores": {player["id"]: 0 for player in players},
    }


def private_assignment(round_state, player_id):
    return {
        "mode": "unaware-imposter",
        "isImposter": player_id == round_state["imposter_id"],
        "word": round_state["alternate_word"] if player_id == round_state["imposter_id"] else round_state["target_word"],
        "category": round_state["category_id"],
    }


def submit_description(round_state, player_id, description, clue_mode="text"):
    cleaned = description.strip()
    if player_id in round_state["descriptions"]:
        raise ValueError("Description already submitted")
    if clue_mode not in ("text", "act") or clue_mode == "text" and not cleaned:
        raise ValueError("A description is required")
    round_state["descriptions"][player_id] = {"type": clue_mode, "description": cleaned[:160] if clue_mode == "text" else "Acted it out"}


def submit_vote(round_state, player_id, target_id):
    if player_id in round_state["votes"]:
        raise ValueError("Vote already submitted")
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
