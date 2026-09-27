import React from 'react';
import { categories, games } from '../../data/gameData';

export default function Lobby({ room, currentPlayer, start, error, emit, leaveRoom }) {
  const game = games.find(([id]) => id === room.modeId);
  const activePlayers = room.players.filter((player) => !player.left);
  const canStart = currentPlayer?.isAdmin && activePlayers.length >= 2;

  return (
    <div className="content">
      <p className="eyebrow">Waiting room · {currentPlayer?.isAdmin ? 'Admin' : 'Player'}</p>
      <h1>Gather your crew.</h1>
      <p className="subtle">
        {game?.[1]} is selected. Invite at least one other player, then the admin can start.
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
          <div className={`player ${player.left ? 'player-left' : ''}`} key={player.id}>
            <span className={`avatar color-${player.avatarColor || 'cyan'}`}>{player.left ? '🏃' : player.avatar}</span>
            <strong>{player.name}</strong>
            {player.isAdmin && <small>ADMIN</small>}
            {player.left && <small>LEFT · {player.score || 0} pts</small>}
          </div>
        ))}
      </div>

      {activePlayers.length < 2 && <p className="counter">Waiting for at least 2 players...</p>}

      {room.modeId === 'mafia-mystery' && currentPlayer?.isAdmin && (
        <div className="selected-game">
          <strong>Case rules</strong><br />
          <label><input type="checkbox" checked={room.settings?.eliminateTies || false} onChange={(event) => emit('room:mystery-settings', { settings: { eliminateTies: event.target.checked } })} /> Eliminate a random tied player</label><br />
          <label><input type="checkbox" checked={room.settings?.suddenDeath ?? true} onChange={(event) => emit('room:mystery-settings', { settings: { suddenDeath: event.target.checked } })} /> Culprits win at parity</label>
        </div>
      )}

      {currentPlayer?.isAdmin && (
        <button className="primary" onClick={start} disabled={!canStart}>
          Start round <span>→</span>
        </button>
      )}

      <button className="secondary" onClick={leaveRoom}>Exit lobby</button>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
