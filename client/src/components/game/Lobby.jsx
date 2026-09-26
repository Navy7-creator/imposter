import React from 'react';
import { categories, games } from '../../data/gameData';

export default function Lobby({ room, currentPlayer, start, error, emit }) {
  const game = games.find(([id]) => id === room.modeId);

  return (
    <div className="content">
      <p className="eyebrow">Waiting room · {currentPlayer?.isAdmin ? 'Admin' : 'Player'}</p>
      <h1>Gather your crew.</h1>
      <p className="subtle">
        {game?.[1]} is selected. Invite 3 to 9 other players, then the admin can start.
      </p>

      <p className="selected-game">
        <strong>{game?.[1] || room.modeId}</strong>
        {room.categoryIds?.length > 0 &&
          ` · ${room.categoryIds
            .map((id) => categories.find(([categoryId]) => categoryId === id)?.[1])
            .join(', ')}`}
      </p>

      <div className="player-grid">
        {room.players.map((player) => (
          <div className="player" key={player.id}>
            <span className="avatar">{player.avatar[0].toUpperCase()}</span>
            <strong>{player.name}</strong>
            {player.isAdmin && <small>ADMIN</small>}
          </div>
        ))}
      </div>

      {room.modeId === 'mafia-mystery' && currentPlayer?.isAdmin && (
        <div className="selected-game">
          <strong>Case rules</strong><br />
          <label><input type="checkbox" checked={room.settings?.eliminateTies || false} onChange={(event) => emit('room:mystery-settings', { settings: { eliminateTies: event.target.checked } })} /> Eliminate a random tied player</label><br />
          <label><input type="checkbox" checked={room.settings?.suddenDeath ?? true} onChange={(event) => emit('room:mystery-settings', { settings: { suddenDeath: event.target.checked } })} /> Culprits win at parity</label>
        </div>
      )}

      {currentPlayer?.isAdmin && (
        <button className="primary" onClick={start}>
          Start round <span>→</span>
        </button>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
