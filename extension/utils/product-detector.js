// product-detector.js
// Comprehensive product detection for e-commerce sites

/**
 * Detect all products on the current page
 * Works on Amazon, eBay, Shopify stores, etc.
 */
function detectAllProducts() {
    const domain = window.location.hostname;
    
    if (domain.includes('amazon.')) {
        return detectAmazonProducts();
    } else if (domain.includes('ebay.')) {
        return detectEbayProducts();
    } else if (domain.includes('etsy.')) {
        return detectEtsyProducts();
    } else if (domain.includes('flipkart.')) {
        return detectFlipkartProducts();
    } else if (isShopifyStore()) {
        return detectShopifyProducts();
    }
    
    // Generic product detection
    return detectGenericProducts();
}

/**
 * Detect Amazon products (listing or detail page)
 */
function detectAmazonProducts() {
    const products = [];
    
    // Check if this is a product detail page
    const isDetailPage = document.querySelector('#dp, #productTitle');
    if (isDetailPage) {
        const product = extractAmazonProductDetail();
        if (product) products.push(product);
    }
    
    // Find all product cards on search/listing pages
    const productCards = document.querySelectorAll('[data-component-type="s-search-result"], .s-result-item, [data-asin]');
    
    productCards.forEach(card => {
        const asin = card.getAttribute('data-asin');
        if (!asin || asin === '') return;
        
        const product = extractAmazonProductCard(card, asin);
        if (product) products.push(product);
    });
    
    return products;
}

/**
 * Extract Amazon product from detail page
 */
function extractAmazonProductDetail() {
    const product = {
        type: 'product',
        platform: 'amazon'
    };
    
    // Title
    product.title = document.querySelector('#productTitle')?.textContent.trim();
    
    // Price
    const priceWhole = document.querySelector('.a-price-whole')?.textContent.trim();
    const priceFraction = document.querySelector('.a-price-fraction')?.textContent.trim();
    if (priceWhole) {
        product.price = `$${priceWhole}${priceFraction || ''}`.replace(/[^0-9.]/g, '');
        product.price = parseFloat(product.price);
    }
    
    // Image
    const mainImage = document.querySelector('#landingImage, #imgBlkFront');
    if (mainImage) {
        product.image_url = mainImage.src || mainImage.getAttribute('data-old-hires');
    }
    
    // Brand
    product.brand = document.querySelector('#bylineInfo')?.textContent.replace('Visit the', '').replace('Store', '').trim();
    
    // Rating
    const rating = document.querySelector('.a-icon-star .a-icon-alt')?.textContent;
    if (rating) {
        product.rating = parseFloat(rating);
    }
    
    // Reviews count
    const reviewCount = document.querySelector('#acrCustomerReviewText')?.textContent;
    if (reviewCount) {
        product.reviews = parseInt(reviewCount.replace(/[^0-9]/g, ''));
    }
    
    // ASIN
    const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    if (asinMatch) {
        product.asin = asinMatch[1];
    }
    
    // URL
    product.url = window.location.href.split('?')[0]; // Remove query params
    
    // Description
    const bullets = Array.from(document.querySelectorAll('#feature-bullets li'))
        .map(li => li.textContent.trim())
        .filter(text => text.length > 0)
        .join(' | ');
    product.description = bullets.slice(0, 500);
    
    return Object.keys(product).length > 2 ? product : null;
}

/**
 * Extract product from Amazon product card
 */
