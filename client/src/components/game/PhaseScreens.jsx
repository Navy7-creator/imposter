import React, { useState } from 'react';
import ScoringHelp from '../ScoringHelp';

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
  const [guess, setGuess] = useState('');

  return (
    <div className="content">
      <p className="eyebrow">Chain Guess the Number</p>
      <h1>🎯 NUMBER YOU ARE GUARDING <em>(NOT YOUR NUMBER)</em></h1>
      <h2 className="guarded-player-heading">You hold the secret number for: {assignment?.guardedPlayerName}</h2>
      <div className="guarded-number-card"><strong>{assignment?.guardedPlayerName}'s Secret Number: {assignment?.number}</strong></div>
      <p className="guarded-number-warning">⚠️ DO NOT guess this number! Your goal is to deduce YOUR OWN number by asking questions. When {assignment?.guardedPlayerName} correctly guesses this number, confirm it below.</p>
      <p className="subtle">Deduce your own number, then submit your guess. Your guardian will confirm it.</p>

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
        onClick={() => emit('round:guess', { targetId: assignment?.playerId, guess })}
        disabled={!assignment?.playerId || !guess}
      >
        Submit guess
      </button>
    </div>
  );
}

export function GuessNumberConfirmationScreen({ assignment, room, emit }) {
  const [confirming, setConfirming] = useState(false);
  const pending = room.pendingConfirmation;
  const isGuardian = assignment?.guardedPlayerId === pending?.targetId;
  const targetName = pending ? room.players.find((player) => player.id === pending.targetId)?.name : 'the player';

  if (!isGuardian) {
    return <div className="content"><p className="eyebrow">Chain Guess the Number</p><h1>Guess pending confirmation.</h1><p className="subtle">The number guardian is checking whether {targetName} guessed correctly.</p></div>;
  }

  const confirm = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await emit('round:confirm-guess');
  };

  return <div className="content"><p className="eyebrow">Chain Guess the Number · Confirm</p><h1>Did {targetName} guess correctly?</h1><p className="subtle">Confirm that {targetName} guessed {assignment?.number}.</p><button className={`guardian-confirm ${confirming ? 'guardian-confirm-ready' : ''}`} onClick={confirm}>{confirming ? `Tap again to confirm ${targetName}` : `✅ Confirm ${targetName} Guessed Correctly`}</button></div>;
}

export function NeverSayDoQuestionScreen({ assignment, emit }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const question = assignment?.question;

  const submit = async () => {
    const response = await emit('round:answer', { questionId: question.id, answer });
    if (!response?.error) setSubmitted(true);
  };

  return (
    <div className="content never-say-do-screen">
      <p className="eyebrow">Never Say / Do · Your secret answer</p>
      <h1 className="question-heading">{question?.text}</h1>
      <p className="subtle">Answer privately. Later, the room will try to guess who wrote it.</p>
      <label className="answer-label">
        Your answer
        <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength="160" placeholder="A playful answer..." disabled={submitted} />
      </label>
      <button className="primary" onClick={submit} disabled={submitted || !answer.trim()}>
        {submitted ? 'Answer submitted' : 'Submit answer'} <span>→</span>
      </button>
      {submitted && <p className="counter">Answer locked. Waiting for the room...</p>}
    </div>
  );
}

