import React, { useState } from 'react';

const avatarGroups = {
  Classic: ['😀', '😎', '🤓', '😈', '🥳', '🤠', '👻', '🤖', '🐸', '🐱', '🐼', '🦊', '🐵', '🦄', '🐙', '🦖'],
  'Mystery / Game': ['🎭', '🕵️', '🥸', '👁️', '🗿', '👻', '💀', '🤡', '🧙', '🧛'],
  Animals: ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🐯', '🦁', '🐨', '🐰', '🐻'],
  Objects: ['🚀', '⭐', '🌙', '🔥', '⚡', '🎮', '🎲', '🎯', '👑', '💎'],
  'Food / Funny': ['🍕', '🍔', '🌮', '🍩', '🍟', '🍉', '🥔', '🥒', '🍌', '🧀'],
};

const colors = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'white'];

export default function AvatarPicker({ avatar, avatarColor, setAvatar, setAvatarColor }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="avatar-customizer">
      <p className="picker-label">Your avatar</p>
      <div className="avatar-current"><span className={`avatar color-${avatarColor}`}>{avatar}</span><button type="button" className="secondary" onClick={() => setOpen((value) => !value)}>{open ? 'Close' : 'Change'}</button></div>
      {open && <div className="avatar-menu">
        {Object.entries(avatarGroups).map(([group, options]) => (
          <div className="avatar-group" key={group}>
            <small>{group}</small>
            <div className="avatar-options">
              {options.map((option) => <button type="button" className={avatar === option ? 'selected' : ''} aria-label={`Choose ${option}`} key={option} onClick={() => { setAvatar(option); setOpen(false); }}>{option}</button>)}
            </div>
          </div>
        ))}
        <button type="button" className="secondary" onClick={() => setOpen(false)}>Done</button>
      </div>}
      <p className="picker-label">Choose your color</p>
      <div className="color-options">
        {colors.map((color) => (
          <button
            type="button"
            className={`color-swatch color-${color} ${avatarColor === color ? 'selected' : ''}`}
            aria-label={`Choose ${color}`}
            key={color}
            onClick={() => setAvatarColor(color)}
          />
        ))}
      </div>
    </div>
  );
}
