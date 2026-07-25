import { useMemo, useRef, useState } from 'react';

function formatDuration(sec) {
  if (!sec || Number.isNaN(sec)) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function PlaylistCard({ item, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
        selected ? 'bg-white/10' : 'bg-transparent active:bg-white/6'
      }`}
    >
      <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl ${
        item.type === 'liked'
          ? 'bg-gradient-to-br from-[#450af5] via-[#7b68ee] to-[#c4efd9]'
          : item.type === 'local'
            ? 'bg-[#232323]'
            : 'bg-[#1f1f1f]'
      }`}>
        {item.coverUrl ? (
          <img src={item.coverUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-white">
            {item.type === 'liked' ? 'favorite' : item.type === 'local' ? 'folder' : 'queue_music'}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{item.name}</p>
        <p className="truncate text-xs text-[#b3b3b3]">
          {item.meta}
        </p>
      </div>
    </button>
  );
}

function derivePlaylistNameFromUrl(url) {
  if (!url?.trim()) return 'Imported Playlist';
  try {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)(?:\?|$)/);
    if (match?.[1]) return `Playlist ${match[1].slice(0, 6)}`;
  } catch (_) {
    // Ignore malformed URL parsing.
  }
  return 'Imported Playlist';
}

function parsePlaylistTextList(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const cleaned = line
        .replace(/^\d+\.\s*/, '')
        .replace(/\s+\d{1,2}:\d{2,3}$/, '')
        .replace(/\s+-\s+$/, '')
        .trim();

      if (!cleaned || cleaned.startsWith('http://') || cleaned.startsWith('https://')) return null;

      let title = cleaned;
      let artist = 'Unknown Artist';

      if (cleaned.includes(' - ')) {
        const [titlePart, ...artistParts] = cleaned.split(' - ');
        title = titlePart.trim();
        artist = artistParts.join(' - ').trim() || 'Unknown Artist';
      } else if (cleaned.includes(' by ')) {
        const [titlePart, ...artistParts] = cleaned.split(' by ');
        title = titlePart.trim();
        artist = artistParts.join(' by ').trim() || 'Unknown Artist';
      }

      return {
        id: `vibedeck-import-${Date.now()}-${index}`,
        title,
        artist,
        album: 'Imported playlist',
        coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600&auto=format&fit=crop',
        duration: 240,
        url: '',
        genre: 'Imported',
        source: 'jiosaavn',
        playbackMode: 'audio'
      };
    })
    .filter(Boolean);
}

