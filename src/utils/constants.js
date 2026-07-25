// Tracks are now fetched dynamically from JioSaavn/Gaana APIs on app load.
export const CURATED_TRACKS = [];

// Vibe mode presets
export const VIBE_PRESETS = {
  lofi: {
    id: "lofi",
    name: "Cozy Lofi",
    themeClass: "rain-active",
    themeColor: "rgba(56, 189, 248, 0.12)", // Sky blue tint
    ambientSoundUrl: "https://assets.mixkit.co/active_storage/sfx/2433/2433-84.wav", // Rain loops
    ambientVolume: 0.15,
    tagline: "Lo-fi beats with ambient rain.",
    bgGradient: "radial-gradient(circle at 50% 0%, #082f49 0%, #121212 100%)"
  },
  synthwave: {
    id: "synthwave",
    name: "Midnight Deck",
    themeClass: "synthwave-active",
    themeColor: "rgba(255, 255, 255, 0.05)", // Warm grey
    tagline: "Dark mode for late-night sessions.",
    bgGradient: "radial-gradient(circle at 50% 0%, #1a1a1a 0%, #121212 100%)"
  },
  focus: {
    id: "focus",
    name: "Deep Focus",
    themeClass: "focus-active",
    themeColor: "rgba(56, 189, 248, 0.08)", // Soft sky blue focus
    tagline: "Minimal distractions, maximum focus.",
    bgGradient: "radial-gradient(circle at 50% 0%, #16171d 0%, #121212 100%)"
  },
  normal: {
    id: "normal",
    name: "Standard Deck",
    themeClass: "",
    themeColor: "rgba(56, 189, 248, 0.12)", // Sky blue tint
    tagline: "Clean default player.",
    bgGradient: "radial-gradient(circle at 50% 0%, #072635 0%, #121212 100%)"
  }
};
