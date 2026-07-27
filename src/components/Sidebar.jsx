import React from 'react';

/* ─────────────────────────────────────────────────────────
   Apple macOS Sidebar — matches Finder / Music.app sidebar
───────────────────────────────────────────────────────── */
export default function Sidebar({
  activeTab, setActiveTab,
  playlists, currentPlaylist, setCurrentPlaylist,
  onAddPlaylist, user, onAuthClick,
}) {
  const handlePlaylistClick = (playlist) => {
    setActiveTab('library');
    setCurrentPlaylist(playlist);
  };

  const navSections = [
    {
      heading: null,
      items: [
        { id: 'home',   icon: 'home',    label: 'Home',      fill: true },
        { id: 'search', icon: 'search',  label: 'Search',    fill: false },
      ],
    },
    {
      heading: 'Browse',
      items: [
        { id: 'podcasts', icon: 'podcasts', label: 'Podcasts',   fill: false },
        { id: 'radio',    icon: 'radio',    label: 'Live Radio',  fill: false },
        { id: 'stats',    icon: 'insights', label: 'Wrapped',     fill: false },
      ],
    },
  ];

  const SidebarItem = ({ item }) => {
    const isActive = activeTab === item.id;
    return (
      <button
        onClick={() => { setActiveTab(item.id); setCurrentPlaylist(null); }}
        className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] text-[13px] font-medium transition-all duration-150 cursor-pointer ${
          isActive
            ? 'bg-[#2C2C2E] text-white font-semibold'
            : 'text-[rgba(235,235,245,0.55)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
        }`}
      >
        <span
          className="material-symbols-outlined text-[18px]"
          style={{
            fontVariationSettings: isActive && item.fill ? "'FILL' 1" : "'FILL' 0",
            color: isActive ? '#0A84FF' : 'inherit',
          }}
        >
          {item.icon}
        </span>
        {item.label}
      </button>
    );
  };

  const isLibraryActive = (id) => activeTab === 'library' && currentPlaylist === id;

  return (
    <aside
      className="w-[260px] h-full fixed left-0 top-0 hidden md:flex flex-col z-40 select-none"
      style={{
        background: 'rgba(14, 14, 15, 0.96)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRight: '0.5px solid rgba(84, 84, 88, 0.35)',
      }}
    >
      {/* Brand */}
      <div
        className="px-5 py-5 flex items-center gap-3 cursor-pointer flex-shrink-0"
        onClick={() => { setActiveTab('home'); setCurrentPlaylist(null); }}
        style={{ borderBottom: '0.5px solid rgba(84,84,88,0.25)' }}
      >
        <div
          className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] flex-shrink-0"
          style={{
            background: 'linear-gradient(145deg, #0A84FF, #0066CC)',
            boxShadow: '0 2px 8px rgba(10, 132, 255, 0.40)',
          }}
        >
          <span className="material-symbols-outlined text-white text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            music_note
          </span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-white tracking-[-0.2px]">Vibe Deck</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#0A84FF' }}>Music</p>
        </div>
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-2.5 py-3 space-y-5 min-h-0">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.heading && (
              <p
                className="px-3 mb-1 text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ color: 'rgba(235,235,245,0.35)' }}
              >
                {section.heading}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => <SidebarItem key={item.id} item={item} />)}
            </div>
          </div>
        ))}

        {/* Library */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'rgba(235,235,245,0.35)' }}>
              Library
            </p>
            <button
              onClick={onAddPlaylist}
              className="w-5 h-5 flex items-center justify-center rounded cursor-pointer hover:bg-white/10 transition-colors"
              title="New Playlist"
            >
              <span className="material-symbols-outlined text-[15px]" style={{ color: 'rgba(235,235,245,0.50)' }}>add</span>
            </button>
          </div>

          <div className="space-y-0.5">
            {/* Liked Songs */}
            <div
              onClick={() => handlePlaylistClick('liked')}
              className={`flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] cursor-pointer transition-all duration-150 ${
                isLibraryActive('liked')
                  ? 'bg-[#2C2C2E]'
                  : 'hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <div
                className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(145deg, #fc3c44, #c62a47)' }}
              >
                <span className="material-symbols-outlined text-white text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              </div>
              <span
                className={`text-[13px] font-medium truncate ${isLibraryActive('liked') ? 'text-white font-semibold' : ''}`}
                style={{ color: isLibraryActive('liked') ? '#fff' : 'rgba(235,235,245,0.70)' }}
              >
                Liked Songs
              </span>
            </div>

            {/* Local Files */}
            <div
              onClick={() => handlePlaylistClick('local')}
              className={`flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] cursor-pointer transition-all duration-150 ${
                isLibraryActive('local')
                  ? 'bg-[#2C2C2E]'
                  : 'hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <div
                className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(145deg, #636366, #48484A)' }}
              >
                <span className="material-symbols-outlined text-white text-[12px]">folder</span>
              </div>
              <span
                className="text-[13px] font-medium truncate"
                style={{ color: isLibraryActive('local') ? '#fff' : 'rgba(235,235,245,0.70)' }}
              >
                Local Files
              </span>
            </div>

            {/* Separator */}
            {playlists.length > 0 && (
              <div className="h-px mx-3 my-1" style={{ background: 'rgba(84,84,88,0.3)' }} />
            )}

            {/* User playlists */}
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => handlePlaylistClick(pl.id)}
                className={`flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] cursor-pointer transition-all duration-150 ${
                  isLibraryActive(pl.id)
                    ? 'bg-[#2C2C2E]'
                    : 'hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                <div
                  className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center flex-shrink-0 bg-[#3A3A3C]"
                >
                  <span className="material-symbols-outlined text-[12px]" style={{ color: 'rgba(235,235,245,0.55)' }}>music_note</span>
                </div>
                <span
                  className="text-[13px] font-medium truncate"
                  style={{ color: isLibraryActive(pl.id) ? '#fff' : 'rgba(235,235,245,0.70)' }}
                >
                  {pl.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile footer */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: '0.5px solid rgba(84,84,88,0.25)' }}
      >
        <div
          className="flex items-center gap-2.5 p-2.5 rounded-[10px] cursor-pointer hover:bg-white/5 transition-all"
          onClick={onAuthClick}
        >
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: user ? 'transparent' : '#3A3A3C', border: '0.5px solid rgba(84,84,88,0.5)' }}
          >
            {user ? (
              <img
                alt={user.displayName || 'User'}
                className="w-full h-full object-cover"
                src={user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"}
              />
            ) : (
              <span className="material-symbols-outlined text-[17px]" style={{ color: 'rgba(235,235,245,0.50)' }}>person</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate">
              {user ? (user.displayName || user.email?.split('@')[0] || 'User') : 'Sign In'}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'rgba(235,235,245,0.40)' }}>
              {user ? 'Cloud Sync On' : 'Local only'}
            </p>
          </div>
          {user && (
            <button
              onClick={(e) => { e.stopPropagation(); onAuthClick(); }}
              className="p-1 rounded-full hover:bg-red-500/15 transition-colors"
              title="Sign Out"
            >
              <span className="material-symbols-outlined text-[15px]" style={{ color: 'rgba(235,235,245,0.40)' }}>logout</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
