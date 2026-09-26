from . import aware_imposter, drawing_imposter, guess_number, guess_the_lie, never_say_do, planned_modes, unaware_imposter

MODES = {
    "aware-imposter": aware_imposter,
    "unaware-imposter": unaware_imposter,
    "guess-number": guess_number,
    "never-say-do": never_say_do,
    "drawing-imposter": drawing_imposter,
    "guess-the-lie": guess_the_lie,
    "word-spy": planned_modes,
    "emoji-clues": planned_modes,
    "quick-debate": planned_modes,
}


def get_game_mode(mode_id):
    try:
        return MODES[mode_id]
    except KeyError as error:
        raise ValueError(f"Unknown game mode: {mode_id}") from error
