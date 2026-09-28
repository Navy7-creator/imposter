import React, { useEffect, useState } from 'react';
import WelcomeScreen from './components/screens/WelcomeScreen';
import RoomScreen from './components/screens/RoomScreen';

export default function App({ socket }) {
  // Core room state that drives the whole game flow.
  const [room, setRoom] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [results, setResults] = useState(null);
  const [personalResults, setPersonalResults] = useState({});
  const [showSplash, setShowSplash] = useState(true);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [liveDrawings, setLiveDrawings] = useState({});
  const [predictionOwnership, setPredictionOwnership] = useState([]);

  // Player form + session values used before joining a room.
  const [form, setForm] = useState(() => ({
    code: new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '',
    name: '',
    playerId: sessionStorage.getItem('imposter-tab-id') || crypto.randomUUID(),
    avatar: localStorage.getItem('imposter-avatar') || '😀',
    avatarColor: localStorage.getItem('imposter-avatar-color') || 'cyan',
  }));

  // Round-specific values for submissions and errors.
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Setup flow keeps the host's configuration steps easy to follow.
  const [setupStep, setSetupStep] = useState('game');
  const [entryStep, setEntryStep] = useState('choice');
  const [entryMode, setEntryMode] = useState('create');
  const [theme, setTheme] = useState(() => localStorage.getItem('imposter-theme') || 'neon-canteen');

  useEffect(() => {
    const joined = ({ room: joinedRoom }) => { setRoom(joinedRoom); setLiveDrawings(joinedRoom.liveDrawings || {}); };
    const updated = (nextRoom) => { setRoom(nextRoom); setLiveDrawings(nextRoom.liveDrawings || {}); };
    const assigned = (nextAssignment) => setAssignment(nextAssignment);
    const roundResults = (nextResults) => setResults(nextResults);
    const personal = (nextResults) => setPersonalResults(nextResults);
    const predictionOwner = ({ questionIds }) => setPredictionOwnership(questionIds || []);
    const drawingStroke = ({ playerId, stroke }) => {
      if (playerId === form.playerId) return;
      setLiveDrawings((current) => {
        if (stroke?.type === 'clear') return { ...current, [playerId]: [] };
        if (stroke?.type === 'start') return { ...current, [playerId]: [...(current[playerId] || []), { strokeId: stroke.strokeId, points: [stroke.point], color: stroke.color, erase: stroke.erase }] };
        if (stroke?.type === 'move') return { ...current, [playerId]: (current[playerId] || []).map((item) => item.strokeId === stroke.strokeId ? { ...item, points: [...item.points, stroke.point] } : item) };
        return current;
      });
    };
    socket.on('room:joined', joined);
    socket.on('room:updated', updated);
    socket.on('round:assignment', assigned);
    socket.on('round:results', roundResults);
    socket.on('round:personal-results', personal);
    socket.on('round:prediction-ownership', predictionOwner);
    socket.on('round:drawing:stroke', drawingStroke);
    return () => {
      socket.off('room:joined', joined);
      socket.off('room:updated', updated);
      socket.off('round:assignment', assigned);
      socket.off('round:results', roundResults);
      socket.off('round:personal-results', personal);
      socket.off('round:prediction-ownership', predictionOwner);
      socket.off('round:drawing:stroke', drawingStroke);
    };
  }, [socket, form.playerId]);


  // Shared socket helper keeps all event calls consistent and error-aware.
  const emit = (event, payload = {}) =>
    new Promise((resolve) => {
      socket.emit(event, payload, (response) => {
        if (response?.error) {
          setError(response.error);
        } else {
          setError('');
        }
        resolve(response);
      });
    });

  // Join flow is separated so it is easier to debug entry validation.
  const join = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Your name is missing. Even aliases count.');
      return;
    }

    if (entryMode === 'join' && !form.code.trim()) {
      setError('Enter the room code first. The room cannot read minds.');
      return;
    }

    sessionStorage.setItem('imposter-tab-id', form.playerId);
    socket.connect();

    const response = await emit('room:join', form);
    if (response?.room) setRoom(response.room);
  };

  // Round actions are grouped by responsibility.
  const start = () => emit('round:start');
  const submitDescription = async () => {
    await emit('round:description', { description });
    setDescription('');
  };
  const leaveRoom = async () => {
    const response = await emit('room:leave');
    if (!response?.error) {
      setConfirmLeave(false);
      setShowSplash(false);
      setRoom(null);
      setAssignment(null);
      setResults(null);
      setLiveDrawings({});
      setPredictionOwnership([]);
      socket.disconnect();
    }
  };
  const requestLeave = () => setConfirmLeave(true);
  const returnToLobby = () => emit('room:return-lobby');
  const playAgain = () => emit('room:play-again');
  const chooseAnotherGame = async () => {
    await emit('room:return-lobby');
    setSetupStep('game');
  };
  const exitGame = requestLeave;
  const vote = (targetId) => emit('round:vote', { targetId });
  const chooseGame = async (modeId) => {
    await emit('room:mode', { modeId });
    setSetupStep(modeId.includes('imposter') ? 'categories' : 'ready');
  };
  const chooseCategories = async (categoryIds) => {
    await emit('room:categories', { categoryIds });
    setSetupStep('clue');
  };
  const chooseClueMode = async (clueMode) => {
    await emit('room:clue-mode', { clueMode });
    setSetupStep('ready');
  };
  const changeTheme = (themeId) => {
    setTheme(themeId);
    localStorage.setItem('imposter-theme', themeId);
  };
  const changeAvatar = (avatar) => {
    setForm((current) => ({ ...current, avatar }));
    localStorage.setItem('imposter-avatar', avatar);
  };
  const changeAvatarColor = (avatarColor) => {
    setForm((current) => ({ ...current, avatarColor }));
    localStorage.setItem('imposter-avatar-color', avatarColor);
  };

  if (showSplash && !room) {
    return <SplashScreen onPlay={() => setShowSplash(false)} />;
  }

  if (!room) {
    return (
      <WelcomeScreen
        form={form}
        setForm={setForm}
        error={error}
        entryStep={entryStep}
        setEntryStep={setEntryStep}
        entryMode={entryMode}
        setEntryMode={setEntryMode}
        theme={theme}
        changeTheme={changeTheme}
        changeAvatar={changeAvatar}
        changeAvatarColor={changeAvatarColor}
        join={join}
      />
    );
  }

  const currentPlayer = room.players.find((player) => player.id === form.playerId);

  return (
    <>
      <RoomScreen
      room={room}
      assignment={assignment}
      results={results}
      personalResults={personalResults}
      description={description}
      setDescription={setDescription}
      error={error}
      setupStep={setupStep}
      theme={theme}
      currentPlayer={currentPlayer}
      form={form}
      chooseGame={chooseGame}
      chooseCategories={chooseCategories}
      chooseClueMode={chooseClueMode}
      start={start}
      submitDescription={submitDescription}
      vote={vote}
      emit={emit}
      leaveRoom={requestLeave}
      returnToLobby={returnToLobby}
      playAgain={playAgain}
      chooseAnotherGame={chooseAnotherGame}
        exitGame={exitGame}
        liveDrawings={liveDrawings}
        predictionOwnership={predictionOwnership}
      />
      {confirmLeave && <LeaveDialog cancel={() => setConfirmLeave(false)} leave={leaveRoom} />}
    </>
  );
}

function SplashScreen({ onPlay }) {
  return <main className="splash theme-neon-canteen"><div className="splash-art" aria-hidden="true"><span>👁️</span><span>🎭</span><span>🕵️</span></div><p className="splash-kicker">A party game of clues, chaos, and suspicion</p><h1>IF Imposter<br /><em>and Friends</em></h1><div className="splash-orbit" aria-hidden="true"><span>?</span><span>🤫</span><span>🔍</span></div><button className="primary splash-play" onClick={onPlay}>Play <span>→</span></button></main>;
}

function LeaveDialog({ cancel, leave }) {
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="leave-title"><p className="eyebrow">Exit room</p><h2 id="leave-title">Leave game?</h2><p>Are you sure you want to leave IF Imposter and Friends?</p><div><button className="secondary" onClick={cancel}>Cancel</button><button className="primary" onClick={leave}>Leave Game</button></div></section></div>;
}