export default function Library({
  activePlaylist,
  playlists,
  onPlayTrack,
  onRemoveFromPlaylist,
  onImportLocalSongs,
  localSongs,
  favorites,
  onSelectPlaylist,
  onCreatePlaylist,
  onImportPlaylist,
  onRenamePlaylist,
  onDeletePlaylist
}) {
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState('');

  const libraryItems = useMemo(() => {
    const likedCover = favorites[0]?.coverUrl || null;
    const localCover = localSongs[0]?.coverUrl || null;
    const customItems = playlists.map((playlist) => ({
      id: playlist.id,
      type: 'playlist',
      name: playlist.name,
      coverUrl: playlist.tracks?.[0]?.coverUrl || null,
      meta: `Playlist • ${playlist.tracks?.length || 0} songs`
    }));

    return [
      {
        id: 'liked',
        type: 'liked',
        name: 'Liked Songs',
        coverUrl: likedCover,
        meta: `Playlist • ${favorites.length} songs`
      },
      {
        id: 'local',
        type: 'local',
        name: 'Local files',
        coverUrl: localCover,
        meta: `Device audio • ${localSongs.length} songs`
      },
      ...customItems
    ];
  }, [favorites, localSongs, playlists]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return libraryItems;
    const query = search.trim().toLowerCase();
    return libraryItems.filter((item) => item.name.toLowerCase().includes(query));
  }, [libraryItems, search]);

  const activeItem = useMemo(() => {
    if (activePlaylist === 'liked') {
      return {
        id: 'liked',
        name: 'Liked Songs',
        description: 'Songs you hearted. This is your quick-access mix.',
        tracks: favorites,
        type: 'liked'
      };
    }

    if (activePlaylist === 'local') {
      return {
        id: 'local',
        name: 'Local files',
        description: 'Audio imported from this device.',
        tracks: localSongs,
        type: 'local'
      };
    }

    const selected = playlists.find((playlist) => playlist.id === activePlaylist) || playlists[0];
    if (selected) {
      return {
        ...selected,
        type: 'playlist',
        description: selected.description || 'Your custom playlist.'
      };
    }

    return {
      id: 'liked',
      name: 'Liked Songs',
      description: 'Songs you hearted. This is your quick-access mix.',
      tracks: favorites,
      type: 'liked'
    };
  }, [activePlaylist, favorites, localSongs, playlists]);

  const processFiles = (files) => {
    const tracks = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name)) continue;

      const streamUrl = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^.]+$/, '');
      const [artistCandidate, ...titleParts] = cleanName.split('-');
      const title = titleParts.length > 0 ? titleParts.join('-').trim() : cleanName;
      const artist = titleParts.length > 0 ? artistCandidate.trim() : 'Local Artist';

      tracks.push({
        id: `local-${Date.now()}-${i}`,
        title,
        artist,
        album: 'Local files',
        duration: 240,
        url: streamUrl,
        coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=600&auto=format&fit=crop',
        genre: 'Local',
        isLocal: true,
        playbackMode: 'audio',
        fileBlob: file
      });
    }

    if (tracks.length > 0) {
      onImportLocalSongs(tracks);
      onSelectPlaylist('local');
    }
  };

  const handleImportPlaylist = () => {
    const url = window.prompt('Paste playlist URL if you have it. Direct access is often blocked, but it helps us name the playlist.');
    const textList = window.prompt(
      'Paste copied playlist text.\n\nExamples:\nSong - Artist\n1. Song - Artist\nSong by Artist'
    );
    if (!textList?.trim()) return;

    const mappedTracks = parsePlaylistTextList(textList);

    if (mappedTracks.length > 0) {
      onImportPlaylist(derivePlaylistNameFromUrl(url), mappedTracks);
    } else {
      window.alert('Could not read tracks from the pasted text. Paste one song per line like "Song - Artist".');
    }
  };

  const handleRename = () => {
    if (activeItem.type !== 'playlist') return;
    const nextName = window.prompt('Rename playlist', activeItem.name);
    if (!nextName?.trim()) return;
    const nextDescription = window.prompt('Playlist description', activeItem.description || '');
    onRenamePlaylist(activeItem.id, nextName.trim(), nextDescription?.trim());
  };

  const playAll = () => {
    if (!activeItem.tracks?.length) return;
    onPlayTrack(activeItem.tracks[0], activeItem.tracks);
  };

  return (
    <div className="min-h-full bg-black px-4 pb-40 pt-4 text-white">
      <section className="sticky top-0 z-20 -mx-4 border-b border-white/5 bg-black/96 px-4 pb-4 pt-2 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Your Library</h1>
            <p className="text-sm text-[#b3b3b3]">Playlists, likes, and local files.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreatePlaylist}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-white"
              title="Create playlist"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-white"
              title="Import audio"
            >
              <span className="material-symbols-outlined">folder_open</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 hide-scrollbar">
          {['Playlists', 'Artists', 'Albums'].map((chip) => (
            <div key={chip} className="rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white">
              {chip}
            </div>
          ))}
        </div>

        <label className="flex items-center gap-3 rounded-xl bg-[#121212] px-4 py-3">
          <span className="material-symbols-outlined text-[#b3b3b3]">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in your library"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#757575]"
          />
        </label>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
        multiple
        className="hidden"
        onChange={(e) => processFiles(e.target.files || [])}
      />

      <section className="mt-4 space-y-1">
        {filteredItems.map((item) => (
          <PlaylistCard
            key={item.id}
            item={item}
            selected={activeItem.id === item.id}
            onClick={() => onSelectPlaylist(item.id)}
          />
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-[28px] bg-[#121212]">
        <div className="relative overflow-hidden border-b border-white/6 px-4 pb-5 pt-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.28),transparent_55%)]" />
          <div className="relative flex items-end gap-4">
            <div className={`flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-2xl ${
              activeItem.type === 'liked'
                ? 'bg-gradient-to-br from-[#450af5] via-[#7b68ee] to-[#c4efd9]'
                : 'bg-[#1e1e1e]'
            }`}>
              {activeItem.tracks?.[0]?.coverUrl ? (
                <img src={activeItem.tracks[0].coverUrl} alt={activeItem.name} className="h-full w-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-white">
                  {activeItem.type === 'liked' ? 'favorite' : activeItem.type === 'local' ? 'folder' : 'queue_music'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b3b3b3]">Playlist</p>
              <h2 className="mt-1 line-clamp-2 text-3xl font-black tracking-tight">{activeItem.name}</h2>
              <p className="mt-2 text-sm text-[#b3b3b3]">{activeItem.description}</p>
              <p className="mt-2 text-xs font-medium text-[#b3b3b3]">{activeItem.tracks?.length || 0} songs</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={playAll}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#38bdf8] text-black shadow-[0_10px_24px_rgba(56,189,248,0.32)]"
          >
            <span className="material-symbols-outlined text-3xl">play_arrow</span>
          </button>
          {activeItem.type === 'playlist' && (
            <>
              <button
                onClick={handleRename}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white"
              >
                Edit
              </button>
              <button
                onClick={() => onDeletePlaylist(activeItem.id)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-[#ff8e8e]"
              >
                Delete
              </button>
            </>
          )}
          <button
            onClick={handleImportPlaylist}
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white"
          >
            Import Playlist
          </button>
        </div>

        <div className="px-4 pb-1">
          <p className="text-[11px] leading-relaxed text-[#8f8f8f]">
            Direct public playlist scraping is often blocked in many cases. This import works best when you paste copied playlist text.
          </p>
        </div>

        <div className="px-2 pb-3">
          {activeItem.tracks?.length ? (
            activeItem.tracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-3 rounded-2xl px-2 py-2.5 active:bg-white/5"
              >
                <button
                  onClick={() => onPlayTrack(track, activeItem.tracks)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="w-6 text-center text-xs text-[#b3b3b3]">{index + 1}</div>
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{track.title}</p>
                    <p className="truncate text-xs text-[#b3b3b3]">{track.artist}</p>
                  </div>
                </button>
                <span className="text-xs text-[#b3b3b3]">{formatDuration(track.duration)}</span>
                <button
                  onClick={() => onRemoveFromPlaylist(activeItem.id, track.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#b3b3b3]"
                  title="Remove song"
                >
                  <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                </button>
              </div>
            ))
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-base font-semibold text-white">Nothing here yet</p>
              <p className="mt-2 text-sm text-[#b3b3b3]">Create a playlist or import local music to start building your library.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
