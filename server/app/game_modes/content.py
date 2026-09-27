import json
import random
from collections import Counter
from collections import defaultdict, deque
from functools import lru_cache
from pathlib import Path


CONTENT_DIR = Path(__file__).parent / "content"
_recent_choices = defaultdict(lambda: deque(maxlen=8))


@lru_cache(maxsize=None)
def load_content(filename):
    with (CONTENT_DIR / filename).open(encoding="utf-8") as file:
        return json.load(file)


def choose(items, pool_id):
    values = list(items)
    if not values:
        raise ValueError(f"Content pool '{pool_id}' is empty")

    recent = _recent_choices[pool_id]
    available = [item for item in values if item not in recent] or values
    selected = random.choice(available)
    recent.append(selected)
    return selected


def choose_distinct(items, pool_id):
    values = list(dict.fromkeys(items))
    selected = choose(values, pool_id)
    alternatives = [item for item in values if item != selected]
    if not alternatives:
        raise ValueError(f"Content pool '{pool_id}' needs at least two distinct items")
    return selected, random.choice(alternatives)


def choose_imposter_round(players, category_ids, history=None, relationships=None):
    history = history or []
    relationships = set(relationships or [])
    requested_categories = list(dict.fromkeys(category_ids or ["everyday-objects"]))
    pairs = load_content("imposter_pairs.json")["pairs"]
    candidates = [pair for pair in pairs if pair["category"] in requested_categories and (not relationships or pair["relationship"] in relationships)]
    words = load_content("imposter_words.json")
    curated_categories = {pair["category"] for pair in candidates}
    for fallback_category in (category for category in requested_categories if category not in curated_categories):
        fallback_words = list(dict.fromkeys(words.get(fallback_category, words["everyday-objects"])))
        candidates.extend(
            {
                "category": fallback_category,
                "normal_word": normal_word,
                "imposter_word": imposter_word,
                "relationship": "confusing",
                "difficulty": "medium",
            }
            for normal_word in fallback_words
            for imposter_word in fallback_words
            if normal_word != imposter_word
        )

    previous_pairs = {
        frozenset((item.get("normal_word"), item.get("imposter_word")))
        for item in history
        if item.get("normal_word") and item.get("imposter_word")
    }
    recent_words = {
        item.get("normal_word")
        for item in history[-3:]
    } | {
        item.get("imposter_word")
        for item in history[-3:]
    }
    category_counts = Counter(item.get("category") for item in history)
    relationship_counts = Counter(item.get("relationship") for item in history)
    difficulty_counts = Counter(item.get("difficulty") for item in history)
    recent_categories = [item.get("category") for item in history[-2:]]
    recent_relationships = [item.get("relationship") for item in history[-2:]]
    recent_difficulties = [item.get("difficulty") for item in history[-2:]]

    unused_candidates = [
        pair for pair in candidates
        if frozenset((pair["normal_word"], pair["imposter_word"])) not in previous_pairs
    ]
    fresh_candidates = unused_candidates or candidates

    def score(pair):
        pair_words = {pair["normal_word"], pair["imposter_word"]}
        return (
            category_counts[pair["category"]],
            int(pair["category"] in recent_categories),
            int(bool(pair_words & recent_words)),
            relationship_counts[pair["relationship"]],
            int(pair["relationship"] in recent_relationships),
            difficulty_counts[pair["difficulty"]],
            int(pair["difficulty"] in recent_difficulties),
        )

    selected = min(fresh_candidates, key=lambda pair: (score(pair), random.random()))
    role_counts = Counter(item.get("imposter_id") for item in history if item.get("imposter_id"))
    minimum_role_count = min((role_counts[player["id"]] for player in players), default=0)
    eligible_players = [player for player in players if role_counts[player["id"]] == minimum_role_count]
    imposter = random.choice(eligible_players)

    return {
        **selected,
        "imposter_id": imposter["id"],
        "reason": f"Selected a fresh {selected['relationship']} pair with balanced category and difficulty rotation.",
        "used_before": not bool(unused_candidates),
    }
