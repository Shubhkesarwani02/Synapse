chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    // Forward ACTION_RESPONSE messages to popup if it's open
    if (msg.type === 'ACTION_RESPONSE') {
        // Try to send to popup (if open)
        // Note: This will only work if popup is open, otherwise message is lost
        // Popup should set up listener before sending action request
        return false; // Don't keep channel open
    }

    if (msg.action === 'page_api_data') {
        // Validate payload before sending
        const payload = msg.payload;

        // Ensure text field is a string
        if (payload && payload.text) {
            // Skip if text is an object that looks like an API response
            if (typeof payload.text === 'object') {
                if (payload.text.total !== undefined || payload.text.by_type !== undefined ||
                    payload.text.items !== undefined || payload.text.count !== undefined) {
                    // This looks like an API response, skip storing it
                    sendResponse({ ok: false, message: 'Cannot store API response data' });
                    return true;
                }
                // Otherwise, stringify it
                payload.text = JSON.stringify(payload.text);
            } else if (typeof payload.text !== 'string') {
                payload.text = String(payload.text || '');
            }

            // Skip if text is empty
            if (!payload.text || !payload.text.trim()) {
                sendResponse({ ok: false, message: 'No content to store' });
                return true;
            }
        } else {
            sendResponse({ ok: false, message: 'Missing text field in payload' });
            return true;
        }

        try {
            const res = await fetch('http://localhost:8000/store', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Error storing page API data:', res.status, errorText);
                sendResponse({ ok: false, message: `Failed to store: ${res.statusText}` });
                return true;
            }

            sendResponse({ ok: true, message: 'Page API data stored' });
        }
        catch (err) {
            console.error('Error storing page API data:', err);
            sendResponse({ ok: false, message: `Error: ${err.message}` });
        }
        return true;
    }
});
