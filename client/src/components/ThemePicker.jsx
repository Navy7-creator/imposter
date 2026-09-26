import React, { useState } from 'react';
import { themes } from '../data/gameData';

export default function ThemePicker({ theme, changeTheme }) {
  const [open, setOpen] = useState(false);
  const current = themes.find((item) => item.id === theme) || themes[0];

  return (
    <div className="theme-picker">
      <button
        type="button"
        className="theme-trigger"
        aria-label={`Theme: ${current.name}`}
        title={`Theme: ${current.name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <i style={{ background: current.colors[0] }} />
        <i style={{ background: current.colors[1] }} />
        <i style={{ background: current.colors[2] }} />
      </button>

      {open && (
        <div className="theme-menu" role="listbox">
          {themes.map((item) => (
            <button
              type="button"
              className={theme === item.id ? 'selected' : ''}
              onClick={() => {
                changeTheme(item.id);
                setOpen(false);
              }}
              key={item.id}
            >
              <span className="theme-preview">
                <i style={{ background: item.colors[0] }} />
                <i style={{ background: item.colors[1] }} />
                <i style={{ background: item.colors[2] }} />
              </span>
              <strong>{item.name}</strong>
              {theme === item.id && <b>Active</b>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