function extractAmazonProductCard(card, asin) {
    const product = {
        type: 'product',
        platform: 'amazon',
        asin: asin
    };
    
    // Title
    const titleElement = card.querySelector('h2 a, .s-title-instructions-style a');
    if (titleElement) {
        product.title = titleElement.textContent.trim();
        product.url = titleElement.href;
    }
    
    // Price
    const priceElement = card.querySelector('.a-price .a-offscreen');
    if (priceElement) {
        const priceText = priceElement.textContent.trim();
        product.price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    }
    
    // Image
    const imageElement = card.querySelector('img.s-image');
    if (imageElement) {
        product.image_url = imageElement.src || imageElement.getAttribute('data-src');
    }
    
    // Rating
    const ratingElement = card.querySelector('.a-icon-star-small .a-icon-alt');
    if (ratingElement) {
        product.rating = parseFloat(ratingElement.textContent);
    }
    
    // Reviews
    const reviewElement = card.querySelector('[aria-label*="stars"]');
    if (reviewElement) {
        const reviewMatch = reviewElement.getAttribute('aria-label').match(/([\d,]+)/);
        if (reviewMatch) {
            product.reviews = parseInt(reviewMatch[1].replace(/,/g, ''));
        }
    }
    
    return product.title ? product : null;
}

/**
 * Detect eBay products
 */
function detectEbayProducts() {
    const products = [];
    
    // Check if this is an item page
    const isItemPage = document.querySelector('.vim, #vi-content');
    if (isItemPage) {
        const product = extractEbayItemDetail();
        if (product) products.push(product);
    }
    
    // Find product listings
    const listings = document.querySelectorAll('.s-item, .srp-river-results .s-item');
    
    listings.forEach(listing => {
        const product = extractEbayListing(listing);
        if (product) products.push(product);
    });
    
    return products;
}

/**
 * Extract eBay item detail
 */
function extractEbayItemDetail() {
    return {
        type: 'product',
        platform: 'ebay',
        title: document.querySelector('.x-item-title, h1.it-ttl')?.textContent.trim(),
        price: parseFloat(document.querySelector('.x-price-primary, #prcIsum')?.textContent.replace(/[^0-9.]/g, '') || '0'),
        image_url: document.querySelector('.ux-image-carousel img, #icImg')?.src,
        url: window.location.href.split('?')[0],
        condition: document.querySelector('.x-item-condition, .vi-cvip-dspl-cond')?.textContent.trim(),
        seller: document.querySelector('.x-sellercard-atf__info__about-seller')?.textContent.trim()
    };
}

/**
 * Extract eBay listing
 */
function extractEbayListing(listing) {
    const product = {
        type: 'product',
        platform: 'ebay'
    };
    
    const titleElement = listing.querySelector('.s-item__title');
    if (titleElement) {
        product.title = titleElement.textContent.trim();
    }
    
    const linkElement = listing.querySelector('.s-item__link');
    if (linkElement) {
        product.url = linkElement.href;
    }
    
    const priceElement = listing.querySelector('.s-item__price');
    if (priceElement) {
        product.price = parseFloat(priceElement.textContent.replace(/[^0-9.]/g, ''));
    }
    
    const imageElement = listing.querySelector('.s-item__image-img');
    if (imageElement) {
        product.image_url = imageElement.src;
    }
    
    return product.title ? product : null;
}

/**
 * Detect Etsy products
 */
function detectEtsyProducts() {
    const products = [];
    const listings = document.querySelectorAll('[data-listing-id]');
    
    listings.forEach(listing => {
        const product = {
            type: 'product',
            platform: 'etsy',
            listing_id: listing.getAttribute('data-listing-id')
        };
        
        const titleElement = listing.querySelector('h3, [data-search-result-listing-title]');
        if (titleElement) {
            product.title = titleElement.textContent.trim();
        }
        
        const linkElement = listing.querySelector('a[href*="/listing/"]');
        if (linkElement) {
            product.url = linkElement.href;
        }
        
        const priceElement = listing.querySelector('.currency-value');
        if (priceElement) {
            product.price = parseFloat(priceElement.textContent.replace(/[^0-9.]/g, ''));
        }
        
        const imageElement = listing.querySelector('img');
        if (imageElement) {
            product.image_url = imageElement.src;
        }
        
        if (product.title) products.push(product);
    });
    
    return products;
}

/**
 * Detect Flipkart products
 */
