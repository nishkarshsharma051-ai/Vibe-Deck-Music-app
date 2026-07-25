const DB_NAME = 'VibeDeckOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'local_songs';

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export async function saveLocalSong(song, fileBlob) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const songData = {
        ...song,
        fileBlob // store the raw binary file/blob
      };

      const request = store.put(songData);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (err) {
    console.error('Failed to save song to IndexedDB:', err);
    return false;
  }
}

export async function getLocalSongs() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Map songs to recreate temporary object URLs from the stored blobs
        const songs = request.result.map((item) => {
          let url = item.url;
          if (item.fileBlob) {
            url = URL.createObjectURL(item.fileBlob);
          }
          return {
            ...item,
            url
          };
        });
        resolve(songs);
      };

      request.onerror = (event) => reject(event.target.error);
    });
  } catch (err) {
    console.error('Failed to retrieve songs from IndexedDB:', err);
    return [];
  }
}

export async function deleteLocalSong(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (err) {
    console.error('Failed to delete song from IndexedDB:', err);
    return false;
  }
}
