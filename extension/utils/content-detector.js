// content-detector.js
// Detects content type and extracts metadata from any webpage

export const detectContentType = () => {
  const url = window.location.href;
  const domain = window.location.hostname;
  
  // Product detection (Amazon, eBay, etc.)
  if (domain.includes('amazon.') || domain.includes('ebay.') || 
      domain.includes('shopify.') || domain.includes('etsy.')) {
    return { type: 'product', extractor: extractProduct };
  }
  
  // Video detection (YouTube, Vimeo)
  if (domain.includes('youtube.com') || domain.includes('vimeo.com')) {
    return { type: 'video', extractor: extractVideo };
  }
  
  // Article detection (Medium, Substack, blogs)
  if (isArticlePage()) {
    return { type: 'article', extractor: extractArticle };
  }
  
  // Default to note
  return { type: 'note', extractor: extractGeneric };
};

const isArticlePage = () => {
  // Check for article indicators
  const indicators = [
    document.querySelector('article'),
    document.querySelector('[role="article"]'),
    document.querySelector('.post-content'),
    document.querySelector('.article-content'),
    document.querySelector('meta[property="og:type"][content="article"]')
  ];
  return indicators.some(el => el !== null);
};

// ===== PRODUCT EXTRACTOR =====
const extractProduct = () => {
  const product = {
    type: 'product',
    title: '',
    price: null,
    currency: 'USD',
    image_url: '',
    description: '',
    url: window.location.href
  };

  // Title extraction (multiple selectors for different sites)
  const titleSelectors = [
    '#productTitle', // Amazon
    'h1[itemprop="name"]', // Schema.org
    '.product-title',
    'h1.title',
    'meta[property="og:title"]'
  ];
  
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      product.title = el.getAttribute('content') || el.textContent.trim();
      break;
    }
  }

  // Price extraction
  const priceSelectors = [
    '.a-price-whole', // Amazon
    '[itemprop="price"]',
    '.price',
    'meta[property="og:price:amount"]'
  ];
  
  for (const selector of priceSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const priceText = el.getAttribute('content') || el.textContent;
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        product.price = parseFloat(priceMatch[0].replace(',', ''));
        break;
      }
    }
  }

  // Image extraction
  const imageSelectors = [
    '#landingImage', // Amazon
    '[itemprop="image"]',
    '.product-image img',
    'meta[property="og:image"]'
  ];
  
  for (const selector of imageSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      product.image_url = el.getAttribute('content') || el.src || el.getAttribute('data-src');
      break;
    }
  }

  // Description
  const descSelectors = [
    '#feature-bullets',
    '[itemprop="description"]',
    '.product-description',
    'meta[property="og:description"]'
  ];
  
  for (const selector of descSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      product.description = el.getAttribute('content') || el.textContent.trim().slice(0, 500);
      break;
    }
  }

  return product;
};

// ===== VIDEO EXTRACTOR =====
const extractVideo = () => {
  const video = {
    type: 'video',
    title: '',
    duration: null,
    thumbnail_url: '',
    author: '',
    description: '',
    url: window.location.href
  };

  // YouTube specific
  if (window.location.hostname.includes('youtube.com')) {
    video.title = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent.trim() ||
                  document.querySelector('meta[property="og:title"]')?.content;
    
    video.author = document.querySelector('#owner-name a')?.textContent.trim();
    
    video.thumbnail_url = document.querySelector('meta[property="og:image"]')?.content;
    
    video.description = document.querySelector('#description')?.textContent.trim().slice(0, 500);
    
    // Duration from page data
    const durationText = document.querySelector('.ytp-time-duration')?.textContent;
    if (durationText) {
      const parts = durationText.split(':').map(Number);
      video.duration = parts.length === 3 
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + parts[1];
    }
  }

  return video;
};

// ===== ARTICLE EXTRACTOR =====
const extractArticle = () => {
  const article = {
    type: 'article',
    title: '',
    author: '',
    published_date: null,
    read_time: null,
    image_url: '',
    content: '',
    url: window.location.href
  };

  // Title
  article.title = document.querySelector('h1')?.textContent.trim() ||
                  document.querySelector('meta[property="og:title"]')?.content;

  // Author
  const authorSelectors = [
    '[rel="author"]',
    '.author-name',
    '[itemprop="author"]',
    'meta[name="author"]'
  ];
  
  for (const selector of authorSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      article.author = el.getAttribute('content') || el.textContent.trim();
      break;
    }
  }

  // Published date
  const dateSelectors = [
    'time[datetime]',
    '[itemprop="datePublished"]',
    'meta[property="article:published_time"]'
  ];
  
  for (const selector of dateSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      article.published_date = el.getAttribute('datetime') || 
                               el.getAttribute('content') || 
                               el.textContent;
      break;
    }
  }

  // Featured image
  article.image_url = document.querySelector('meta[property="og:image"]')?.content;

  // Content extraction (main article text)
  const contentSelectors = [
    'article',
    '.post-content',
    '.article-content',
    '[role="article"]',
    'main'
  ];
  
  for (const selector of contentSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      // Get text content, clean it up
      const text = Array.from(el.querySelectorAll('p'))
        .map(p => p.textContent.trim())
        .filter(t => t.length > 50)
        .join('\n\n');
      
      article.content = text.slice(0, 2000); // First 2000 chars
      
      // Estimate read time
      const wordCount = text.split(/\s+/).length;
      article.read_time = Math.ceil(wordCount / 200); // 200 words per minute
      
      break;
    }
  }

  return article;
};

// ===== GENERIC EXTRACTOR =====
const extractGeneric = () => {
  return {
    type: 'note',
    title: document.title,
    content: document.body.innerText.slice(0, 2000),
    url: window.location.href,
    image_url: document.querySelector('meta[property="og:image"]')?.content
  };
};
