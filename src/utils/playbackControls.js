import { registerPlugin, Capacitor } from '@capacitor/core';

const PlaybackControls = registerPlugin('PlaybackControls');

/**
 * Request notification permissions on startup (Android 13+ requirement)
 */
export async function requestNotificationPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch (err) {
    console.log('Notification permission request skipped:', err);
  }
}

/**
 * Update the native (Capacitor) media notification with full track metadata.
 * Falls back silently if not on a native platform or plugin is unavailable.
 */
export async function updateNativePlaybackState(track, isPlaying, duration = 0, currentTime = 0) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const title    = track?.title    ? String(track.title)    : 'Unknown Title';
    const artist   = track?.artist   ? String(track.artist)   : 'Unknown Artist';
    const album    = track?.album    ? String(track.album)    : 'Vibe Deck';
    const coverUrl = track?.coverUrl ? String(track.coverUrl) : '';
    const durNum   = duration || (track?.duration ? Number(track.duration) : 0);
    const currNum  = currentTime || 0;

    await PlaybackControls.updateState({
      title,
      artist,
      album,
      coverUrl,
      isPlaying: Boolean(isPlaying),
      duration: Number(durNum),
      currentTime: Number(currNum),
    });
  } catch (_) {
    // Plugin not installed or not available — ignore silently
  }
}

/**
 * Update the Web Media Session API metadata + playback state.
 * Safe to call on both web and native (skips if not supported).
 *
 * @param {object|null} track
 * @param {boolean} isPlaying
 * @param {string|null} artworkBlobUrl  - Pre-converted local blob URL for the artwork
 */
export function updateWebMediaSession(track, isPlaying, artworkBlobUrl = null) {
  if (!('mediaSession' in navigator)) return;

  // Metadata
  if (track) {
    const artworkSrc = artworkBlobUrl || track.coverUrl;
    const artwork = artworkSrc
      ? [
          { src: artworkSrc, sizes: '96x96',  type: 'image/png' },
          { src: artworkSrc, sizes: '256x256', type: 'image/png' },
          { src: artworkSrc, sizes: '512x512', type: 'image/png' },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  track.title  || 'Unknown Track',
      artist: track.artist || 'Unknown Artist',
      album:  track.album  || 'Vibe Deck',
      artwork,
    });
  } else {
    navigator.mediaSession.metadata = null;
  }

  // Playback state
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
}
