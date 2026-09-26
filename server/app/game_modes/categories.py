CATEGORIES = {
    "everyday-objects": ["backpack", "lighthouse", "umbrella", "toaster", "spaceship"],
    "marvel-universe": ["Spider-Man", "Iron Man", "Thor", "Hulk", "Black Panther"],
    "bts-songs": ["Dynamite", "Butter", "Spring Day", "DNA", "Fire"],
    "people-and-places": ["detective", "astronaut", "chef", "museum", "stadium"],
}

CATEGORY_CATALOG = [
    {"id": category_id, "name": category_id.replace("-", " ").title()}
    for category_id in CATEGORIES
]
