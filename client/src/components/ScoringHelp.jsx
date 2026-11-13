import React, { useState } from 'react';

export default function ScoringHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="scoring-help">
      <button type="button" className="help-button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>? How Scoring Works</button>
      {open && <div className="scoring-popover" role="dialog">
        <strong>Points</strong>
        <p>Drawing Imposter: crewmate catches imposter +300; imposter survives +500; caught imposter guesses the word +250.</p>
        <p>Who Would Never?: correct target guess +300; author fools the group +150.</p>
        <p>Chain Guess the Number: 1st +500, 2nd +350, 3rd +200, 4th+ +100; guardian confirmation +50.</p>
      </div>}
    </div>
  );
}
