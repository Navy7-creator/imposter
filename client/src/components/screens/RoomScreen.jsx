import React from 'react';
import RoomShare from '../RoomShare';
import GamePicker from '../../features/games/GamePicker';
import CategoryPicker from '../setup/CategoryPicker';
import ClueModePicker from '../setup/ClueModePicker';
import Lobby from '../game/Lobby';
import {
  Descriptions,
  Discussion,
  Voting,
  Results,
  GuessNumberScreen,
  NeverSayDoQuestionScreen,
  DrawingImposterScreen,
  GuessTheLieStatementScreen,
  GuessTheLieVoteScreen,
  MafiaNightScreen,
  MafiaDayScreen,
  MafiaVoteScreen,
  DrawingVotingScreen,
} from '../game/PhaseScreens';

export default function RoomScreen({
  room,
  assignment,
  results,
  personalResults,
  description,
  setDescription,
  error,
  setupStep,
  theme,
  currentPlayer,
  form,
  chooseGame,
  chooseCategories,
  chooseClueMode,
  start,
  submitDescription,
  vote,
  emit,
  leaveRoom,
  returnToLobby,
  playAgain,
  chooseAnotherGame,
  exitGame,
  liveDrawings,
}) {
  return (
    <main className={`shell theme-${theme}`}>
      <header className="topbar">
        <div className="masthead">
          <span className="mark">IF</span>
          <span>IF IMPOSTER AND FRIENDS</span>
        </div>

        <RoomShare code={room.code} />
        <button className="secondary leave-button" onClick={leaveRoom}>Leave Game</button>
        <span className="room-pill">ROOM {room.code}</span>
      </header>

      <section className="game">
        <div className="phase">
          <span>ROUND 01</span>
          <strong>{room.phase.replace('-', ' ')}</strong>
        </div>

        {room.phase === 'lobby' && currentPlayer?.isAdmin && setupStep === 'game' && (
          <GamePicker chooseGame={chooseGame} />
        )}

        {room.phase === 'lobby' && currentPlayer?.isAdmin && setupStep === 'categories' && (
          <CategoryPicker selected={room.categoryIds} chooseCategories={chooseCategories} />
        )}

        {room.phase === 'lobby' && currentPlayer?.isAdmin && setupStep === 'clue' && (
          <ClueModePicker chooseClueMode={chooseClueMode} />
        )}

        {room.phase === 'lobby' && (setupStep === 'ready' || !currentPlayer?.isAdmin) && (
          <Lobby room={room} currentPlayer={currentPlayer} start={start} error={error} emit={emit} leaveRoom={leaveRoom} />
        )}

        {room.phase === 'descriptions' && (
          <Descriptions
            assignment={assignment}
            room={room}
            value={description}
            setValue={setDescription}
            submit={submitDescription}
            clueMode={room.clueMode}
          />
        )}

        {room.phase === 'guessing' && room.modeId === 'guess-number' && (
          <GuessNumberScreen assignment={assignment} room={room} emit={emit} />
        )}

        {room.phase === 'questions' && room.modeId === 'never-say-do' && (
          <NeverSayDoQuestionScreen assignment={assignment} room={room} emit={emit} currentPlayer={currentPlayer} />
        )}

        {room.phase === 'drawing' && room.modeId === 'drawing-imposter' && (
            <DrawingImposterScreen assignment={assignment} room={room} emit={emit} liveDrawings={liveDrawings} currentPlayer={currentPlayer} />
        )}

        {room.phase === 'voting' && room.modeId === 'drawing-imposter' && (
          <DrawingVotingScreen room={room} currentPlayer={currentPlayer} vote={vote} />
        )}

        {room.phase === 'statements' && room.modeId === 'guess-the-lie' && (
          <GuessTheLieStatementScreen room={room} emit={emit} />
        )}

        {room.phase === 'voting' && room.modeId === 'guess-the-lie' && (
          <GuessTheLieVoteScreen room={room} emit={emit} />
        )}

        {room.phase === 'night' && room.modeId === 'mafia-mystery' && (
          <MafiaNightScreen assignment={assignment} room={room} emit={emit} />
        )}

        {room.phase === 'day' && room.modeId === 'mafia-mystery' && (
          <MafiaDayScreen room={room} currentPlayer={currentPlayer} emit={emit} />
        )}

        {room.phase === 'voting' && room.modeId === 'mafia-mystery' && (
          <MafiaVoteScreen room={room} emit={emit} />
        )}

        {room.phase === 'discussion' && (
          <Discussion room={room} startVoting={() => emit('round:start-voting')} />
        )}

        {room.phase === 'voting' && room.modeId === 'aware-imposter' && <Voting room={room} currentPlayer={currentPlayer} vote={vote} error={error} />}
        {room.phase === 'voting' && room.modeId === 'unaware-imposter' && <Voting room={room} currentPlayer={currentPlayer} vote={vote} error={error} />}
        {room.phase === 'results' && <Results results={results} personalResults={personalResults} room={room} returnToLobby={returnToLobby} playAgain={playAgain} chooseAnotherGame={chooseAnotherGame} exitGame={exitGame} />}
        {room.phase === 'ended' && (
          <div className="content">
            <p className="eyebrow">Game ended</p>
            <h1>Not enough players remain.</h1>
            <p className="subtle">At least two active players are needed to start another round.</p>
            {currentPlayer?.isAdmin && <button className="primary" onClick={returnToLobby}>Return to lobby <span>→</span></button>}
            <button className="secondary" onClick={leaveRoom}>Exit game</button>
          </div>
        )}
      </section>
    </main>
  );
}
