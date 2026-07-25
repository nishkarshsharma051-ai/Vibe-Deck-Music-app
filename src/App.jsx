import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense, startTransition } from 'react';
import { VIBE_PRESETS } from './utils/constants';
import './App.css';

// Auth & storage imports
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { auth } from './utils/firebase';
import { syncUserData, fetchUserData } from './utils/supabase';

import Player from './components/Player';
import AuthModal from './components/AuthModal';
import Logo from './components/Logo';
import AlbumModal from './components/AlbumModal';
import NowPlayingToast from './components/NowPlayingToast';
import { saveLocalSong, getLocalSongs, deleteLocalSong } from './utils/db';
import { extractDominantColor } from './utils/colorExtractor';
import { requestNotificationPermission } from './utils/playbackControls';

// Lazily loaded — only parsed when first visited
const Dashboard = lazy(() => import('./components/Dashboard'));
const Search    = lazy(() => import('./components/Search'));
const Library   = lazy(() => import('./components/Library'));
const Lyrics    = lazy(() => import('./components/Lyrics'));
const Settings  = lazy(() => import('./components/Settings'));
const Stats     = lazy(() => import('./components/Stats'));
const Podcasts  = lazy(() => import('./components/Podcasts'));
const Radio     = lazy(() => import('./components/Radio'));

// Lazy-loaded tab components
const TabSkeleton = () => (
  <div className="px-lg py-md space-y-6 animate-pulse">
    <div className="h-48 rounded-3xl bg-white/5" />
    <div className="grid grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-white/5" />)}
    </div>
  </div>
);

const EMPTY_ANALYTICS = {
  totalListeningTime: 0,
  totalPlayCount: 0,
  songs: {},
  artists: {},
  monthly: {}
};

const getMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric'
  });
};

const normalizeAnalytics = (value) => {
  if (!value || typeof value !== 'object') return EMPTY_ANALYTICS;

  return {
    totalListeningTime: value.totalListeningTime || 0,
    totalPlayCount: value.totalPlayCount || 0,
    songs: value.songs || {},
    artists: value.artists || {},
    monthly: value.monthly || {}
  };
};

