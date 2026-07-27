import React, { useEffect, useMemo, useState, useCallback } from 'react';

const MOODS = [
  { id: 'chill',   label: 'Chill',    icon: 'nights_stay',      query: 'chill lofi relax',           color: '#FBBF24' },
  { id: 'energy',  label: 'Energy',   icon: 'bolt',             query: 'energetic pump workout',     color: '#F59E0B' },
  { id: 'focus',   label: 'Focus',    icon: 'self_improvement', query: 'study focus concentration',  color: '#10B981' },
  { id: 'party',   label: 'Party',    icon: 'celebration',      query: 'party dance hits',           color: '#EC4899' },
  { id: 'romance', label: 'Romance',  icon: 'favorite',         query: 'love romantic songs',        color: '#F43F5E' },
  { id: 'sad',     label: 'Sad',      icon: 'cloud_queue',      query: 'sad emotional heartbreak',   color: '#60A5FA' },
];

function isTrackPlayable(track) {
  if (!track || !track.title) return false;
  if (track.title.startsWith('http://') || track.title.startsWith('https://')) return false;
  return Boolean(
    track.url || track.hlsUrl || track.trackId ||
    track.source === 'gaana' || track.source === 'jiosaavn' || track.isLocal
  );
}

/* ── Shelf (Amber Gold Play Button) ── */
function Shelf({ title, items, onPlayTrack }) {
  return (
    <section className="space-y-2.5 animate-cardReveal">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-[17px] font-bold tracking-tight text-white">{title}</h2>
        <button className="text-[13px] font-semibold text-[#F59E0B] hover:opacity-75 transition-opacity">
          See All
        </button>
      </div>
      <div className="shelf-scroll flex gap-3.5 overflow-x-auto pb-2 hide-scrollbar -mx-1 px-1">
        {items.map((track, idx) => (
          <button
            key={track.id}
            onClick={() => onPlayTrack(track, items)}
            className="track-card group w-[140px] shrink-0 text-left cursor-pointer apple-press"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="relative aspect-square overflow-hidden rounded-[12px] bg-[#131316] shadow-lg group-hover:shadow-xl transition-shadow duration-200 border border-white/5">
              <img
                src={track.coverUrl}
                alt={track.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {/* Amber Gold Play Button */}
              <div className="play-btn absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full shadow-lg"
                style={{ background: 'linear-gradient(135deg, #FBBF24, #D97706)' }}>
                <span className="material-symbols-outlined text-black font-black text-[16px]">play_arrow</span>
              </div>
            </div>
            <p className="mt-2 truncate text-[13px] font-semibold text-white leading-snug">{track.title}</p>
            <p className="truncate text-[12px]" style={{ color: 'rgba(240,240,245,0.55)' }}>{track.artist}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function AlbumShelf({ title, items, onPlayAlbum }) {
  return (
    <section className="space-y-2.5 animate-cardReveal">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-[17px] font-bold tracking-tight text-white">{title}</h2>
        <button className="text-[13px] font-semibold text-[#F59E0B] hover:opacity-75 transition-opacity">
          See All
        </button>
      </div>
      <div className="shelf-scroll flex gap-3.5 overflow-x-auto pb-2 hide-scrollbar -mx-1 px-1">
        {items.map((album, idx) => (
          <button
            key={idx}
            onClick={() => onPlayAlbum && onPlayAlbum(album)}
            className="track-card group w-[140px] shrink-0 text-left cursor-pointer apple-press"
          >
            <div className="relative aspect-square overflow-hidden rounded-[12px] bg-[#131316] shadow-lg group-hover:shadow-xl transition-shadow duration-200 border border-white/5">
              <img
                src={album.img}
                alt={album.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="mt-2 truncate text-[13px] font-semibold text-white leading-snug">{album.name}</p>
            <p className="truncate text-[12px]" style={{ color: 'rgba(240,240,245,0.55)' }}>{album.artist}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

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
    <section className="space-y-2.5">
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
              className="relative flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-[12px] transition-all duration-150 cursor-pointer apple-press overflow-hidden"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, #FBBF24, #D97706)'
                  : 'rgba(31, 31, 36, 0.60)',
                border: isActive
                  ? '0.5px solid #FBBF24'
                  : '0.5px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}
                style={{ color: isActive ? '#000000' : mood.color, fontVariationSettings: "'FILL' 1" }}
              >
                {isLoading ? 'autorenew' : mood.icon}
              </span>
              <span
                className="text-[11px] font-semibold tracking-wide"
                style={{ color: isActive ? '#000000' : 'rgba(240,240,245,0.75)' }}
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

  const quickPicks     = useMemo(() => history.filter(isTrackPlayable).filter(t => !isOnline ? t.isLocal : true).slice(0, 6), [history, isOnline]);
  const recentlyPlayed = useMemo(() => history.filter(isTrackPlayable).filter(t => !isOnline ? t.isLocal : true).slice(0, 8), [history, isOnline]);

  /* Liquid Amber Radial Glow */
  const heroBg = accentColor
    ? `radial-gradient(ellipse 90% 60% at 50% -20%, hsl(${accentColor.h}, ${Math.min(accentColor.s, 65)}%, 18%) 0%, #070709 80%)`
    : 'radial-gradient(ellipse 90% 60% at 50% -20%, rgba(245, 158, 11, 0.16) 0%, #070709 80%)';

  return (
    <div
      className="min-h-full px-4 pb-36 pt-1 text-white"
      style={{ background: heroBg, transition: 'background 0.8s ease' }}
    >
      {/* Greeting */}
      <div className="mb-4">
        <h1
          className="text-[32px] font-black tracking-tight leading-tight"
          style={{ letterSpacing: '-0.5px' }}
        >
          {greeting}
        </h1>
      </div>

      {!isOnline && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold"
          style={{ background: 'rgba(255,69,58,0.12)', color: '#FF453A', border: '0.5px solid rgba(255,69,58,0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A] animate-pulse" />
          Offline Mode
        </div>
      )}

      {/* Quick Picks — Inset Grouped Cell with Amber Highlight */}
      {quickPicks.length > 0 && (
        <section className="mb-6 animate-cardReveal">
          <div className="overflow-hidden rounded-[12px]" style={{ border: '0.5px solid rgba(245, 158, 11, 0.15)', background: 'rgba(19, 19, 22, 0.70)' }}>
            <div className="grid grid-cols-1 divide-y divide-[rgba(255,255,255,0.06)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
              {quickPicks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => onPlayTrack(track, quickPicks)}
                  className="ios-grouped-cell group flex h-[52px] items-center px-3 gap-3 text-left cursor-pointer apple-press"
                >
                  <div className="relative h-[36px] w-[36px] flex-shrink-0 overflow-hidden rounded-[6px]">
                    <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
                  </div>
                  <span className="flex-1 text-[13px] font-semibold leading-snug text-white truncate">
                    {track.title}
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-[#F59E0B] opacity-0 group-hover:opacity-100 transition-opacity">
                    play_circle
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {!isOnline && quickPicks.length === 0 && (
        <div
          className="rounded-[12px] p-6 text-center my-4"
          style={{ background: 'rgba(31,31,36,0.6)', border: '0.5px solid rgba(255,255,255,0.08)' }}
        >
          <span className="material-symbols-outlined text-[40px] block mb-2"
            style={{ color: 'rgba(240,240,245,0.3)' }}>cloud_off</span>
          <h3 className="text-[15px] font-bold text-white mb-1">You're Offline</h3>
          <p className="text-[13px]" style={{ color: 'rgba(240,240,245,0.50)' }}>
            Import local audio files to listen anywhere.
          </p>
        </div>
      )}

      {/* Moods */}
      {isOnline && (
        <div className="mb-6">
          <MoodChips onPlayTrack={onPlayTrack} />
        </div>
      )}

      {/* Suggested Songs */}
      {isOnline && suggestedSongs.length > 0 && (
        <div className="mb-6">
          <Shelf title="Suggested for You" items={suggestedSongs} onPlayTrack={onPlayTrack} />
        </div>
      )}

      {/* Featured Albums */}
      {isOnline && suggestedAlbums.length > 0 && (
        <div className="mb-6">
          <AlbumShelf title="Featured Albums" items={suggestedAlbums} onPlayAlbum={onPlayAlbum} />
        </div>
      )}

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <div className="mb-6">
          <Shelf title="Recently Played" items={recentlyPlayed} onPlayTrack={onPlayTrack} />
        </div>
      )}
    </div>
  );
}
