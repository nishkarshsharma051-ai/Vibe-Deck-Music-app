import React from 'react';

const RADIO_STATIONS = [
  {
    id: "radio-1",
    title: "Lofi Hip Hop Radio",
    broadcaster: "VibeDeck Broadcast",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
    coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300",
    frequency: "98.7 FM",
    description: "Relaxing beats to study, work, or unwind. The official live-stream ambient channel."
  },
  {
    id: "radio-2",
    title: "Synthwave Retro Radio",
    broadcaster: "Midnight Radio Co.",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=300",
    frequency: "102.5 FM",
    description: "Cruising down neon lit highways. Late-night retrosynth loops."
  },
  {
    id: "radio-3",
    title: "Classic Rock Live",
    broadcaster: "Planet Rock",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    coverUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=300",
    frequency: "95.1 FM",
    description: "The greatest riffs and rock anthems of all time. Streaming worldwide 24/7."
  },
  {
    id: "radio-4",
    title: "Chillout Lounge Session",
    broadcaster: "Ibiza Blue",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300",
    frequency: "88.9 FM",
    description: "Smooth deep house, ambient chill, and relaxing downtempo music."
  }
];

export default function Radio({ onPlayTrack }) {
  const handleStationPlay = (station) => {
    onPlayTrack({
      id: station.id,
      title: station.title,
      artist: station.broadcaster,
      album: station.frequency,
      coverUrl: station.coverUrl,
      url: station.url,
      duration: 3600, // infinite virtual loop length
      playbackMode: "audio",
      genre: "Radio",
      isLive: true
    });
  };

  return (
    <div className="px-lg py-md space-y-8 animate-fadeIn max-w-6xl pb-40">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">radio</span>
          VibeDeck Live Radio
        </h2>
        <p className="text-[#b3b3b3] text-sm">
          Tune in to high-fidelity live audio stations curated by global tastemakers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {RADIO_STATIONS.map((station) => (
          <div
            key={station.id}
            onClick={() => handleStationPlay(station)}
            className="bg-[#181818] hover:bg-[#282828] border border-transparent hover:border-white/5 rounded-2xl p-5 flex flex-col gap-4 cursor-pointer group transition-all duration-300 shadow-lg hover:scale-[1.02]"
          >
            <div className="aspect-square rounded-xl overflow-hidden relative shadow-md bg-[#282828]">
              <img src={station.coverUrl} alt={station.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-5xl fill-1">play_circle</span>
              </div>
              <div className="absolute top-3 left-3 bg-[#38bdf8] text-black text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping"></span>
                Live
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">{station.title}</h3>
                <span className="text-[9px] text-[#b3b3b3] font-bold border border-white/10 px-1.5 py-0.5 rounded bg-[#121212]/50">{station.frequency}</span>
              </div>
              <span className="text-xs text-[#b3b3b3] font-bold block mt-1">{station.broadcaster}</span>
              <p className="text-[10px] text-[#b3b3b3]/70 line-clamp-2 mt-2 leading-relaxed">{station.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
