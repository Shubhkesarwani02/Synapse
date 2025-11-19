// youtube-detector.js
// Comprehensive YouTube video detection - finds ALL videos on a page

/**
 * Extract all YouTube video URLs from the current page
 * Works on:
 * - YouTube search results
 * - YouTube channel pages
 * - YouTube recommended/sidebar videos
 * - Embedded YouTube videos on other sites
 * - Direct YouTube video pages
 */
function detectAllYouTubeVideos() {
    const videos = [];
    const seenIds = new Set();

    // 1. Find YouTube video links (a tags)
    const videoLinks = document.querySelectorAll('a[href*="youtube.com/watch"], a[href*="youtu.be/"]');
    videoLinks.forEach(link => {
        const videoData = extractVideoFromLink(link);
        if (videoData && !seenIds.has(videoData.video_id)) {
            seenIds.add(videoData.video_id);
            videos.push(videoData);
        }
    });

    // 2. Find embedded iframes
    const iframes = document.querySelectorAll('iframe[src*="youtube.com/embed"]');
    iframes.forEach(iframe => {
        const videoData = extractVideoFromIframe(iframe);
        if (videoData && !seenIds.has(videoData.video_id)) {
            seenIds.add(videoData.video_id);
            videos.push(videoData);
        }
    });

    // 3. YouTube-specific: Find video thumbnails with data attributes
    const thumbnails = document.querySelectorAll('ytd-thumbnail, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer');
    thumbnails.forEach(thumbnail => {
        const videoData = extractVideoFromYouTubeThumbnail(thumbnail);
        if (videoData && !seenIds.has(videoData.video_id)) {
            seenIds.add(videoData.video_id);
            videos.push(videoData);
        }
    });

    // 4. Find video data in page JSON/script tags
    const scriptTags = document.querySelectorAll('script');
    scriptTags.forEach(script => {
        if (script.textContent.includes('videoId')) {
            const videoData = extractVideoFromScript(script.textContent);
            videoData.forEach(data => {
                if (data && !seenIds.has(data.video_id)) {
                    seenIds.add(data.video_id);
                    videos.push(data);
                }
            });
        }
    });

    // 5. Current video (if on a watch page)
    const currentVideo = extractCurrentVideo();
    if (currentVideo && !seenIds.has(currentVideo.video_id)) {
        seenIds.add(currentVideo.video_id);
        videos.unshift(currentVideo); // Add to beginning
    }

    return videos;
}

/**
 * Extract video data from a link element
 */
function extractVideoFromLink(link) {
    const href = link.href;
    const videoId = extractVideoId(href);
    
    if (!videoId) return null;

    // Try to find associated thumbnail
    let thumbnail = null;
    const imgElements = link.querySelectorAll('img');
    if (imgElements.length > 0) {
        thumbnail = imgElements[0].src || imgElements[0].getAttribute('data-src');
    }

    // Try to find title
    let title = link.getAttribute('title') || link.getAttribute('aria-label');
    if (!title) {
        const titleElement = link.querySelector('#video-title, .title, h3, [id*="title"]');
        if (titleElement) {
            title = titleElement.textContent.trim();
        }
    }

    // Try to find channel name
    let channel = null;
    const channelElement = link.closest('ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer')
        ?.querySelector('#channel-name, .channel-name, ytd-channel-name');
    if (channelElement) {
        channel = channelElement.textContent.trim();
    }

    return {
        video_id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: title || 'YouTube Video',
        thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        channel: channel,
        type: 'video',
        platform: 'youtube'
    };
}

/**
 * Extract video data from an iframe
 */
function extractVideoFromIframe(iframe) {
    const src = iframe.src;
    const videoId = extractVideoId(src);
    
    if (!videoId) return null;

    return {
        video_id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: iframe.title || 'Embedded YouTube Video',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        type: 'video',
        platform: 'youtube'
    };
}

/**
 * Extract video data from YouTube thumbnail element
 */
