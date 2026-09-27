import React from 'react';

const avatarGroups = {
  Classic: ['😀', '😎', '🤓', '😈', '🥳', '🤠', '👻', '🤖', '🐸', '🐱', '🐼', '🦊', '🐵', '🦄', '🐙', '🦖'],
  'Mystery / Game': ['🎭', '🕵️', '🥸', '👁️', '🗿', '👻', '💀', '🤡', '🧙', '🧛'],
  Animals: ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🐯', '🦁', '🐨', '🐰', '🐻'],
  Objects: ['🚀', '⭐', '🌙', '🔥', '⚡', '🎮', '🎲', '🎯', '👑', '💎'],
  'Food / Funny': ['🍕', '🍔', '🌮', '🍩', '🍟', '🍉', '🥔', '🥒', '🍌', '🧀'],
};

const colors = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'white'];

export default function AvatarPicker({ avatar, avatarColor, setAvatar, setAvatarColor }) {
  return (
    <div className="avatar-customizer">
      <p className="picker-label">Choose your avatar</p>
      {Object.entries(avatarGroups).map(([group, options]) => (
        <div className="avatar-group" key={group}>
          <small>{group}</small>
          <div className="avatar-options">
            {options.map((option) => (
              <button
                type="button"
                className={avatar === option ? 'selected' : ''}
                aria-label={`Choose ${option}`}
                key={option}
                onClick={() => setAvatar(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
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
