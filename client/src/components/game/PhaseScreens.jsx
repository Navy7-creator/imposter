import React, { useState } from 'react';

export function Descriptions({ assignment, room, value, setValue, submit, clueMode }) {
  const acting = clueMode === 'act';

  return (
    <div className="content">
      <p className="eyebrow">
        {acting ? 'Act it out' : 'Write your clue'} · {assignment?.category?.replaceAll('-', ' ')}
      </p>
      <h1>
        Your word is <em>{assignment?.word}</em>
      </h1>
      <p className="subtle">
        {acting
          ? 'Perform one clue in real life, then tap done on your device.'
          : 'Give one short clue. Be specific enough to sound human, vague enough to stay alive.'}
      </p>

      {!acting && (
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength="160"
          placeholder="One clue, no giveaways..."
        />
      )}

      <button className="primary" onClick={submit} disabled={!acting && !value.trim()}>
        {acting ? 'I acted it out' : 'Submit clue'}
      </button>

      <p className="counter">
        {room.descriptions.length} / {room.players.length} clues in
      </p>
    </div>
  );
}

export function Discussion({ room, startVoting }) {
  return (
    <div className="content">
      <p className="eyebrow">Discussion</p>
      <h1>Read the room.</h1>

      <div className="clues">
        {room.descriptions.map((item, index) => (
          <article key={item.playerId}>
            <span>0{index + 1}</span>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <button className="primary" onClick={startVoting}>
        Open voting <span>→</span>
      </button>
    </div>
  );
}

export function Voting({ room, vote }) {
  return (
    <div className="content">
      <p className="eyebrow">Cast your vote</p>
      <h1>Who is the Imposter?</h1>

      <div className="vote-list">
        {room.players.map((player) => (
          <button key={player.id} onClick={() => vote(player.id)}>
            <span className="avatar">{player.avatar[0].toUpperCase()}</span>
            <strong>{player.name}</strong>
            <span>Vote →</span>
          </button>
        ))}
      </div>

      <p className="counter">
        {room.votesSubmitted} / {room.players.length} votes in
      </p>
    </div>
  );
}

export function GuessNumberScreen({ assignment, room, emit }) {
  const [targetId, setTargetId] = useState(room.players[0]?.id || '');
  const [guess, setGuess] = useState('');

  return (
    <div className="content">
      <p className="eyebrow">Guess the number</p>
      <h1>Your secret number is <em>{assignment?.number}</em></h1>
      <p className="subtle">Pick a player and guess their number between 1 and 100.</p>

      <label>
        Target player
        <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          {room.players
            .filter((player) => player.id !== assignment?.playerId)
            .map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
        </select>
      </label>

      <label>
        Your guess
        <input
          type="number"
          min="1"
          max="100"
          value={guess}
          onChange={(event) => setGuess(event.target.value)}
          placeholder="1-100"
        />
      </label>

      <button
        className="primary"
        onClick={() => emit('round:guess', { targetId, guess })}
        disabled={!targetId || !guess}
      >
        Lock in guess
      </button>
    </div>
  );
}

export function NeverSayDoStatementScreen({ assignment, room, emit }) {
  const [statement, setStatement] = useState('');
  const [isTrue, setIsTrue] = useState(false);
  const target = room.players.find((player) => player.id === assignment?.targetId);

  return (
    <div className="content">
      <p className="eyebrow">Never say/do</p>
      <h1>{assignment?.prompt} about <em>{target?.name}</em></h1>
      <p className="subtle">Write a statement to test the room.</p>

      <textarea
        value={statement}
        onChange={(event) => setStatement(event.target.value)}
        maxLength="160"
        placeholder="Example: never says hello before coffee..."
      />

      <label>
        Is this statement true?
        <select value={String(isTrue)} onChange={(event) => setIsTrue(event.target.value === 'true')}>
          <option value="false">False</option>
          <option value="true">True</option>
        </select>
      </label>

      <button
        className="primary"
        onClick={() => emit('round:statement', { statement, isTrue })}
        disabled={!statement.trim()}
      >
        Submit statement
      </button>
    </div>
  );
}

export function NeverSayDoAnswerScreen({ room, emit }) {
  return (
    <div className="content">
      <p className="eyebrow">Guess the truth</p>
      <h1>Which statements are true?</h1>

      <div className="clues">
        {room.statements?.map((item) => (
          <article key={item.playerId}>
            <p>{item.statement}</p>
            <div className="vote-list">
              <button onClick={() => emit('round:answer', { statementId: item.playerId, answer: true })}>True</button>
              <button onClick={() => emit('round:answer', { statementId: item.playerId, answer: false })}>False</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function DrawingImposterScreen({ assignment, room, emit }) {
  const [drawing, setDrawing] = useState('');

  return (
    <div className="content">
      <p className="eyebrow">Drawing imposter</p>
      <h1>Your prompt is <em>{assignment?.prompt}</em></h1>
      <p className="subtle">Write a quick sketch idea or a short drawing clue.</p>

      <textarea
        value={drawing}
        onChange={(event) => setDrawing(event.target.value)}
        maxLength="200"
        placeholder="Describe the drawing or shape..."
      />

      <button
        className="primary"
        onClick={() => emit('round:drawing', { drawing })}
        disabled={!drawing.trim()}
      >
        Send drawing
      </button>
    </div>
  );
}

export function GuessTheLieStatementScreen({ room, emit }) {
  const [answers, setAnswers] = useState(['', '', '']);
  const submit = () => emit('round:guess-lie-statements', { statements: answers });

  return (
    <div className="content">
      <p className="eyebrow">Guess the lie</p>
      <h1>Write three statements.</h1>
      <p className="subtle">Only one should be false.</p>

      {answers.map((value, index) => (
        <textarea
          key={index}
          value={value}
          onChange={(event) => {
            const next = [...answers];
            next[index] = event.target.value;
            setAnswers(next);
          }}
          maxLength="160"
          placeholder={`Statement ${index + 1}`}
        />
      ))}

      <button className="primary" onClick={submit} disabled={answers.some((value) => !value.trim())}>
        Submit statements
      </button>
    </div>
  );
}

export function GuessTheLieVoteScreen({ room, emit }) {
  return (
    <div className="content">
      <p className="eyebrow">Vote on the lie</p>
      <h1>Pick the player and statement you think is the lie.</h1>

      <div className="vote-list">
        {room.players.map((player) => (
          <button key={player.id} onClick={() => emit('round:guess-lie-vote', { targetId: player.id, statementIndex: 0 })}>
            <span className="avatar">{player.avatar[0].toUpperCase()}</span>
            <strong>{player.name}</strong>
            <span>Vote →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MafiaNightScreen({ assignment, room, emit }) {
  const role = assignment?.role;
  const [targetId, setTargetId] = useState(room.players.find((player) => player.id !== assignment?.playerId)?.id || '');
  const canAct = ['culprit', 'investigator', 'protector'].includes(role) && assignment?.alive;
  const names = (assignment?.culpritIds || []).map((id) => room.players.find((player) => player.id === id)?.name).filter(Boolean);

  if (!assignment?.alive) {
    return <div className="content"><p className="eyebrow">Mystery Room · Night</p><h1>You are observing.</h1><p className="subtle">You were eliminated. Watch the case unfold.</p></div>;
  }

  if (!canAct) {
    return <div className="content"><p className="eyebrow">Mystery Room · Night</p><h1>Keep your card close.</h1><p className="subtle">No action tonight. The active roles are deciding; this screen will update as soon as they finish.</p><CueCard assignment={assignment} room={room} /></div>;
  }

  return (
    <div className="content">
      <p className="eyebrow">Mystery Room · Night</p>
      <h1>You are the <em>{role}</em>.</h1>
      <p className="subtle">{role === 'culprit' ? `Your fellow culprits: ${names.join(', ')}. Choose a target; the server resolves disagreements privately.` : 'Choose your night action.'}</p>
      <CueCard assignment={assignment} room={room} />
      {assignment?.investigation && <p className="selected-game">Your last investigation: <strong>{room.players.find((player) => player.id === assignment.investigation.targetId)?.name}</strong> is {assignment.investigation.isCulprit ? 'a Culprit.' : 'not a Culprit.'}</p>}

      <label>
        Target
        <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          {room.players
            .filter((player) => player.id !== assignment?.playerId || role !== 'protector')
            .map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
        </select>
      </label>

      <button className="primary" onClick={() => emit('round:mafia-night', { targetId })} disabled={!targetId}>
        Submit night action
      </button>
    </div>
  );
}

function CueCard({ assignment, room }) {
  const card = assignment?.cueCard;
  if (!card) return null;
  return <div className="selected-game"><strong>{card.character.name}</strong> — {card.character.personality}<br />Alibi: {card.alibi}<br />Fact about {room.players.find((player) => player.id === card.factTargetId)?.name}: {card.fact}<br /><em>{card.objective}</em></div>;
}

export function MafiaDayScreen({ room, currentPlayer, emit }) {
  const reveal = room.dayReveal || {};
  const removed = room.players.find((player) => player.id === reveal.removedId);
  return <div className="content"><p className="eyebrow">Mystery Room · Day {room.script?.title}</p><h1>{removed ? <><em>{removed.name}</em> was removed.</> : 'The save worked. Nobody died.'}</h1><p className="subtle">Discuss alibis and fact cards. Only reveal what you choose to reveal.</p>{currentPlayer?.isAdmin && <button className="primary" onClick={() => emit('round:mafia-start-vote')}>Open vote</button>}</div>;
}

export function MafiaVoteScreen({ room, emit }) {
  return <div className="content"><p className="eyebrow">Mystery Room · Vote</p><h1>Who took <em>{room.script?.macguffin}</em>?</h1><div className="vote-list">{room.players.filter((player) => room.alive.includes(player.id)).map((player) => <button key={player.id} onClick={() => emit('round:mafia-vote', { targetId: player.id })}><span className="avatar">{player.avatar[0].toUpperCase()}</span><strong>{player.name}</strong><span>Vote →</span></button>)}</div><p className="counter">{room.votesSubmitted} / {room.alive.length} votes in</p></div>;
}

export function Results({ results, room }) {
  if (room.modeId === 'mafia-mystery') {
    const culprits = Object.entries(results?.roles || {}).filter(([, role]) => role === 'culprit').map(([id]) => room.players.find((player) => player.id === id)?.name).filter(Boolean);
    return (
      <div className="content">
        <p className="eyebrow">Mystery Room · Case closed</p>
        <h1>{results?.winner === 'culprits' ? 'The culprits escaped.' : 'The innocents solved it.'}</h1>
        <p className="reveal">The culprits were <strong>{culprits.join(', ')}</strong>.</p>
        <div className="scores">{Object.entries(results?.scores || {}).map(([id, score]) => <div key={id}><span>{room.players.find((player) => player.id === id)?.name}</span><strong>{score} pts</strong></div>)}</div>
      </div>
    );
  }
  return (
    <div className="content">
      <p className="eyebrow">The reveal</p>
      <h1>{results?.caught ? 'The group got it.' : 'The Imposter slipped away.'}</h1>

      <p className="reveal">
        The word was <strong>{results?.targetWord}</strong>. Imposter:{' '}
        <strong>{room.players.find((player) => player.id === results?.imposterId)?.name}</strong>.
      </p>

      <div className="scores">
        {Object.entries(results?.scores || {}).map(([id, score]) => (
          <div key={id}>
            <span>{room.players.find((player) => player.id === id)?.name}</span>
            <strong>{score} pts</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
