import React from 'react';

const EQUALIZER_PRESETS = {
  flat: { name: 'Flat (Default)', bands: [0, 0, 0, 0, 0] },
  bass_boost: { name: 'Bass Booster', bands: [6, 4, 0, -2, -4] },
  acoustic: { name: 'Acoustic', bands: [2, 1, 2, 3, 1] },
  dance: { name: 'Dance', bands: [4, 2, 0, 2, 4] },
  electronic: { name: 'Electronic', bands: [3, 1, -1, 2, 3] },
  hiphop: { name: 'Hip-Hop', bands: [5, 3, 1, 2, 1] },
  classical: { name: 'Classical', bands: [3, 2, -1, -2, -3] },
  vocal_boost: { name: 'Vocal Booster', bands: [-2, -1, 3, 4, 1] }
};

const SLEEP_TIMER_OPTIONS = [
  { label: 'Off', value: null },
  { label: '5 Minutes', value: 5 },
  { label: '15 Minutes', value: 15 },
  { label: '30 Minutes', value: 30 },
  { label: '45 Minutes', value: 45 },
  { label: '1 Hour', value: 60 },
  { label: 'End of Track', value: 'end' }
];

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

const Settings = function Settings({
  playbackSpeed,
  onChangePlaybackSpeed,
  equalizerPreset,
  onChangeEqualizerPreset,
  customEqualizerBands,
  onChangeCustomEqualizerBands,
  crossfadeTime,
  onChangeCrossfadeTime,
  sleepTimer,
  onChangeSleepTimer,
  sleepTimerTimeRemaining,
  volumeNormalization,
  onChangeVolumeNormalization,
  compactMode,
  onChangeCompactMode,
  ambientIntensity,
  onChangeAmbientIntensity
}) {

  const handleBandChange = (index, value) => {
    const updatedBands = [...customEqualizerBands];
    updatedBands[index] = parseFloat(value);
    onChangeCustomEqualizerBands(updatedBands);
    onChangeEqualizerPreset('custom');
  };

  const selectPreset = (key) => {
    onChangeEqualizerPreset(key);
    if (key !== 'custom') {
      onChangeCustomEqualizerBands([...EQUALIZER_PRESETS[key].bands]);
    }
  };

  const formatRemainingTime = (secs) => {
    if (secs === null || isNaN(secs)) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="px-lg py-md space-y-12 animate-fadeIn max-w-4xl pb-40">
      
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">tune</span>
          Audio Settings & Preferences
        </h2>
        <p className="text-on-surface-variant text-sm">
          Optimize your premium playback experience, control output curves, and personalize atmosphere details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Equalizer Panel */}
        <div className="bg-white/2 border border-white/5 p-6 rounded-3xl space-y-6 relative overflow-hidden glass-panel shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] pointer-events-none"></div>
          
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">graphic_eq</span>
            Pro Equalizer
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-wider block mb-2">Preset Selector</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(EQUALIZER_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => selectPreset(key)}
                    className={`py-2 px-3 rounded-xl text-left text-xs font-semibold transition-all border ${
                      equalizerPreset === key
                        ? 'bg-primary text-on-primary-container border-primary/20 shadow-md neon-glow-blue'
                        : 'bg-white/5 border-transparent text-on-surface-variant hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
                <button
                  onClick={() => selectPreset('custom')}
                  className={`py-2 px-3 rounded-xl text-left text-xs font-semibold transition-all border ${
                    equalizerPreset === 'custom'
                      ? 'bg-primary text-on-primary-container border-primary/20 shadow-md neon-glow-blue'
                      : 'bg-white/5 border-transparent text-on-surface-variant hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Custom EQ curve
                </button>
              </div>
            </div>

            {/* EQ Slider Controls */}
            <div className="pt-4 space-y-4">
              <label className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-wider block">Frequency Bands (dB)</label>
              
              <div className="flex justify-between items-center h-44 bg-black/20 p-4 rounded-2xl border border-white/5 relative">
                
                {/* Visual grid guide lines */}
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-white/5 border-dashed pointer-events-none"></div>
                
                {['60Hz', '230Hz', '910Hz', '4kHz', '14kHz'].map((label, index) => {
                  const dbVal = customEqualizerBands[index] || 0;
                  return (
                    <div key={label} className="flex flex-col items-center h-full flex-1 justify-between relative z-10">
                      <span className="text-[10px] font-bold font-mono text-primary">{dbVal > 0 ? `+${dbVal}` : dbVal}dB</span>
                      
                      {/* Vertical Slider */}
                      <div className="h-24 w-6 flex items-center justify-center relative">
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="1"
                          orient="vertical" /* Supporting legacy browsers */
                          style={{
                            writingMode: 'bt-lr',
                            WebkitAppearance: 'slider-vertical',
                            width: '4px',
                            height: '100%',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '9999px',
                            cursor: 'pointer'
                          }}
                          value={dbVal}
                          onChange={(e) => handleBandChange(index, e.target.value)}
                        />
                      </div>
                      
                      <span className="text-[9px] font-bold text-on-surface-variant/50 tracking-wider mt-1">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Playback Settings Panel */}
        <div className="bg-white/2 border border-white/5 p-6 rounded-3xl space-y-6 relative overflow-hidden glass-panel shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-[60px] pointer-events-none"></div>
          
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">playback_speed</span>
            Audio Controls
          </h3>

          <div className="space-y-6">
            
            {/* Playback Speed */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-wider">Playback Tempo</label>
                <span className="text-xs font-bold text-secondary font-mono">{playbackSpeed}x</span>
              </div>
              <div className="flex gap-2">
                {PLAYBACK_SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => onChangePlaybackSpeed(speed)}
                    className={`flex-1 py-2 px-1 rounded-xl text-center text-xs font-bold transition-all border ${
                      playbackSpeed === speed
                        ? 'bg-secondary text-on-secondary-container border-secondary/20 shadow-md neon-glow-steel'
                        : 'bg-white/5 border-transparent text-on-surface-variant hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Crossfade */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <label className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-wider block">Crossfade Songs</label>
                  <p className="text-[10px] text-on-surface-variant/40">Smooth transition overlay duration between tracks</p>
                </div>
                <span className="text-xs font-bold text-secondary font-mono">{crossfadeTime}s</span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={crossfadeTime}
                  onChange={(e) => onChangeCrossfadeTime(parseInt(e.target.value))}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none outline-none cursor-pointer focus:outline-none"
                />
                <span className="text-[10px] font-bold text-on-surface-variant/50 w-8">{crossfadeTime === 0 ? 'Off' : `${crossfadeTime}s`}</span>
              </div>
            </div>

            {/* Volume Normalization */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/2 border border-white/5">
              <div className="space-y-0.5 pr-4">
                <label className="text-xs font-bold text-white block">Volume Normalization</label>
                <p className="text-[10px] text-on-surface-variant/50 leading-tight">Keeps playback volume balanced across different catalog tracks.</p>
              </div>
              <button
                onClick={() => onChangeVolumeNormalization(!volumeNormalization)}
                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${
                  volumeNormalization ? 'bg-primary' : 'bg-white/10'
                } flex items-center ${volumeNormalization ? 'justify-end' : 'justify-start'}`}
              >
                <div className="w-4 h-4 bg-background rounded-full shadow-md"></div>
              </button>
            </div>

          </div>
        </div>

        {/* Sleep Timer & Scheduling */}
        <div className="bg-white/2 border border-white/5 p-6 rounded-3xl space-y-6 relative overflow-hidden glass-panel shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/5 rounded-full blur-[60px] pointer-events-none"></div>
          
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">bedtime</span>
            Sleep Timer
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <label className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-wider block">Set Shutdown Timer</label>
                <p className="text-[10px] text-on-surface-variant/40">Turns off playing audio after the specified duration.</p>
              </div>
              {sleepTimer !== null && (
                <span className="text-xs font-bold text-tertiary font-mono bg-tertiary/10 border border-tertiary/20 rounded-full px-3 py-1 flex items-center gap-1 animate-pulse">
                  <span className="material-symbols-outlined text-xs">schedule</span>
                  {sleepTimer === 'end' ? 'End of Track' : formatRemainingTime(sleepTimerTimeRemaining)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {SLEEP_TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => onChangeSleepTimer(opt.value)}
                  className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all border ${
                    sleepTimer === opt.value
                      ? 'bg-tertiary text-on-tertiary-container border-tertiary/20 shadow-md neon-glow-orange'
                      : 'bg-white/5 border-transparent text-on-surface-variant hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customization & Visualizers */}
        <div className="bg-white/2 border border-white/5 p-6 rounded-3xl space-y-6 relative overflow-hidden glass-panel shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] pointer-events-none"></div>
          
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">palette</span>
            UI Customizer
          </h3>

          <div className="space-y-6">
            
            {/* Compact mode toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/2 border border-white/5">
              <div className="space-y-0.5 pr-4">
                <label className="text-xs font-bold text-white block">Compact Shelf Layout</label>
                <p className="text-[10px] text-on-surface-variant/50 leading-tight">Reduces margins and padding inside search lists and tracks shelf for maximum density.</p>
              </div>
              <button
                onClick={() => onChangeCompactMode(!compactMode)}
                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${
                  compactMode ? 'bg-primary' : 'bg-white/10'
                } flex items-center ${compactMode ? 'justify-end' : 'justify-start'}`}
              >
                <div className="w-4 h-4 bg-background rounded-full shadow-md"></div>
              </button>
            </div>

            {/* Ambient sound density */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <label className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-wider block">Ambient Sound Overlay Volume</label>
                  <p className="text-[10px] text-on-surface-variant/40">Adjust maximum level of custom active backing audio tracks (e.g. Rain)</p>
                </div>
                <span className="text-xs font-bold text-primary font-mono">{Math.round(ambientIntensity * 100)}%</span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={ambientIntensity}
                  onChange={(e) => onChangeAmbientIntensity(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none outline-none cursor-pointer focus:outline-none"
                />
                <span className="text-[10px] font-bold text-on-surface-variant/50 w-8">{ambientIntensity === 0 ? 'Muted' : `${Math.round(ambientIntensity * 100)}%`}</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
export default React.memo(Settings);
