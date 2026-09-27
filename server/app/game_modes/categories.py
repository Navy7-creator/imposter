from .content import load_content


CATEGORIES = load_content("imposter_words.json")

CATEGORY_CATALOG = [
    {"id": category_id, "name": category_id.replace("-", " ").title()}
    for category_id in CATEGORIES
]
