import React, { useEffect, useMemo, useState, useCallback } from 'react';

const MOODS = [
  { id: 'chill',   label: 'Chill',    icon: 'nights_stay',      query: 'chill lofi relax',           color: '#5AC8FA' },
  { id: 'energy',  label: 'Energy',   icon: 'bolt',             query: 'energetic pump workout',     color: '#FF9F0A' },
  { id: 'focus',   label: 'Focus',    icon: 'self_improvement', query: 'study focus concentration',  color: '#32D74B' },
  { id: 'party',   label: 'Party',    icon: 'celebration',      query: 'party dance hits',           color: '#BF5AF2' },
  { id: 'romance', label: 'Romance',  icon: 'favorite',         query: 'love romantic songs',        color: '#FF375F' },
  { id: 'sad',     label: 'Sad',      icon: 'cloud_queue',      query: 'sad emotional heartbreak',   color: '#64D2FF' },
];

function isTrackPlayable(track) {
  if (!track || !track.title) return false;
  if (track.title.startsWith('http://') || track.title.startsWith('https://')) return false;
  return Boolean(
    track.url || track.hlsUrl || track.trackId ||
    track.source === 'gaana' || track.source === 'jiosaavn' || track.isLocal
  );
}

/* ── Apple Music-style horizontal shelf ── */
function Shelf({ title, items, onPlayTrack }) {
  return (
    <section className="space-y-3 animate-cardReveal">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-[17px] font-bold tracking-tight text-white">{title}</h2>
        <button className="text-[13px] font-semibold text-[#0A84FF] hover:opacity-70 transition-opacity">
          See All
        </button>
      </div>
      <div className="shelf-scroll flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-1 px-1">
        {items.map((track, idx) => (
          <button
            key={track.id}
            onClick={() => onPlayTrack(track, items)}
            className="track-card group w-[148px] shrink-0 text-left cursor-pointer apple-press"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {/* Album art */}
            <div className="relative aspect-square overflow-hidden rounded-[12px] bg-[#1C1C1E] shadow-xl group-hover:shadow-2xl transition-shadow duration-200">
              <img
                src={track.coverUrl}
                alt={track.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              {/* Play button */}
              <div className="play-btn absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full shadow-lg"
                style={{ background: 'rgba(10, 132, 255, 0.92)', backdropFilter: 'blur(8px)' }}>
                <span className="material-symbols-outlined text-white font-black text-[16px]">play_arrow</span>
              </div>
            </div>
            <p className="mt-2 truncate text-[13px] font-semibold text-white leading-snug">{track.title}</p>
            <p className="truncate text-[12px]" style={{ color: 'rgba(235,235,245,0.50)' }}>{track.artist}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function AlbumShelf({ title, items, onPlayAlbum }) {
  return (
    <section className="space-y-3 animate-cardReveal">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-[17px] font-bold tracking-tight text-white">{title}</h2>
        <button className="text-[13px] font-semibold text-[#0A84FF] hover:opacity-70 transition-opacity">
          See All
        </button>
      </div>
      <div className="shelf-scroll flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-1 px-1">
        {items.map((album, idx) => (
          <button
            key={idx}
            onClick={() => onPlayAlbum && onPlayAlbum(album)}
            className="track-card group w-[148px] shrink-0 text-left cursor-pointer apple-press"
          >
            <div className="relative aspect-square overflow-hidden rounded-[12px] bg-[#1C1C1E] shadow-xl group-hover:shadow-2xl transition-shadow duration-200">
              <img
                src={album.img}
                alt={album.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
            <p className="mt-2 truncate text-[13px] font-semibold text-white leading-snug">{album.name}</p>
            <p className="truncate text-[12px]" style={{ color: 'rgba(235,235,245,0.50)' }}>{album.artist}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── Mood chips — Apple pill style ── */
function MoodChips({ onPlayTrack }) {
  const [activeMood, setActiveMood] = useState(null);
  const [loadingMood, setLoadingMood] = useState(null);

  const handleMoodClick = useCallback(async (mood) => {
    if (loadingMood) return;
    setActiveMood(mood.id);
    setLoadingMood(mood.id);

    try {
      const GAANA_API_BASE = 'https://gaana-api-pied.vercel.app/api';
      let tracks = [];

      try {
        const res = await fetch(`${GAANA_API_BASE}/search/songs?q=${encodeURIComponent(mood.query)}&limit=12`);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.length) {
            tracks = json.data.map(item => ({
              id: `gaana-${item.track_id}`, trackId: item.track_id, seoKey: item.seokey,
              title: item.title, artist: item.artists || 'Unknown Artist',
              album: item.album || '', duration: item.duration ? Number(item.duration) : 240,
              coverUrl: item.artworkUrl || '', url: '', hlsUrl: '',
              genre: mood.label, source: 'gaana', playbackMode: 'audio',
              isItunes: false, youtubeId: null,
            }));
          }
        }
      } catch { /* fall through */ }

      if (!tracks.length) {
        const res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(mood.query)}&limit=12`);
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.results?.length) {
            tracks = data.data.results.map(item => ({
              id: `jiosaavn-${item.id}`,
              title: item.name?.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#039;/g,"'") || '',
              artist: item.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist',
              album: item.album?.name || '',
              coverUrl: item.image?.find(i => i.quality === '500x500')?.url || item.image?.[0]?.url || '',
              url: item.downloadUrl?.find(d => d.quality === '320kbps')?.url || item.downloadUrl?.[0]?.url || '',
              duration: item.duration ? Number(item.duration) : 240,
              genre: mood.label, source: 'jiosaavn', playbackMode: 'audio',
              isItunes: false, youtubeId: null,
            }));
          }
        }
      }

      if (tracks.length > 0 && typeof onPlayTrack === 'function') {
        await onPlayTrack(tracks[0], tracks);
      }
    } catch (err) {
      console.warn('Mood fetch failed:', err);
    } finally {
      setLoadingMood(null);
    }
  }, [loadingMood, onPlayTrack]);

  return (
    <section className="space-y-3">
      <h2 className="text-[17px] font-bold tracking-tight text-white px-0.5">Play by Mood</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {MOODS.map((mood) => {
          const isActive = activeMood === mood.id;
          const isLoading = loadingMood === mood.id;
          return (
            <button
              key={mood.id}
              onClick={() => handleMoodClick(mood)}
              disabled={!!loadingMood}
              className="relative flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-[14px] transition-all duration-150 cursor-pointer apple-press overflow-hidden"
              style={{
                background: isActive
                  ? `${mood.color}22`
                  : 'rgba(44, 44, 46, 0.70)',
                border: isActive
                  ? `1px solid ${mood.color}55`
                  : '1px solid rgba(84, 84, 88, 0.30)',
                boxShadow: isActive ? `0 0 0 1px ${mood.color}30` : 'none',
              }}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${isLoading ? 'animate-spin' : ''}`}
                style={{ color: isActive ? mood.color : 'rgba(235,235,245,0.70)', fontVariationSettings: "'FILL' 1" }}
              >
                {isLoading ? 'autorenew' : mood.icon}
              </span>
              <span
                className="text-[11px] font-semibold tracking-wide"
                style={{ color: isActive ? mood.color : 'rgba(235,235,245,0.70)' }}
              >
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Dashboard({
  onPlayTrack, onPlayAlbum,
  history = [], recommendations = [],
  suggestedSongs = [], suggestedAlbums = [],
  isOnline = true, accentColor = null,
}) {
  const [greeting, setGreeting] = useState('Good Evening');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12)      setGreeting('Good Morning');
    else if (h < 17) setGreeting('Good Afternoon');
    else             setGreeting('Good Evening');
  }, []);

  const quickPicks    = useMemo(() => history.filter(isTrackPlayable).filter(t => !isOnline ? t.isLocal : true).slice(0, 6), [history, isOnline]);
  const recentlyPlayed = useMemo(() => history.filter(isTrackPlayable).filter(t => !isOnline ? t.isLocal : true).slice(0, 8), [history, isOnline]);

  /* Dynamic hero gradient from album art color */
  const heroBg = accentColor
    ? `linear-gradient(180deg, hsl(${accentColor.h},${Math.min(accentColor.s,40)}%,15%) 0%, #000000 40%)`
    : 'linear-gradient(180deg, #1A1A1F 0%, #000000 35%)';

  return (
    <div
      className="min-h-full px-4 pb-36 pt-1 text-white"
      style={{ background: heroBg, transition: 'background 0.8s ease' }}
    >
      {/* ── Greeting ── */}
      <div className="mb-5">
        <h1
          className="text-[32px] font-black tracking-tight leading-tight"
          style={{ letterSpacing: '-0.5px' }}
        >
          {greeting}
        </h1>
      </div>

      {/* ── Offline badge ── */}
      {!isOnline && (
        <div className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold"
          style={{ background: 'rgba(255,69,58,0.12)', color: '#FF453A', border: '0.5px solid rgba(255,69,58,0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A] animate-pulse" />
          Offline
        </div>
      )}

      {/* ── Quick Picks ── */}
      {quickPicks.length > 0 && (
        <section className="mb-7 animate-cardReveal">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quickPicks.map((track, idx) => (
              <button
                key={track.id}
                onClick={() => onPlayTrack(track, quickPicks)}
                className="quick-pick group flex min-h-[56px] items-center overflow-hidden rounded-[10px] text-left cursor-pointer apple-press transition-all duration-150"
                style={{
                  background: 'rgba(44, 44, 46, 0.85)',
                  border: '0.5px solid rgba(84, 84, 88, 0.30)',
                  animationDelay: `${idx * 35}ms`,
                }}
              >
                <div className="relative h-[56px] w-[56px] flex-shrink-0 overflow-hidden">
                  <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
                </div>
                <span className="flex-1 px-3 text-[14px] font-semibold leading-tight text-white line-clamp-2">
                  {track.title}
                </span>
                <div
                  className="opacity-0 group-hover:opacity-100 mr-3 flex items-center justify-center w-7 h-7 rounded-full transition-opacity duration-150"
                  style={{ background: '#0A84FF' }}
                >
                  <span className="material-symbols-outlined text-white font-black text-[13px]">play_arrow</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Offline empty state ── */}
      {!isOnline && quickPicks.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center my-4"
          style={{ background: 'rgba(44,44,46,0.6)', border: '0.5px solid rgba(84,84,88,0.3)' }}
        >
          <span className="material-symbols-outlined text-[44px] block mb-3"
            style={{ color: 'rgba(235,235,245,0.3)' }}>cloud_off</span>
          <h3 className="text-[17px] font-bold text-white mb-1">You're Offline</h3>
          <p className="text-[14px]" style={{ color: 'rgba(235,235,245,0.50)' }}>
            Import local audio files to listen anywhere.
          </p>
        </div>
      )}

      {/* ── Mood chips ── */}
      {isOnline && (
        <div className="mb-7">
          <MoodChips onPlayTrack={onPlayTrack} accentColor={accentColor} />
        </div>
      )}

      {/* ── Suggested songs ── */}
      {isOnline && suggestedSongs.length > 0 && (
        <div className="mb-7">
          <Shelf title="Suggested for You" items={suggestedSongs} onPlayTrack={onPlayTrack} />
        </div>
      )}

      {/* ── Suggested albums ── */}
      {isOnline && suggestedAlbums.length > 0 && (
        <div className="mb-7">
          <AlbumShelf title="Featured Albums" items={suggestedAlbums} onPlayAlbum={onPlayAlbum} />
        </div>
      )}

      {/* ── Recently played ── */}
      {recentlyPlayed.length > 0 && (
        <div className="mb-7">
          <Shelf title="Recently Played" items={recentlyPlayed} onPlayTrack={onPlayTrack} />
        </div>
      )}
    </div>
  );
}