function extractVideoFromYouTubeThumbnail(element) {
    // Try to find video link
    const linkElement = element.querySelector('a#thumbnail, a.yt-simple-endpoint');
    if (!linkElement) return null;

    const href = linkElement.href;
    const videoId = extractVideoId(href);
    
    if (!videoId) return null;

    // Get title
    let title = null;
    const titleElement = element.querySelector('#video-title, .title');
    if (titleElement) {
        title = titleElement.textContent.trim();
    }

    // Get thumbnail
    let thumbnail = null;
    const imgElement = element.querySelector('img');
    if (imgElement) {
        thumbnail = imgElement.src || imgElement.getAttribute('data-src');
    }

    // Get channel
    let channel = null;
    const channelElement = element.querySelector('#channel-name, ytd-channel-name');
    if (channelElement) {
        channel = channelElement.textContent.trim();
    }

    // Get duration
    let duration = null;
    const durationElement = element.querySelector('.ytd-thumbnail-overlay-time-status-renderer, #text');
    if (durationElement) {
        duration = durationElement.textContent.trim();
    }

    return {
        video_id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: title || 'YouTube Video',
        thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        channel: channel,
        duration: duration,
        type: 'video',
        platform: 'youtube'
    };
}

/**
 * Extract video IDs from script tag JSON data
 */
function extractVideoFromScript(scriptContent) {
    const videos = [];
    const videoIdMatches = scriptContent.matchAll(/"videoId":"([^"]+)"/g);
    
    for (const match of videoIdMatches) {
        const videoId = match[1];
        if (videoId && videoId.length === 11) { // YouTube video IDs are 11 chars
            videos.push({
                video_id: videoId,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                title: 'YouTube Video',
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                type: 'video',
                platform: 'youtube'
            });
        }
    }
    
    return videos;
}

/**
 * Extract the currently playing video (if on a watch page)
 */
function extractCurrentVideo() {
    // Check if we're on a YouTube watch page
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    if (!videoId) return null;

    // Get title from page
    const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.title')?.textContent.trim();
    
    // Get channel
    const channel = document.querySelector('#channel-name, ytd-channel-name')?.textContent.trim();
    
    // Get description
    const description = document.querySelector('#description, .content')?.textContent.trim().slice(0, 500);
    
    // Get thumbnail
    const thumbnail = document.querySelector('meta[property="og:image"]')?.content;

    // Get views
    const viewsElement = document.querySelector('.view-count, #count');
    const views = viewsElement?.textContent.trim();

    return {
        video_id: videoId,
        url: window.location.href,
        title: title || document.title,
        thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        channel: channel,
        description: description,
        views: views,
        type: 'video',
        platform: 'youtube',
        is_current: true  // Mark as currently viewed
    };
}

/**
 * Extract YouTube video ID from a URL
 * Handles various YouTube URL formats
 */
function extractVideoId(url) {
    if (!url) return null;

    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) return watchMatch[1];

    // Short URL: youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) return shortMatch[1];

    // Embed URL: youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/\/embed\/([^?]+)/);
    if (embedMatch) return embedMatch[1];

    return null;
}

/**
 * Get detailed information for a specific video ID
 */
function getYouTubeVideoDetails(videoId) {
    return {
        video_id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        type: 'video',
        platform: 'youtube'
    };
}

/**
 * Check if current page is YouTube
 */
function isYouTubePage() {
    return window.location.hostname.includes('youtube.com') || window.location.hostname.includes('youtu.be');
}

/**
 * Format videos for storage
 */
function formatVideosForStorage(videos) {
    return videos.map(video => ({
        user_id: "mvp_demo_user_2024", // Will be replaced by actual user ID
        content: `${video.title}\n\n${video.description || ''}\nChannel: ${video.channel || 'Unknown'}\nDuration: ${video.duration || 'Unknown'}`,
        url: video.url,
        title: video.title,
        metadata: {
            video_id: video.video_id,
            thumbnail: video.thumbnail,
            channel: video.channel,
            duration: video.duration,
            views: video.views,
            platform: video.platform,
            type: video.type,
            is_current: video.is_current || false
        }
    }));
}
