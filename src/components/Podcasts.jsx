import React from 'react';

const FEATURED_SHOWS = [
  {
    id: "pod-show-1",
    title: "Lex Fridman Podcast",
    publisher: "Lex Fridman",
    description: "Conversations about science, technology, history, philosophy and the nature of intelligence, consciousness, love, and power.",
    img: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=300",
    episodes: [
      { id: "pod-ep-1-1", title: "Mark Zuckerberg: Future of Meta & AI", duration: 3600, date: "Jun 1, 2026", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", coverUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=300" },
      { id: "pod-ep-1-2", title: "Elon Musk: AI, Mars, and Tesla", duration: 4200, date: "May 25, 2026", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", coverUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=300" }
    ]
  },
  {
    id: "pod-show-2",
    title: "Huberman Lab",
    publisher: "Dr. Andrew Huberman",
    description: "Dr. Andrew Huberman discusses neuroscience: how our brain and its connections with the organs of our body control our perceptions, our behaviors, and our health.",
    img: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=300",
    episodes: [
      { id: "pod-ep-2-1", title: "Sleep Toolkit: Protocol for Perfect Rest", duration: 2800, date: "May 28, 2026", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", coverUrl: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=300" },
      { id: "pod-ep-2-2", title: "Focus & ADHD: Dopamine Optimization Secrets", duration: 3200, date: "May 20, 2026", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", coverUrl: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=300" }
    ]
  },
  {
    id: "pod-show-3",
    title: "TED Talks Daily",
    publisher: "TED",
    description: "Every weekday, bring you the latest ideas in every subject imaginable — from Artificial Intelligence to Zoology, and everything in between.",
    img: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=300",
    episodes: [
      { id: "pod-ep-3-1", title: "How Generative AI Reinvents Creative Work", duration: 1200, date: "May 30, 2026", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", coverUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=300" },
      { id: "pod-ep-3-2", title: "The Power of Vulnerability in Leadership", duration: 1500, date: "May 18, 2026", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", coverUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=300" }
    ]
  }
];

export default function Podcasts({ onPlayTrack }) {
  const [selectedShow, setSelectedShow] = React.useState(null);

  const handleEpisodePlay = (show, ep) => {
    onPlayTrack({
      id: ep.id,
      title: ep.title,
      artist: show.title,
      album: show.publisher,
      coverUrl: show.img,
      url: ep.url,
      duration: ep.duration,
      playbackMode: "audio",
      genre: "Podcast"
    });
  };

  return (
    <div className="px-lg py-md space-y-8 animate-fadeIn max-w-6xl pb-40">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">podcasts</span>
          VibeDeck Podcasts
        </h2>
        <p className="text-[#b3b3b3] text-sm">
          Listen to expert dialogue, science toolkits, and curated educational lectures on-demand.
        </p>
      </div>

      {selectedShow ? (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedShow(null)}
            className="flex items-center gap-2 text-[#b3b3b3] hover:text-white transition-colors group font-bold text-xs"
          >
            <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Back to Podcasts Hub
          </button>

          <div className="flex flex-col md:flex-row gap-6 bg-[#181818] p-6 rounded-2xl border border-white/5 relative overflow-hidden">
            <img src={selectedShow.img} alt={selectedShow.title} className="w-40 h-40 rounded-xl object-cover shadow-lg flex-shrink-0" />
            <div className="flex-1 flex flex-col justify-end">
              <span className="text-[10px] text-primary uppercase font-bold tracking-widest bg-primary/10 px-3 py-1 rounded-full w-max">
                Podcast Show
              </span>
              <h3 className="text-3xl font-black text-white mt-3">{selectedShow.title}</h3>
              <p className="text-xs text-primary font-bold mt-1">{selectedShow.publisher}</p>
              <p className="text-xs text-[#b3b3b3] mt-2 leading-relaxed max-w-2xl">{selectedShow.description}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-bold text-white mb-2">Episodes List</h4>
            <div className="space-y-2">
              {selectedShow.episodes.map((ep) => (
                <div
                  key={ep.id}
                  onClick={() => handleEpisodePlay(selectedShow, ep)}
                  className="bg-[#181818] hover:bg-[#282828] border border-transparent hover:border-white/5 rounded-xl p-4 flex items-center justify-between cursor-pointer group transition-all duration-200"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#282828] flex items-center justify-center flex-shrink-0 group-hover:bg-[#38bdf8]/20 transition-all">
                      <span className="material-symbols-outlined text-[#b3b3b3] group-hover:text-primary transition-colors text-xl">play_circle</span>
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs text-white group-hover:text-primary transition-colors truncate">{ep.title}</h5>
                      <span className="text-[10px] text-[#b3b3b3] mt-1 block">{ep.date} • {Math.round(ep.duration / 60)} min</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#b3b3b3] hover:text-white transition-colors cursor-pointer text-lg">download</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {FEATURED_SHOWS.map((show) => (
            <div
              key={show.id}
              onClick={() => setSelectedShow(show)}
              className="bg-[#181818] hover:bg-[#282828] border border-transparent hover:border-white/5 rounded-2xl p-5 flex flex-col gap-4 cursor-pointer group transition-all duration-300 shadow-lg hover:scale-[1.02]"
            >
              <div className="aspect-square rounded-xl overflow-hidden relative shadow-md bg-[#282828]">
                <img src={show.img} alt={show.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-5xl fill-1">play_circle</span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">{show.title}</h3>
                <span className="text-xs text-[#b3b3b3] font-bold block mt-1">{show.publisher}</span>
                <p className="text-[10px] text-[#b3b3b3]/70 line-clamp-2 mt-2 leading-relaxed">{show.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
