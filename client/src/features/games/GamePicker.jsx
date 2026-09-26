import React from 'react';
import { gameModeList } from './registry';

export default function GamePicker({ chooseGame }) {
  return (
    <div className="setup-screen">
      <p className="eyebrow">Room setup · step 1 of 2</p>
      <h1>Choose a game.</h1>
      <p className="subtle">Pick the game everyone will play. You can change this before starting.</p>

      <div className="game-grid">
        {gameModeList.map(([id, mode]) => {
          const Icon = mode.Icon;

          return (
            <button className="game-card" key={id} onClick={() => chooseGame(id)}>
              <Icon />
              <strong>{mode.title}</strong>
              <small>{mode.description}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
