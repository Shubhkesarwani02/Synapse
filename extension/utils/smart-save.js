// smart-save.js
// Intelligent content saving with bulk support

/**
 * Smart save - detects content and saves appropriately
 * Supports both single item and bulk (multiple videos/products) saving
 */
async function smartSave(backendUrl, userId) {
    try {
        const detection = detectContentType();
        
        // Check if this is a bulk save (multiple items)
        if (detection.isBulk) {
            return await saveBulkContent(detection, backendUrl, userId);
        } else {
            return await saveSingleContent(detection, backendUrl, userId);
        }
    } catch (error) {
        console.error('Smart save error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Save multiple items at once (videos, products, etc.)
 */
async function saveBulkContent(detection, backendUrl, userId) {
    try {
        const extracted = detection.extractor();
        
        if (!extracted || !extracted.items || extracted.items.length === 0) {
            return {
                success: false,
                error: `No ${detection.type}s found on this page`
            };
        }
        
        // Save each item
        const results = [];
        const errors = [];
        
        for (const item of extracted.formatted) {
            try {
                // Ensure user_id is set
                item.user_id = userId;
                
                const response = await fetch(`${backendUrl}/api/memory`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item),
                    credentials: 'omit'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    results.push(result);
                } else {
                    const errorData = await response.json();
                    errors.push(errorData.detail || 'Unknown error');
                }
            } catch (error) {
                errors.push(error.message);
            }
        }
        
        // Return summary
        return {
            success: results.length > 0,
            saved_count: results.length,
            failed_count: errors.length,
            total: extracted.items.length,
            message: `Successfully saved ${results.length} of ${extracted.items.length} ${detection.type}s`,
            errors: errors.length > 0 ? errors : undefined
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Save single content item
 */
async function saveSingleContent(detection, backendUrl, userId) {
    try {
        const extracted = detection.extractor();
        
        if (!extracted) {
            return {
                success: false,
                error: 'Could not extract content from page'
            };
        }
        
        // Build content payload
        const content = buildContentString(extracted);
        const metadata = buildMetadata(extracted);
        
        const payload = {
            user_id: userId,
            content: content,
            url: extracted.url || window.location.href,
            title: extracted.title || document.title,
            metadata: metadata
        };
        
        // Save to backend
        const response = await fetch(`${backendUrl}/api/memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'omit'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save');
        }
        
        const result = await response.json();
        
        return {
            success: true,
            id: result.id,
            message: `${extracted.type || 'Content'} saved successfully!`
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Build content string from extracted data
 */
function buildContentString(data) {
    let content = data.title || '';
    
    if (data.description) {
        content += '\n\n' + data.description;
    }
    
    if (data.content) {
        content += '\n\n' + data.content;
    }
    
    // Add type-specific content
    if (data.type === 'product') {
        if (data.price) content += `\nPrice: $${data.price}`;
        if (data.brand) content += `\nBrand: ${data.brand}`;
    }
    
    if (data.type === 'video') {
        if (data.channel) content += `\nChannel: ${data.channel}`;
        if (data.duration) content += `\nDuration: ${data.duration}`;
    }
    
    if (data.type === 'article') {
        if (data.author) content += `\nAuthor: ${data.author}`;
        if (data.read_time) content += `\nRead time: ${data.read_time} min`;
    }
    
    return content || 'No content extracted';
}

/**
 * Build metadata object from extracted data
 */
function buildMetadata(data) {
    const metadata = {
        type: data.type
    };
    
    // Add all properties except content/title/url
    for (const [key, value] of Object.entries(data)) {
        if (!['content', 'title', 'url', 'description'].includes(key)) {
            metadata[key] = value;
        }
    }
    
    return metadata;
}

/**
 * Save page as-is (fallback for when content detection fails)
 */
async function savePageAsNote(backendUrl, userId) {
    try {
        const content = document.body.innerText?.slice(0, 5000) || 'No content';
        
        const payload = {
            user_id: userId,
            content: content,
            url: window.location.href,
            title: document.title,
            metadata: {
                type: 'note',
                saved_at: new Date().toISOString()
            }
        };
        
        const response = await fetch(`${backendUrl}/api/memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error('Failed to save page');
        }
        
        return {
            success: true,
            message: 'Page saved as note!'
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
