import React from 'react';

export default function ClueModePicker({ chooseClueMode }) {
  return (
    <div className="setup-screen">
      <p className="eyebrow">Room setup · step 3 of 3</p>
      <h1>How will clues work?</h1>
      <p className="subtle">
        Everyone must submit one clue action. Choose text on the device or act it out in real life.
      </p>

      <div className="game-grid">
        <button className="game-card" onClick={() => chooseClueMode('text')}>
          <span className="game-icon">Aa</span>
          <strong>Text clue</strong>
          <small>Write one clue on your device.</small>
        </button>

        <button className="game-card" onClick={() => chooseClueMode('act')}>
          <span className="game-icon">✦</span>
          <strong>Act it out</strong>
          <small>Perform one clue in real life, then tap done.</small>
        </button>
      </div>
    </div>
  );
}
