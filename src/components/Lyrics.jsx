import React, { useEffect, useRef } from 'react';

const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
};

const Lyrics = function Lyrics({
  currentTrack,
  currentTime,
  isFetchingLyrics,
  audioRef,
  setCurrentTime
}) {
  const scrollRef = useRef(null);

  const parseLrc = (lyricsText) => {
    if (!lyricsText) return [];
    const cleaned = stripHtml(lyricsText);
    const lines = cleaned.split('\n');
    const lyricsArray = [];

    lines.forEach((line) => {
      const match = line.match(/\[(\d+):(\d+)[.:](\d+)\](.*)/);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const ms = parseInt(match[3]);
        const time = minutes * 60 + seconds + ms / 100;
        const text = match[4].trim();
        if (text) {
          lyricsArray.push({ time, text, synced: true });
        }
      } else {
        const text = line.trim();
        if (text && !line.match(/^\[(?:ti|ar|al|by|offset|length|re|ve):/i)) {
          lyricsArray.push({ time: -1, text, synced: false });
        }
      }
    });

    return lyricsArray.sort((a, b) => {
      if (a.time === -1 && b.time === -1) return 0;
      if (a.time === -1) return 1;
      if (b.time === -1) return -1;
      return a.time - b.time;
    });
  };

  const rawLyrics = currentTrack?.lyrics ? stripHtml(currentTrack.lyrics) : '';
  const lyricsList = parseLrc(currentTrack?.lyrics);
  const isSynced = lyricsList.some((l) => l.synced);
  const isPlainText = rawLyrics && !isSynced && lyricsList.length > 0;

  let activeIndex = -1;
  if (isSynced) {
    for (let i = 0; i < lyricsList.length; i++) {
      if (lyricsList[i].time <= currentTime && lyricsList[i].time !== -1) {
        activeIndex = i;
      }
    }
  }

  useEffect(() => {
    if (scrollRef.current && activeIndex !== -1 && isSynced) {
      const activeEl = scrollRef.current.children[activeIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex, isSynced]);

  // Tap lyric line to seek audio directly (Apple Music Karaoke Tap-to-Seek)
  const handleLineClick = (lineTime) => {
    if (lineTime === undefined || lineTime < 0) return;
    if (setCurrentTime) setCurrentTime(lineTime);
    if (audioRef?.current) {
      audioRef.current.currentTime = lineTime;
    }
  };

  return (
    <div className="px-6 md:px-12 py-10 flex-1 h-full flex flex-col justify-center items-center relative overflow-hidden select-none">
      {/* Dynamic blurred art backdrop */}
      {currentTrack && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none scale-110 transition-all duration-1000"
          style={{
            backgroundImage: `url(${currentTrack.coverUrl})`,
            filter: 'blur(110px)',
            opacity: 0.22,
          }}
        />
      )}

      {currentTrack ? (
        <div className="w-full max-w-3xl flex flex-col h-full relative z-10">
          
          {/* Header track card */}
          <div className="flex items-center gap-4 mb-8 pt-4 pb-4 border-b border-white/8 backdrop-blur-md rounded-2xl px-4 bg-white/5">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-14 h-14 rounded-xl object-cover shadow-2xl flex-shrink-0 border border-white/10"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-white tracking-tight truncate">{currentTrack.title}</h2>
              <p className="text-xs text-[#60a5fa] font-bold truncate mt-0.5">{currentTrack.artist}</p>
            </div>
            {isSynced && (
              <span className="px-3 py-1 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-[#60a5fa] text-[10px] font-black uppercase tracking-wider">
                Tap to Seek
              </span>
            )}
          </div>

          {/* Scrolling Lyrics Box */}
          <div className="flex-1 w-full overflow-y-auto hide-scrollbar pb-36 px-2">
            {isFetchingLyrics ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 animate-pulse">
                <span className="material-symbols-outlined text-5xl text-[#3b82f6] animate-spin">
                  autorenew
                </span>
                <p className="text-xs text-[#b3b3b3] font-bold uppercase tracking-widest">Fetching live lyrics...</p>
              </div>
            ) : isSynced ? (
              <div ref={scrollRef} className="space-y-6 text-left">
                {lyricsList.map((line, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <p
                      key={idx}
                      onClick={() => handleLineClick(line.time)}
                      className={`font-black text-2xl md:text-4xl tracking-tight transition-all duration-300 leading-snug cursor-pointer origin-left ${
                        isActive
                          ? 'text-white scale-[1.03] drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] opacity-100'
                          : 'text-white/35 hover:text-white/80 hover:scale-[1.01]'
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })}
              </div>
            ) : isPlainText ? (
              <div className="space-y-4 text-left">
                {lyricsList.map((line, idx) => (
                  <p
                    key={idx}
                    className="font-black text-2xl md:text-4xl tracking-tight text-white/80 hover:text-white leading-snug"
                  >
                    {line.text || '\u00A0'}
                  </p>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
                <span className="material-symbols-outlined text-6xl text-white/20">blur_on</span>
                <div>
                  <h3 className="text-lg font-black text-white">Lyrics Not Available</h3>
                  <p className="text-xs text-white/40 max-w-xs mx-auto mt-1">
                    Enjoy the raw instrumentation and beats of this track.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4 z-10 py-20">
          <span className="material-symbols-outlined text-6xl text-white/20">lyrics</span>
          <h3 className="text-lg font-black text-white">No Song Playing</h3>
          <p className="text-xs text-white/40 max-w-xs mx-auto">
            Play a track from Home or Search to view live interactive lyrics.
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(Lyrics);