function detectFlipkartProducts() {
    const products = [];
    const listings = document.querySelectorAll('[data-id]');
    
    listings.forEach(listing => {
        const product = {
            type: 'product',
            platform: 'flipkart'
        };
        
        const titleElement = listing.querySelector('a[title], .s1Q9rs');
        if (titleElement) {
            product.title = titleElement.getAttribute('title') || titleElement.textContent.trim();
        }
        
        const linkElement = listing.querySelector('a[href*="/p/"]');
        if (linkElement) {
            product.url = 'https://www.flipkart.com' + linkElement.getAttribute('href');
        }
        
        const priceElement = listing.querySelector('._30jeq3, ._1_WHN1');
        if (priceElement) {
            product.price = parseFloat(priceElement.textContent.replace(/[^0-9]/g, ''));
        }
        
        const imageElement = listing.querySelector('img');
        if (imageElement) {
            product.image_url = imageElement.src;
        }
        
        if (product.title) products.push(product);
    });
    
    return products;
}

/**
 * Check if site is a Shopify store
 */
function isShopifyStore() {
    return document.querySelector('meta[content*="Shopify"]') || 
           document.querySelector('script[src*="cdn.shopify"]') ||
           window.Shopify !== undefined;
}

/**
 * Detect Shopify products
 */
function detectShopifyProducts() {
    const products = [];
    const productCards = document.querySelectorAll('.product-card, [data-product-id], .grid__item');
    
    productCards.forEach(card => {
        const product = {
            type: 'product',
            platform: 'shopify'
        };
        
        const titleElement = card.querySelector('.product-card__title, .card__title, h3');
        if (titleElement) {
            product.title = titleElement.textContent.trim();
        }
        
        const linkElement = card.querySelector('a');
        if (linkElement) {
            product.url = linkElement.href;
        }
        
        const priceElement = card.querySelector('.price, .product-card__price, .card__price');
        if (priceElement) {
            product.price = parseFloat(priceElement.textContent.replace(/[^0-9.]/g, ''));
        }
        
        const imageElement = card.querySelector('img');
        if (imageElement) {
            product.image_url = imageElement.src;
        }
        
        if (product.title) products.push(product);
    });
    
    return products;
}

/**
 * Generic product detection fallback
 */
function detectGenericProducts() {
    const products = [];
    
    // Look for product schema markup
    const schemaProducts = document.querySelectorAll('[itemtype*="Product"]');
    schemaProducts.forEach(element => {
        const product = {
            type: 'product',
            platform: window.location.hostname
        };
        
        product.title = element.querySelector('[itemprop="name"]')?.textContent.trim();
        product.price = parseFloat(element.querySelector('[itemprop="price"]')?.textContent.replace(/[^0-9.]/g, '') || '0');
        product.image_url = element.querySelector('[itemprop="image"]')?.src;
        product.url = window.location.href;
        
        if (product.title) products.push(product);
    });
    
    return products;
}

/**
 * Format products for storage
 */
function formatProductsForStorage(products) {
    return products.map(product => ({
        user_id: "mvp_demo_user_2024",
        content: `${product.title}\nPrice: ${product.price ? '$' + product.price : 'N/A'}\nPlatform: ${product.platform}\n${product.description || ''}`,
        url: product.url,
        title: product.title,
        metadata: {
            type: 'product',
            platform: product.platform,
            price: product.price,
            image_url: product.image_url,
            brand: product.brand,
            rating: product.rating,
            reviews: product.reviews,
            asin: product.asin,
            condition: product.condition,
            seller: product.seller
        }
    }));
}

/**
 * Check if current page is an e-commerce site
 */
function isEcommerceSite() {
    const domain = window.location.hostname;
    return domain.includes('amazon.') || 
           domain.includes('ebay.') || 
           domain.includes('etsy.') || 
           domain.includes('flipkart.') ||
           isShopifyStore();
}
