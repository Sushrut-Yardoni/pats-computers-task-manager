// PATS IndexedDB Audio Tone Storage
// Safely stores user-selected personal ringtones and audio files from phone or computer storage
// Bypasses localStorage 5MB quota restrictions to allow full-fidelity audio clips up to 20MB

export interface StoredAudioTone {
  id: string;
  name: string;
  dataUri: string;
  size: string;
  duration?: string;
  updatedAt: number;
}

const DB_NAME = 'pats_audio_db';
const STORE_NAME = 'custom_tones';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open audio database'));
    };
  });
}

export async function saveAudioToStorage(tone: StoredAudioTone): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(tone);

      putRequest.onsuccess = () => {
        // Also save metadata stub in localStorage for quick synchronous checks
        try {
          localStorage.setItem('pats_custom_tone_name', tone.name);
          localStorage.setItem('pats_custom_tone_size', tone.size || '');
          localStorage.setItem('pats_custom_tone_duration', tone.duration || '');
          localStorage.setItem('pats_selected_tone', 'custom');
        } catch {}
        resolve(true);
      };

      putRequest.onerror = () => {
        console.warn('Error storing audio file in IndexedDB:', putRequest.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, falling back to localStorage if size permits:', err);
    try {
      localStorage.setItem('pats_custom_tone_name', tone.name);
      localStorage.setItem('pats_custom_tone_size', tone.size || '');
      localStorage.setItem('pats_custom_tone_data', tone.dataUri);
      localStorage.setItem('pats_selected_tone', 'custom');
      return true;
    } catch {
      return false;
    }
  }
}

export async function loadAudioFromStorage(): Promise<StoredAudioTone | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get('custom');

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result as StoredAudioTone);
        } else {
          // Check localStorage fallback
          try {
            const dataUri = localStorage.getItem('pats_custom_tone_data');
            const name = localStorage.getItem('pats_custom_tone_name');
            const size = localStorage.getItem('pats_custom_tone_size') || '';
            const duration = localStorage.getItem('pats_custom_tone_duration') || '';
            if (dataUri && name) {
              resolve({
                id: 'custom',
                name,
                dataUri,
                size,
                duration,
                updatedAt: Date.now()
              });
              return;
            }
          } catch {}
          resolve(null);
        }
      };

      getRequest.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    try {
      const dataUri = localStorage.getItem('pats_custom_tone_data');
      const name = localStorage.getItem('pats_custom_tone_name');
      const size = localStorage.getItem('pats_custom_tone_size') || '';
      const duration = localStorage.getItem('pats_custom_tone_duration') || '';
      if (dataUri && name) {
        return {
          id: 'custom',
          name,
          dataUri,
          size,
          duration,
          updatedAt: Date.now()
        };
      }
    } catch {}
    return null;
  }
}

export async function deleteAudioFromStorage(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete('custom');

      deleteRequest.onsuccess = () => {
        try {
          localStorage.removeItem('pats_custom_tone_name');
          localStorage.removeItem('pats_custom_tone_data');
          localStorage.removeItem('pats_custom_tone_size');
          localStorage.removeItem('pats_custom_tone_duration');
        } catch {}
        resolve(true);
      };

      deleteRequest.onerror = () => {
        resolve(false);
      };
    });
  } catch {
    try {
      localStorage.removeItem('pats_custom_tone_name');
      localStorage.removeItem('pats_custom_tone_data');
      localStorage.removeItem('pats_custom_tone_size');
      localStorage.removeItem('pats_custom_tone_duration');
      return true;
    } catch {
      return false;
    }
  }
}
