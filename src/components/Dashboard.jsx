import React, { useEffect, useMemo, useState, useCallback } from 'react';

const MOODS = [
  { id: 'chill',    label: 'Chill',     icon: 'nights_stay',      query: 'chill lofi relax'       },
  { id: 'energy',   label: 'Energetic', icon: 'bolt',             query: 'energetic pump workout'  },
  { id: 'focus',    label: 'Focus',     icon: 'self_improvement', query: 'study focus concentration'},
  { id: 'party',    label: 'Party',     icon: 'celebration',      query: 'party dance hits'         },
  { id: 'romance',  label: 'Romance',   icon: 'favorite',         query: 'love romantic songs'      },
  { id: 'sad',      label: 'Sad',       icon: 'cloud_queue',       query: 'sad emotional heartbreak' },
];

function isTrackPlayable(track) {
  if (!track || !track.title) return false;
  if (track.title.startsWith('http://') || track.title.startsWith('https://')) return false;
  return Boolean(
    track.url || track.hlsUrl || track.trackId ||
    track.source === 'gaana' || track.source === 'jiosaavn' || track.isLocal
  );
}

function Shelf({ title, items, onPlayTrack }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
      </div>
      <div className="shelf-scroll flex gap-4 overflow-x-auto pb-1 hide-scrollbar">
        {items.map((track) => (
          <button
            key={track.id}
            onClick={() => onPlayTrack(track, items)}
            className="group w-36 shrink-0 text-left active:scale-[0.98] cursor-pointer"
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#181818] shadow-xl">
              <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
              <div className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#38bdf8] text-black opacity-100 shadow-[0_10px_20px_rgba(56,189,248,0.32)]">
                <span className="material-symbols-outlined font-black">play_arrow</span>
              </div>
            </div>
            <p className="mt-3 truncate text-sm font-semibold text-white">{track.title}</p>
            <p className="truncate text-xs text-[#b3b3b3]">{track.artist}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function AlbumShelf({ title, items, onPlayAlbum }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
      </div>
      <div className="shelf-scroll flex gap-4 overflow-x-auto pb-1 hide-scrollbar">
        {items.map((album, idx) => (
          <button
            key={idx}
            onClick={() => onPlayAlbum && onPlayAlbum(album)}
            className="group w-36 shrink-0 text-left active:scale-[0.98] cursor-pointer"
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#181818] shadow-xl">
              <img src={album.img} alt={album.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            </div>
            <p className="mt-3 truncate text-sm font-semibold text-white">{album.name}</p>
            <p className="truncate text-xs text-[#b3b3b3]">{album.artist}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function MoodChips({ onPlayTrack, accentColor }) {
  const [activeMood, setActiveMood] = useState(null);
  const [loadingMood, setLoadingMood] = useState(null);

  const handleMoodClick = useCallback(async (mood) => {
    if (loadingMood) return;
    setActiveMood(mood.id);
    setLoadingMood(mood.id);

    try {
      // Try Gaana first
      const GAANA_API_BASE = 'https://gaana-api-pied.vercel.app/api';
      let tracks = [];

      try {
        const res = await fetch(`${GAANA_API_BASE}/search/songs?q=${encodeURIComponent(mood.query)}&limit=12`);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.length) {
            tracks = json.data.map(item => ({
              id: `gaana-${item.track_id}`,
              trackId: item.track_id,
              seoKey: item.seokey,
              title: item.title,
              artist: item.artists || 'Unknown Artist',
              album: item.album || '',
              duration: item.duration ? Number(item.duration) : 240,
              coverUrl: item.artworkUrl || '',
              url: '', hlsUrl: '',
              genre: mood.label,
              source: 'gaana',
              playbackMode: 'audio',
              isItunes: false,
              youtubeId: null,
            }));
          }
        }
      } catch { /* fall through */ }

      // Fallback to JioSaavn
      if (!tracks.length) {
        const res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(mood.query)}&limit=12`);
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.results?.length) {
            tracks = data.data.results.map(item => ({
              id: `jiosaavn-${item.id}`,
              title: item.name?.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'") || '',
              artist: item.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist',
              album: item.album?.name || '',
              coverUrl: item.image?.find(i => i.quality === '500x500')?.url || item.image?.[0]?.url || '',
              url: item.downloadUrl?.find(d => d.quality === '320kbps')?.url || item.downloadUrl?.[0]?.url || '',
              duration: item.duration ? Number(item.duration) : 240,
              genre: mood.label,
              source: 'jiosaavn',
              playbackMode: 'audio',
              isItunes: false,
              youtubeId: null,
            }));
          }
        }
      }

      if (tracks.length > 0 && typeof onPlayTrack === 'function') {
        try {
          await onPlayTrack(tracks[0], tracks);
        } catch (playErr) {
          console.warn('Failed to start mood playback:', playErr);
        }
      }
    } catch (err) {
      console.warn('Mood fetch failed:', err);
    } finally {
      setLoadingMood(null);
    }
  }, [loadingMood, onPlayTrack]);

  const accentH = accentColor?.h ?? 200;
  const accentS = Math.min(accentColor?.s ?? 80, 65);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black tracking-tight text-white">Play by mood</h2>
      <div className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar">
        {MOODS.map((mood) => {
          const isActive = activeMood === mood.id;
          const isLoading = loadingMood === mood.id;

          return (
            <button
              key={mood.id}
              onClick={() => handleMoodClick(mood)}
              disabled={!!loadingMood}
              className={`flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 border
                ${isActive
                  ? 'text-black scale-105 shadow-lg'
                  : 'bg-white/8 border-white/10 text-white/80 hover:bg-white/14 hover:text-white'
                }`}
              style={isActive ? {
                background: `hsl(${accentH}, ${accentS}%, 58%)`,
                borderColor: `hsl(${accentH}, ${accentS}%, 58%)`,
                boxShadow: `0 8px 24px hsla(${accentH}, ${accentS}%, 50%, 0.35)`,
              } : {}}
            >
              <span className={`material-symbols-outlined text-base ${isLoading ? 'animate-spin' : ''}`}>
                {isLoading ? 'autorenew' : mood.icon}
              </span>
              {mood.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Dashboard({
  onPlayTrack,
  onPlayAlbum,
  history = [],
  recommendations = [],
  suggestedSongs = [],
  suggestedAlbums = [],
  isOnline = true,
  accentColor = null,
}) {
  const [greeting, setGreeting] = useState('Good evening');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const quickPicks = useMemo(() => {
    let base = history.filter(isTrackPlayable);
    if (!isOnline) base = base.filter(t => t.isLocal);
    return base.slice(0, 6);
  }, [history, isOnline]);

  const recentlyPlayed = useMemo(() => {
    let base = history.filter(isTrackPlayable);
    if (!isOnline) base = base.filter(t => t.isLocal);
    return base.slice(0, 8);
  }, [history, isOnline]);

  // Build hero gradient dynamically from accentColor
  const heroBg = accentColor
    ? `linear-gradient(180deg, hsl(${accentColor.h}, ${Math.min(accentColor.s, 55)}%, 22%) 0%, hsl(${accentColor.h}, ${Math.min(accentColor.s, 35)}%, 10%) 28%, #121212 55%, #000 80%)`
    : 'linear-gradient(180deg,#0c4a6e 0%,#082f49 14%,#121212 28%,#000 62%)';

  return (
    <div
      className="min-h-full px-4 pb-28 pt-2 text-white transition-[background] duration-700"
      style={{ background: heroBg }}
    >
      <div className="mb-6">
        <h1 className="mt-1 text-[2.15rem] font-black leading-none tracking-tight">{greeting}</h1>
      </div>

      {!isOnline && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-3.5 py-1 text-xs text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          Offline Mode
        </div>
      )}

      {quickPicks.length > 0 && (
        <section className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickPicks.map((track) => (
            <button
              key={track.id}
              onClick={() => onPlayTrack(track, quickPicks)}
              className="flex min-h-[64px] items-center overflow-hidden rounded-md bg-white/10 text-left backdrop-blur-sm active:scale-[0.98] active:bg-white/14 cursor-pointer"
            >
              <img src={track.coverUrl} alt={track.title} className="h-16 w-16 object-cover" />
              <span className="px-3 text-[0.95rem] font-bold leading-tight text-white line-clamp-2">{track.title}</span>
            </button>
          ))}
        </section>
      )}

      {!isOnline && quickPicks.length === 0 && (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-center my-6">
          <span className="material-symbols-outlined text-4xl text-white/40 mb-3">cloud_off</span>
          <h3 className="text-lg font-black">You are Offline</h3>
          <p className="text-sm text-[#b3b3b3] mt-2">
            No offline history yet. Import audio files in your Library tab to play them anywhere, anytime.
          </p>
        </div>
      )}

      {/* 🎵 Mood Quick-Play */}
      {isOnline && (
        <div className="mt-8">
          <MoodChips onPlayTrack={onPlayTrack} accentColor={accentColor} />
        </div>
      )}

      {isOnline && suggestedSongs.length > 0 && (
        <div className="mt-8">
          <Shelf title="Suggested songs" items={suggestedSongs} onPlayTrack={onPlayTrack} />
        </div>
      )}

      {isOnline && suggestedAlbums.length > 0 && (
        <div className="mt-8">
          <AlbumShelf title="Suggested albums" items={suggestedAlbums} onPlayAlbum={onPlayAlbum} />
        </div>
      )}

      {recentlyPlayed.length > 0 && (
        <div className="mt-8">
          <Shelf title="Recently played" items={recentlyPlayed} onPlayTrack={onPlayTrack} />
        </div>
      )}
    </div>
  );
}
