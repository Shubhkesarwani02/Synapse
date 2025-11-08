/**
 * User ID utility functions
 * Syncs with extension's user ID storage
 */

const USER_ID_KEY = 'ai_mem_user_id';
const FALLBACK_KEYS = ['recallhub_user_id', 'synapse_user_id'];

/**
 * Get or create a user ID from localStorage
 * Checks extension's key first, then fallback keys
 * Creates a new UUID if none exists
 */
export function getOrCreateUserId(): string {
  // First check for the extension's user ID key
  let uid = localStorage.getItem(USER_ID_KEY);
  
  // Fallback to other keys for backward compatibility
  if (!uid) {
    for (const key of FALLBACK_KEYS) {
      uid = localStorage.getItem(key);
      if (uid) break;
    }
  }
  
  // If no user ID exists, create one and store it
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, uid);
  } else {
    // Sync to the extension's key if using a fallback key
    if (!localStorage.getItem(USER_ID_KEY)) {
      localStorage.setItem(USER_ID_KEY, uid);
    }
  }
  
  return uid;
}

/**
 * Get the current user ID without creating a new one
 */
export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY) || 
         localStorage.getItem(FALLBACK_KEYS[0]) || 
         localStorage.getItem(FALLBACK_KEYS[1]);
}

/**
 * Set a user ID (useful for manual override)
 * This will be synced to extension's Chrome storage when extension runs
 */
export function setUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

/**
 * Check if there's a user ID mismatch between localStorage and extension
 * Returns the extension's user ID if available, null otherwise
 * Note: This requires the extension to be installed and active
 */
export async function checkExtensionUserId(): Promise<string | null> {
  // Try to get user ID from extension via postMessage
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    // Set up a listener for the response
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'USER_ID_RESPONSE' || event.data?.userId) {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.userId || null);
      }
    };

    window.addEventListener('message', messageHandler);

    // Request user ID from extension
    window.postMessage({ type: 'GET_USER_ID' }, '*');

    // Timeout after 1 second
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      resolve(null);
    }, 1000);
  });
}

/**
 * Sync user ID with extension if there's a mismatch
 * Prioritizes the extension's user_id since it's the source of truth for saved content
 */
export async function syncWithExtension(): Promise<boolean> {
  const localId = getUserId();
  const extensionId = await checkExtensionUserId();

  if (extensionId && localId && extensionId !== localId) {
    // Extension has a different ID - use extension's ID (it has the saved content)
    console.warn(`⚠️ User ID mismatch detected! Local: ${localId}, Extension: ${extensionId}. Using extension's ID.`);
    setUserId(extensionId);
    return true;
  } else if (extensionId && !localId) {
    // Extension has ID but localStorage doesn't
    setUserId(extensionId);
    return true;
  } else if (localId && !extensionId) {
    // LocalStorage has ID but extension doesn't - sync to extension via localStorage
    // Extension will pick it up on next run
    return false; // No change needed, extension will sync
  }

  return false;
}

