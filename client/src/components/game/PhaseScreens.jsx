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

export function Voting({ room, currentPlayer, vote, error }) {
  return (
    <div className="content">
      <p className="eyebrow">Cast your vote</p>
      <h1>Who is the Imposter?</h1>

      <div className="vote-list">
        {room.players.filter((player) => !player.left).map((player) => (
          <button key={player.id} onClick={() => vote(player.id)} disabled={player.id === currentPlayer?.id}>
            <span className={`avatar color-${player.avatarColor || 'cyan'}`}>{player.avatar}</span>
            <strong>{player.name}</strong>
            <span className="vote-status">{room.votedPlayerIds?.includes(player.id) ? '✓' : 'Vote →'}</span>
          </button>
        ))}
      </div>

      <p className="counter">
        {room.votesSubmitted} / {room.players.length} votes in
      </p>
      {error && <p className="error">{error}</p>}
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
            .filter((player) => !player.left && player.id !== assignment?.playerId)
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

export function NeverSayDoQuestionScreen({ assignment, emit, currentPlayer }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const question = assignment?.question;
  const options = question?.options || [];

  const submit = async () => {
    const response = await emit('round:answer', { questionId: question.id, targetPlayerId: selectedPlayerId });
    if (!response?.error) setSubmitted(true);
  };

  return (
    <div className="content never-say-do-screen">
      <p className="eyebrow">Never Say / Do · Question</p>
      <h1 className="question-heading">Who would never...</h1>
      <p className="never-question">{question?.text?.replace(/^Who would never\s*/i, '').replace(/\?$/, '')}</p>
      <p className="subtle">Choose the player you think fits the question.</p>

      <div className="player-choice-list" role="radiogroup" aria-label="Choose a player">
        {options.map((player) => (
          <button
            type="button"
            role="radio"
            aria-checked={selectedPlayerId === player.id}
            className={`player-choice ${selectedPlayerId === player.id ? 'selected' : ''}`}
            key={player.id}
            onClick={() => setSelectedPlayerId(player.id)}
            disabled={submitted}
          >
            <span className={`avatar color-${player.avatarColor || 'cyan'}`}>{player.avatar}</span>
            <strong>{player.name}</strong>
            <span className="choice-mark">{selectedPlayerId === player.id ? '✓' : '○'}</span>
          </button>
        ))}
      </div>

      <button className="primary" onClick={submit} disabled={submitted || !selectedPlayerId}>
        {submitted ? 'Answer submitted' : 'Submit answer'} <span>→</span>
      </button>
      {submitted && <p className="counter">Answer locked. Waiting for the room...</p>}
      {currentPlayer && <p className="counter">You are answering as {currentPlayer.name}.</p>}
    </div>
  );
}

export function DrawingImposterScreen({ assignment, room, emit, liveDrawings = {}, currentPlayer }) {
  const [strokes, setStrokes] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [color, setColor] = useState('#102b3f');
  const [eraser, setEraser] = useState(false);

  return (
    <div className="content">
      <p className="eyebrow">Drawing imposter</p>
      <h1>Your prompt is <em>{assignment?.prompt}</em></h1>
      <p className="subtle">Draw your clue, then submit it when you are ready.</p>
      <div className="drawing-toolbar" aria-label="Drawing tools">
        {['#102b3f', '#ef5350', '#ffcf56', '#65e0d2', '#5b8cff', '#ff77b7'].map((option) => (
          <button type="button" className={`drawing-color ${color === option && !eraser ? 'selected' : ''}`} style={{ background: option }} aria-label={`Use ${option} ink`} key={option} onClick={() => { setColor(option); setEraser(false); }} disabled={submitted} />
        ))}
        <button type="button" className={`secondary tool-button ${eraser ? 'selected' : ''}`} onClick={() => setEraser((value) => !value)} disabled={submitted}>Eraser</button>
        <button type="button" className="secondary tool-button" onClick={() => setStrokes((current) => current.slice(0, -1))} disabled={submitted || !strokes.length}>Undo stroke</button>
      </div>
      <DrawingCanvas strokes={strokes} disabled={submitted} color={color} eraser={eraser} onStroke={(stroke) => emit('round:drawing:stroke', { stroke })} setStrokes={setStrokes} />
      {Object.entries(liveDrawings).filter(([playerId]) => playerId !== currentPlayer?.id).map(([playerId, remoteStrokes]) => <div className="remote-drawing" key={playerId}><p className="eyebrow">{room.players.find((player) => player.id === playerId)?.name || 'Player'} is drawing</p><DrawingCanvas strokes={remoteStrokes} readOnly /></div>)}
      <div className="drawing-actions">
        <button className="secondary" onClick={() => { setStrokes([]); emit('round:drawing:stroke', { stroke: { type: 'clear' } }); }} disabled={submitted}>Clear</button>
        <button className="primary" onClick={() => { emit('round:drawing', { drawing: JSON.stringify(strokes) }); setSubmitted(true); }} disabled={submitted || !strokes.length}>Submit drawing <span>→</span></button>
      </div>
    </div>
  );
}

function DrawingCanvas({ strokes, setStrokes, onStroke, color = '#102b3f', eraser = false, disabled = false, readOnly = false }) {
  const canvasRef = React.useRef(null);
  const activeStroke = React.useRef(null);
  const strokesRef = React.useRef(strokes);
  strokesRef.current = strokes;

  const render = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    strokesRef.current.forEach((stroke) => {
      if (!stroke.points.length) return;
      context.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
      context.strokeStyle = stroke.color || '#102b3f';
      context.beginPath();
      stroke.points.forEach((point, index) => {
        const x = point.x * canvas.clientWidth;
        const y = point.y * canvas.clientHeight;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    });
    context.globalCompositeOperation = 'source-over';
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
      canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
      render();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [render]);

  React.useEffect(() => render(), [render, strokes]);

  const pointFromEvent = (event) => {
    const bounds = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };
  const move = (event) => {
    if (!activeStroke.current || disabled || readOnly) return;
    const point = pointFromEvent(event);
    setStrokes((current) => current.map((stroke) => stroke.strokeId === activeStroke.current ? { ...stroke, points: [...stroke.points, point] } : stroke));
    onStroke({ type: 'move', strokeId: activeStroke.current, point });
  };
  const end = () => {
    if (!activeStroke.current) return;
    onStroke?.({ type: 'end', strokeId: activeStroke.current });
    activeStroke.current = null;
  };

  return <canvas ref={canvasRef} className="drawing-canvas" onPointerDown={(event) => {
    if (disabled || readOnly) return;
    canvasRef.current.setPointerCapture(event.pointerId);
    const strokeId = crypto.randomUUID();
    const point = pointFromEvent(event);
    activeStroke.current = strokeId;
    setStrokes((current) => [...current, { strokeId, points: [point], color, erase: eraser }]);
    onStroke({ type: 'start', strokeId, point, color, erase: eraser });
  }} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />;
}

export function DrawingVotingScreen({ room, currentPlayer, vote }) {
  return <div className="content"><p className="eyebrow">Drawing imposter · vote</p><h1>Whose drawing is different?</h1><div className="drawing-gallery">{Object.entries(room.drawings || {}).map(([playerId, drawing]) => <div className="drawing-card" key={playerId}><p>{room.players.find((player) => player.id === playerId)?.name || 'Player'}</p><DrawingCanvas strokes={parseDrawing(drawing)} readOnly /><button className="secondary" onClick={() => vote(playerId)} disabled={playerId === currentPlayer?.id}>Vote for this drawing</button></div>)}</div><p className="counter">{room.votesSubmitted} / {room.activePlayerCount || room.players.length} votes in</p></div>;
}

function parseDrawing(drawing) {
  try {
    const parsed = JSON.parse(drawing);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
        {room.players.filter((player) => !player.left).map((player) => (
          <button key={player.id} onClick={() => emit('round:guess-lie-vote', { targetId: player.id, statementIndex: 0 })}>
            <span className={`avatar color-${player.avatarColor || 'cyan'}`}>{player.avatar}</span>
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
  return <div className="content"><p className="eyebrow">Mystery Room · Vote</p><h1>Who took <em>{room.script?.macguffin}</em>?</h1><div className="vote-list">{room.players.filter((player) => !player.left && room.alive.includes(player.id)).map((player) => <button key={player.id} onClick={() => emit('round:mafia-vote', { targetId: player.id })}><span className={`avatar color-${player.avatarColor || 'cyan'}`}>{player.avatar}</span><strong>{player.name}</strong><span>Vote →</span></button>)}</div><p className="counter">{room.votesSubmitted} / {room.alive.length} votes in</p></div>;
}

export function Results({ results, personalResults, room, returnToLobby, playAgain, chooseAnotherGame, exitGame }) {
  if (room.modeId === 'never-say-do') {
    return <NeverSayDoResults results={results} personalResults={personalResults} room={room} playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} />;
  }
  if (room.modeId === 'mafia-mystery') {
    const culprits = Object.entries(results?.roles || {}).filter(([, role]) => role === 'culprit').map(([id]) => room.players.find((player) => player.id === id)?.name).filter(Boolean);
    return (
      <div className="content">
        <p className="eyebrow">Mystery Room · Case closed</p>
        <h1>{results?.winner === 'culprits' ? 'The culprits escaped.' : 'The innocents solved it.'}</h1>
        <p className="reveal">The culprits were <strong>{culprits.join(', ')}</strong>.</p>
        <Scoreboard room={room} scores={results?.scores} />
        <ResultActions playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} />
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

      <Scoreboard room={room} scores={results?.scores} />
      <ResultActions playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} />
    </div>
  );
}

function NeverSayDoResults({ results, personalResults, room, playAgain, chooseAnotherGame, exitGame }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const questions = results?.questionResults || [];
  const question = questions[index];
  const personal = question ? personalResults?.[question.answers[0]?.playerId] : null;
  const answer = question?.answers[0];
  const finished = index >= questions.length;

  if (finished) {
    return <div className="content"><p className="eyebrow">Round complete</p><h1>The room has spoken.</h1><p className="subtle">Every answer is in. Here is how the room played it.</p><Scoreboard room={room} scores={results?.scores} /><ResultActions playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} /></div>;
  }

  return <div className="content never-results"><p className="eyebrow">Question {index + 1} of {questions.length}</p><h1>Who would never...</h1><p className="never-question">{question.text.replace(/^Who would never\s*/i, '').replace(/\?$/, '')}</p>{!revealed ? <button className="primary" onClick={() => setRevealed(true)}>Reveal the room <span>↓</span></button> : <div className="reveal"><p>And the answer was...</p><h2 className="answer-reveal">🔥 {question.correctPlayerName}</h2><p><strong>{answer?.playerName || personal?.playerName || 'Player'}</strong> chose <strong>{answer?.selectedPlayerName || personal?.selectedPlayerName || 'nobody'}</strong> {answer?.correct ? '✓ +1' : '✕ +0'}</p><button className="primary" onClick={() => { setIndex((value) => value + 1); setRevealed(false); }}>{index === questions.length - 1 ? 'Show scores' : 'Next question'} <span>→</span></button></div>}</div>;
}

function Scoreboard({ room, scores = {} }) {
  return <div className="scores">{Object.entries(scores).map(([id, score]) => {
    const player = room.players.find((item) => item.id === id);
    return <div className={player?.left ? 'player-left' : ''} key={id}><span><span className={`avatar color-${player?.avatarColor || 'cyan'}`}>{player?.left ? '🏃' : player?.avatar}</span> {player?.name}{player?.left ? ' · Left' : ''}</span><strong>{score} pts</strong></div>;
  })}</div>;
}

function ResultActions({ playAgain, chooseAnotherGame, exitGame }) {
  return <div className="result-actions"><button className="primary" onClick={playAgain}>Next Round <span>→</span></button><button className="secondary" onClick={chooseAnotherGame}>Change Game</button><button className="secondary" onClick={exitGame}>Leave Game</button></div>;
}