export function NeverSayDoPredictionScreen({ room, assignment, emit, predictionOwnership = [] }) {
  const [index, setIndex] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [submitted, setSubmitted] = useState(new Set());
  const questions = room.predictionQuestions || [];
  const question = questions[index];
  const isOwnAnswer = question && (
    assignment?.question?.id === question.questionId
  );
  const done = !question;

  const submit = async () => {
    const response = await emit('round:prediction', { questionId: question.questionId, selectedPlayerId });
    if (!response?.error) {
      setSubmitted((current) => new Set(current).add(question.questionId));
      setSelectedPlayerId('');
      setIndex((current) => current + 1);
    }
  };

  if (done) return <div className="content"><p className="eyebrow">Predictions locked</p><h1>Everyone has made their guess.</h1><p className="subtle">Waiting for the reveal...</p></div>;

  const cannotVoteMessage = 'You submitted this answer, so you cannot vote on it.';

  return (
    <div className="content never-say-do-screen">
      <p className="eyebrow">WHO WOULD NEVER? · {index + 1} / {questions.length}</p>
      <h1 className="question-heading">{question.predictionText}</h1>
      <div className="answer-card"><strong>{question.answer}</strong></div>
      {isOwnAnswer ? <div className="own-answer-note"><strong>{cannotVoteMessage}</strong><span>Move on to the next answer.</span><button className="primary" onClick={() => { setIndex((current) => current + 1); setSelectedPlayerId(''); }}>Next answer <span>→</span></button></div> : <><p className="subtle">Vote for the player you think this describes:</p><div className="player-choice-list" role="radiogroup" aria-label="Choose the question target">{question.options.map((player) => <button type="button" role="radio" aria-checked={selectedPlayerId === player.id} className={`player-choice ${selectedPlayerId === player.id ? 'selected' : ''}`} key={player.id} onClick={() => setSelectedPlayerId(player.id)}><span className={`avatar color-${player.avatarColor || 'cyan'}`}>{player.avatar}</span><strong>{player.name}</strong><span className="choice-mark">{selectedPlayerId === player.id ? '✓' : '○'}</span></button>)}</div><button className="primary" onClick={submit} disabled={!selectedPlayerId || submitted.has(question.questionId)}>Submit guess <span>→</span></button></>}
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
      <p className="subtle">Draw your clue on the canvas, then submit your drawing when you are ready.</p>
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

export function Results({ results, personalResults, room, returnToLobby, playAgain, chooseAnotherGame, exitGame, backHome }) {
  if (room.modeId === 'never-say-do') {
    return <NeverSayDoResults results={results} personalResults={personalResults} room={room} playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} backHome={backHome} />;
  }
  if (room.modeId === 'guess-number') {
    return <GuessNumberResults results={results} room={room} playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} backHome={backHome} />;
  }
  if (room.modeId === 'mafia-mystery') {
    const culprits = Object.entries(results?.roles || {}).filter(([, role]) => role === 'culprit').map(([id]) => room.players.find((player) => player.id === id)?.name).filter(Boolean);
    return (
      <div className="content">
        <p className="eyebrow">Mystery Room · Case closed</p>
        <h1>{results?.winner === 'culprits' ? 'The culprits escaped.' : 'The innocents solved it.'}</h1>
        <p className="reveal">The culprits were <strong>{culprits.join(', ')}</strong>.</p>
        <Scoreboard room={room} scores={results?.scores} />
        <ResultActions playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} backHome={backHome} />
      </div>
    );
  }

  function GuessNumberResults({ results, room, playAgain, chooseAnotherGame, exitGame }) {
    const winner = room.players.find((player) => player.id === results?.winnerId);
    const target = room.players.find((player) => player.id === results?.winnerTargetId);
    const sortedScores = Object.entries(results?.scores || {}).sort(([, left], [, right]) => right - left);
    const rank = Math.max(1, sortedScores.findIndex(([id]) => id === results?.winnerId) + 1);
    const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';

    return (
      <div className="content">
        <p className="eyebrow">Chain Guess the Number · Scoreboard</p>
        <h1>🎉 {target?.name || 'Player'} Verified! ({rank}{suffix} Place)</h1>
        <p className="reveal"><strong>{winner?.name || 'Player'}</strong> correctly deduced their number, and the guardian confirmed it.</p>
        <Scoreboard room={room} scores={results?.scores} />
        <ResultActions playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} backHome={backHome} />
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
      <ResultActions playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} backHome={backHome} />
    </div>
  );
}

function NeverSayDoResults({ results, personalResults, room, playAgain, chooseAnotherGame, exitGame, backHome }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const questions = results?.questionResults || [];
  const question = questions[index];
  const finished = index >= questions.length;

  if (finished) {
    return <div className="content"><p className="eyebrow">Round complete</p><h1>The room has spoken.</h1><p className="subtle">Every answer is in. Here is how the room played it.</p><Scoreboard room={room} scores={results?.scores} /><ResultActions playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} backHome={backHome} /></div>;
  }

  return <div className="content never-results"><p className="eyebrow">WHO WOULD NEVER? · {index + 1} of {questions.length}</p>{!revealed ? <><h1>The question was:</h1><p className="subtle">{question.questionContext}</p><div className="answer-card"><strong>{question.answer}</strong></div><button className="primary" onClick={() => setRevealed(true)}>Reveal the target <span>↓</span></button></> : <div className="reveal"><p>The question was: <strong>{question.questionContext}</strong></p><p>Target player: <strong>{question.targetName}</strong></p><p>Submitted by: <strong>{question.authorName}</strong></p><div className="prediction-results">{question.predictions.map((prediction) => <p key={prediction.predictorId}><span className={`avatar color-${room.players.find((player) => player.id === prediction.predictorId)?.avatarColor || 'cyan'}`}>{room.players.find((player) => player.id === prediction.predictorId)?.avatar || '😀'}</span> <strong>{prediction.predictorName}</strong> voted for <strong>{prediction.selectedPlayerName}</strong> {prediction.correct ? '✓ +100' : '✕ +0'}</p>)}</div><button className="primary" onClick={() => { setIndex((value) => value + 1); setRevealed(false); }}>{index === questions.length - 1 ? 'Show scores' : 'Next answer'} <span>→</span></button></div>}</div>;
}

function Scoreboard({ room, scores = {} }) {
  return <><div className="scores">{Object.entries(scores).map(([id, score]) => {
    const player = room.players.find((item) => item.id === id);
    return <div className={player?.left ? 'player-left' : ''} key={id}><span><span className={`avatar color-${player?.avatarColor || 'cyan'}`}>{player?.left ? '🏃' : player?.avatar}</span> {player?.name}{player?.left ? ' · Left' : ''}</span><strong>{score} pts</strong></div>;
  })}</div><ScoringHelp /></>;
}

function ResultActions({ playAgain, chooseAnotherGame, exitGame, backHome }) {
  const [seconds, setSeconds] = useState(10);
  React.useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) { window.clearInterval(timer); backHome(); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [backHome]);
  return <><p className="return-countdown">Returning to home screen in {seconds} seconds...</p><div className="result-actions"><button className="primary" onClick={playAgain}>Next Round <span>→</span></button><button className="secondary" onClick={backHome}>Play Again / Back to Home</button><button className="secondary" onClick={chooseAnotherGame}>Change Game</button><button className="secondary" onClick={exitGame}>Leave Game</button></div></>;
}
