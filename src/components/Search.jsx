import { useEffect, useMemo, useState, memo } from 'react';

function formatDuration(sec) {
  if (!sec || Number.isNaN(sec)) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const Search = function Search({
  onPlayTrack,
  onAddToQueue,
  playlists,
  onAddToPlaylist,
  onToggleLike,
  favorites,
  user,
  recommendations = [],
  isOnline = true
}) {
  const GAANA_API_BASE = 'https://gaana-api-pied.vercel.app/api';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [artistResults, setArtistResults] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);

  if (!isOnline) {
    return (
      <div className="min-h-full bg-black px-6 py-20 text-white flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
          <span className="material-symbols-outlined text-4xl text-red-400">cloud_off</span>
        </div>
        <h2 className="text-2xl font-black mb-2">You're Offline</h2>
        <p className="text-sm text-[#b3b3b3] max-w-sm mb-8 leading-relaxed">
          Search requires an internet connection. Head over to your Library tab to play your persistently saved local audio tracks.
        </p>
      </div>
    );
  }
  const [selectedArtistSongs, setSelectedArtistSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingArtistSongs, setLoadingArtistSongs] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [featuredTrack, setFeaturedTrack] = useState(null);

  const fallbackCover = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop';
  const fallbackArtistImage = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';

  const decode = (str) => str?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&')?.replace(/&#039;/g, "'") || '';

  const formatSaavnTrack = (r, genre = 'Music') => ({
    id: `jiosaavn-${r.id}`,
    title: decode(r.name),
    artist: r.artists?.primary?.map((a) => decode(a.name)).join(', ') || 'Unknown Artist',
    album: decode(r.album?.name),
    coverUrl: r.image?.find((i) => i.quality === '500x500')?.url || r.image?.[0]?.url || fallbackCover,
    url: r.downloadUrl?.find((d) => d.quality === '320kbps')?.url || r.downloadUrl?.[0]?.url || '',
    duration: r.duration ? Number(r.duration) : 240,
    genre,
    source: 'jiosaavn',
    playbackMode: 'audio',
    isItunes: false,
    youtubeId: null
  });

  const formatGaanaTrack = (item, genre = 'Music') => ({
    id: `gaana-${item.track_id}`,
    trackId: item.track_id,
    seoKey: item.seokey,
    title: item.title,
    artist: item.artists || 'Unknown Artist',
    album: item.album || 'Official Release',
    duration: item.duration ? Number(item.duration) : 240,
    coverUrl: item.artworkUrl || fallbackCover,
    url: '',
    hlsUrl: '',
    genre,
    playbackMode: 'audio',
    source: 'gaana',
    isItunes: false,
    youtubeId: null
  });

  useEffect(() => {
    fetch('https://saavn.sumit.co/api/search/songs?query=today%20top%20hits&limit=1')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.results?.[0]) {
          setFeaturedTrack(formatSaavnTrack(json.data.results[0], 'Featured'));
        } else if (recommendations[0]) {
          setFeaturedTrack(recommendations[0]);
        }
      })
      .catch(() => {
        if (recommendations[0]) setFeaturedTrack(recommendations[0]);
      });
  }, [recommendations]);

  useEffect(() => {
    const historyKey = user ? `vibe_${user.uid}_search_history` : 'vibe_search_history';
    try {
      setSearchHistory(JSON.parse(localStorage.getItem(historyKey) || '[]'));
    } catch (_) {
      setSearchHistory([]);
    }
  }, [user]);

  const addToHistory = (rawQuery) => {
    if (!rawQuery?.trim()) return;
    const cleanQuery = rawQuery.trim();
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== cleanQuery.toLowerCase());
      const next = [cleanQuery, ...filtered].slice(0, 8);
      const historyKey = user ? `vibe_${user.uid}_search_history` : 'vibe_search_history';
      localStorage.setItem(historyKey, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setArtistResults([]);
      setSelectedArtist(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      const searchQuery = query.trim();
      addToHistory(searchQuery);
      setLoading(true);

      fetch(`${GAANA_API_BASE}/search/songs?q=${encodeURIComponent(searchQuery)}&limit=12`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((json) => {
          if (json?.data?.length) {
            setResults(json.data.map((item) => formatGaanaTrack(item, 'Search')));
          } else {
            return fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(searchQuery)}&limit=12`)
              .then((res) => res.json())
              .then((data) => {
                setResults((data?.data?.results || []).map((item) => formatSaavnTrack(item, 'Search')));
              });
          }
          return null;
        })
        .catch(() =>
          fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(searchQuery)}&limit=12`)
            .then((res) => res.json())
            .then((data) => {
              setResults((data?.data?.results || []).map((item) => formatSaavnTrack(item, 'Search')));
            })
            .catch(() => setResults([]))
        )
        .finally(() => setLoading(false));

      fetch(`https://saavn.sumit.co/api/search/artists?query=${encodeURIComponent(searchQuery)}&limit=6`)
        .then((res) => res.json())
        .then((artistData) => {
          const nextArtists = (artistData?.data?.results || []).map((artist) => ({
            id: artist.id,
            name: decode(artist.title || artist.name),
            imageUrl: artist.image?.find((img) => img.quality === '500x500')?.url || artist.image?.[0]?.url || fallbackArtistImage
          }));
          setArtistResults(nextArtists);
        })
        .catch(() => setArtistResults([]));
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const discoverSongs = useMemo(() => {
    const base = recommendations.length ? recommendations : [];
    return base.slice(0, 6);
  }, [recommendations]);

  const handleSelectArtist = async (artist) => {
    setSelectedArtist(artist);
    setSelectedArtistSongs([]);
    setLoadingArtistSongs(true);

    try {
      const res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(artist.name)}&limit=12`);
      const json = await res.json();
      const songs = (json?.data?.results || []).map((item) => formatSaavnTrack(item, 'Artist'));
      setSelectedArtistSongs(songs);
    } catch (_) {
      setSelectedArtistSongs([]);
    } finally {
      setLoadingArtistSongs(false);
    }
  };

  const renderTrackRow = (track, index, list = results) => {
    const isFavorite = favorites.some((fav) => fav.id === track.id);

    return (
      <div
        key={track.id}
        className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 active:bg-white/5"
      >
        <button onClick={() => onPlayTrack(track, list)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="w-6 text-center text-xs text-[#b3b3b3]">{index + 1}</div>
          <img src={track.coverUrl} alt={track.title} className="h-12 w-12 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{track.title}</p>
            <p className="truncate text-xs text-[#b3b3b3]">{track.artist}</p>
          </div>
        </button>

        <button
          onClick={() => onToggleLike(track)}
          className={`material-symbols-outlined text-[18px] ${isFavorite ? 'text-primary' : 'text-[#b3b3b3]'}`}
        >
          favorite
        </button>

        <button
          onClick={() => onAddToQueue(track)}
          className="material-symbols-outlined text-[18px] text-[#b3b3b3]"
          title="Add to queue"
        >
          queue_music
        </button>

        <div className="relative">
          <button
            onClick={() => setActiveMenuId(activeMenuId === track.id ? null : track.id)}
            className="material-symbols-outlined text-[18px] text-[#b3b3b3]"
          >
            more_horiz
          </button>

          {activeMenuId === track.id && (
            <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-white/10 bg-[#202020] py-1 shadow-2xl">
              <button
                onClick={() => {
                  onAddToPlaylist('liked', track);
                  setActiveMenuId(null);
                }}
                className="block w-full px-3 py-2 text-left text-xs font-medium text-white hover:bg-white/5"
              >
                Add to Liked Songs
              </button>
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => {
                    onAddToPlaylist(playlist.id, track);
                    setActiveMenuId(null);
                  }}
                  className="block w-full truncate px-3 py-2 text-left text-xs font-medium text-white hover:bg-white/5"
                >
                  Add to {playlist.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="w-10 text-right text-xs text-[#b3b3b3]">{formatDuration(track.duration)}</span>
      </div>
    );
  };

  const browseCategories = [
    { title: 'Pop', color: 'bg-[#dc148c]' },
    { title: 'Bollywood', color: 'bg-[#8d67ab]' },
    { title: 'Focus', color: 'bg-[#477d95]' },
    { title: 'Workout', color: 'bg-[#e8115b]' },
    { title: 'Chill', color: 'bg-[#27856a]' },
    { title: 'Party', color: 'bg-[#f59b23]' }
  ];

  return (
    <div className="min-h-full bg-black px-4 pb-40 pt-4 text-white">
      <div className="sticky top-0 z-20 -mx-4 border-b border-white/5 bg-black/96 px-4 pb-4 pt-2 backdrop-blur-xl">
        <h1 className="mb-4 text-2xl font-black tracking-tight">Search</h1>
        <label className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-black">
          <span className="material-symbols-outlined">search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-black/60"
          />
        </label>
      </div>

      {selectedArtist ? (
        <div className="pt-5">
          <button onClick={() => setSelectedArtist(null)} className="mb-4 flex items-center gap-2 text-sm text-[#b3b3b3]">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back
          </button>
          <div className="overflow-hidden rounded-[28px] bg-[#121212]">
            <div className="relative h-56 overflow-hidden">
              <img src={selectedArtist.imageUrl} alt={selectedArtist.name} className="h-full w-full object-cover opacity-70" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-5 left-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#38bdf8]">Artist</p>
                <h2 className="mt-2 text-4xl font-black">{selectedArtist.name}</h2>
              </div>
            </div>
            <div className="px-2 py-3">
              {loadingArtistSongs ? (
                <div className="px-4 py-10 text-sm text-[#b3b3b3]">Loading songs...</div>
              ) : (
                selectedArtistSongs.map((track, index) => renderTrackRow(track, index, selectedArtistSongs))
              )}
            </div>
          </div>
        </div>
      ) : query.trim() ? (
        <div className="space-y-6 pt-5">
          {loading ? (
            <div className="px-2 py-8 text-sm text-[#b3b3b3]">Searching songs and artists...</div>
          ) : (
            <>
              {results.length > 0 && (
                <section className="overflow-hidden rounded-[28px] bg-[#121212]">
                  <div className="border-b border-white/6 px-4 py-4">
                    <h2 className="text-xl font-black">Songs</h2>
                  </div>
                  <div className="px-2 py-3">
                    {results.map((track, index) => renderTrackRow(track, index, results))}
                  </div>
                </section>
              )}

              {artistResults.length > 0 && (
                <section>
                  <h2 className="mb-3 text-xl font-black">Artists</h2>
                  <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                    {artistResults.map((artist) => (
                      <button
                        key={artist.id}
                        onClick={() => handleSelectArtist(artist)}
                        className="w-32 shrink-0 text-center"
                      >
                        <img src={artist.imageUrl} alt={artist.name} className="mx-auto h-28 w-28 rounded-full object-cover" />
                        <p className="mt-3 truncate text-sm font-semibold">{artist.name}</p>
                        <p className="text-xs text-[#b3b3b3]">Artist</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {!results.length && !artistResults.length && !loading && (
                <div className="rounded-3xl bg-[#121212] px-4 py-10 text-center">
                  <p className="text-lg font-semibold text-white">No results found</p>
                  <p className="mt-2 text-sm text-[#b3b3b3]">Try another artist, album, or song name.</p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-8 pt-5">
          {featuredTrack && (
            <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#082f49,#121212_60%)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e0f2fe]">Featured for you</p>
              <div className="mt-4 flex items-center gap-4">
                <img src={featuredTrack.coverUrl} alt={featuredTrack.title} className="h-24 w-24 rounded-2xl object-cover shadow-2xl" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-2xl font-black text-white">{featuredTrack.title}</h2>
                  <p className="truncate text-sm text-[#e0f2fe]">{featuredTrack.artist}</p>
                  <button
                    onClick={() => onPlayTrack(featuredTrack, [featuredTrack, ...discoverSongs])}
                    className="mt-4 rounded-full bg-[#38bdf8] px-5 py-2 text-sm font-bold text-black"
                  >
                    Play
                  </button>
                </div>
              </div>
            </section>
          )}

          {searchHistory.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-black">Recent searches</h2>
                <button
                  onClick={() => {
                    setSearchHistory([]);
                    const historyKey = user ? `vibe_${user.uid}_search_history` : 'vibe_search_history';
                    localStorage.removeItem(historyKey);
                  }}
                  className="text-xs font-semibold text-[#b3b3b3] hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {searchHistory.map((item) => (
                  <button
                    key={item}
                    onClick={() => setQuery(item)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-[#121212] px-4 py-3 text-left group hover:bg-white/5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[#b3b3b3] text-lg">history</span>
                    <span className="text-sm font-medium text-white flex-1">{item}</span>
                    <span className="material-symbols-outlined text-[#b3b3b3] text-sm opacity-0 group-hover:opacity-100 transition-opacity">north_west</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {discoverSongs.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-black">Suggested songs</h2>
              <div className="overflow-hidden rounded-[28px] bg-[#121212] px-2 py-3">
                {discoverSongs.map((track, index) => renderTrackRow(track, index, discoverSongs))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-xl font-black">Browse all</h2>
            <div className="grid grid-cols-2 gap-4">
              {browseCategories.map((category) => (
                <button
                  key={category.title}
                  onClick={() => setQuery(category.title)}
                  className={`aspect-[1.3/1] rounded-2xl p-4 text-left text-lg font-black text-white ${category.color}`}
                >
                  {category.title}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default memo(Search);
