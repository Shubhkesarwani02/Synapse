// Storage utilities for managing user data and context persistence

// MVP: Use USER_ID from constants.js (loaded before this file)
// USER_ID is declared in utils/constants.js which is loaded first in manifest.json
let cachedUserId = null;

function getOrCreateUserId() {
    // MVP: Always return constant USER_ID from constants.js
    // USER_ID is available globally since constants.js is loaded first
    return Promise.resolve(USER_ID);

    /* Original dynamic logic removed for MVP - uncomment for production
    return new Promise(resolve => {
        // Always check localStorage first (even if cached) to ensure sync with dashboard
        try {
            const localStorageId = localStorage.getItem('ai_mem_user_id');
            if (localStorageId) {
                // If localStorage has a different ID than cache, update cache
                if (cachedUserId && cachedUserId !== localStorageId) {
                    console.log(`🔄 User ID changed! Old: ${cachedUserId}, New: ${localStorageId}`);
                    cachedUserId = localStorageId;
                } else if (!cachedUserId) {
                    cachedUserId = localStorageId;
                }
                // Sync to Chrome storage
                try {
                    chrome.storage.local.set({ ai_mem_user_id: localStorageId }, () => {
                        resolve(localStorageId);
                    });
                } catch (e) {
                    resolve(localStorageId);
                }
                return;
            }
        } catch (localStorageError) {
            // localStorage not available, continue
        }

        // If we reach here, localStorage doesn't have an ID, check Chrome storage
        try {
            chrome.storage.local.get(['ai_mem_user_id'], (res) => {
                if (res.ai_mem_user_id) {
                    cachedUserId = res.ai_mem_user_id;
                    // Sync to localStorage for dashboard access
                    try {
                        localStorage.setItem('ai_mem_user_id', cachedUserId);
                    } catch (e) {
                        // localStorage might not be available in some contexts
                    }
                    return resolve(cachedUserId);
                }

                // No ID found in either storage, create new one
                const id = crypto.randomUUID();
                cachedUserId = id;

                // Save to both storages
                chrome.storage.local.set({ ai_mem_user_id: id }, () => {
                    try {
                        localStorage.setItem('ai_mem_user_id', id);
                    } catch (e) {
                        // localStorage might not be available
                    }
                    resolve(id);
                });
            });
        } catch (e) {
            // Fallback: create new ID and save to localStorage
            const id = crypto.randomUUID();
            cachedUserId = id;

            try {
                localStorage.setItem('ai_mem_user_id', id);
            } catch (localStorageError) {
                // localStorage might not be available
            }

            resolve(id);
        }
    });
    */
}

function restoreContextFromStorage() {
    const wasInjected = localStorage.getItem('__SABKI_SOCH_CONTEXT_INJECTED__') === 'true';
    const injectedTimestamp = localStorage.getItem('__SABKI_SOCH_CONTEXT_TIMESTAMP__');

    if (window.__AI_CONTEXT_INJECTED__) {
        return true;
    }

    if (window.__SABKI_SOCH_CONTEXT__ && window.__SABKI_SOCH_CONTEXT__.length > 0) {
        window.__AI_CONTEXT_INJECTED__ = true;
        return true;
    }

    try {
        const storedContext = localStorage.getItem('__SABKI_SOCH_AI_CONTEXT__');
        if (storedContext && wasInjected) {
            window.__SABKI_SOCH_CONTEXT__ = JSON.parse(storedContext);
            window.__AI_CONTEXT_INJECTED__ = true;

            return true;
        } else if (storedContext && !wasInjected) {
            localStorage.removeItem('__SABKI_SOCH_AI_CONTEXT__');
        }
    } catch (e) {
        console.error('⚠️ Could not restore context from storage:', e);
    }
    return false;
}

