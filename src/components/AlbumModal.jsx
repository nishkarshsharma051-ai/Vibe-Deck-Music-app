import React from 'react';

function formatDuration(sec) {
  if (!sec || Number.isNaN(sec)) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function AlbumModal({ isOpen, onClose, album, onPlayTrack }) {
  if (!isOpen || !album) return null;

  const handlePlayAll = () => {
    if (album.tracks && album.tracks.length > 0) {
      onPlayTrack(album.tracks[0], album.tracks);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
      style={{
        animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    >
      <div 
        className="relative w-full max-w-2xl rounded-t-[32px] border-t border-white/10 bg-[#12131a]/95 px-6 pb-12 pt-6 shadow-2xl overflow-y-auto max-h-[85vh] hide-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'nowPlayingSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* Handle bar */}
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-white/20 cursor-pointer" onClick={onClose} />

        {/* Top Header */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#38bdf8]">Album Details</span>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Album Hero Section */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="h-40 w-40 shrink-0 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <img src={album.coverUrl} alt={album.name} className="h-full w-full object-cover" />
          </div>
          <div className="text-center md:text-left min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b3b3b3]">Suggested Album</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-white truncate">{album.name}</h2>
            <p className="mt-2 text-sm font-medium text-[#38bdf8] truncate">{album.artist}</p>
            <p className="mt-1 text-xs text-[#b3b3b3]">{album.tracks?.length || 0} songs</p>
            
            <button
              onClick={handlePlayAll}
              className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#38bdf8] px-6 py-2.5 text-sm font-bold text-black shadow-[0_8px_20px_rgba(56,189,248,0.3)] hover:scale-105 active:scale-95 transition-all mx-auto md:mx-0"
            >
              <span className="material-symbols-outlined text-lg fill-1">play_arrow</span>
              Play Album
            </button>
          </div>
        </div>

        {/* Tracks List */}
        <div className="space-y-1">
          {album.tracks && album.tracks.length > 0 ? (
            album.tracks.map((track, index) => (
              <div 
                key={track.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 transition duration-150"
              >
                <button
                  onClick={() => {
                    onPlayTrack(track, album.tracks);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="w-6 text-center text-xs text-[#b3b3b3] font-mono">{index + 1}</div>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-white/5">
                    <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{track.title}</p>
                    <p className="truncate text-xs text-[#b3b3b3]">{track.artist}</p>
                  </div>
                </button>
                <span className="text-xs text-[#b3b3b3] font-mono pr-2">{formatDuration(track.duration)}</span>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-[#b3b3b3]">
              <span className="material-symbols-outlined text-4xl animate-spin text-[#38bdf8]">autorenew</span>
              <p className="mt-2 text-sm">Fetching tracks...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
