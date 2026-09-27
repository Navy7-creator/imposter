import React, { useEffect, useState } from 'react';
import WelcomeScreen from './components/screens/WelcomeScreen';
import RoomScreen from './components/screens/RoomScreen';

export default function App({ socket }) {
  // Core room state that drives the whole game flow.
  const [room, setRoom] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [results, setResults] = useState(null);
  const [personalResults, setPersonalResults] = useState({});

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
    socket.on('room:joined', ({ room: joinedRoom }) => setRoom(joinedRoom));
    socket.on('room:updated', setRoom);
    socket.on('round:assignment', setAssignment);
    socket.on('round:results', setResults);
    socket.on('round:personal-results', setPersonalResults);
  }, [socket]);


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
      setRoom(null);
      setAssignment(null);
      setResults(null);
      socket.disconnect();
    }
  };
  const returnToLobby = () => emit('room:return-lobby');
  const playAgain = () => emit('room:play-again');
  const chooseAnotherGame = async () => {
    await emit('room:return-lobby');
    setSetupStep('game');
  };
  const exitGame = () => emit('room:exit-game');
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
      leaveRoom={leaveRoom}
      returnToLobby={returnToLobby}
      playAgain={playAgain}
      chooseAnotherGame={chooseAnotherGame}
      exitGame={exitGame}
    />
  );
}

