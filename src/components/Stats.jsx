import React, { useEffect, useMemo, useState, useRef } from 'react';

/* ─────────────────────────────────────────────
   Tiny animated count-up number
───────────────────────────────────────────── */
const CountUp = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!end) return;
    let start = null;
    const raf = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setCount(Math.floor(ease * end));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [end, duration]);
  return <span>{count.toLocaleString()}</span>;
};

/* ─────────────────────────────────────────────
   Live "Now" pulse badge
───────────────────────────────────────────── */
const LiveBadge = () => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-[0.25em] px-2.5 py-1">
    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
    Live
  </span>
);

/* ─────────────────────────────────────────────
   Real-time "Now Listening" header bar
───────────────────────────────────────────── */
const NowListeningBar = ({ currentTrack, isPlaying, currentTime, accentColor }) => {
  if (!currentTrack) return null;

  const elapsed = Math.round(currentTime);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const accentH = accentColor?.h ?? 200;
  const accentS = Math.min(accentColor?.s ?? 70, 60);

  return (
    <div
      className="rounded-2xl border border-white/10 p-4 mb-5 flex items-center gap-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, hsl(${accentH},${accentS}%,14%), hsl(${accentH},${accentS}%,8%))`,
      }}
    >
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,white,transparent)]" />

      {/* Cover art with spin when playing */}
      <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-lg ${isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''}`}>
        {currentTrack.coverUrl
          ? <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-white/10 flex items-center justify-center"><span className="material-symbols-outlined text-white/40">music_note</span></div>
        }
      </div>

      <div className="flex-1 min-w-0 z-10">
        <div className="flex items-center gap-2 mb-1">
          <LiveBadge />
          {isPlaying && (
            <div className="flex items-end gap-[2px] h-4">
              {[0,1,2].map(i => (
                <div key={i} className="w-[3px] rounded-full bg-white/60 animate-soundBar"
                  style={{ height: `${10 + i * 3}px`, animationDelay: `${i * 0.18}s` }} />
              ))}
            </div>
          )}
        </div>
        <p className="text-white font-black text-sm truncate">{currentTrack.title}</p>
        <p className="text-white/60 text-xs truncate">{currentTrack.artist}</p>
      </div>

      {/* Elapsed */}
      <div className="shrink-0 text-right z-10">
        <p className="font-mono text-xs text-white/40">elapsed</p>
        <p className="font-mono text-sm text-white font-bold">{mm}:{ss}</p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Streak calculator
───────────────────────────────────────────── */
function calcStreak(analytics) {
  const monthly = Object.values(analytics?.monthly || {});
  const keys = monthly.map(m => m.key).sort();
  if (!keys.length) return 0;

  let streak = 1, maxStreak = 1;
  for (let i = 1; i < keys.length; i++) {
    const [y1, m1] = keys[i - 1].split('-').map(Number);
    const [y2, m2] = keys[i].split('-').map(Number);
    const diff = (y2 - y1) * 12 + (m2 - m1);
    if (diff === 1) { streak++; maxStreak = Math.max(maxStreak, streak); }
    else { streak = 1; }
  }
  return maxStreak;
}

/* ─────────────────────────────────────────────
   Mini bar chart for monthly listening
───────────────────────────────────────────── */
const MonthlyBarChart = ({ monthlyList }) => {
  const max = Math.max(...monthlyList.map(m => m.listeningTime), 1);
  const last8 = monthlyList.slice(-8);

  return (
    <div className="flex items-end gap-2 h-28 mt-2">
      {last8.map((m) => {
        const pct = Math.max(6, (m.listeningTime / max) * 100);
        const label = m.label?.split(' ')[0]?.substring(0, 3) || m.key;
        return (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-1 group">
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-[#3b82f6] to-[#93c5fd] opacity-80 group-hover:opacity-100 transition-all"
              style={{ height: `${pct}%`, transition: 'height 1.2s cubic-bezier(0.22,1,0.36,1)' }}
            />
            <span className="text-[8px] text-white/40 font-bold uppercase">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Day-of-week heatmap
───────────────────────────────────────────── */
const DayHeatmap = ({ songs }) => {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Distribute by total listening time mod 7 (simulated from data)
  const songList = Object.values(songs || {});
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  songList.forEach((s, i) => {
    buckets[i % 7] += (s.listeningTime || 0);
  });
  const max = Math.max(...buckets, 1);

  return (
    <div className="flex gap-2 items-end mt-2">
      {DAYS.map((day, i) => {
        const intensity = buckets[i] / max;
        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-md transition-all duration-700"
              style={{
                height: `${Math.max(8, intensity * 48)}px`,
                background: `rgba(59, 130, 246, ${0.15 + intensity * 0.85})`,
              }}
            />
            <span className="text-[8px] font-bold text-white/40">{day[0]}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Stats Component
───────────────────────────────────────────── */
const Stats = function Stats({ analytics, currentTrack, isPlaying, currentTime, accentColor }) {
  const {
    totalListeningTime = 0,
    totalPlayCount = 0,
    songs = {},
    artists = {},
    monthly = {}
  } = analytics || {};

  const [animateIn, setAnimateIn] = useState(false);
  const [activeSection, setActiveSection] = useState('live');  // live | overview | songs | artists | journey
  const [isStoryActive, setIsStoryActive] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const TOTAL_SLIDES = 8;

  useEffect(() => { setAnimateIn(true); }, []);

  const songsList = useMemo(() => Object.values(songs), [songs]);
  const artistsList = useMemo(() => Object.values(artists), [artists]);

  const monthlyList = useMemo(() =>
    Object.entries(monthly)
      .map(([key, value]) => ({
        key,
        label: value.label || key,
        listeningTime: value.listeningTime || 0,
        playCount: value.playCount || 0,
        songs: value.songs || {},
        artists: value.artists || {},
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    [monthly]
  );

  const topSongs = useMemo(() =>
    [...songsList].sort((a, b) => b.playCount - a.playCount || b.listeningTime - a.listeningTime).slice(0, 10),
    [songsList]
  );

  const topArtists = useMemo(() =>
    [...artistsList].sort((a, b) => b.playCount - a.playCount || b.listeningTime - a.listeningTime).slice(0, 5),
    [artistsList]
  );

  const topGenres = useMemo(() => {
    const map = {};
    songsList.forEach(s => {
      const g = s.genre || 'Unknown';
      map[g] = (map[g] || 0) + (s.listeningTime || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 1);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([genre, time]) => ({ genre, time, pct: Math.round((time / total) * 100) }));
  }, [songsList]);

  const totalMinutes = Math.round(totalListeningTime / 60);
  const hoursListened = (totalMinutes / 60).toFixed(1);
  const streak = calcStreak(analytics);

  // Songs per hour average
  const avgPerHour = totalMinutes > 0 ? ((totalPlayCount / (totalMinutes / 60))).toFixed(1) : 0;

  // "Most active" month
  const topMonth = useMemo(() =>
    [...monthlyList].sort((a, b) => b.listeningTime - a.listeningTime)[0] || null,
    [monthlyList]
  );

  const persona = useMemo(() => {
    if (totalListeningTime === 0) return { title: 'The Silent Listener', desc: 'Tune in to unlock your identity.', icon: 'insights', gradient: 'from-[#38bdf8] to-[#1d4ed8]' };
    const g = (topGenres[0]?.genre || '').toLowerCase();
    if (g.includes('lofi') || g.includes('chill') || g.includes('ambient')) return { title: 'Deep Ambient Dreamer', desc: 'Calm, atmospheric sounds define your world.', icon: 'nights_stay', gradient: 'from-[#60a5fa] to-[#1e3a8a]' };
    if (g.includes('punjabi') || g.includes('dance') || g.includes('pop') || g.includes('hip hop')) return { title: 'Sonic Trendsetter', desc: 'High-tempo, rhythm-forward hooks fuel you.', icon: 'electric_bolt', gradient: 'from-[#93c5fd] to-[#1d4ed8]' };
    return { title: 'Vibe Connoisseur', desc: 'Your palette is broad, bridging eras seamlessly.', icon: 'star', gradient: 'from-[#bfdbfe] to-[#2563eb]' };
  }, [topGenres, totalListeningTime]);

  const formatTime = (secs) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  };

  // ─── Story slides logic ───
  const nextSlide = () => { if (currentSlide < TOTAL_SLIDES - 1) setCurrentSlide(p => p + 1); else setIsStoryActive(false); };
  const prevSlide = () => { if (currentSlide > 0) setCurrentSlide(p => p - 1); };
  useEffect(() => {
    if (!isStoryActive || currentSlide === TOTAL_SLIDES - 1) return;
    const t = setTimeout(nextSlide, 6000);
    return () => clearTimeout(t);
  }, [isStoryActive, currentSlide]);

  const SECTION_TABS = [
    { id: 'live',     icon: 'sensors',       label: 'Live'     },
    { id: 'overview', icon: 'dashboard',     label: 'Overview' },
    { id: 'songs',    icon: 'queue_music',   label: 'Songs'    },
    { id: 'artists',  icon: 'artist',        label: 'Artists'  },
    { id: 'journey',  icon: 'show_chart',    label: 'Journey'  },
  ];

  // Empty state
  if (totalListeningTime === 0 && !currentTrack) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center text-center px-6 py-20 text-white bg-black">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10 animate-pulse">
          <span className="material-symbols-outlined text-4xl text-[#38bdf8]">headphones</span>
        </div>
        <h2 className="text-2xl font-black mb-2">Your Wrapped is waiting</h2>
        <p className="text-sm text-[#b3b3b3] max-w-sm">
          Start listening! Vibe Deck tracks every play, artist, genre and mood right here in real time.
        </p>
      </div>
    );
  }

  // Story view
  if (isStoryActive) {
    return <StoryView
      currentSlide={currentSlide}
      totalSlides={TOTAL_SLIDES}
      onNext={nextSlide}
      onPrev={prevSlide}
      onClose={() => setIsStoryActive(false)}
      topSongs={topSongs}
      topArtists={topArtists}
      topGenres={topGenres}
      totalMinutes={totalMinutes}
      hoursListened={hoursListened}
      monthlyList={monthlyList}
      totalPlayCount={totalPlayCount}
      persona={persona}
      formatTime={formatTime}
      streak={streak}
    />;
  }

  // Dashboard view
  return (
    <div className={`min-h-full bg-[#090909] text-white pb-44 pt-4 transition-opacity duration-700 ${animateIn ? 'opacity-100' : 'opacity-0'}`}>

      {/* CSS injections */}
      <style>{`
        @keyframes soundBar2 { 0%,100%{transform:scaleY(.3)} 50%{transform:scaleY(1)} }
        .stat-soundbar { animation: soundBar2 .8s ease-in-out infinite; transform-origin: bottom; }
      `}</style>

      {/* Header */}
      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Wrapped</h1>
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mt-0.5">Your listening universe</p>
          </div>
          <button
            onClick={() => { setIsStoryActive(true); setCurrentSlide(0); }}
            className="flex items-center gap-2 bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white text-xs font-black px-4 py-2.5 rounded-full shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            Open Story
          </button>
        </div>

        {/* Section Tab Switcher */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {SECTION_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all
                ${activeSection === tab.id
                  ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white/8 text-white/60 hover:bg-white/12'
                }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5">

        {/* ── LIVE section ── */}
        {activeSection === 'live' && (
          <div className="space-y-5 animate-fadeInGate">
            <NowListeningBar
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              accentColor={accentColor}
            />

            {/* Session stats - real time */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon="play_circle"
                label="Total Plays"
                value={<CountUp end={totalPlayCount} />}
                sub="all time"
                color="#3b82f6"
              />
              <StatCard
                icon="schedule"
                label="Hours"
                value={<CountUp end={Math.round(totalMinutes / 60)} />}
                sub="listened"
                color="#60a5fa"
              />
              <StatCard
                icon="local_fire_department"
                label="Month Streak"
                value={<CountUp end={streak} />}
                sub="months active"
                color="#f59e0b"
              />
              <StatCard
                icon="speed"
                label="Avg / Hour"
                value={avgPerHour}
                sub="songs played"
                color="#34d399"
              />
            </div>

            {/* Genre breakdown donut-style */}
            {topGenres.length > 0 && (
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4">
                <p className="text-xs font-black text-white/50 uppercase tracking-wider mb-3">Genre DNA</p>
                <div className="space-y-2.5">
                  {topGenres.map((g, i) => (
                    <div key={g.genre}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-white">{g.genre}</span>
                        <span className="text-xs font-mono text-[#60a5fa]">{g.pct}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#93c5fd]"
                          style={{
                            width: `${g.pct}%`,
                            transition: `width ${0.8 + i * 0.15}s cubic-bezier(0.22,1,0.36,1)`,
                            opacity: 1 - i * 0.12,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day of week heatmap */}
            {songsList.length > 0 && (
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4">
                <p className="text-xs font-black text-white/50 uppercase tracking-wider mb-1">Listening Activity</p>
                <p className="text-[10px] text-white/30 mb-2">Estimated weekly distribution</p>
                <DayHeatmap songs={songs} />
              </div>
            )}
          </div>
        )}

        {/* ── OVERVIEW section ── */}
        {activeSection === 'overview' && (
          <div className="space-y-4 animate-fadeInGate">
            {/* Persona card */}
            <div className={`rounded-3xl p-5 bg-gradient-to-br ${persona.gradient} relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,white,transparent)]" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-3xl text-white">{persona.icon}</span>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/70">Your Listener Persona</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{persona.title}</h3>
                  <p className="text-xs text-white/80 mt-0.5 max-w-[220px]">{persona.desc}</p>
                </div>
              </div>
            </div>

            {/* Big stats */}
            <div className="grid grid-cols-3 gap-3">
              <BigStatCard label="Minutes" value={<CountUp end={totalMinutes} />} icon="schedule" />
              <BigStatCard label="Songs" value={<CountUp end={songsList.length} />} icon="music_note" />
              <BigStatCard label="Artists" value={<CountUp end={artistsList.length} />} icon="person" />
            </div>

            {/* Most active month */}
            {topMonth && (
              <div className="rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#0f1e30] border border-[#3b82f6]/20 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center border border-[#3b82f6]/30">
                  <span className="material-symbols-outlined text-[#60a5fa]">star</span>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#60a5fa]">Most Active Month</p>
                  <p className="text-white font-black text-base">{topMonth.label}</p>
                  <p className="text-white/50 text-xs">{formatTime(topMonth.listeningTime)} • {topMonth.playCount} plays</p>
                </div>
              </div>
            )}

            {/* Top genre breakdown */}
            {topGenres.length > 0 && (
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4">
                <p className="text-xs font-black text-white/50 uppercase tracking-wider mb-3">Top Genres</p>
                <div className="flex flex-wrap gap-2">
                  {topGenres.map((g, i) => (
                    <span
                      key={g.genre}
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        background: `rgba(59,130,246,${0.15 + i * 0.04})`,
                        border: `1px solid rgba(59,130,246,${0.3 - i * 0.04})`,
                        color: `rgba(255,255,255,${0.9 - i * 0.12})`,
                      }}
                    >
                      {g.genre} <span className="opacity-60">{g.pct}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SONGS section ── */}
        {activeSection === 'songs' && (
          <div className="space-y-3 animate-fadeInGate">
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Top {topSongs.length} Tracks</p>
            {topSongs.map((song, idx) => (
              <div
                key={song.id}
                className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl p-3 transition-colors hover:bg-white/8"
                style={{ animationDelay: `${idx * 0.06}s` }}
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0 flex items-center justify-center">
                  {idx === 0 ? <span className="material-symbols-outlined text-amber-400 text-xl">workspace_premium</span>
                  : idx === 1 ? <span className="material-symbols-outlined text-slate-300 text-xl">military_tech</span>
                  : idx === 2 ? <span className="material-symbols-outlined text-amber-600 text-xl">military_tech</span>
                  : <span className="text-white/30 font-mono text-xs font-bold">#{idx + 1}</span>}
                </div>

                {/* Art */}
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
                  {song.coverUrl
                    ? <img src={song.coverUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-white/10 flex items-center justify-center"><span className="material-symbols-outlined text-white/30 text-sm">music_note</span></div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{song.title}</p>
                  <p className="text-xs text-white/50 truncate">{song.artist}</p>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono text-[#60a5fa] font-bold">{song.playCount}×</p>
                  <p className="text-[10px] text-white/30">{formatTime(song.listeningTime)}</p>
                </div>
              </div>
            ))}
            {topSongs.length === 0 && (
              <p className="text-center text-white/30 text-sm py-10">No songs tracked yet</p>
            )}
          </div>
        )}

        {/* ── ARTISTS section ── */}
        {activeSection === 'artists' && (
          <div className="space-y-3 animate-fadeInGate">
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Your Top Artists</p>
            {topArtists.map((artist, idx) => {
              const maxTime = topArtists[0]?.listeningTime || 1;
              const pct = (artist.listeningTime / maxTime) * 100;
              return (
                <div key={artist.name} className="bg-white/5 border border-white/5 rounded-2xl p-4 overflow-hidden relative">
                  {/* Progress bg */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-10 bg-gradient-to-r from-[#3b82f6] to-transparent transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0">
                      {artist.imageUrl
                        ? <img src={artist.imageUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-[#3b82f6]/20 flex items-center justify-center font-black text-[#60a5fa]">{artist.name[0]}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <span className="material-symbols-outlined text-amber-400 text-sm">workspace_premium</span>}
                        <p className="text-sm font-black text-white truncate">{artist.name}</p>
                      </div>
                      <p className="text-xs text-white/40">{artist.playCount} plays · {formatTime(artist.listeningTime)}</p>
                    </div>
                    <div className="shrink-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/8">
                      <span className="text-xs font-black text-white/50">#{idx + 1}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {topArtists.length === 0 && (
              <p className="text-center text-white/30 text-sm py-10">No artists tracked yet</p>
            )}
          </div>
        )}

        {/* ── JOURNEY section ── */}
        {activeSection === 'journey' && (
          <div className="space-y-5 animate-fadeInGate">
            {/* Monthly chart */}
            {monthlyList.length > 0 ? (
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4">
                <p className="text-xs font-black text-white/50 uppercase tracking-wider mb-1">Monthly Listening</p>
                <p className="text-[10px] text-white/30 mb-2">Last {Math.min(monthlyList.length, 8)} months</p>
                <MonthlyBarChart monthlyList={monthlyList} />
              </div>
            ) : (
              <div className="rounded-2xl bg-white/5 border border-white/8 p-6 text-center">
                <span className="material-symbols-outlined text-3xl text-white/20 mb-2">show_chart</span>
                <p className="text-white/30 text-sm">Not enough data yet</p>
              </div>
            )}

            {/* Month by month breakdown */}
            {monthlyList.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black text-white/40 uppercase tracking-wider">Month Breakdown</p>
                {[...monthlyList].reverse().map((m) => {
                  const maxTime = Math.max(...monthlyList.map(x => x.listeningTime), 1);
                  const pct = (m.listeningTime / maxTime) * 100;
                  return (
                    <div key={m.key} className="rounded-xl bg-white/5 border border-white/5 p-3 flex items-center gap-3">
                      <div className="w-2 rounded-full bg-[#3b82f6]" style={{ height: `${Math.max(8, pct * 0.4)}px` }} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{m.label}</p>
                        <p className="text-[10px] text-white/40">{m.playCount} plays · {formatTime(m.listeningTime)}</p>
                      </div>
                      <span className="text-xs font-mono text-[#60a5fa]">{formatTime(m.listeningTime)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Streak */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 text-amber-400">
                <span className="material-symbols-outlined text-2xl">local_fire_department</span>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-amber-400">Longest Streak</p>
                <p className="text-2xl font-black text-white">{streak} <span className="text-sm font-medium text-white/60">months</span></p>
                <p className="text-xs text-white/40">consecutive active months</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Small Stat Card
───────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/8 p-4 flex flex-col gap-2">
      <span className="material-symbols-outlined text-xl" style={{ color }}>{icon}</span>
      <div>
        <p className="text-xl font-black text-white">{value}</p>
        <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{label}</p>
        <p className="text-[9px] text-white/25">{sub}</p>
      </div>
    </div>
  );
}

function BigStatCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/8 p-3 text-center">
      <span className="material-symbols-outlined text-lg text-[#60a5fa] mb-1">{icon}</span>
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">{label}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Story View (unchanged slides + improvements)
───────────────────────────────────────────── */
function StoryView({
  currentSlide, totalSlides, onNext, onPrev, onClose,
  topSongs, topArtists, topGenres, totalMinutes, hoursListened,
  monthlyList, totalPlayCount, persona, formatTime, streak
}) {
  const orbColors = [
    ['from-[#60a5fa]','to-[#1d4ed8]'],
    ['from-[#38bdf8]','to-[#2563eb]'],
    ['from-[#93c5fd]','to-[#1e3a8a]'],
    ['from-[#60a5fa]','to-[#2563eb]'],
    ['from-[#3b82f6]','to-[#1e3a8a]'],
    ['from-[#38bdf8]','to-[#1d4ed8]'],
    [persona.gradient.split(' ')[1], persona.gradient.split(' ')[2] || persona.gradient.split(' ')[1]],
    ['from-[#60a5fa]','to-[#3b82f6]'],
  ];
  const orbs = orbColors[currentSlide] || orbColors[0];

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black text-white md:p-4">
      <div className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-[#050505] px-6 pb-[calc(10rem+env(safe-area-inset-bottom,0px))] pt-[calc(3rem+env(safe-area-inset-top,0px))] md:mx-auto md:min-h-[calc(100dvh-2rem)] md:max-w-md md:rounded-[36px] md:shadow-2xl border border-white/10">

        {/* Progress bars */}
        <div className="absolute left-6 right-6 top-[calc(1.25rem+env(safe-area-inset-top,0px))] z-40 flex gap-1.5 md:top-5">
          {[...Array(totalSlides)].map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full bg-white rounded-full transition-all ${
                i < currentSlide ? 'w-full' : i === currentSlide ? (currentSlide === totalSlides - 1 ? 'w-full' : 'animate-[storyBar_6s_linear_forwards]') : 'w-0'
              }`} />
            </div>
          ))}
        </div>

        {/* Dynamic orb backgrounds */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-1/4 -right-1/4 w-[150%] h-[150%] bg-gradient-to-bl ${orbs[0]} ${orbs[1]} opacity-20 blur-[120px] transition-all duration-1000`} />
          <div className={`absolute -bottom-1/4 -left-1/4 w-[120%] h-[120%] bg-gradient-to-tr ${orbs[1]} ${orbs[0]} opacity-20 blur-[100px] transition-all duration-1000`} />
        </div>

        <style>{`
          @keyframes storyBar { from{width:0%} to{width:100%} }
          @keyframes floatUp { from{opacity:0;transform:translateY(30px) scale(.95);filter:blur(8px)} to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)} }
          .animate-floatUp { animation: floatUp .8s cubic-bezier(.16,1,.3,1) both; }
          .animate-floatUp-delayed { animation: floatUp .8s cubic-bezier(.16,1,.3,1) .2s both; }
          .receipt-edge-top { background: linear-gradient(135deg, transparent 5px, #f8f9fa 5px) -5px 0, linear-gradient(-135deg, transparent 5px, #f8f9fa 5px) -5px 0; background-size: 10px 10px; background-repeat: repeat-x; height: 10px; width: 100%; }
          .receipt-edge-bottom { background: linear-gradient(45deg, transparent 5px, #f8f9fa 5px) -5px 0, linear-gradient(-45deg, transparent 5px, #f8f9fa 5px) -5px 0; background-size: 10px 10px; background-repeat: repeat-x; height: 10px; width: 100%; }
        `}</style>

        {/* Nav tap zones */}
        <button onClick={onPrev} className="absolute left-0 top-24 bottom-24 w-1/4 z-30 cursor-pointer outline-none" />
        <button onClick={onNext} className="absolute right-0 top-24 bottom-24 w-1/4 z-30 cursor-pointer outline-none" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white/50">Wrapped '26</span>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center cursor-pointer transition-all relative z-40">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Slide content */}
        <div className="relative z-20 flex flex-1 flex-col justify-center py-6">

          {/* SLIDE 0: Welcome */}
          {currentSlide === 0 && (
            <div className="space-y-8 text-center animate-floatUp">
              <div className="w-28 h-28 rounded-[36px] bg-gradient-to-tr from-[#60a5fa] to-[#1d4ed8] p-[2px] mx-auto shadow-[0_0_40px_rgba(96,165,250,0.4)]">
                <div className="w-full h-full rounded-[34px] bg-black/80 flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-[#60a5fa]">graphic_eq</span>
                </div>
              </div>
              <div>
                <h2 className="text-[2.75rem] font-black tracking-tight leading-[1] text-white">Your Sound,<br/><span className="bg-gradient-to-r from-[#93c5fd] via-[#3b82f6] to-[#1d4ed8] bg-clip-text text-transparent">Decoded.</span></h2>
                <p className="mt-5 text-sm text-[#b3b3b3] max-w-[260px] mx-auto leading-relaxed font-medium">Every beat, loop and late-night spin — analyzed.</p>
              </div>
            </div>
          )}

          {/* SLIDE 1: Listening Time */}
          {currentSlide === 1 && (
            <div className="space-y-8 text-center animate-floatUp">
              <div className="inline-flex items-center gap-2 mx-auto rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-bold text-white">
                <span className="material-symbols-outlined text-sm text-[#60a5fa]">schedule</span>
                TIME WELL SPENT
              </div>
              <div className="space-y-3">
                <p className="text-[5rem] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_30px_rgba(96,165,250,0.4)]"><CountUp end={totalMinutes} /></p>
                <p className="text-xl font-black tracking-widest uppercase bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] bg-clip-text text-transparent">Minutes Listened</p>
              </div>
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 max-w-[300px] mx-auto animate-floatUp-delayed">
                <p className="text-sm text-white/90 leading-relaxed font-medium">
                  That's <strong className="text-[#60a5fa] text-base">{hoursListened} hours</strong> of audio immersion across <strong className="text-[#93c5fd] text-base">{monthlyList.length} active</strong> months.
                </p>
              </div>
            </div>
          )}

          {/* SLIDE 2: Top Genres */}
          {currentSlide === 2 && (
            <div className="space-y-6 animate-floatUp">
              <div className="text-center mb-8">
                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[#60a5fa]">Your Sonic DNA</p>
                <h3 className="text-4xl font-black text-white mt-1">Top Genres</h3>
              </div>
              <div className="space-y-4 px-2">
                {topGenres.slice(0,5).map((g, idx) => {
                  const maxTime = topGenres[0].time;
                  const width = `${Math.max(15, Math.round((g.time / maxTime) * 100))}%`;
                  return (
                    <div key={idx} className="animate-floatUp" style={{ animationDelay: `${idx * 0.15}s` }}>
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-sm font-bold text-white uppercase tracking-wider">{g.genre}</span>
                        <span className="text-[10px] font-mono text-[#93c5fd]">{formatTime(g.time)}</span>
                      </div>
                      <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-[#93c5fd] to-[#1d4ed8] rounded-full" style={{ width, transition: 'width 1.5s cubic-bezier(0.22,1,0.36,1)', transitionDelay: '0.3s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SLIDE 3: Top Track */}
          {currentSlide === 3 && topSongs[0] && (
            <div className="space-y-8 text-center animate-floatUp">
              <div className="relative mx-auto h-48 w-48 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#111] border border-white/10 shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-[spin_10s_linear_infinite]">
                  <img src={topSongs[0].coverUrl} alt="" className="w-full h-full object-cover rounded-full opacity-90 scale-[0.85]" />
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_38%,rgba(0,0,0,0.85)_41%,transparent_45%,rgba(0,0,0,0.85)_46%,transparent_50%,rgba(0,0,0,0.6)_55%)] pointer-events-none" />
                </div>
                <div className="relative z-10 w-12 h-12 rounded-full bg-black border border-white/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#12131a]" />
                </div>
              </div>
              <div className="animate-floatUp-delayed">
                <p className="text-[11px] uppercase font-black tracking-[0.3em] text-[#60a5fa]">Song of the Year</p>
                <h3 className="line-clamp-2 text-3xl font-black text-white mt-2 px-4">{topSongs[0].title}</h3>
                <p className="text-sm text-white/70 mt-1 truncate px-8">{topSongs[0].artist}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-black/40 border border-white/10 px-5 py-2 text-xs font-mono text-white animate-floatUp-delayed">
                <span className="material-symbols-outlined text-base text-[#60a5fa]">play_circle</span>
                Played {topSongs[0].playCount} times
              </div>
            </div>
          )}

          {/* SLIDE 4: Top 5 Tracks */}
          {currentSlide === 4 && (
            <div className="space-y-5 animate-floatUp">
              <div className="text-center mb-6">
                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[#60a5fa]">Heavy Rotation</p>
                <h3 className="text-3xl font-black text-white mt-1">Top 5 Tracks</h3>
              </div>
              <div className="space-y-3">
                {topSongs.slice(0,5).map((song, idx) => (
                  <div key={song.id} className="flex items-center gap-4 bg-black/40 border border-white/5 rounded-xl p-3 animate-floatUp" style={{ animationDelay: `${idx * 0.15}s` }}>
                    <div className="w-12 h-12 rounded-md overflow-hidden shrink-0">
                      <img src={song.coverUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate text-sm">{song.title}</p>
                      <p className="text-xs text-white/60 truncate">{song.artist}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-[#60a5fa] font-bold">#{idx + 1}</p>
                      <p className="text-[10px] text-white/30">{song.playCount}×</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 5: Top Artist */}
          {currentSlide === 5 && topArtists[0] && (
            <div className="space-y-8 text-center animate-floatUp">
              <div className="relative mx-auto h-48 w-48 rounded-full p-[3px] bg-gradient-to-tr from-[#60a5fa] to-[#1d4ed8] shadow-[0_0_50px_rgba(96,165,250,0.4)]">
                <div className="w-full h-full rounded-full bg-[#12131a] overflow-hidden flex items-center justify-center font-black text-5xl text-white relative">
                  {topArtists[0].imageUrl ? <img src={topArtists[0].imageUrl} alt="" className="w-full h-full object-cover" /> : <span>{topArtists[0].name[0]}</span>}
                  <div className="absolute inset-0 rounded-full shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] pointer-events-none" />
                </div>
              </div>
              <div className="animate-floatUp-delayed">
                <p className="text-[11px] uppercase font-black tracking-[0.3em] text-[#60a5fa]">Your #1 Artist</p>
                <h3 className="truncate text-[2.5rem] font-black text-white mt-1 px-2">{topArtists[0].name}</h3>
                <div className="mt-4 inline-block bg-black/40 rounded-2xl border border-white/10 px-6 py-3">
                  <p className="text-sm text-white/90 font-medium">You spent <strong className="text-[#93c5fd]">{formatTime(topArtists[0].listeningTime)}</strong> with them.</p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 6: Streak + Persona */}
          {currentSlide === 6 && (
            <div className="space-y-6 text-center animate-floatUp">
              {/* Streak */}
              <div className="inline-flex items-center gap-3 bg-black/40 border border-amber-500/20 rounded-2xl px-6 py-3">
                <span className="material-symbols-outlined text-amber-400 text-3xl">local_fire_department</span>
                <div className="text-left">
                  <p className="text-[9px] uppercase tracking-widest text-amber-400 font-black">Best Streak</p>
                  <p className="text-2xl font-black text-white">{streak} <span className="text-sm font-medium text-white/50">months</span></p>
                </div>
              </div>

              {/* Persona */}
              <div className={`rounded-3xl p-5 bg-gradient-to-br ${persona.gradient} relative overflow-hidden mx-2`}>
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,white,transparent)]" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-white">{persona.icon}</span>
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-white/70 font-black">Your Persona</p>
                  <h3 className="text-2xl font-black text-white">{persona.title}</h3>
                  <p className="text-sm text-white/80 max-w-[240px] leading-relaxed">{persona.desc}</p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 7: Receipt */}
          {currentSlide === 7 && (
            <div className="flex flex-col items-center justify-center h-full animate-floatUp max-h-[70vh]">
              <div className="w-full max-w-[320px] bg-[#f8f9fa] text-black shadow-2xl flex flex-col font-mono text-sm overflow-hidden">
                <div className="receipt-edge-top" />
                <div className="px-6 py-4 overflow-y-auto hide-scrollbar">
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-black tracking-tighter uppercase font-sans">Vibe Deck</h4>
                    <p className="text-[10px] uppercase tracking-widest text-black/60 mt-1">Wrapped '26 Receipt</p>
                    <p className="text-[10px] text-black/40 mt-1">{new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="border-b-2 border-dashed border-black/20 pb-4 mb-4 space-y-2">
                    <div className="flex justify-between font-bold"><span>TOTAL MINUTES</span><span>{totalMinutes.toLocaleString()}</span></div>
                    <div className="flex justify-between text-black/70"><span>TOTAL PLAYS</span><span>{totalPlayCount}</span></div>
                    <div className="flex justify-between text-black/70"><span>TOP ARTIST</span><span className="truncate ml-2">{topArtists[0]?.name || 'N/A'}</span></div>
                    <div className="flex justify-between text-black/70"><span>STREAK</span><span>{streak} months</span></div>
                    <div className="flex justify-between text-black/70"><span>PERSONA</span><span className="truncate ml-2">{persona.title.split(' ')[0]}</span></div>
                  </div>
                  <div className="border-b-2 border-dashed border-black/20 pb-4 mb-4">
                    <p className="font-bold mb-2">TOP 5 TRACKS</p>
                    {topSongs.slice(0,5).map((song, idx) => (
                      <div key={song.id} className="flex justify-between text-black/80 mb-1 text-xs">
                        <span className="truncate mr-2">0{idx + 1} {song.title.substring(0, 15)}</span>
                        <span>{song.playCount}×</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-center pt-2 pb-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Ean-13-5901234123457.svg" alt="barcode" className="h-10 mx-auto opacity-70" />
                    <p className="text-[8px] tracking-[0.4em] mt-2 opacity-60">THANK YOU FOR LISTENING</p>
                  </div>
                </div>
                <div className="receipt-edge-bottom" />
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="relative z-20 flex items-center justify-between border-t border-white/10 pt-4 pb-2">
          <button onClick={onPrev} disabled={currentSlide === 0} className="text-xs font-bold text-white/50 hover:text-white flex items-center gap-1 cursor-pointer disabled:opacity-0 transition-colors px-2 py-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </button>
          {currentSlide === totalSlides - 1 ? (
            <button onClick={onClose} className="bg-white text-black text-[11px] font-bold uppercase tracking-widest px-6 py-3 rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-[0_10px_20px_rgba(255,255,255,0.2)]">
              Done
            </button>
          ) : (
            <button onClick={onNext} className="text-xs font-bold text-white/80 hover:text-white flex items-center gap-1 cursor-pointer transition-colors px-2 py-1">
              Next
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Stats);
