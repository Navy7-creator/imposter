"""Server-authoritative rules for Mystery Room."""
import json
import random
from pathlib import Path


SCRIPT_PATH = Path(__file__).parent / "scripts" / "grand_slam_arena.json"


def _script():
    with SCRIPT_PATH.open(encoding="utf-8") as file:
        return json.load(file)


def _role_list(count):
    roles = ["culprit", "investigator"]
    if count >= 6:
        roles += ["culprit", "protector"]
    if count >= 8:
        roles += ["wildcard"]
    return roles + ["bystander"] * (count - len(roles))


def create_round(players, _category_ids=None):
    if not 2 <= len(players) <= 10:
        raise ValueError("Mystery Room needs 2 to 10 players")
    script = _script()
    ids = [player["id"] for player in players]
    roles = _role_list(len(ids))
    random.shuffle(roles)
    cast = random.sample(script["cast"], len(ids))
    random.shuffle(cast)
    cards, false_indices = {}, set(random.sample(range(len(ids)), max(1, round(len(ids) / 3))))
    for index, player_id in enumerate(ids):
        cards[player_id] = {**cast[index], "factTargetId": ids[(index + 1) % len(ids)], "factIsTrue": index not in false_indices}
    return {"script": {key: script[key] for key in ("id", "title", "macguffin", "intro")}, "roles": dict(zip(ids, roles)), "cards": cards, "alive": ids[:], "nightActions": {}, "votes": {}, "round": 1, "winner": None, "dayReveal": None, "investigations": {}, "scores": {player_id: 0 for player_id in ids}}


def private_assignment(round_state, player_id):
    role, card = round_state["roles"][player_id], round_state["cards"][player_id]
    return {"mode": "mafia-mystery", "playerId": player_id, "role": role, "alive": player_id in round_state["alive"], "cueCard": {"character": {"name": card["name"], "personality": card["personality"]}, "alibi": card["alibi"], "fact": card["fact"], "factTargetId": card["factTargetId"], "objective": "Keep the culprits hidden." if role == "culprit" else "Expose every culprit."}, "culpritIds": [id for id, value in round_state["roles"].items() if value == "culprit"] if role == "culprit" else [], "investigation": round_state["investigations"].get(player_id)}


def night_actors(round_state):
    return [id for id in round_state["alive"] if round_state["roles"][id] in ("culprit", "investigator", "protector")]


def submit_night_action(round_state, player_id, target_id):
    if player_id not in night_actors(round_state) or target_id not in round_state["alive"]:
        raise ValueError("Choose a valid living target")
    if round_state["roles"][player_id] == "protector" and target_id == player_id:
        raise ValueError("The protector cannot shield themself")
    round_state["nightActions"][player_id] = target_id


def night_complete(round_state):
    return all(id in round_state["nightActions"] for id in night_actors(round_state))


def resolve_night(round_state):
    actions, roles = round_state["nightActions"], round_state["roles"]
    targets = [actions[id] for id in night_actors(round_state) if roles[id] == "culprit"]
    kill = None
    if targets:
        highest = max(targets.count(target) for target in set(targets))
        kill = random.choice([target for target in set(targets) if targets.count(target) == highest])
    protected = next((actions[id] for id in night_actors(round_state) if roles[id] == "protector"), None)
    for investigator in [id for id in night_actors(round_state) if roles[id] == "investigator"]:
        target = actions[investigator]
        round_state["investigations"][investigator] = {"targetId": target, "isCulprit": roles[target] == "culprit"}
    removed = kill if kill and kill != protected else None
    if removed in round_state["alive"]:
        round_state["alive"].remove(removed)
    round_state["dayReveal"] = {"removedId": removed, "saved": bool(kill and kill == protected)}
    round_state["nightActions"] = {}


def submit_vote(round_state, player_id, target_id):
    if player_id not in round_state["alive"] or target_id not in round_state["alive"]:
        raise ValueError("Only living players can vote")
    round_state["votes"][player_id] = target_id


def votes_complete(round_state):
    return len(round_state["votes"]) == len(round_state["alive"])


def resolve_vote(round_state, eliminate_ties=False):
    counts = {target: list(round_state["votes"].values()).count(target) for target in set(round_state["votes"].values())}
    highest, leaders = max(counts.values(), default=0), []
    leaders = [target for target, count in counts.items() if count == highest]
    eliminated = random.choice(leaders) if eliminate_ties and len(leaders) > 1 else (leaders[0] if len(leaders) == 1 else None)
    if eliminated:
        round_state["alive"].remove(eliminated)
    round_state["dayReveal"] = {"eliminatedId": eliminated, "tie": len(leaders) > 1}
    round_state["votes"] = {}


def winner(round_state, sudden_death=True):
    culprits = sum(round_state["roles"][id] == "culprit" for id in round_state["alive"])
    innocents = len(round_state["alive"]) - culprits
    if not culprits:
        return "innocents"
    if not innocents or (sudden_death and culprits >= innocents):
        return "culprits"
    return None


def results(round_state):
    winning = winner(round_state) or "innocents"
    for id, role in round_state["roles"].items():
        if (winning == "culprits") == (role == "culprit"):
            round_state["scores"][id] += 100
    return {"winner": winning, "roles": round_state["roles"], "scores": round_state["scores"], "script": round_state["script"]}
