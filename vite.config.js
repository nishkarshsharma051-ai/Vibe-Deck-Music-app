import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Spotify API Connect Middleware for secure client credentials authentication
const spotifyApiPlugin = () => {
  let cachedToken = null;
  let tokenExpiry = 0;

  const getSpotifyToken = async (clientId, clientSecret) => {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) {
      return cachedToken;
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.statusText}`);
      }

      const data = await response.json();
      cachedToken = data.access_token;
      tokenExpiry = now + (data.expires_in - 300) * 1000;
      return cachedToken;
    } catch (err) {
      console.error('Spotify Auth Token error:', err);
      return null;
    }
  };

  return {
    name: 'vite-plugin-spotify-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, 'SPOTIFY_');
      const clientId = env.SPOTIFY_CLIENT_ID;
      const clientSecret = env.SPOTIFY_CLIENT_SECRET;

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host}`);

        if (url.pathname === '/api/spotify/search') {
          res.setHeader('Content-Type', 'application/json');

          if (!clientId || !clientSecret) {
            res.statusCode = 500;
            res.end(JSON.stringify({
              error: 'Missing Spotify Credentials',
              message: 'SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is missing.'
            }));
            return;
          }

          const query = url.searchParams.get('q');
          if (!query) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing search query parameter "q"' }));
            return;
          }

          const token = await getSpotifyToken(clientId, clientSecret);
          if (!token) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Spotify authentication failed.' }));
            return;
          }

          try {
            const spotifyRes = await fetch(
              `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=25`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!spotifyRes.ok) throw new Error(`Spotify error ${spotifyRes.status}`);

            const data = await spotifyRes.json();
            const formattedTracks = (data.tracks?.items || []).map(item => {
              const artist = item.artists.map(a => a.name).join(', ');
              const title = item.name;
              const coverUrl = item.album.images[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop';
              return {
                id: `spotify-${item.id}`,
                title,
                artist,
                album: item.album.name,
                duration: Math.round(item.duration_ms / 1000),
                coverUrl,
                genre: 'Spotify Catalog',
                searchQuery: `${artist} ${title}`
              };
            });

            res.end(JSON.stringify(formattedTracks));
          } catch (err) {
            console.error('Spotify Proxy API error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Spotify Search query failed', details: err.message }));
          }
          return;
        }

        next();
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    spotifyApiPlugin(),
  ],
  build: {
    // Target modern Android WebView (Chrome 85+)
    target: 'chrome85',
    // Increase chunk warn limit for Player.jsx which is intentionally large
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Aggressive manual chunking — splits vendor code from app code
        manualChunks(id) {
          // Firebase SDK → its own chunk (rarely changes)
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          // Capacitor native bridge → its own chunk
          if (id.includes('node_modules/@capacitor')) {
            return 'vendor-capacitor';
          }
          // React core → its own chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // All other node_modules → shared vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        },
      },
    },
    // Minify with oxc (Vite 8's native fast minifier — no separate esbuild needed)
    minify: 'oxc',
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
})

