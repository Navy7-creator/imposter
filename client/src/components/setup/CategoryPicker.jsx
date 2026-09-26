import React, { useState } from 'react';
import { categories } from '../../data/gameData';

export default function CategoryPicker({ selected = ['everyday-objects'], chooseCategories }) {
  const [choices, setChoices] = useState(selected);

  const toggle = (id) =>
    setChoices((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  const save = async () => {
    if (choices.length) {
      await chooseCategories(choices);
    }
  };

  return (
    <div className="setup-screen">
      <p className="eyebrow">Room setup · step 2 of 3</p>
      <h1>Pick your worlds.</h1>
      <p className="subtle">Choose one or more categories. The round will draw from your selection.</p>

      <div className="category-grid">
        {categories.map(([id, name]) => (
          <button
            className={`category-card ${choices.includes(id) ? 'selected' : ''}`}
            key={id}
            onClick={() => toggle(id)}
          >
            <span>{choices.includes(id) ? '✓' : '+'}</span>
            <strong>{name}</strong>
          </button>
        ))}
      </div>

      <button className="primary" onClick={save} disabled={!choices.length}>
        Choose clue style <span>→</span>
      </button>
    </div>
  );
}
