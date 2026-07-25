import React from 'react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  playlists, 
  currentPlaylist, 
  setCurrentPlaylist, 
  onAddPlaylist,
  user,
  onAuthClick
}) {
  const handlePlaylistClick = (playlist) => {
    setActiveTab('library');
    setCurrentPlaylist(playlist);
  };

  return (
    <aside className="w-[280px] h-full fixed left-0 top-0 bg-black hidden md:flex flex-col p-2 gap-2 z-40 select-none">
      
      {/* Top Panel: Navigation Hub */}
      <div className="bg-[#121212] rounded-xl p-5 space-y-4">
        {/* Brand Header */}
        <div 
          className="flex items-center gap-3 cursor-pointer mb-2" 
          onClick={() => { setActiveTab('home'); setCurrentPlaylist(null); }}
        >
          {/* Brand Header Icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-black shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-lg font-black">music_note</span>
          </div>
          <div>
            <h1 className="font-display text-base font-black text-white tracking-tight leading-none">
              Vibe Deck
            </h1>
            <span className="text-[9px] text-primary font-bold uppercase tracking-widest block mt-0.5">Premium</span>
          </div>
        </div>

        {/* Home Option */}
        <button
          onClick={() => { setActiveTab('home'); setCurrentPlaylist(null); }}
          className={`w-full flex items-center gap-5 py-2.5 px-2 rounded-lg font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'home'
              ? 'text-white'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
          <span className="text-sm tracking-wide">Home</span>
        </button>

        {/* Search Option */}
        <button
          onClick={() => { setActiveTab('search'); setCurrentPlaylist(null); }}
          className={`w-full flex items-center gap-5 py-2.5 px-2 rounded-lg font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'search'
              ? 'text-white'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[26px]">search</span>
          <span className="text-sm tracking-wide">Search</span>
        </button>

        {/* Podcasts Option */}
        <button
          onClick={() => { setActiveTab('podcasts'); setCurrentPlaylist(null); }}
          className={`w-full flex items-center gap-5 py-2.5 px-2 rounded-lg font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'podcasts'
              ? 'text-white'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[26px]">podcasts</span>
          <span className="text-sm tracking-wide">Podcasts</span>
        </button>

        {/* Live Radio Option */}
        <button
          onClick={() => { setActiveTab('radio'); setCurrentPlaylist(null); }}
          className={`w-full flex items-center gap-5 py-2.5 px-2 rounded-lg font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'radio'
              ? 'text-white'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[26px]">radio</span>
          <span className="text-sm tracking-wide">Live Radio</span>
        </button>
      </div>

      {/* Bottom Panel: Your Library */}
      <div className="bg-[#121212] rounded-xl flex-1 p-4 flex flex-col min-h-0">
        
        {/* Library Header */}
        <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-white/5">
          <div className="flex items-center gap-3 text-[#b3b3b3] hover:text-white transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[26px]">library_music</span>
            <span className="text-sm font-bold tracking-wide">Your Library</span>
          </div>
          
          <button 
            onClick={onAddPlaylist}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="Create Playlist"
          >
            <span className="material-symbols-outlined text-xl">add</span>
          </button>
        </div>

        {/* Scrollable Shelf */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 hide-scrollbar">
          
          {/* Liked Songs Entry */}
          <div
            onClick={() => handlePlaylistClick('liked')}
            className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
              activeTab === 'library' && currentPlaylist === 'liked'
                ? 'bg-[#2a2a2a]'
                : 'hover:bg-white/5'
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#450e4b] to-[#7652c6] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[22px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-bold text-sm truncate ${activeTab === 'library' && currentPlaylist === 'liked' ? 'text-primary' : 'text-white'}`}>
                Liked Songs
              </p>
              <p className="text-xs text-[#b3b3b3] font-medium tracking-wide">
                Playlist • Dynamic
              </p>
            </div>
          </div>

          {/* Local files folder */}
          <div
            onClick={() => handlePlaylistClick('local')}
            className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
              activeTab === 'library' && currentPlaylist === 'local'
                ? 'bg-[#2a2a2a]'
                : 'hover:bg-white/5'
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-[#282828] flex items-center justify-center shadow-md border border-white/5">
              <span className="material-symbols-outlined text-[22px] text-primary">folder_open</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-bold text-sm truncate ${activeTab === 'library' && currentPlaylist === 'local' ? 'text-primary' : 'text-white'}`}>
                Local Audio Files
              </p>
              <p className="text-xs text-[#b3b3b3] font-medium tracking-wide">
                Folder • Device
              </p>
            </div>
          </div>

          {/* Playlists Loop */}
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => handlePlaylistClick(pl.id)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                activeTab === 'library' && currentPlaylist === pl.id
                  ? 'bg-[#2a2a2a]'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="w-12 h-12 rounded-lg bg-[#282828] flex items-center justify-center shadow-md border border-white/5 text-[#b3b3b3] group-hover:text-white">
                <span className="material-symbols-outlined text-[22px]">music_note</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-bold text-sm truncate ${activeTab === 'library' && currentPlaylist === pl.id ? 'text-primary' : 'text-white'}`}>
                  {pl.name}
                </p>
                <p className="text-xs text-[#b3b3b3] font-medium tracking-wide">
                  Playlist • User
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Profile block */}
        <div className="pt-3 mt-auto border-t border-white/5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#181818] border border-white/5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-surface-container-high overflow-hidden border border-white/10 flex-shrink-0 flex items-center justify-center">
                {user ? (
                  <img
                    alt={user.displayName || 'User profile'}
                    className="w-full h-full object-cover"
                    src={user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"}
                  />
                ) : (
                  <span className="material-symbols-outlined text-lg text-[#b3b3b3]">person</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-white truncate">
                  {user ? (user.displayName || (user.email ? user.email.split('@')[0] : 'VibeDeck User')) : 'Offline Mode'}
                </p>
                <p className="text-[8px] text-primary uppercase tracking-widest font-extrabold truncate">
                  {user ? 'Cloud Sync Active' : 'Local Storage Only'}
                </p>
              </div>
            </div>
            {user && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAuthClick();
                }}
                className="p-1.5 rounded-full text-[#b3b3b3] hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center cursor-pointer"
                title="Log Out"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}
