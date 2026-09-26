# Mafia script files

Each story is a standalone `.json` file in this directory. The game engine currently loads `grand_slam_arena.json`; additional scripts can be added here without putting story content in Python code.

## Required format

```json
{
  "id": "unique-script-id",
  "title": "Story title",
  "macguffin": "The object or mystery everyone cares about",
  "intro": "The opening situation shown to players.",
  "cast": [
    {
      "name": "Character name",
      "personality": "A short personality description",
      "alibi": "What this character claims they were doing",
      "fact": "A private fact about this character"
    }
  ]
}
```

## Fields

- `id`: unique string used to identify the script.
- `title`: story title.
- `macguffin`: missing object, secret, or central mystery.
- `intro`: opening narrative.
- `cast`: array of character objects. Include at least 10 characters for rooms of up to 10 players.
- `cast[].name`: character display name.
- `cast[].personality`: short role description.
- `cast[].alibi`: claimed whereabouts.
- `cast[].fact`: character-specific clue.

Optional fields such as `setting`, `timeline`, `evidence`, `revelations`, and `endings` may contain additional story content. Keep all story text in JSON; keep game rules in `mafia_mystery.py`.
