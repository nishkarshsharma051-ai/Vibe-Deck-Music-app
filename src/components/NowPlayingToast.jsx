import React, { useEffect, useState, useRef } from 'react';

/**
 * NowPlayingToast — appears at the top of the screen for 3s when a new track starts.
 */
export default function NowPlayingToast({ track, accentColor }) {
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);
  const prevTrackId = useRef(null);

  useEffect(() => {
    if (!track || track.id === prevTrackId.current) return;
    prevTrackId.current = track.id;

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Mount then animate in
    setVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShow(true));
    });

    // Animate out after 3s
    timerRef.current = setTimeout(() => {
      setShow(false);
      timerRef.current = setTimeout(() => setVisible(false), 400);
    }, 3200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [track?.id]);

  if (!visible || !track) return null;

  const bgColor = accentColor
    ? `hsl(${accentColor.h}, ${Math.min(accentColor.s, 55)}%, 12%)`
    : '#161616';

  return (
    <div
      className={`fixed top-[env(safe-area-inset-top,0px)] left-0 right-0 z-[200] flex justify-center px-4 transition-all duration-400 ease-out pointer-events-none`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}
    >
      <div
        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 shadow-2xl border border-white/10 max-w-sm w-full transition-all duration-400 ease-out
          ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}
        style={{
          background: bgColor,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Album art */}
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-lg"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white/60 text-lg">music_note</span>
          </div>
        )}

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate leading-tight">{track.title}</p>
          <p className="text-white/60 text-xs truncate mt-0.5">{track.artist}</p>
        </div>

        {/* Playing indicator */}
        <div className="flex items-end gap-[3px] shrink-0 h-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-[3px] rounded-full animate-soundBar"
              style={{
                height: `${12 + i * 4}px`,
                background: accentColor ? accentColor.hsl : '#38bdf8',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
