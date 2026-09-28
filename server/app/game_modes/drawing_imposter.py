from .content import choose_imposter_round

DRAWING_COLORS = {"#102b3f", "#ef5350", "#ffcf56", "#65e0d2", "#5b8cff", "#ff77b7", "#ffffff"}


def create_round(players, category_id="everyday-objects", history=None):
    selection = choose_imposter_round(
        players,
        category_id if isinstance(category_id, list) else [category_id],
        history,
        relationships=("confusing", "deceptively_similar"),
    )
    return {
        "category_id": selection["category"],
        "prompt": selection["normal_word"],
        "alternate_prompt": selection["imposter_word"],
        "imposter_id": selection["imposter_id"],
        "selection": selection,
        "live_drawings": {},
        "drawings": {},
        "votes": {},
        "scores": {player["id"]: 0 for player in players},
    }


def private_assignment(round_state, player_id):
    is_imposter = player_id == round_state["imposter_id"]
    return {"mode": "drawing-imposter", "isImposter": is_imposter, "prompt": round_state["alternate_prompt"] if is_imposter else round_state["prompt"]}


def submit_drawing(round_state, player_id, drawing):
    if player_id in round_state["drawings"]:
        raise ValueError("Drawing already submitted")
    if not drawing or len(drawing) > 200000:
        raise ValueError("A valid drawing is required")
    round_state["drawings"][player_id] = drawing


def submit_stroke(round_state, player_id, stroke):
    if player_id in round_state["drawings"]:
        raise ValueError("Drawing has already been submitted")
    if not isinstance(stroke, dict) or stroke.get("type") not in ("start", "move", "end", "clear"):
        raise ValueError("Invalid drawing stroke")
    if stroke.get("type") == "clear":
        round_state.setdefault("live_drawings", {}).setdefault(player_id, {}).clear()
        return
    stroke_id = stroke.get("strokeId")
    if not isinstance(stroke_id, str) or not stroke_id or len(stroke_id) > 80:
        raise ValueError("Invalid drawing stroke id")
    if stroke["type"] in ("start", "move"):
        point = stroke.get("point")
        if not isinstance(point, dict) or not all(isinstance(point.get(key), (int, float)) and 0 <= point[key] <= 1 for key in ("x", "y")):
            raise ValueError("Invalid drawing point")
    player_strokes = round_state.setdefault("live_drawings", {}).setdefault(player_id, {})
    if stroke["type"] == "start":
        color = stroke.get("color", "#102b3f")
        if color not in DRAWING_COLORS:
            raise ValueError("Invalid drawing color")
        if not isinstance(stroke.get("erase", False), bool):
            raise ValueError("Invalid eraser state")
        player_strokes[stroke_id] = {"strokeId": stroke_id, "points": [stroke["point"]], "color": color, "erase": stroke.get("erase", False)}
    elif stroke["type"] == "move":
        if stroke_id not in player_strokes:
            raise ValueError("Drawing stroke has not started")
        if len(player_strokes[stroke_id]["points"]) >= 2000:
            raise ValueError("Drawing stroke is too long")
        player_strokes[stroke_id]["points"].append(stroke["point"])
    elif stroke_id not in player_strokes:
        raise ValueError("Drawing stroke has not started")


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
                round_state["scores"][player_id] += 1
    else:
        round_state["scores"][round_state["imposter_id"]] += 2
    return {"accusedId": accused_id, "imposterId": round_state["imposter_id"], "prompt": round_state["prompt"], "caught": caught, "drawings": round_state["drawings"], "scores": round_state["scores"]}
