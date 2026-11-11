import React, { useEffect, useRef, useState } from 'react';

export default function Chatbox({ room, currentPlayer, emit }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [targetId, setTargetId] = useState('');
  const [excludedIds, setExcludedIds] = useState([]);
  const [unread, setUnread] = useState(0);
  const feedRef = useRef(null);
  const messages = room.chat || [];
  const players = room.players.filter((player) => !player.left && player.id !== currentPlayer?.id);

  useEffect(() => {
    if (expanded) {
      setUnread(0);
      feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
    } else if (messages.length && messages[messages.length - 1].senderId !== currentPlayer?.id) {
      setUnread((count) => count + 1);
    }
  }, [messages.length, expanded, currentPlayer?.id]);

  const send = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    const targetIds = audience === 'WHISPER' ? (targetId ? [targetId] : []) : excludedIds;
    if (!trimmed || (audience === 'WHISPER' && !targetId) || (audience === 'EXCLUDE' && !excludedIds.length)) return;
    const response = await emit('room:chat', { roomId: room.code, text: trimmed, audienceType: audience, targetIds });
    if (!response?.error) {
      setText('');
      if (audience === 'WHISPER') setTargetId('');
      if (audience === 'EXCLUDE') setExcludedIds([]);
    }
  };

  const toggleExcluded = (id) => setExcludedIds((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]);

  return (
    <aside className={`chatbox ${expanded ? 'chatbox-expanded' : ''}`}>
      {!expanded ? (
        <button className="chatbox-pill" type="button" onClick={() => setExpanded(true)} aria-label="Open chat">
          Chat {unread > 0 && <span className="chatbox-badge">{unread}</span>}
        </button>
      ) : (
        <section className="chatbox-panel" aria-label="Game chat">
          <header className="chatbox-header">
            <strong>Room chat</strong>
            <button type="button" className="chatbox-close" onClick={() => setExpanded(false)} aria-label="Collapse chat">×</button>
          </header>
          <div className="chatbox-feed" ref={feedRef}>
            {!messages.length && <p className="chatbox-empty">No messages yet.</p>}
            {messages.map((message) => {
              const whisper = message.audienceType === 'WHISPER';
              const excluded = message.audienceType === 'EXCLUDE';
              const names = message.targetIds.map((id) => room.players.find((player) => player.id === id)?.name).filter(Boolean);
              return (
                <article className="chatbox-message" key={`${message.timestamp}-${message.senderId}`}>
                  <span className={`avatar color-${message.senderAvatarColor || 'cyan'}`}>{message.senderAvatar || '😀'}</span>
                  <div><strong>{message.senderName}</strong>{whisper && <small>[Whisper]</small>}{excluded && <small>[Hidden from {names.join(', ')}]</small>}<p>{message.text}</p></div>
                </article>
              );
            })}
          </div>
          <form className="chatbox-form" onSubmit={send}>
            <select value={audience} onChange={(event) => setAudience(event.target.value)} aria-label="Chat audience">
              <option value="ALL">Everyone</option>
              <option value="WHISPER">Whisper</option>
              <option value="EXCLUDE">Exclude</option>
            </select>
            {audience === 'WHISPER' && <select value={targetId} onChange={(event) => setTargetId(event.target.value)} aria-label="Whisper recipient"><option value="">Choose player</option>{players.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}</select>}
            {audience === 'EXCLUDE' && <div className="chatbox-exclusions">{players.map((player) => <label key={player.id}><input type="checkbox" checked={excludedIds.includes(player.id)} onChange={() => toggleExcluded(player.id)} /> {player.name}</label>)}</div>}
            <div className="chatbox-input-row">
              <input value={text} onChange={(event) => setText(event.target.value)} maxLength="240" placeholder="Say something..." aria-label="Chat message" />
              <button className="primary" type="submit" disabled={!text.trim()}>Send</button>
            </div>
          </form>
        </section>
      )}
    </aside>
  );
}
