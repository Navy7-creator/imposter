import random

from .categories import CATEGORIES


def create_round(players, category_id="everyday-objects"):
    category_ids = category_id if isinstance(category_id, list) else [category_id]
    category_id = random.choice(category_ids)
    prompts = CATEGORIES.get(category_id, CATEGORIES["everyday-objects"])
    prompt = random.choice(prompts)
    alternate = random.choice([item for item in prompts if item != prompt])
    imposter_id = random.choice(players)["id"]
    return {"category_id": category_id, "prompt": prompt, "alternate_prompt": alternate, "imposter_id": imposter_id, "drawings": {}, "votes": {}, "scores": {player["id"]: 0 for player in players}}


def private_assignment(round_state, player_id):
    is_imposter = player_id == round_state["imposter_id"]
    return {"mode": "drawing-imposter", "isImposter": is_imposter, "prompt": round_state["alternate_prompt"] if is_imposter else round_state["prompt"]}


def submit_drawing(round_state, player_id, drawing):
    if player_id in round_state["drawings"]:
        raise ValueError("Drawing already submitted")
    if not drawing or len(drawing) > 200000:
        raise ValueError("A valid drawing is required")
    round_state["drawings"][player_id] = drawing


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
                round_state["scores"][player_id] += 1
    else:
        round_state["scores"][round_state["imposter_id"]] += 2
    return {"accusedId": accused_id, "imposterId": round_state["imposter_id"], "prompt": round_state["prompt"], "caught": caught, "drawings": round_state["drawings"], "scores": round_state["scores"]}
