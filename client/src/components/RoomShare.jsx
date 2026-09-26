import React, { useState } from 'react';

export default function RoomShare({ code }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/?room=${code}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my Imposter & Friends room',
          text: `Join room ${code}`,
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      // Sharing was cancelled.
    }
  };

  return (
    <button type="button" className="share-room" onClick={share} title="Share room link">
      {copied ? 'COPIED' : 'SHARE'}
    </button>
  );
}
