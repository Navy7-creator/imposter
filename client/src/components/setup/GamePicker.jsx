import React from 'react';
import { games, gameIcons } from '../../data/gameData';

export default function GamePicker({ chooseGame }) {
  return (
    <div className="setup-screen">
      <p className="eyebrow">Room setup · step 1 of 2</p>
      <h1>Choose a game.</h1>
      <p className="subtle">Pick the game everyone will play. You can change this before starting.</p>

      <div className="game-grid">
        {games.map(([id, name, description]) => (
          <button className="game-card" key={id} onClick={() => chooseGame(id)}>
            <span className="game-icon">{gameIcons[id]}</span>
            <strong>{name}</strong>
            <small>{description}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
