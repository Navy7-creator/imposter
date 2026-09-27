import React from 'react';
import ThemePicker from '../ThemePicker';
import AvatarPicker from '../AvatarPicker';

export default function WelcomeScreen({
  form,
  setForm,
  error,
  entryStep,
  setEntryStep,
  entryMode,
  setEntryMode,
  theme,
  changeTheme,
  changeAvatar,
  changeAvatarColor,
  join,
}) {
  return (
    <main className={`shell theme-${theme}`}>
      <div className="masthead">
        <span className="mark">IF</span>
        <span>IMPOSTER & FRIENDS</span>
      </div>

      <section className="join-panel">
        <p className="eyebrow">Welcome to the game hub</p>
        <h1>
          Make a move.
          <br />
          <em>Bring your friends.</em>
        </h1>

        <ThemePicker theme={theme} changeTheme={changeTheme} />

        {entryStep === 'choice' ? (
          <div className="entry-choices">
            <button
              className="entry-card"
              onClick={() => {
                setEntryMode('create');
                setEntryStep('form');
                setForm({ ...form, code: '' });
              }}
            >
              <span className="entry-mark">HOST</span>
              <strong>Create a room</strong>
              <small>Start a new room and become its admin.</small>
            </button>

            <button
              className="entry-card"
              onClick={() => {
                setEntryMode('join');
                setEntryStep('form');
              }}
            >
              <span className="entry-mark">GUEST</span>
              <strong>Join a room</strong>
              <small>Enter a room code shared by the admin.</small>
            </button>
          </div>
        ) : (
          <form noValidate onSubmit={join}>
            <button type="button" className="back-link" onClick={() => setEntryStep('choice')}>
              ← Back
            </button>

            <p className="eyebrow">{entryMode === 'join' ? 'Join a room' : 'Create a room'}</p>

            <label>
              Your name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Casey"
              />
            </label>

            <AvatarPicker
              avatar={form.avatar}
              avatarColor={form.avatarColor}
              setAvatar={changeAvatar}
              setAvatarColor={changeAvatarColor}
            />

            {entryMode === 'join' && (
              <label>
                Room code
                <input
                  autoFocus
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value.toUpperCase() })
                  }
                  placeholder="Enter the admin's code"
                />
              </label>
            )}

            <button className="primary">
              {entryMode === 'join' ? 'Join the room' : 'Create the room'}
            </button>

            {error && <p className="error">{error}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
