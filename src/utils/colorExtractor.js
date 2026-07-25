/**
 * colorExtractor.js
 * Extracts the dominant color from an image URL using the Canvas API.
 * Returns an HSL string that can be used as a CSS color.
 */

const cache = new Map();

/**
 * Extract dominant color from an image URL.
 * @param {string} imageUrl
 * @returns {Promise<{raw: [number,number,number], hsl: string, rgba: string} | null>}
 */
export async function extractDominantColor(imageUrl) {
  if (!imageUrl) return null;
  if (cache.has(imageUrl)) return cache.get(imageUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const SIZE = 40; // small sample for speed
        canvas.width = SIZE;
        canvas.height = SIZE;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SIZE, SIZE);

        const imageData = ctx.getImageData(0, 0, SIZE, SIZE).data;

        let r = 0, g = 0, b = 0, count = 0;

        // Average the pixels, skip near-black and near-white
        for (let i = 0; i < imageData.length; i += 4) {
          const pr = imageData[i];
          const pg = imageData[i + 1];
          const pb = imageData[i + 2];
          const brightness = (pr + pg + pb) / 3;

          // Skip very dark or very bright pixels for more vivid palette
          if (brightness < 20 || brightness > 230) continue;

          r += pr;
          g += pg;
          b += pb;
          count++;
        }

        if (count === 0) {
          resolve(null);
          return;
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Boost saturation a bit by pulling toward the max channel
        const max = Math.max(r, g, b);
        const boost = 1.3;
        r = Math.min(255, Math.round(r + (max - r) * (boost - 1)));
        g = Math.min(255, Math.round(g + (max - g) * (boost - 1)));
        b = Math.min(255, Math.round(b + (max - b) * (boost - 1)));

        const hsl = rgbToHsl(r, g, b);
        const result = {
          raw: [r, g, b],
          hsl: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
          // Darker version for backgrounds
          bgGradient: `linear-gradient(180deg, hsl(${hsl[0]}, ${Math.min(hsl[1], 60)}%, 15%) 0%, hsl(${hsl[0]}, ${Math.min(hsl[1], 40)}%, 8%) 30%, #000 70%)`,
          // Semi-transparent tint
          tint: `hsla(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%, 0.18)`,
          // Player bar gradient
          playerGradient: `linear-gradient(135deg, hsl(${hsl[0]}, ${Math.min(hsl[1], 55)}%, 12%) 0%, #0b0b0b 100%)`,
          h: hsl[0],
          s: hsl[1],
          l: hsl[2],
        };

        cache.set(imageUrl, result);
        resolve(result);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