export default function App() {
  const GAANA_API_BASE = 'https://gaana-api-pied.vercel.app/api';
  const [isLoading, setIsLoading] = useState(true);
  const [fadeLoading, setFadeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [vibeMode, setVibeMode] = useState('normal'); // bluish slate default
  const [currentTime, setCurrentTime] = useState(0);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(() => new Set(['home']));

  // Auth & sync state
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const isInitialLoadRef = useRef(false);

  // Persisted playlists & favorites
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('vibedeck_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [playlists, setPlaylists] = useState(() => {
    const saved = localStorage.getItem('vibedeck_playlists');
    return saved ? JSON.parse(saved) : [];
  });

  // Local imported songs (current session only)
  const [localSongs, setLocalSongs] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState('liked');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Dynamic album-art color
  const [accentColor, setAccentColor] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Extract dominant color from current track's album art
  useEffect(() => {
    if (!currentTrack?.coverUrl) { setAccentColor(null); return; }
    extractDominantColor(currentTrack.coverUrl).then(color => {
      if (color) setAccentColor(color);
    });
  }, [currentTrack?.coverUrl]);

  // Load persistent local songs on startup
  useEffect(() => {
    const loadPersistedLocalSongs = async () => {
      const persisted = await getLocalSongs();
      if (persisted && persisted.length > 0) {
        setLocalSongs(persisted);
      }
    };
    loadPersistedLocalSongs();
  }, []);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // Listening history
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('vibedeck_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Playback settings
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [equalizerPreset, setEqualizerPreset] = useState('flat');
  const [customEqualizerBands, setCustomEqualizerBands] = useState([0, 0, 0, 0, 0]);
  const [crossfadeTime, setCrossfadeTime] = useState(0);
  const [sleepTimer, setSleepTimer] = useState(null);
  const [sleepTimerTimeRemaining, setSleepTimerTimeRemaining] = useState(null);
  const [volumeNormalization, setVolumeNormalization] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [ambientIntensity, setAmbientIntensity] = useState(0.1);

  // Listening stats
  const [analytics, setAnalytics] = useState(() => {
    try {
      const saved = localStorage.getItem('vibedeck_analytics');
      return saved ? normalizeAnalytics(JSON.parse(saved)) : EMPTY_ANALYTICS;
    } catch (e) {
      return EMPTY_ANALYTICS;
    }
  });

  // Persist stats to localStorage
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const key = user ? `vibedeck_${user.uid}_analytics` : 'vibedeck_analytics';
    localStorage.setItem(key, JSON.stringify(analytics));
  }, [analytics, user?.uid]);

  const [starterSongs, setStarterSongs] = useState([]);
  const [suggestedSongs, setSuggestedSongs] = useState([]);
  const [suggestedAlbums, setSuggestedAlbums] = useState([]);

  // Fetch trending songs on mount
  useEffect(() => {
    const fetchStarter = async () => {
      // Fetch starter albums
      try {
        const res = await fetch('https://saavn.sumit.co/api/search/albums?query=trending&limit=8');
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.results?.length) {
            const formattedAlbums = data.data.results.map(item => ({
              name: item.name?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&')?.replace(/&#039;/g, "'") || '',
              artist: item.artists?.primary?.[0]?.name || item.artist || 'Various Artists',
              img: item.image?.find(i => i.quality === '500x500')?.url || item.image?.[0]?.url || ''
            }));
            setSuggestedAlbums(formattedAlbums);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch starter albums:', err);
      }

      let success = false;
      try {
        const res = await fetch(`${GAANA_API_BASE}/search/songs?q=today%20top%20hits&limit=15`);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.length) {
            const formatted = json.data.map(item => ({
              id: `gaana-${item.track_id}`,
              trackId: item.track_id,
              seoKey: item.seokey,
              title: item.title,
              artist: item.artists || 'Unknown Artist',
              album: item.album || 'Official Release',
              duration: item.duration ? Number(item.duration) : 240,
              coverUrl: item.artworkUrl || '',
              url: '',
              hlsUrl: '',
              genre: 'Music',
              playbackMode: 'audio',
              source: 'gaana',
              isItunes: false,
              youtubeId: null
            }));
            setStarterSongs(formatted);
            setSuggestedSongs(formatted.slice(0, 6));
            setQueue(formatted);
            success = true;
          }
        }
      } catch (err) {
        console.warn('Gaana starter fetch failed, trying Saavn...', err);
      }

      // Fallback to Saavn only if Gaana failed
      if (!success) {
        try {
          const res = await fetch('https://saavn.sumit.co/api/search/songs?query=today%20top%20hits&limit=15');
          if (res.ok) {
            const data = await res.json();
            if (data?.data?.results?.length) {
              const formatted = data.data.results.map(item => ({
                id: `jiosaavn-${item.id}`,
                title: item.name?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&')?.replace(/&#039;/g, "'") || '',
                artist: item.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist',
                album: item.album?.name || '',
                coverUrl: item.image?.find(i => i.quality === '500x500')?.url || item.image?.[0]?.url || '',
                url: item.downloadUrl?.find(d => d.quality === '320kbps')?.url || item.downloadUrl?.[0]?.url || '',
                duration: item.duration ? Number(item.duration) : 240,
                genre: 'Pop',
                source: 'jiosaavn',
                playbackMode: 'audio',
                isItunes: false,
                youtubeId: null
              }));
              setStarterSongs(formatted);
              setSuggestedSongs(formatted.slice(0, 6));
              setQueue(formatted);
            }
          }
        } catch (err) {
          console.error('Failed to fetch starter songs:', err);
        }
      }

      // Deactivate loader after delay with smooth fade-out
      setTimeout(() => {
        setFadeLoading(true);
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }, 700);
    };

    fetchStarter();
  }, []);

  // Refresh suggestions when the current track changes
  useEffect(() => {
    if (!currentTrack) return;
    const genre = currentTrack.genre || 'Pop';
    const queryTerm = currentTrack.artist?.split(',')[0] || currentTrack.title || 'hits';

    // Fetch dynamic albums for the active artist
    const artistQuery = currentTrack.artist?.split(',')[0] || '';
    if (artistQuery) {
      fetch(`https://saavn.sumit.co/api/search/albums?query=${encodeURIComponent(artistQuery)}&limit=6`)
        .then(res => res.json())
        .then(data => {
          if (data?.data?.results?.length) {
            const formattedAlbums = data.data.results.map(item => ({
              name: item.name?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&')?.replace(/&#039;/g, "'") || '',
              artist: item.artists?.primary?.[0]?.name || item.artist || 'Various Artists',
              img: item.image?.find(i => i.quality === '500x500')?.url || item.image?.[0]?.url || ''
            }));
            setSuggestedAlbums(formattedAlbums);
          }
        })
        .catch(err => {
          console.warn('Failed to fetch dynamic albums for artist:', err);
        });
    }

    // Fetch dynamic recommendations for the active track
    fetch(`${GAANA_API_BASE}/search/songs?q=${encodeURIComponent(queryTerm)}&limit=6`)
      .then(res => res.json())
      .then(json => {
        if (json.data?.length) {
          const formatted = json.data.map(item => ({
            id: `gaana-${item.track_id}`,
            trackId: item.track_id,
            seoKey: item.seokey,
            title: item.title,
            artist: item.artists || 'Unknown Artist',
            album: item.album || 'Official Release',
            duration: item.duration ? Number(item.duration) : 240,
            coverUrl: item.artworkUrl || '',
            url: '',
            hlsUrl: '',
            genre: currentTrack.genre || 'Music',
            source: 'gaana',
            playbackMode: 'audio',
            isItunes: false,
            youtubeId: null
          })).filter(t => t.id !== currentTrack.id);
          setSuggestedSongs(formatted);
        } else {
          // Fallback to JioSaavn
          return fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(queryTerm)}&limit=6`)
            .then(res => res.json())
            .then(data => {
              if (data?.data?.results?.length) {
                const formatted = data.data.results.map(item => ({
                  id: `jiosaavn-${item.id}`,
                  title: item.name?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&')?.replace(/&#039;/g, "'") || '',
                  artist: item.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist',
                  album: item.album?.name || '',
                  coverUrl: item.image?.find(i => i.quality === '500x500')?.url || item.image?.[0]?.url || '',
                  url: item.downloadUrl?.find(d => d.quality === '320kbps')?.url || item.downloadUrl?.[0]?.url || '',
                  duration: item.duration ? Number(item.duration) : 240,
                  genre: currentTrack.genre || 'Music',
                  source: 'jiosaavn',
                  playbackMode: 'audio',
                  isItunes: false,
                  youtubeId: null
                })).filter(t => t.id !== currentTrack.id);
                setSuggestedSongs(formatted);
              } else {
                const fallback = starterSongs.filter(t => t.id !== currentTrack.id).slice(0, 5);
                setSuggestedSongs(fallback);
              }
            });
        }
      })
      .catch(() => {
        const fallback = starterSongs.filter(t => t.id !== currentTrack.id).slice(0, 5);
        setSuggestedSongs(fallback);
      });
  }, [currentTrack, starterSongs]);

  const handleIncrementListeningTime = (track, seconds, countPlay = false) => {
    if (!track) return;
    
    setAnalytics((prev) => {
      const base = normalizeAnalytics(prev);
      const updatedSongs = { ...prev.songs };
      const updatedArtists = { ...prev.artists };
      const updatedMonthly = { ...base.monthly };
      
      const artistName = track.artist || 'Unknown Artist';
      const songId = track.id;
      const monthKey = getMonthKey();
      const monthBucket = updatedMonthly[monthKey]
        ? {
            ...updatedMonthly[monthKey],
            songs: { ...(updatedMonthly[monthKey].songs || {}) },
            artists: { ...(updatedMonthly[monthKey].artists || {}) }
          }
        : {
            key: monthKey,
            label: getMonthLabel(monthKey),
            listeningTime: 0,
            playCount: 0,
            songs: {},
            artists: {}
          };
      
      // Update Song details
      if (!updatedSongs[songId]) {
        updatedSongs[songId] = {
          id: songId,
          title: track.title,
          artist: artistName,
          coverUrl: track.coverUrl,
          genre: track.genre || 'Music',
          playCount: 0,
          listeningTime: 0
        };
      }
      
      updatedSongs[songId].listeningTime += seconds;
      if (countPlay) {
        updatedSongs[songId].playCount += 1;
      }
      
      // Update Artist details
      if (!updatedArtists[artistName]) {
        updatedArtists[artistName] = {
          name: artistName,
          playCount: 0,
          listeningTime: 0,
          imageUrl: track.coverUrl // fallback to coverUrl
        };
      }
      
      updatedArtists[artistName].listeningTime += seconds;
      if (countPlay) {
        updatedArtists[artistName].playCount += 1;
      }

      if (!monthBucket.songs[songId]) {
        monthBucket.songs[songId] = {
          id: songId,
          title: track.title,
          artist: artistName,
          coverUrl: track.coverUrl,
          listeningTime: 0,
          playCount: 0
        };
      }

      if (!monthBucket.artists[artistName]) {
        monthBucket.artists[artistName] = {
          name: artistName,
          imageUrl: track.coverUrl,
          listeningTime: 0,
          playCount: 0
        };
      }

      monthBucket.listeningTime += seconds;
      monthBucket.songs[songId].listeningTime += seconds;
      monthBucket.artists[artistName].listeningTime += seconds;

      if (countPlay) {
        monthBucket.playCount += 1;
        monthBucket.songs[songId].playCount += 1;
        monthBucket.artists[artistName].playCount += 1;
      }

      updatedMonthly[monthKey] = monthBucket;
      
      return {
        totalListeningTime: base.totalListeningTime + seconds,
        totalPlayCount: base.totalPlayCount + (countPlay ? 1 : 0),
        songs: updatedSongs,
        artists: updatedArtists,
        monthly: updatedMonthly
      };
    });
  };

  // Auth state listener & data sync
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        isInitialLoadRef.current = true;
        
        // Load from user-specific local storage immediately for responsive offline/fast rendering
        try {
          const localFavs = localStorage.getItem(`vibedeck_${currentUser.uid}_favorites`);
          const localPlaylists = localStorage.getItem(`vibedeck_${currentUser.uid}_playlists`);
          const localHistory = localStorage.getItem(`vibedeck_${currentUser.uid}_history`);
          const localAnalytics = localStorage.getItem(`vibedeck_${currentUser.uid}_analytics`);
          
          if (localFavs) setFavorites(JSON.parse(localFavs));
          else setFavorites([]);
          
          if (localPlaylists) setPlaylists(JSON.parse(localPlaylists));
          else setPlaylists([]);
          
          if (localHistory) setHistory(JSON.parse(localHistory));
          else setHistory([]);
          
          if (localAnalytics) setAnalytics(normalizeAnalytics(JSON.parse(localAnalytics)));
          else setAnalytics(EMPTY_ANALYTICS);
        } catch (e) {
          console.warn("Failed to load user-specific local storage:", e);
        }

        try {
          const cloudData = await fetchUserData(currentUser.uid);
          if (cloudData) {
            // Apply favorites
            if (Array.isArray(cloudData.favorites)) {
              setFavorites(cloudData.favorites);
              localStorage.setItem(`vibedeck_${currentUser.uid}_favorites`, JSON.stringify(cloudData.favorites));
            }
            // Apply playlists
            if (Array.isArray(cloudData.playlists)) {
              setPlaylists(cloudData.playlists);
              localStorage.setItem(`vibedeck_${currentUser.uid}_playlists`, JSON.stringify(cloudData.playlists));
            }
            // Apply history
            if (Array.isArray(cloudData.history)) {
              setHistory(cloudData.history);
              localStorage.setItem(`vibedeck_${currentUser.uid}_history`, JSON.stringify(cloudData.history));
            }
            // Apply stats
            if (cloudData.analytics && typeof cloudData.analytics.totalListeningTime === 'number') {
              setAnalytics(normalizeAnalytics(cloudData.analytics));
              localStorage.setItem(`vibedeck_${currentUser.uid}_analytics`, JSON.stringify(cloudData.analytics));
            }
            // Apply settings
            if (cloudData.settings) {
              const s = cloudData.settings;
              if (s.vibeMode) setVibeMode(s.vibeMode);
              if (s.playbackSpeed) setPlaybackSpeed(s.playbackSpeed);
              if (s.equalizerPreset) setEqualizerPreset(s.equalizerPreset);
              if (s.customEqualizerBands) setCustomEqualizerBands(s.customEqualizerBands);
              if (s.crossfadeTime) setCrossfadeTime(s.crossfadeTime);
              if (typeof s.volumeNormalization === 'boolean') setVolumeNormalization(s.volumeNormalization);
              if (typeof s.compactMode === 'boolean') setCompactMode(s.compactMode);
              if (s.ambientIntensity) setAmbientIntensity(s.ambientIntensity);
            }
            
            // Seed cloud if cloud was completely empty
            if (!cloudData.favorites && !cloudData.playlists && !cloudData.history && !cloudData.analytics) {
              await syncUserData(currentUser.uid, {
                settings: {
                  vibeMode,
                  playbackSpeed,
                  equalizerPreset,
                  customEqualizerBands,
                  crossfadeTime,
                  volumeNormalization,
                  compactMode,
                  ambientIntensity
                },
                history,
                analytics,
                favorites,
                playlists
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch cloud profile data:", err);
        } finally {
          setTimeout(() => {
            isInitialLoadRef.current = false;
          }, 1500);
        }
      } else {
        // Safe logout fallbacks to local storage
        try {
          const localFavs = localStorage.getItem('vibedeck_favorites');
          const localPlaylists = localStorage.getItem('vibedeck_playlists');
          const localHistory = localStorage.getItem('vibedeck_history');
          const localAnalytics = localStorage.getItem('vibedeck_analytics');
          
          setFavorites(localFavs ? JSON.parse(localFavs) : []);
          setPlaylists(localPlaylists ? JSON.parse(localPlaylists) : []);
          setHistory(localHistory ? JSON.parse(localHistory) : []);
          setAnalytics(localAnalytics ? normalizeAnalytics(JSON.parse(localAnalytics)) : EMPTY_ANALYTICS);
        } catch (e) {
          console.warn("Offline state fallbacks failed:", e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Native status bar setup
  useEffect(() => {
    const initNative = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch (e) {
        // Ignored, not running on native device
      }
    };
    initNative();
  }, []);

  // Debounced settings sync to cloud
  useEffect(() => {
    if (!user || isInitialLoadRef.current) return;

    const delayDebounce = setTimeout(() => {
      syncUserData(user.uid, {
        settings: {
          vibeMode,
          playbackSpeed,
          equalizerPreset,
          customEqualizerBands,
          crossfadeTime,
          volumeNormalization,
          compactMode,
          ambientIntensity
        }
      });
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [
    user,
    vibeMode,
    playbackSpeed,
    equalizerPreset,
    customEqualizerBands,
    crossfadeTime,
    volumeNormalization,
    compactMode,
    ambientIntensity
  ]);


  // Debounced library sync to cloud
  useEffect(() => {
    if (!user || isInitialLoadRef.current) return;

    const delayDebounce = setTimeout(() => {
      syncUserData(user.uid, {
        favorites,
        playlists
      });
    }, 2500);

    return () => clearTimeout(delayDebounce);
  }, [user, favorites, playlists]);

  // Throttled analytics sync (every 15s)
  useEffect(() => {
    if (!user || isInitialLoadRef.current) return;

    const delayDebounce = setTimeout(() => {
      syncUserData(user.uid, {
        history,
        analytics
      });
    }, 15000);

    return () => clearTimeout(delayDebounce);
  }, [user, history, analytics]);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimer === null || sleepTimer === 'end') {
      setSleepTimerTimeRemaining(null);
      return;
    }

    setSleepTimerTimeRemaining(sleepTimer * 60);

    const timer = setInterval(() => {
      setSleepTimerTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsPlaying(false);
          setSleepTimer(null);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimer]);

  // Queue state
  const [queue, setQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  const recommendationTracks = useMemo(() => {
    const sourceBuckets = [
      ...history,
      ...favorites,
      ...localSongs,
      ...playlists.flatMap((playlist) => playlist.tracks || [])
    ];

    const preferredArtists = sourceBuckets
      .map((track) => track.artist?.split(',')[0]?.trim())
      .filter(Boolean);

    const uniqueCandidates = [];
    const seenIds = new Set();
    const seedGenre = sourceBuckets[0]?.genre;

    starterSongs.forEach((track) => {
      if (seenIds.has(track.id)) return;
      const artistMatched = preferredArtists.some((artist) =>
        track.artist.toLowerCase().includes(artist.toLowerCase())
      );
      const genreMatched = seedGenre && track.genre?.toLowerCase() === String(seedGenre).toLowerCase();
      if (artistMatched || genreMatched) {
        seenIds.add(track.id);
        uniqueCandidates.push(track);
      }
    });

    starterSongs.forEach((track) => {
      if (!seenIds.has(track.id)) {
        seenIds.add(track.id);
        uniqueCandidates.push(track);
      }
    });

    return uniqueCandidates.slice(0, 8);
  }, [history, favorites, localSongs, playlists, starterSongs]);

  // Native Audio references
  const audioRef = useRef(null);
  const ambientAudioRef = useRef(null);

  // Fetch lyrics on track change
  useEffect(() => {
    if (!currentTrack) return;

    const isGaanaTrack = currentTrack.source === 'gaana';
    const gaanaSeoKey = currentTrack.seoKey;
    const isJioSaavnTrack = currentTrack.id?.startsWith('jiosaavn-');
    const rawJioId = currentTrack.id?.replace('jiosaavn-', '');

    const fetchLyrics = async () => {
      setIsFetchingLyrics(true);
      try {
        let lyricsText = '';

        // ── Step 1: LRCLIB exact match (artist + track + duration) ──
        if (currentTrack.title && currentTrack.artist) {
          const params = new URLSearchParams({
            artist_name: currentTrack.artist,
            track_name: currentTrack.title,
          });
          if (currentTrack.duration) params.set('duration', String(currentTrack.duration));

          const exactRes = await fetch(`https://lrclib.net/api/get?${params}`);
          if (exactRes.ok) {
            const exactData = await exactRes.json();
            // Prefer synced LRC lyrics; fall back to plain text
            lyricsText = exactData?.syncedLyrics || exactData?.plainLyrics || '';
          }
        }

        // ── Step 2: LRCLIB search (if exact match missed) ──
        if (!lyricsText && currentTrack.title && currentTrack.artist) {
          const searchParams = new URLSearchParams({
            artist_name: currentTrack.artist,
            track_name: currentTrack.title,
          });
          const searchRes = await fetch(`https://lrclib.net/api/search?${searchParams}`);
          if (searchRes.ok) {
            const results = await searchRes.json();
            // Pick the result with synced lyrics first, then plain
            const best = results?.find(r => r.syncedLyrics) || results?.find(r => r.plainLyrics);
            if (best) {
              lyricsText = best.syncedLyrics || best.plainLyrics || '';
            }
          }
        }

        // ── Step 3: Provider fallback (for tracks LRCLIB doesn't have) ──
        if (!lyricsText && isGaanaTrack && gaanaSeoKey) {
          const gaanaRes = await fetch(`${GAANA_API_BASE}/lyrics/${gaanaSeoKey}`);
          if (gaanaRes.ok) {
            const gaanaData = await gaanaRes.json();
            lyricsText =
              gaanaData?.data?.lyrics ||
              gaanaData?.lyrics ||
              '';
          }
        }

        if (!lyricsText && isJioSaavnTrack && rawJioId) {
          const jioRes = await fetch(`https://saavn.sumit.co/api/songs/${rawJioId}/lyrics`);
          if (jioRes.ok) {
            const jioData = await jioRes.json();
            lyricsText = jioData?.data?.lyrics || '';
          }
        }

        setCurrentTrack(prev =>
          prev?.id === currentTrack.id
            ? { ...prev, lyrics: lyricsText || null }
            : prev
        );
      } catch (err) {
        console.warn('Lyrics fetch error:', err);
        setCurrentTrack(prev =>
          prev?.id === currentTrack.id ? { ...prev, lyrics: null } : prev
        );
      } finally {
        setIsFetchingLyrics(false);
      }
    };

    fetchLyrics();
  }, [currentTrack?.id]);

  const resolveTrackForPlayback = async (track) => {
    if (!track) return track;

    // Check if the track is dynamic and needs resolution
    const isDynamic = track.source === 'gaana' || track.source === 'jiosaavn' || track.id?.startsWith('gaana-') || track.id?.startsWith('jiosaavn-');

    // Fast-path: If the track already has a valid stream URL and is not dynamic, resolve instantly
    if (track.url && !isDynamic) {
      return track;
    }

    // 1. Resolve Gaana Track
    if (track.source === 'gaana' || track.id?.startsWith('gaana-')) {
      try {
        const trackId = track.trackId || track.id.replace('gaana-', '');
        const response = await fetch(`${GAANA_API_BASE}/stream/${trackId}?quality=high`);
        if (!response.ok) throw new Error('Gaana stream request failed');
        const streamData = await response.json();

        return {
          ...track,
          trackId,
          url: streamData?.data?.hlsUrl || '',
          hlsUrl: streamData?.data?.hlsUrl || '',
          streamBitRate: streamData?.data?.bitRate || null,
          source: 'gaana'
        };
      } catch (err) {
        console.warn('Failed to resolve Gaana stream:', err);
        return track;
      }
    }

    // 2. Resolve JioSaavn Track (First attempt to map to Gaana for streaming; fall back to Saavn)
    if (track.source === 'jiosaavn' || track.id?.startsWith('jiosaavn-')) {
      try {
        console.log(`Mapping JioSaavn track "${track.title}" to Gaana stream...`);
        const query = `${track.title} ${track.artist}`;
        const searchResponse = await fetch(`${GAANA_API_BASE}/search/songs?q=${encodeURIComponent(query)}&limit=1`);
        if (searchResponse.ok) {
          const searchJson = await searchResponse.json();
          const matchedTrack = searchJson?.data?.[0];
          if (matchedTrack && matchedTrack.track_id) {
            const streamResponse = await fetch(`${GAANA_API_BASE}/stream/${matchedTrack.track_id}?quality=high`);
            if (streamResponse.ok) {
              const streamData = await streamResponse.json();
              if (streamData?.data?.hlsUrl) {
                console.log(`Successfully mapped JioSaavn track "${track.title}" to Gaana stream ID ${matchedTrack.track_id}`);
                return {
                  ...track,
                  trackId: matchedTrack.track_id,
                  seoKey: matchedTrack.seokey,
                  url: streamData.data.hlsUrl,
                  hlsUrl: streamData.data.hlsUrl,
                  streamBitRate: streamData.data.bitRate || null,
                  source: 'gaana' // convert source to gaana for hls wrap
                };
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to map JioSaavn track to Gaana stream, falling back to direct Saavn stream:', err);
      }

      // Fallback: Resolve JioSaavn Track direct URL
      const rawJioId = track.id.replace('jiosaavn-', '');
      try {
        const response = await fetch(`https://saavn.sumit.co/api/songs/${rawJioId}`);
        if (response.ok) {
          const json = await response.json();
          // The Sumit Saavn API has changed formats; we check both json.data[0] and direct arrays
          const songItem = Array.isArray(json.data) ? json.data[0] : (json.data?.results?.[0] || json.data);
          if (songItem) {
            const downloadUrl = songItem.downloadUrl;
            const freshUrl = downloadUrl && downloadUrl.length > 0
              ? downloadUrl[downloadUrl.length - 1].url
              : '';
            
            if (freshUrl) {
              return {
                ...track,
                url: freshUrl
              };
            }
          }
        }
      } catch (err) {
        console.warn('Failed to resolve fresh JioSaavn stream URL:', err);
      }
    }

    return track;
  };

  // Sync favorites to local storage
  useEffect(() => {
    const key = user ? `vibedeck_${user.uid}_favorites` : 'vibedeck_favorites';
    localStorage.setItem(key, JSON.stringify(favorites));
  }, [favorites, user?.uid]);

  // Sync playlists to local storage
  useEffect(() => {
    const key = user ? `vibedeck_${user.uid}_playlists` : 'vibedeck_playlists';
    localStorage.setItem(key, JSON.stringify(playlists));
  }, [playlists, user?.uid]);

  // Handle ambient background loops for Vibe Modes (Lofi Rain sound)
  useEffect(() => {
    const preset = VIBE_PRESETS[vibeMode];

    // Clean up existing ambient sound
    if (ambientAudioRef.current) {
      ambientAudioRef.current.pause();
      ambientAudioRef.current = null;
    }

    if (preset.ambientSoundUrl && isPlaying) {
      const ambient = new Audio(preset.ambientSoundUrl);
      ambient.loop = true;
      ambient.volume = preset.ambientVolume || 0.1;
      ambientAudioRef.current = ambient;
      ambient.play().catch((err) => console.log('Ambient autoplay blocked:', err));
    }
  }, [vibeMode, isPlaying]);

  // Playback Control Triggers
  const handlePlayTrack = async (track, trackList = null) => {
    if (!track) return;

    try {
      const resolved = await resolveTrackForPlayback(track);
      const playableTrack = resolved || track;
      if (!playableTrack || !playableTrack.id) return;

      // Synchronously load and play native audio streams within user gesture if url exists
      if (audioRef.current && playableTrack.url) {
        try {
          audioRef.current.src = playableTrack.url;
          audioRef.current.load();
          audioRef.current.play().catch((err) => console.log('Synchronous play blocked:', err));
        } catch (err) {
          console.warn('Sync audio setup failed:', err);
        }
      } else if (audioRef.current) {
        // Synchronously unlock Safari audio context on user gesture
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            audioRef.current.pause();
          }).catch((err) => console.log('Audio context unlocked:', err));
        }
      }

      setCurrentTrack(playableTrack);
      setIsPlaying(true);
      setCurrentTime(0);

      // Save to history (deduplicate, keep most recent, limit to 15)
      setHistory(prev => {
        const filtered = prev.filter(t => t.id !== playableTrack.id);
        const updated = [playableTrack, ...filtered].slice(0, 15);
        const key = user ? `vibedeck_${user.uid}_history` : 'vibedeck_history';
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });

      if (trackList) {
        const nextQueue = trackList.map((item) => item.id === playableTrack.id ? playableTrack : item);
        setQueue(nextQueue);
        const idx = nextQueue.findIndex((t) => t.id === playableTrack.id);
        setCurrentQueueIndex(idx !== -1 ? idx : 0);
      } else {
        // If no list is passed, check if track already exists in queue, otherwise append it
        const idx = queue.findIndex((t) => t.id === playableTrack.id);
        if (idx !== -1) {
          setQueue(queue.map((item) => item.id === playableTrack.id ? playableTrack : item));
          setCurrentQueueIndex(idx);
        } else {
          const newQueue = [...queue, playableTrack];
          setQueue(newQueue);
          setCurrentQueueIndex(newQueue.length - 1);
        }
      }
    } catch (err) {
      console.warn('handlePlayTrack failed:', err);
    }
  };

  const handlePlayNext = async () => {
    if (queue.length === 0) return;
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}

    let nextIdx = currentQueueIndex;
    let activeQueue = queue;

    if (isRepeat && currentTrack) {
      nextIdx = currentQueueIndex;
    } else if (isShuffle && queue.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * queue.length);
      } while (nextIdx === currentQueueIndex);
    } else {
      nextIdx = currentQueueIndex + 1;
      // Smart Autoplay: if we reached the end of the queue, fetch recommendations automatically
      if (nextIdx >= queue.length) {
        if (currentTrack) {
          try {
            const query = currentTrack.artist || currentTrack.genre || 'pop';
            const res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=8`);
            if (res.ok) {
              const data = await res.json();
              if (data?.data?.results?.length) {
                const freshTracks = data.data.results
                  .map(item => ({
                    id: `jiosaavn-${item.id}`,
                    title: item.name?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&')?.replace(/&#039;/g, "'") || '',
                    artist: item.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist',
                    album: item.album?.name || '',
                    coverUrl: item.image?.find(i => i.quality === '500x500')?.url || item.image?.[0]?.url || '',
                    url: item.downloadUrl?.find(d => d.quality === '320kbps')?.url || item.downloadUrl?.[0]?.url || '',
                    duration: item.duration ? Number(item.duration) : 240,
                    genre: item.genre || 'Music',
                    source: 'jiosaavn',
                    playbackMode: 'audio',
                  }))
                  .filter(t => !queue.some(q => q.id === t.id));

                if (freshTracks.length > 0) {
                  activeQueue = [...queue, ...freshTracks];
                  setQueue(activeQueue);
                } else {
                  nextIdx = 0;
                }
              } else {
                nextIdx = 0;
              }
            } else {
              nextIdx = 0;
            }
          } catch (_) {
            nextIdx = 0;
          }
        } else {
          nextIdx = 0;
        }
      }
    }

    const nextTrack = await resolveTrackForPlayback(activeQueue[nextIdx]);
    
    if (audioRef.current && nextTrack.url) {
      try {
        audioRef.current.src = nextTrack.url;
        audioRef.current.load();
        audioRef.current.play().catch((err) => console.log('Sync next play blocked:', err));
      } catch (err) {
        console.warn('Sync next play failed:', err);
      }
    }
    
    setQueue(activeQueue.map((item, index) => index === nextIdx ? nextTrack : item));
    setCurrentQueueIndex(nextIdx);
    setCurrentTrack(nextTrack);
    setIsPlaying(true);
  };

  const handlePlayPrevious = async () => {
    if (queue.length === 0) return;
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}

    let prevIdx = currentQueueIndex;
    if (isShuffle && queue.length > 1) {
      do {
        prevIdx = Math.floor(Math.random() * queue.length);
      } while (prevIdx === currentQueueIndex);
    } else {
      prevIdx = (currentQueueIndex - 1 + queue.length) % queue.length;
    }

    const prevTrack = await resolveTrackForPlayback(queue[prevIdx]);
    
    if (audioRef.current && prevTrack.url) {
      try {
        audioRef.current.src = prevTrack.url;
        audioRef.current.load();
        audioRef.current.play().catch((err) => console.log('Sync prev play blocked:', err));
      } catch (err) {
        console.warn('Sync prev play failed:', err);
      }
    }
    
    setQueue(queue.map((item, index) => index === prevIdx ? prevTrack : item));
    setCurrentQueueIndex(prevIdx);
    setCurrentTrack(prevTrack);
    setIsPlaying(true);
  };

  // Queue Management
  const handleAddToQueue = (track) => {
    if (!queue.some((t) => t.id === track.id)) {
      setQueue([...queue, track]);
    }
  };

  // Like Song Toggle
  const handleToggleLike = (track) => {
    if (favorites.some((f) => f.id === track.id)) {
      setFavorites(favorites.filter((f) => f.id !== track.id));
    } else {
      setFavorites([...favorites, track]);
    }
  };

  // Playlist Management
  const handleCreatePlaylist = () => {
    const name = prompt('Enter a name for your playlist:', `My Vibe Mix #${playlists.length + 1}`);
    if (!name) return;

    const newPlaylist = {
      id: `playlist-${Date.now()}`,
      name: name,
      description: 'A custom high-fidelity sound selection.',
      tracks: []
    };

    setPlaylists([...playlists, newPlaylist]);
    setCurrentPlaylist(newPlaylist.id);
    setActiveTab('library');
  };

  const handleImportPlaylist = (name, tracks) => {
    const newPlaylist = {
      id: `playlist-${Date.now()}`,
      name: name,
      description: `Imported playlist.`,
      tracks: tracks
    };
    setPlaylists([...playlists, newPlaylist]);
    setCurrentPlaylist(newPlaylist.id);
    setActiveTab('library');
  };

  const handleAddToPlaylist = (playlistId, track) => {
    if (playlistId === 'liked') {
      if (favorites.some((fav) => fav.id === track.id)) return;
      setFavorites([...favorites, track]);
      return;
    }

    setPlaylists(
      playlists.map((pl) => {
        if (pl.id === playlistId) {
          // Avoid duplicate tracks in same playlist
          if (pl.tracks.some((t) => t.id === track.id)) return pl;
          return { ...pl, tracks: [...pl.tracks, track] };
        }
        return pl;
      })
    );
  };

  const handleRenamePlaylist = (playlistId, newName, newDescription) => {
    setPlaylists(
      playlists.map((pl) => {
        if (pl.id === playlistId) {
          return { ...pl, name: newName, description: newDescription || pl.description };
        }
        return pl;
      })
    );
  };

  const handleDeletePlaylist = (playlistId) => {
    setPlaylists(playlists.filter((pl) => pl.id !== playlistId));
    setCurrentPlaylist(null);
  };

  const handleRemoveFromPlaylist = (playlistId, trackId) => {
    if (playlistId === 'liked') {
      setFavorites(favorites.filter((f) => f.id !== trackId));
    } else if (playlistId === 'local') {
      setLocalSongs(localSongs.filter((t) => t.id !== trackId));
      deleteLocalSong(trackId);
    } else {
      setPlaylists(
        playlists.map((pl) => {
          if (pl.id === playlistId) {
            return { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) };
          }
          return pl;
        })
      );
    }
  };

  // Local Song importing
  const handleImportLocalSongs = async (tracks) => {
    // Save to IndexedDB persistently
    for (const track of tracks) {
      if (track.fileBlob) {
        await saveLocalSong(track, track.fileBlob);
      }
    }
    const updatedLocal = [...localSongs, ...tracks];
    setLocalSongs(updatedLocal);
    
    // Play the first newly imported track immediately
    handlePlayTrack(tracks[0], updatedLocal);
    setActiveTab('library');
    setCurrentPlaylist('local');
  };

  // Handle Authentication trigger
  const handleAuthClick = async () => {
    if (user) {
      if (window.confirm("Do you want to log out from your cloud sync session?")) {
        try {
          if (auth) await signOut(auth);
        } catch (err) {
          console.error("Sign out failed:", err.message);
        }
      }
    } else {
      setIsAuthModalOpen(true);
    }
  };

  useEffect(() => {
    setLoadedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const changeTab = (tabId) => {
    if (tabId === activeTab) return;

    startTransition(() => {
      setActiveTab(tabId);
    });

    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
      // Ignored
    });
  };

  // Stable memoized callbacks to avoid unnecessary child re-renders
  const handlePlayForHome     = useCallback((track, list = queue) => handlePlayTrack(track, list), [handlePlayTrack, queue]);
  const handlePlayForSearch   = useCallback((track, list = null) => handlePlayTrack(track, list), [handlePlayTrack]);
  const handlePlayForLibrary  = useCallback((track) => handlePlayTrack(track, null), [handlePlayTrack]);
  const handleOpenLyrics      = useCallback(() => changeTab('lyrics'), []);

  const handlePlayAlbum = useCallback(async (album) => {
    setSelectedAlbum({
      name: album.name,
      artist: album.artist,
      coverUrl: album.img || album.coverUrl,
      tracks: []
    });
    setIsAlbumModalOpen(true);

    try {
      const query = album.name;
      const res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=15`);
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.results?.length) {
          const formatted = data.data.results.map(item => ({
            id: `jiosaavn-${item.id}`,
            title: item.name?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&')?.replace(/&#039;/g, "'") || '',
            artist: item.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist',
            album: item.album?.name || '',
            coverUrl: item.image?.find(i => i.quality === '500x500')?.url || item.image?.[0]?.url || '',
            url: item.downloadUrl?.find(d => d.quality === '320kbps')?.url || item.downloadUrl?.[0]?.url || '',
            duration: item.duration ? Number(item.duration) : 240,
            genre: 'Pop',
            source: 'jiosaavn',
            playbackMode: 'audio',
            isItunes: false,
            youtubeId: null
          }));
          setSelectedAlbum(prev => ({
            ...prev,
            tracks: formatted
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch album tracks:', err);
    }
  }, []);

  // Tab nav items — stable reference so bottom nav never re-renders
  const TAB_NAV = useMemo(() => [
    { id: 'home',    icon: 'home',          label: 'Home'    },
    { id: 'search',  icon: 'search',        label: 'Search'  },
    { id: 'library', icon: 'library_music', label: 'Library' },
    { id: 'stats',   icon: 'insights',      label: 'Wrapped' },
  ], []);

  // Active vibe mode background
  const preset = VIBE_PRESETS[vibeMode];

  useEffect(() => {
    if (activeTab === 'home') return undefined;

    const state = { vibeDeckTab: activeTab };
    window.history.pushState(state, '');

    const handlePopState = () => {
      if (activeTab === 'lyrics') {
        setActiveTab('home');
        return;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState, { once: true });
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  // ⌨️ Global keyboard shortcuts — placed here so all handlers are already defined
  // Use refs to always call the latest version without re-registering the listener
  const playNextRef = useRef(null);
  const playPrevRef = useRef(null);
  const toggleLikeRef = useRef(null);
  const currentTrackRef2 = useRef(null);
  playNextRef.current = handlePlayNext;
  playPrevRef.current = handlePlayPrevious;
  toggleLikeRef.current = handleToggleLike;
  currentTrackRef2.current = currentTrack;

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;
        case 'ArrowRight':
          e.preventDefault();
          playNextRef.current?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          playPrevRef.current?.();
          break;
        case 'l':
        case 'L': {
          const t = currentTrackRef2.current;
          if (t) toggleLikeRef.current?.(t);
          break;
        }
        case 'm':
        case 'M': {
          if (audioRef.current) audioRef.current.muted = !audioRef.current.muted;
          break;
        }
        case 'f':
        case 'F':
          changeTab('lyrics');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty — refs always hold latest values

  return (
    <div
      className={`h-[100dvh] w-full relative overflow-hidden transition-[background,background-color] duration-1000 ${preset.themeClass}`}
      style={{ background: preset.bgGradient, '--theme-glow': preset.themeColor }}
    >
      {/* Vibe Atmosphere Overlays */}
      <div className="ambient-glow"></div>
      <div className="rain-overlay"></div>
      <div className="grid-overlay"></div>

      {isLoading && (
        <div 
          className={`absolute inset-0 z-[100] flex flex-col items-center justify-center text-white transition-opacity duration-700 ease-in-out ${fadeLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={{ backgroundColor: '#072635' }}
        >
          <div className="flex flex-col items-center gap-4 animate-logoZoomIn">
            <Logo size="xl" className="text-[#38bdf8]" animated={true} />
            <h1 className="text-4xl font-black tracking-tight text-white">Vibe Deck</h1>
          </div>
        </div>
      )}

      {/* Main Content Stage */}
      <main
        className="app-scroll-region relative z-10 h-full min-h-0 overflow-y-auto overflow-x-hidden"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'auto',
          paddingBottom: 'calc(12rem + env(safe-area-inset-bottom, 0px))'
        }}
      >
        <header className="vibedeck-topbar sticky top-0 z-30 border-b border-white/5 bg-[linear-gradient(180deg,rgba(8,47,73,0.96),rgba(0,0,0,0.82))] px-4 pb-3 backdrop-blur-xl md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#38bdf8] text-black shadow-[0_8px_24px_rgba(56,189,248,0.25)] animate-pulse">
                <span className="material-symbols-outlined text-lg">music_note</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-white">Vibe Deck</h1>
                  {!isOnline && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      Offline
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">For you</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => changeTab('settings')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white"
                title="Settings"
              >
                <span className="material-symbols-outlined">settings</span>
              </button>
              <button
                onClick={handleAuthClick}
                className="flex h-11 min-w-11 items-center justify-center rounded-full bg-white/10 px-3 text-xs font-semibold text-white"
                title="Account"
              >
                {user ? (user.displayName?.[0] || user.email?.[0] || 'U') : 'Log in'}
              </button>
            </div>
          </div>
        </header>

        {/* Tab views — content-visibility:hidden keeps rendered DOM in memory, so switching tabs is instant */}

        {/* Home */}
        {loadedTabs.has('home') && activeTab === 'home' && (
          <Suspense fallback={<TabSkeleton />}>
            <Dashboard onPlayTrack={handlePlayForHome} onPlayAlbum={handlePlayAlbum} history={history} suggestedSongs={suggestedSongs} suggestedAlbums={suggestedAlbums} isOnline={isOnline} accentColor={accentColor} />
          </Suspense>
        )}

        {/* Search */}
        {loadedTabs.has('search') && activeTab === 'search' && (
          <Suspense fallback={<TabSkeleton />}>
            <Search onPlayTrack={handlePlayForSearch} queue={queue} onAddToQueue={handleAddToQueue} playlists={playlists} onAddToPlaylist={handleAddToPlaylist} onToggleLike={handleToggleLike} favorites={favorites} user={user} recommendations={recommendationTracks} isOnline={isOnline} />
          </Suspense>
        )}

        {/* Library */}
        {loadedTabs.has('library') && activeTab === 'library' && (
          <Suspense fallback={<TabSkeleton />}>
            <Library
              activePlaylist={currentPlaylist || 'liked'}
              playlists={playlists}
              onPlayTrack={handlePlayForLibrary}
              onRemoveFromPlaylist={handleRemoveFromPlaylist}
              onImportLocalSongs={handleImportLocalSongs}
              localSongs={localSongs}
              favorites={favorites}
              onSelectPlaylist={setCurrentPlaylist}
              onCreatePlaylist={handleCreatePlaylist}
              onImportPlaylist={handleImportPlaylist}
              onRenamePlaylist={handleRenamePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onAddToPlaylist={handleAddToPlaylist}
            />
          </Suspense>
        )}

        {/* Podcasts */}
        {loadedTabs.has('podcasts') && activeTab === 'podcasts' && (
          <Suspense fallback={<TabSkeleton />}>
            <Podcasts onPlayTrack={handlePlayForHome} />
          </Suspense>
        )}

        {/* Live Radio */}
        {loadedTabs.has('radio') && activeTab === 'radio' && (
          <Suspense fallback={<TabSkeleton />}>
            <Radio onPlayTrack={handlePlayForHome} />
          </Suspense>
        )}

        {/* Lyrics */}
        {loadedTabs.has('lyrics') && activeTab === 'lyrics' && (
          <Suspense fallback={<TabSkeleton />}>
            <Lyrics
              currentTrack={currentTrack}
              currentTime={currentTime}
              isFetchingLyrics={isFetchingLyrics}
              audioRef={audioRef}
              setCurrentTime={setCurrentTime}
            />
          </Suspense>
        )}

        {/* Settings */}
        {loadedTabs.has('settings') && activeTab === 'settings' && (
          <Suspense fallback={<TabSkeleton />}>
            <Settings
              playbackSpeed={playbackSpeed} onChangePlaybackSpeed={setPlaybackSpeed}
              equalizerPreset={equalizerPreset} onChangeEqualizerPreset={setEqualizerPreset}
              customEqualizerBands={customEqualizerBands} onChangeCustomEqualizerBands={setCustomEqualizerBands}
              crossfadeTime={crossfadeTime} onChangeCrossfadeTime={setCrossfadeTime}
              sleepTimer={sleepTimer} onChangeSleepTimer={setSleepTimer}
              sleepTimerTimeRemaining={sleepTimerTimeRemaining}
              volumeNormalization={volumeNormalization} onChangeVolumeNormalization={setVolumeNormalization}
              compactMode={compactMode} onChangeCompactMode={setCompactMode}
              ambientIntensity={ambientIntensity} onChangeAmbientIntensity={setAmbientIntensity}
            />
          </Suspense>
        )}

        {/* Stats / Wrapped */}
        {loadedTabs.has('stats') && activeTab === 'stats' && (
          <Suspense fallback={<TabSkeleton />}>
            <Stats
              analytics={analytics}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              accentColor={accentColor}
            />
          </Suspense>
        )}
      </main>

      {/* Floating Playback Bar */}
      <Player
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onPlayNext={handlePlayNext}
        onPlayPrevious={handlePlayPrevious}
        favorites={favorites}
        onToggleLike={handleToggleLike}
        isShuffle={isShuffle}
        setIsShuffle={setIsShuffle}
        isRepeat={isRepeat}
        setIsRepeat={setIsRepeat}
        audioRef={audioRef}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        queue={queue}
        setQueue={setQueue}
        currentQueueIndex={currentQueueIndex}
        onPlayTrack={handlePlayTrack}
        onOpenLyrics={handleOpenLyrics}
        isFetchingLyrics={isFetchingLyrics}
        
        // Playlist direct bindings
        playlists={playlists}
        onAddToPlaylist={handleAddToPlaylist}
        
        // Advanced settings bindings
        playbackSpeed={playbackSpeed}
        equalizerPreset={equalizerPreset}
        customEqualizerBands={customEqualizerBands}
        crossfadeTime={crossfadeTime}
        sleepTimer={sleepTimer}
        volumeNormalization={volumeNormalization}
        ambientIntensity={ambientIntensity}
        
        // Analytics binding
        onIncrementListeningTime={handleIncrementListeningTime}
      />

      {/* Mobile Bottom Tab Navigation (Material 3 style) */}
      <nav className="fixed bottom-0 left-0 right-0 mobile-nav border-t border-white/8 bg-[#0b0b0b]/96 backdrop-blur-3xl flex items-start justify-around z-[60] px-2">
        {TAB_NAV.map(tab => {
          const isActive = activeTab === tab.id;
          const activeH = accentColor?.h ?? 217;
          const activeS = Math.min(accentColor?.s ?? 90, 75);

          return (
            <button
              key={tab.id}
              id={`mobile-nav-${tab.id}`}
              onClick={() => changeTab(tab.id)}
              className="ripple relative flex flex-col items-center justify-center w-full h-14 gap-1 pt-1 overflow-hidden group cursor-pointer"
            >
              <div
                className={`flex items-center justify-center w-14 h-8 rounded-full transition-all duration-300 ${
                  isActive ? 'scale-105 shadow-lg' : 'bg-transparent text-white/50 group-hover:text-white/80'
                }`}
                style={isActive ? {
                  background: `hsla(${activeH}, ${activeS}%, 55%, 0.22)`,
                  borderColor: `hsla(${activeH}, ${activeS}%, 60%, 0.35)`,
                  boxShadow: `0 4px 15px hsla(${activeH}, ${activeS}%, 50%, 0.25)`,
                  color: `hsl(${activeH}, ${activeS}%, 65%)`
                } : {}}
              >
                <span
                  className="material-symbols-outlined text-[23px] transition-all"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {tab.icon}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold tracking-wide transition-colors ${
                  isActive ? 'text-white' : 'text-white/50'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Auth System Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Album Songs Detail Modal */}
      <AlbumModal
        isOpen={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        album={selectedAlbum}
        onPlayTrack={handlePlayTrack}
      />

      {/* Now Playing Toast */}
      <NowPlayingToast track={currentTrack} accentColor={accentColor} />
    </div>
  );
}
