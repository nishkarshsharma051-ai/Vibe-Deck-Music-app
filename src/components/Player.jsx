import React, { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { updateNativePlaybackState } from '../utils/playbackControls';
import ShareCard from './ShareCard';
import DevicePickerModal from './DevicePickerModal';


export default function Player({
  currentTrack,
  isPlaying = false,
  setIsPlaying = () => {},
  onPlayNext = () => {},
  onPlayPrevious = () => {},
  favorites = [],
  onToggleLike = () => {},
  isShuffle = false,
  setIsShuffle = () => {},
  isRepeat = false,
  setIsRepeat = () => {},
  audioRef,
  currentTime = 0,
  setCurrentTime = () => {},
  queue = [],
  setQueue,
  currentQueueIndex = 0,
  onPlayTrack,
  onOpenLyrics = () => {},
  isFetchingLyrics = false,
  
  // Playlists direct
  playlists = [],
  onAddToPlaylist,
  
  // Advanced Settings from Spotify preferences
  playbackSpeed,
  equalizerPreset,
  customEqualizerBands,
  crossfadeTime,
  sleepTimer,
  volumeNormalization,
  ambientIntensity,
  
  // Analytics
  onIncrementListeningTime
}) {
  const [volume, setVolume] = useState(0.8);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState('default');
  const [showVisualizer, setShowVisualizer] = useState(false);
  const canvasRef = useRef(null);
  const hlsRef = useRef(null);
  const currentTrackRef = useRef(currentTrack);
  const sleepTimerRef = useRef(sleepTimer);
  useEffect(() => {
    sleepTimerRef.current = sleepTimer;
  }, [sleepTimer]);
  const [corsFailed, setCorsFailed] = useState(false);
  const attemptsRef = useRef(0);
  const [showAutoHealedAlert, setShowAutoHealedAlert] = useState(false);
  const [healedSongName, setHealedSongName] = useState('');
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

  const accumulatedSecondsRef = useRef(0);
  const playAwardedForSessionRef = useRef(false);

  useEffect(() => {
    // Flush previous track's stats before changing reference
    if (accumulatedSecondsRef.current > 0 && currentTrackRef.current && onIncrementListeningTime) {
      onIncrementListeningTime(currentTrackRef.current, accumulatedSecondsRef.current, playAwardedForSessionRef.current);
      accumulatedSecondsRef.current = 0;
    }
    playAwardedForSessionRef.current = false;
    currentTrackRef.current = currentTrack;
    setCorsFailed(false);
    attemptsRef.current = 0;
  }, [currentTrack?.id]);

  // Web Audio Refs for EQ chain
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const eqFiltersRef = useRef([]);


  useEffect(() => {
    if (!isNowPlayingOpen) return undefined;

    const state = { vibeDeckOverlay: 'nowPlaying' };
    window.history.pushState(state, '');

    const handlePopState = () => {
      setIsNowPlayingOpen(false);
      setIsPlaylistMenuOpen(false);
    };

    window.addEventListener('popstate', handlePopState, { once: true });
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isNowPlayingOpen]);

  // Media Session API — lock screen controls and notifications
  // Artwork blob ref — convert remote cover to local blob so the OS notification can show it
  const artworkBlobRef = useRef(null);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (Capacitor.isNativePlatform()) return;
    if (!currentTrack) { navigator.mediaSession.metadata = null; return; }

    const setMetadata = (artworkUrl) => {
      const artwork = artworkUrl
        ? [
            { src: artworkUrl, sizes: '96x96',   type: 'image/png' },
            { src: artworkUrl, sizes: '256x256',  type: 'image/png' },
            { src: artworkUrl, sizes: '512x512',  type: 'image/png' },
          ]
        : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title:  currentTrack.title  || 'Unknown Track',
        artist: currentTrack.artist || 'Unknown Artist',
        album:  currentTrack.album  || 'Vibe Deck',
        artwork,
      });
    };

    // Try to convert the remote image to a local blob URL so the OS can always load it
    if (currentTrack.coverUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          canvas.getContext('2d').drawImage(img, 0, 0, 512, 512);
          canvas.toBlob((blob) => {
            if (!blob) { setMetadata(currentTrack.coverUrl); return; }
            // Revoke previous blob to avoid memory leak
            if (artworkBlobRef.current) URL.revokeObjectURL(artworkBlobRef.current);
            const blobUrl = URL.createObjectURL(blob);
            artworkBlobRef.current = blobUrl;
            setMetadata(blobUrl);
          }, 'image/png');
        } catch (_) {
          setMetadata(currentTrack.coverUrl);
        }
      };
      img.onerror = () => setMetadata(currentTrack.coverUrl);
      img.src = currentTrack.coverUrl;
    } else {
      setMetadata(null);
    }

    return () => {
      // Clean up blob on track change
      if (artworkBlobRef.current) {
        URL.revokeObjectURL(artworkBlobRef.current);
        artworkBlobRef.current = null;
      }
    };
  }, [currentTrack?.id, currentTrack?.coverUrl]);

  // Sync playback state → notification shows "playing" or "paused"
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (Capacitor.isNativePlatform()) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    updateNativePlaybackState(currentTrack, isPlaying);
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, isPlaying]);

  // Register notification button action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (Capacitor.isNativePlatform()) return;

    const handlePlay = () => {
      setIsPlaying(true);
      if (audioRef.current) audioRef.current.play().catch(() => {});
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    };
    const handlePreviousTrack = () => onPlayPrevious();
    const handleNextTrack = () => onPlayNext();
    const handleSeekTo = ({ seekTime }) => {
      if (seekTime === undefined || isNaN(seekTime)) return;
      setCurrentTime(seekTime);
      if (audioRef.current) audioRef.current.currentTime = seekTime;
    };
    const handleSeekBackward = ({ seekOffset = 10 }) => {
      const t = Math.max(0, (audioRef.current?.currentTime || currentTime) - seekOffset);
      setCurrentTime(t);
      if (audioRef.current) audioRef.current.currentTime = t;
    };
    const handleSeekForward = ({ seekOffset = 10 }) => {
      const t = (audioRef.current?.currentTime || currentTime) + seekOffset;
      setCurrentTime(t);
      if (audioRef.current) audioRef.current.currentTime = t;
    };
    const handleStop = () => {
      setIsPlaying(false);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    };

    const actions = [
      ['play',           handlePlay],
      ['pause',          handlePause],
      ['previoustrack',  handlePreviousTrack],
      ['nexttrack',      handleNextTrack],
      ['seekto',         handleSeekTo],
      ['seekbackward',   handleSeekBackward],
      ['seekforward',    handleSeekForward],
      ['stop',           handleStop],
    ];

    actions.forEach(([action, handler]) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch (_) {}
    });

    return () => {
      actions.forEach(([action]) => {
        try { navigator.mediaSession.setActionHandler(action, null); } catch (_) {}
      });
    };
  }, [onPlayNext, onPlayPrevious, setIsPlaying, setCurrentTime, audioRef]);

  // Update position state — debounced to every 5s to avoid notification flicker
  const positionUpdateRef = useRef(null);
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (!currentTrack || !duration || duration <= 0 || !isFinite(duration)) return;

    const update = () => {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: audioRef.current?.playbackRate || 1,
          position: Math.min(Math.max(0, currentTime), duration),
        });
      } catch (_) {}
    };

    // Always update immediately on track/duration change
    update();

    // Then throttle position updates to every 5s while playing
    if (isPlaying) {
      clearInterval(positionUpdateRef.current);
      positionUpdateRef.current = setInterval(update, 5000);
    }
    return () => clearInterval(positionUpdateRef.current);
  }, [currentTrack?.id, duration, isPlaying]);

  // One-shot update when seeking (currentTime changes by user gesture)
  const lastSeekRef = useRef(currentTime);
  useEffect(() => {
    const delta = Math.abs(currentTime - lastSeekRef.current);
    lastSeekRef.current = currentTime;
    // Only fire on big jumps (seek action), not every second of playback
    if (delta < 3 || !('mediaSession' in navigator) || !duration || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: audioRef.current?.playbackRate || 1,
        position: Math.min(Math.max(0, currentTime), duration),
      });
    } catch (_) {}
  }, [currentTime]);


  useEffect(() => {
    if (!audioRef.current) return;

    const initEqualizer = () => {
      if (audioContextRef.current || corsFailed) return;

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const source = ctx.createMediaElementSource(audioRef.current);
        sourceRef.current = source;

        // Frequencies corresponding to standard pro filters
        const frequencies = [60, 230, 910, 4000, 14000];
        const filters = frequencies.map((freq, idx) => {
          const filter = ctx.createBiquadFilter();
          filter.type = idx === 0 ? 'lowshelf' : idx === 4 ? 'highshelf' : 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1.0;
          filter.gain.value = customEqualizerBands[idx] || 0;
          return filter;
        });

        eqFiltersRef.current = filters;

        // Analyser for sound visualization
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        // Connect the nodes chain: Source -> EQ0 -> EQ1 -> EQ2 -> EQ3 -> EQ4 -> Analyser -> Destination
        let prevNode = source;
        filters.forEach((filter) => {
          prevNode.connect(filter);
          prevNode = filter;
        });

        prevNode.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (err) {
        console.warn('Equalizer chain skipped (e.g. CORS remote stream constraints):', err);
      }
    };

    if (isPlaying) {
      initEqualizer();
    }
  }, [isPlaying, audioRef]);

  // Dynamically update EQ band gains when customized
  useEffect(() => {
    if (eqFiltersRef.current && eqFiltersRef.current.length > 0) {
      eqFiltersRef.current.forEach((filter, idx) => {
        if (filter) {
          filter.gain.value = customEqualizerBands[idx] || 0;
        }
      });
    }
  }, [customEqualizerBands]);

  // Adjust playback tempo speed rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed || 1.0;
    }
  }, [playbackSpeed, currentTrack?.id, isPlaying, audioRef]);

  // Listening time tracker (batches every 10s)
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;

    const flushListeningTime = () => {
      if (accumulatedSecondsRef.current > 0 && currentTrackRef.current && onIncrementListeningTime) {
        onIncrementListeningTime(currentTrackRef.current, accumulatedSecondsRef.current, playAwardedForSessionRef.current);
        accumulatedSecondsRef.current = 0;
      }
    };

    const interval = setInterval(() => {
      accumulatedSecondsRef.current += 1;
      if (accumulatedSecondsRef.current >= 30) {
        playAwardedForSessionRef.current = true;
      }
      
      // Flush every 10 seconds to keep stats reasonably fresh without rendering thrash
      if (accumulatedSecondsRef.current >= 10) {
        flushListeningTime();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      flushListeningTime(); // Flush immediately on pause/unmount
    };
  }, [isPlaying, currentTrack?.id, onIncrementListeningTime]);

  const trackDuration = Number(currentTrack?.duration) || 0;

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Visualizer rendering (organic wave sim) — only runs when visualizer is visible & playing
  useEffect(() => {
    if (!showVisualizer || !isNowPlayingOpen || !isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numBars = 16;
    const barHeights = Array(numBars).fill(0);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      // Smooth canvas clean
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create glowing neon steel gradient matching the theme
      const gradient = ctx.createLinearGradient(0, canvas.height, canvas.width, 0);
      gradient.addColorStop(0, '#b7c4ff'); // cobalt blue
      gradient.addColorStop(0.5, '#b8c4fe'); // steel blue
      gradient.addColorStop(1, '#ffb784'); // amber tint

      ctx.fillStyle = gradient;

      const barWidth = canvas.width / numBars;

      for (let i = 0; i < numBars; i++) {
        let targetHeight = 0;

        if (isPlaying) {
          // Generate smooth, organic wave fluctuations combining multiple frequencies and tempos
          const time = Date.now() * 0.005;
          const slowWave = Math.sin(i * 0.3 + time) * 0.4 + 0.4;
          const fastPulse = Math.cos(i * 0.7 - time * 2) * 0.25 + 0.25;
          const beatSync = 0.8 + 0.2 * Math.abs(Math.sin(time * 1.5));
          
          targetHeight = (slowWave + fastPulse) * beatSync * canvas.height * 0.8;
          
          // Add minor high-frequency random jitters for ultimate realism
          targetHeight += Math.random() * 2 - 1;
        } else {
          // Flatline when paused
          targetHeight = 2; // subtle background glow
        }

        // Linear interpolation (lerp) for liquid-smooth movement
        barHeights[i] += (targetHeight - barHeights[i]) * 0.16;
        if (barHeights[i] < 2) barHeights[i] = 2;

        const x = i * barWidth;
        const height = barHeights[i];

        ctx.beginPath();
        // Rounded caps
        ctx.roundRect(x + 1, canvas.height - height, barWidth - 2, height, 2);
        ctx.fill();
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [showVisualizer, isNowPlayingOpen, isPlaying]);

  const prevTrackIdRef = useRef('');

  useEffect(() => {
    setDuration(trackDuration);
  }, [trackDuration, currentTrack?.id]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!currentTrack?.hlsUrl) return;

    const audio = audioRef.current;
    const canPlayNativeHls = audio.canPlayType('application/vnd.apple.mpegurl');

    if (canPlayNativeHls) {
      audio.src = currentTrack.hlsUrl;
      return;
    }

    if (window.Hls?.isSupported?.()) {
      const hls = new window.Hls();
      hls.loadSource(currentTrack.hlsUrl);
      hls.attachMedia(audio);
      hlsRef.current = hls;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [audioRef, currentTrack?.id, currentTrack?.hlsUrl]);

  useEffect(() => {
    if (!currentTrack) return;

    const trackChanged = prevTrackIdRef.current !== currentTrack.id;
    prevTrackIdRef.current = currentTrack.id;
    if (trackChanged) {
      setCurrentTime(0);
      setDuration(0);
    }

    if (audioRef.current) {
      if (trackChanged) {
        audioRef.current.load();
      }
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.log('Autoplay blocked:', err);
          if (err.name === 'NotAllowedError') {
            setIsAutoplayBlocked(true);
          }
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [audioRef, currentTrack, isPlaying, setCurrentTime]);

  useEffect(() => {
    const vol = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, [volume, isMuted]);

  const handlePlayPause = async () => {
    if (!currentTrack) return;
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (audioRef.current) {
      if (nextPlaying) {
        audioRef.current.play().catch((err) => {
          console.log("Audio gesture play blocked:", err);
          if (err.name === 'NotAllowedError') {
            setIsAutoplayBlocked(true);
          }
        });
      } else {
        audioRef.current.pause();
      }
    }
  };

  const handlePlayPauseRef = useRef(handlePlayPause);
  const onPlayNextRef = useRef(onPlayNext);
  const onPlayPreviousRef = useRef(onPlayPrevious);
  
  useEffect(() => {
    handlePlayPauseRef.current = handlePlayPause;
    onPlayNextRef.current = onPlayNext;
    onPlayPreviousRef.current = onPlayPrevious;
  });

  useEffect(() => {
    const handleNativePlaybackAction = (event) => {
      const action = event?.detail?.action;
      if (action === 'toggle') {
        handlePlayPauseRef.current();
      } else if (action === 'next') {
        onPlayNextRef.current();
      } else if (action === 'previous') {
        onPlayPreviousRef.current();
      }
    };

    window.addEventListener('native-playback-action', handleNativePlaybackAction);
    return () => window.removeEventListener('native-playback-action', handleNativePlaybackAction);
  }, []);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSeekChange = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);

    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const mediaDuration = audioRef.current.duration;
      if (mediaDuration !== undefined && !isNaN(mediaDuration) && mediaDuration > 0 && mediaDuration !== Infinity) {
        setDuration(mediaDuration);
      } else {
        setDuration(trackDuration);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime || 0);
    }
  };

  const handleAudioEnded = () => {
    if (sleepTimer === 'end') {
      setIsPlaying(false);
    } else {
      onPlayNext();
    }
  };

  const handleAudioError = async () => {
    attemptsRef.current += 1;
    console.warn(`Playback attempt #${attemptsRef.current} failed for track "${currentTrack?.title}".`);

    if (attemptsRef.current === 1 && !corsFailed) {
      setCorsFailed(true);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
          if (isPlaying) {
            audioRef.current.play().catch(e => console.log("CORS fallback autoplay blocked:", e));
          }
        }
      }, 100);
      return;
    }

    // Auto-Heal: Advance queue, show floating warning alert
    console.warn("Audio stream failed. Playing next track in queue...");
    setHealedSongName(currentTrack?.title || 'Unknown Track');
    setShowAutoHealedAlert(true);
    setTimeout(() => {
      setShowAutoHealedAlert(false);
    }, 4000);
    
    attemptsRef.current = 0;
    onPlayNext();
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isLiked = currentTrack && favorites.some((f) => f.id === currentTrack.id);

  return (
    <>
    <footer className="fixed playback-footer left-0 md:left-[280px] right-0 bottom-0 z-50 select-none">
      
      {/* Core media elements */}
      <audio
        ref={audioRef}
        crossOrigin={corsFailed ? undefined : "anonymous"}
        src={currentTrack?.hlsUrl ? undefined : currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
      />


      {/* Mobile mini player */}
      <div
        className="vibedeck-mini-player flex md:hidden items-center justify-between mx-2.5 px-3 py-2.5 rounded-lg bg-[#181818] border border-white/8 shadow-2xl cursor-pointer"
        onClick={(e) => {
          if (!e.target.closest('button')) setIsNowPlayingOpen(true);
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {currentTrack ? (
            <img src={currentTrack.coverUrl} alt="Album Art" className="w-11 h-11 object-cover rounded-md flex-shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-md bg-[#282828] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#b3b3b3] text-lg">music_note</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-[13px] truncate">
              {currentTrack?.title || 'No song playing'}
            </p>
            <p className="text-[#b3b3b3] text-[11px] truncate mt-0.5">
              {currentTrack?.artist || 'Pick a track to start'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl fill-1">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            onClick={onPlayNext}
            className="material-symbols-outlined text-[28px] text-[#b3b3b3] hover:text-white cursor-pointer"
          >
            skip_next
          </button>
        </div>
      </div>

      {/* Desktop player */}
      <div className="hidden md:grid grid-cols-[1fr_2fr_1fr] items-center h-20 bg-black px-4 transition-all">

        {/* Now Playing Info Panel */}
        <div className="flex items-center gap-4 min-w-0">
          {currentTrack ? (
            <>
              <img alt="Album Art" className="w-14 h-14 object-cover rounded shadow-md flex-shrink-0" src={currentTrack.coverUrl} />
              <div className="min-w-0 flex-1">
                <h5 className="text-white font-bold text-xs truncate hover:underline cursor-pointer">{currentTrack.title}</h5>
                <p className="text-[#b3b3b3] text-[10px] truncate mt-0.5 hover:underline cursor-pointer">{currentTrack.artist}</p>
              </div>
              <button
                onClick={() => onToggleLike(currentTrack)}
                className={`material-symbols-outlined text-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  isLiked ? 'text-primary fill-1' : 'text-[#b3b3b3] hover:text-white'
                }`}
              >
                favorite
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded bg-[#181818] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#b3b3b3]/55">music_note</span>
              </div>
              <div>
                <h5 className="text-[#b3b3b3] font-bold text-xs">No song playing</h5>
                <p className="text-[10px] text-[#b3b3b3]/40 mt-0.5">VibeDeck Premium</p>
              </div>
            </div>
          )}
        </div>

        {/* Media Controller Panel */}
        <div className="flex flex-col items-center gap-1.5 max-w-xl justify-self-center w-full">
          <div className="flex items-center gap-5">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`material-symbols-outlined text-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isShuffle ? 'text-primary' : 'text-[#b3b3b3] hover:text-white'
              }`}
            >
              shuffle
            </button>
            <button
              onClick={onPlayPrevious}
              className="material-symbols-outlined text-xl text-[#b3b3b3] hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              skip_previous
            </button>
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl fill-1">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button
              onClick={onPlayNext}
              className="material-symbols-outlined text-xl text-[#b3b3b3] hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              skip_next
            </button>
            <button
              onClick={() => setIsRepeat(!isRepeat)}
              className={`material-symbols-outlined text-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isRepeat ? 'text-primary' : 'text-[#b3b3b3] hover:text-white'
              }`}
            >
              repeat
            </button>
          </div>

          {/* Seek Bar */}
          {(() => {
            const activeDuration = duration && duration !== Infinity && !isNaN(duration) && duration > 0
              ? duration
              : (trackDuration || 0);
            return (
              <div className="flex items-center gap-2.5 w-full px-4 group">
                <span className="text-[10px] text-[#b3b3b3] font-mono w-8 text-right">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 relative flex items-center">
                  <input
                    type="range" min="0" max={activeDuration || 100}
                    value={Math.min(currentTime, activeDuration || 100)}
                    onChange={handleSeekChange}
                    className="w-full h-1 bg-[#404040] rounded-full appearance-none outline-none cursor-pointer focus:outline-none"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-primary pointer-events-none rounded-full"
                    style={{ width: `${Math.min(100, (currentTime / (activeDuration || 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#b3b3b3] font-mono w-8">
                  {formatTime(activeDuration)}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Volume + Extras */}
        <div className="flex items-center justify-end gap-3 min-w-0">
          <button
            onClick={onOpenLyrics}
            disabled={!currentTrack}
            title={isFetchingLyrics ? 'Fetching lyrics...' : currentTrack?.lyrics ? 'View synced lyrics' : 'Lyrics not available'}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              currentTrack?.lyrics
                ? 'text-primary hover:scale-105'
                : isFetchingLyrics
                ? 'text-[#b3b3b3]/60 cursor-wait'
                : 'text-[#b3b3b3]/30 cursor-default'
            }`}
          >
            {isFetchingLyrics ? (
              <span className="material-symbols-outlined text-lg animate-spin">autorenew</span>
            ) : (
              <span className="material-symbols-outlined text-lg">lyrics</span>
            )}
            <span className="hidden xl:inline">{isFetchingLyrics ? 'Loading...' : 'Lyrics'}</span>
          </button>

          <div className="flex items-center gap-2 group">
            <button
              onClick={toggleMute}
              className="material-symbols-outlined text-[#b3b3b3] hover:text-white text-lg transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
            </button>
            <div className="w-20 relative flex items-center">
              <input
                type="range" min="0" max="1" step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-[#404040] rounded-full appearance-none outline-none cursor-pointer focus:outline-none"
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-primary pointer-events-none rounded-full"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </footer>

    {/* Full-screen now playing panel */}
    {isNowPlayingOpen && (
      <div
        className="fixed inset-0 z-[200] md:hidden bg-[#12131b]"
        style={{
          animation: 'nowPlayingSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* Dynamic immersive blurred album art background */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {currentTrack?.coverUrl ? (
            <img
              className="w-full h-full object-cover scale-110 blur-[60px] opacity-35 transition-transform duration-700"
              alt="Dynamic Immersive Background"
              src={currentTrack.coverUrl}
              style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,#2a3d46,#12131b_58%,#0b0b0f)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#12131b] via-transparent to-black/20" />
        </div>

        {/* Content Canvas */}
        <div className="relative z-10 h-full flex flex-col px-6 pt-safe pb-6">
          {/* Top Bar */}
          <div className="flex justify-between items-center py-4 pt-8">
            <button
              onClick={() => {
                setIsNowPlayingOpen(false);
                setIsPlaylistMenuOpen(false);
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/8 border border-white/8 hover:bg-white/15 active:scale-90 transition-all duration-300"
            >
              <span className="material-symbols-outlined text-white text-[22px]">keyboard_arrow_down</span>
            </button>
            <div className="text-center">
              <p className="text-[11px] text-white/55 font-bold uppercase tracking-[0.18em]">Now Playing</p>
              <p className="text-white/88 text-xs font-semibold truncate max-w-[180px] mt-1">
                {currentTrack?.album || 'Vibe Deck'}
              </p>
            </div>
            <button
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/8 border border-white/8 hover:bg-white/15 active:scale-90 transition-all duration-300"
              onClick={() => setIsShareOpen(true)}
              title="Share"
            >
              <span className="material-symbols-outlined text-white text-[22px]">share</span>
            </button>
          </div>

          {/* Immersive Artwork / Visualizer Container */}
          <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
            {/* View Mode Toggle Pill */}
            <div className="mb-3 flex items-center gap-1 bg-black/40 border border-white/10 rounded-full p-1 text-[11px] font-bold z-20">
              <button
                onClick={() => setShowVisualizer(false)}
                className={`px-3 py-1 rounded-full transition-all ${!showVisualizer ? 'bg-white text-black shadow' : 'text-white/60 hover:text-white'}`}
              >
                Art
              </button>
              <button
                onClick={() => setShowVisualizer(true)}
                className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${showVisualizer ? 'bg-[#3b82f6] text-white shadow' : 'text-white/60 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-xs">graphic_eq</span>
                Visualizer
              </button>
            </div>

            {showVisualizer ? (
              <div className="w-full max-w-[320px] aspect-square rounded-2xl bg-black/60 border border-white/10 p-4 flex flex-col items-center justify-center shadow-2xl relative">
                <canvas ref={canvasRef} width={280} height={200} className="w-full h-44" />
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-3">Live Audio Waveform</p>
              </div>
            ) : (
              <div
                className="w-full aspect-square max-w-[320px] relative transition-all duration-500 shadow-[0_20px_70px_rgba(0,0,0,0.45)] rounded-xl overflow-hidden"
                style={{
                  animation: isPlaying ? 'albumBreath 4s ease-in-out infinite' : 'none',
                }}
              >
                {currentTrack?.coverUrl ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-white/20">music_note</span>
                  </div>
                )}
                {/* Overlay Shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
              </div>
            )}
          </div>

          {/* Track Info & Like */}
          <div className="mb-5 flex justify-between items-end">
            <div className="flex-1 min-w-0">
              <h1 className="text-[2rem] font-black text-white tracking-tight truncate">
                {currentTrack?.title || 'No song playing'}
              </h1>
              <p className="text-white/72 text-base truncate mt-1">
                {currentTrack?.artist || 'Unknown Artist'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setIsPlaylistMenuOpen(!isPlaylistMenuOpen)}
                  className="mb-1 flex-shrink-0 active:scale-75 transition-all text-white/60 hover:text-white"
                  title="Add to Playlist"
                >
                  <span className="material-symbols-outlined text-3xl">
                    playlist_add
                  </span>
                </button>
                
                {isPlaylistMenuOpen && (
                  <div className="absolute right-0 bottom-10 z-[100] w-48 rounded-xl glass-panel-3 border border-white/10 shadow-2xl py-2 text-xs text-left" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-wider px-4 py-1.5 border-b border-white/5">
                      Add to Playlist
                    </p>
                    {playlists.length === 0 ? (
                      <p className="text-on-surface-variant/60 px-4 py-2 italic">No playlists created</p>
                    ) : (
                      playlists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => {
                            if (currentTrack) {
                              onAddToPlaylist(pl.id, currentTrack);
                              setIsPlaylistMenuOpen(false);
                            }
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 text-on-surface-variant hover:text-white truncate block"
                        >
                          {pl.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => currentTrack && onToggleLike(currentTrack)}
                className="mb-1 flex-shrink-0 active:scale-75 transition-all"
              >
                <span
                  className={`material-symbols-outlined text-3xl transition-all ${
                    favorites.some(f => f.id === currentTrack?.id) ? 'text-primary fill-1' : 'text-white/60'
                  }`}
                  style={{ fontVariationSettings: favorites.some(f => f.id === currentTrack?.id) ? "'FILL' 1" : "'FILL' 0" }}
                >
                  favorite
                </span>
              </button>
            </div>
          </div>

          {/* Playback Progress */}
          {(() => {
            const activeDuration =
              duration && duration !== Infinity && !isNaN(duration) && duration > 0
                ? duration
                : trackDuration || 0;
            const progress = activeDuration > 0 ? Math.min(100, (currentTime / activeDuration) * 100) : 0;
            return (
              <div className="mb-8">
                <div className="relative h-1 w-full bg-white/15 rounded-full mb-2">
                  <div
                    className="absolute top-0 left-0 h-full bg-white rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max={activeDuration || 100}
                    value={Math.min(currentTime, activeDuration || 100)}
                    onChange={handleSeekChange}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                    style={{ height: '24px', top: '-10px' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/55 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(activeDuration)}</span>
                </div>
              </div>
            );
          })()}

          {/* Controls */}
          <div className="flex justify-between items-center mb-8 px-1">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-75 transition-all ${
                isShuffle ? 'text-primary' : 'text-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[26px]">shuffle</span>
            </button>

            <button
              onClick={onPlayPrevious}
              className="text-white active:scale-75 transition-all"
            >
              <span className="material-symbols-outlined text-[34px] fill-1">skip_previous</span>
            </button>

            <button
              onClick={handlePlayPause}
              className="w-[72px] h-[72px] bg-white text-black rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[42px] fill-1 text-black">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <button
              onClick={onPlayNext}
              className="text-white active:scale-75 transition-all"
            >
              <span className="material-symbols-outlined text-[34px] fill-1">skip_next</span>
            </button>

            <button
              onClick={() => setIsRepeat(!isRepeat)}
              className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-75 transition-all ${
                isRepeat ? 'text-primary' : 'text-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[26px]">repeat</span>
            </button>
          </div>

          {/* Utility Actions */}
          <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/8 bg-white/6 px-3 py-3 backdrop-blur-xl mb-4">
            <button
              onClick={() => setIsDeviceModalOpen(true)}
              className="flex flex-col items-center gap-1 text-white/60 transition-colors hover:text-primary cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">bluetooth_audio</span>
              <span className="text-[10px] font-semibold tracking-wider">Devices</span>
            </button>
            <button
              onClick={() => { setIsNowPlayingOpen(false); onOpenLyrics(); }}
              className="flex flex-col items-center gap-1 text-white/60 transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined text-xl">lyrics</span>
              <span className="text-[10px] font-semibold tracking-wider">Lyrics</span>
            </button>
            <button
              onClick={() => setIsShareOpen(true)}
              className="flex flex-col items-center gap-1 text-white/60 transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined text-xl">share</span>
              <span className="text-[10px] font-semibold tracking-wider">Share</span>
            </button>
            <button
              onClick={() => setIsQueueOpen(true)}
              className="flex flex-col items-center gap-1 text-white/60 transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined text-xl">queue_music</span>
              <span className="text-[10px] font-semibold tracking-wider">Queue</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Stream error auto-heal alert */}
    {showAutoHealedAlert && (
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[9999] bg-surface-container-high/90 backdrop-blur-[20px] border border-primary/20 rounded-full px-6 py-3 shadow-[0_0_30px_rgba(183,196,255,0.15)] flex items-center gap-3 text-xs font-bold text-white animate-slideUp">
        <span className="material-symbols-outlined text-primary text-base animate-pulse">auto_mode</span>
        <span>Playback Auto-Healed: Stream error on <span className="text-primary">"{healedSongName}"</span> resolved by skipping!</span>
      </div>
    )}

    {/* Autoplay gesture unlock modal */}
    {isAutoplayBlocked && (
      <div 
        onClick={() => {
          setIsAutoplayBlocked(false);
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log(e));
            setIsPlaying(true);
          }
        }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99999] flex items-center justify-center cursor-pointer animate-fadeIn"
      >
        <div className="bg-surface/85 backdrop-blur-[30px] border border-primary/20 rounded-3xl p-8 max-w-sm text-center space-y-6 shadow-[0_0_50px_rgba(183,196,255,0.15)] glass-stroke" onClick={(e) => e.stopPropagation()}>
          <span className="material-symbols-outlined text-5xl text-primary animate-pulse">music_note</span>
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-white">Unlock Sound System</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Your browser requires a user tap to enable high-fidelity sound output. Click below to stream instantly.
            </p>
          </div>
          <button 
            onClick={() => {
              setIsAutoplayBlocked(false);
              if (audioRef.current) {
                audioRef.current.play().catch(e => console.log(e));
                setIsPlaying(true);
              }
            }}
            className="bg-primary text-on-primary-container font-extrabold text-xs px-8 py-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-primary/20 neon-glow-blue w-full"
          >
            Start Playing
          </button>
        </div>
      </div>
    )}

    {/* Queue Drawer Modal */}
    {isQueueOpen && (
      <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-xl flex flex-col justify-end animate-fadeInGate">
        <div className="bg-[#12131c] border-t border-white/10 rounded-t-[32px] max-h-[80vh] flex flex-col px-6 pt-5 pb-8 animate-slideUp">
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-white">Playback Queue</h3>
              <p className="text-xs text-white/50">{queue.length} track{queue.length === 1 ? '' : 's'} in queue</p>
            </div>
            <div className="flex items-center gap-2">
              {queue.length > 0 && setQueue && (
                <button
                  onClick={() => setQueue([currentTrack].filter(Boolean))}
                  className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20"
                >
                  Clear Queue
                </button>
              )}
              <button
                onClick={() => setIsQueueOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2 pr-1 hide-scrollbar">
            {queue.length === 0 ? (
              <div className="py-12 text-center text-white/40">
                <span className="material-symbols-outlined text-4xl mb-2">queue_music</span>
                <p className="text-sm">Queue is empty</p>
              </div>
            ) : (
              queue.map((track, idx) => {
                const isCurrent = idx === currentQueueIndex;
                return (
                  <div
                    key={track.id || idx}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-[#3b82f6]/15 border-[#3b82f6]/40'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="w-6 text-center text-xs font-mono text-white/40 font-bold">
                      {isCurrent ? '▶' : idx + 1}
                    </span>
                    <img src={track.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        if (onPlayTrack) onPlayTrack(track, queue);
                        setIsQueueOpen(false);
                      }}
                    >
                      <p className={`text-sm font-bold truncate ${isCurrent ? 'text-[#60a5fa]' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="text-xs text-white/50 truncate">{track.artist}</p>
                    </div>
                    {setQueue && !isCurrent && (
                      <button
                        onClick={() => {
                          const updated = queue.filter((_, i) => i !== idx);
                          setQueue(updated);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    )}

    {/* Bluetooth & Audio Devices Modal */}
    <DevicePickerModal
      isOpen={isDeviceModalOpen}
      onClose={() => setIsDeviceModalOpen(false)}
      audioRef={audioRef}
      activeDeviceId={activeDeviceId}
      setActiveDeviceId={setActiveDeviceId}
    />

    {/* Share Card Modal */}
    <ShareCard
      track={currentTrack}
      isOpen={isShareOpen}
      onClose={() => setIsShareOpen(false)}
    />
    </>
  );
}
