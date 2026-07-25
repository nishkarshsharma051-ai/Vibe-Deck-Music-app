import React, { useRef, useState, useCallback } from 'react';

/**
 * ShareCard — beautiful full-screen modal that lets users share the current track.
 * Uses the Web Share API if available, otherwise copies to clipboard or downloads the card.
 */
export default function ShareCard({ track, isOpen, onClose, accentColor }) {
  const cardRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const shareText = `🎵 Listening to "${track?.title}" by ${track?.artist} on Vibe Deck`;
      const shareUrl = 'https://vibedeck.app';

      if (navigator.share) {
        await navigator.share({
          title: `${track?.title} — Vibe Deck`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        // Fallback silent fail
        console.warn('Share failed:', err);
      }
    } finally {
      setSharing(false);
    }
  }, [track]);

  if (!isOpen || !track) return null;

  const accentH = accentColor?.h ?? 200;
  const accentS = Math.min(accentColor?.s ?? 80, 70);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mb-8 rounded-3xl overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card preview */}
        <div
          ref={cardRef}
          className="relative flex flex-col items-center p-6 gap-5"
          style={{
            background: `linear-gradient(160deg, hsl(${accentH}, ${accentS}%, 18%) 0%, hsl(${accentH}, ${accentS}%, 8%) 60%, #000 100%)`,
          }}
        >
          {/* Decorative orb */}
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: `hsl(${accentH}, ${accentS}%, 60%)` }}
          />

          {/* Album art */}
          <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            {track.coverUrl ? (
              <img
                src={track.coverUrl}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-white/40">album</span>
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="text-center z-10">
            <p className="text-white font-black text-xl leading-tight">{track.title}</p>
            <p className="text-white/70 text-sm mt-1">{track.artist}</p>
            {track.album && <p className="text-white/40 text-xs mt-0.5">{track.album}</p>}
          </div>

          {/* Vibe Deck badge */}
          <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 z-10">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-black text-[10px] font-black"
              style={{ background: `hsl(${accentH}, ${accentS}%, 60%)` }}
            >
              ♪
            </div>
            <span className="text-white/80 text-xs font-semibold tracking-wide">Playing on Vibe Deck</span>
          </div>

          {/* Sound bars decoration */}
          <div className="flex items-end gap-1 absolute bottom-5 left-6 opacity-30">
            {[10, 18, 14, 22, 12, 8, 16].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full"
                style={{ height: `${h}px`, background: `hsl(${accentH}, ${accentS}%, 70%)` }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex flex-col gap-3 p-5 border-t border-white/8"
          style={{ background: '#111' }}
        >
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2 rounded-full py-3.5 font-bold text-sm text-black transition-all active:scale-95 disabled:opacity-60"
            style={{ background: `hsl(${accentH}, ${accentS}%, 62%)` }}
          >
            <span className="material-symbols-outlined text-base">
              {copied ? 'check_circle' : sharing ? 'hourglass_top' : navigator.share ? 'share' : 'content_copy'}
            </span>
            {copied ? 'Copied to clipboard!' : sharing ? 'Sharing...' : navigator.share ? 'Share Now' : 'Copy Link'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 text-white/50 text-sm font-semibold hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
