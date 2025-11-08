# backend/routes/memory.py
"""
Enhanced memory/content saving endpoints with metadata enrichment
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid
import google.generativeai as genai
import json
import re

from models.models import MemoryCreate
from constants import (
    EMBEDDING_MODEL_NAME,
    METADATA_ENRICHMENT_PROMPT,
    USER_ID
)

router = APIRouter()

# Global variables to be injected
collection = None


def init_memory_router(chroma_collection):
    """Initialize the memory router with ChromaDB collection"""
    global collection
    collection = chroma_collection


@router.post("/memory")
async def save_memory(memory: MemoryCreate):
    """
    Save memory with enhanced metadata extraction
    
    Automatically detects content type and extracts relevant metadata:
    - Products: name, price, brand, image_url
    - Videos: video_id, platform, thumbnail
    - Books: author, isbn, cover_image
    - Articles: author, published_date, reading_time
    - Todos: task_list
    - Media: Extracts image and video URLs from raw_html
    """
    try:
        if collection is None:
            raise HTTPException(status_code=500, detail="Collection not initialized")
        
        # 1. Extract media URLs from raw_html if provided
        media_urls = []
        if memory.raw_html:
            media_urls = extract_media_urls(memory.raw_html)
        
        # 2. Detect content type and enrich metadata
        enriched_metadata = await enrich_metadata(memory)
        
        # 3. Generate title if not provided
        if not memory.title:
            # Generate a simple title from content or URL
            if memory.content:
                # Use first 100 chars of content as title
                memory.title = memory.content[:100].strip()
                if len(memory.content) > 100:
                    memory.title += "..."
            elif memory.url:
                try:
                    memory.title = memory.url.split('/')[-1] or "Untitled"
                except:
                    memory.title = "Untitled"
            else:
                memory.title = "Untitled"
        
        # 4. Add media URLs to metadata (serialize as JSON string for ChromaDB)
        if media_urls:
            enriched_metadata["media"] = json.dumps(media_urls)
        
        # 5. Generate embedding using Gemini
        embedding_result = genai.embed_content(
            model=EMBEDDING_MODEL_NAME,
            content=memory.content,
            task_type="retrieval_document"
        )
        embedding = embedding_result['embedding']
        
        # 6. Create memory ID and timestamp
        memory_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # 7. Prepare metadata for ChromaDB (merge user metadata with enriched)
        # ChromaDB only accepts primitive types (str, int, float, bool, None)
        # So we need to serialize complex types (lists, dicts) as JSON strings

        # MVP: Use constant USER_ID instead of memory.user_id
        final_metadata = {
            "user_id": USER_ID,  # MVP: Hardcoded user ID
            "url": memory.url or "",
            "title": memory.title,
            "timestamp": timestamp,
            "time": timestamp,  # For compatibility with existing code
        }
        
        # Add source if provided (backward compatibility)
        if memory.source:
            final_metadata["source"] = memory.source
        
        # Add enriched metadata (serialize complex types)
        for key, value in enriched_metadata.items():
            if isinstance(value, (list, dict)):
                final_metadata[key] = json.dumps(value)
            elif value is not None:
                final_metadata[key] = value
        
        # Ensure content_type is set for compatibility with stats endpoint
        # Use 'type' from enriched metadata, fallback to 'note'
        if 'type' in final_metadata:
            final_metadata['content_type'] = final_metadata['type']
        elif 'content_type' not in final_metadata:
            final_metadata['content_type'] = 'note'
        
        # Add user-provided metadata (serialize complex types)
        if memory.metadata:
            for key, value in memory.metadata.items():
                if isinstance(value, (list, dict)):
                    final_metadata[key] = json.dumps(value)
                elif value is not None:
                    final_metadata[key] = value
        
        # 8. Store in ChromaDB
        collection.add(
            ids=[memory_id],
            embeddings=[embedding],
            documents=[memory.content],
            metadatas=[final_metadata]
        )
        
        # Log for debugging
        print(f"✅ Memory saved - ID: {memory_id}, User ID: {memory.user_id}, Type: {final_metadata.get('type', 'unknown')}, Title: {memory.title[:50]}")
        
        return {
            "id": memory_id,
            "status": "success",
            "metadata": final_metadata,
            "message": "Memory saved successfully"
        }
        
    except Exception as e:
        print(f"Error saving memory: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save memory: {str(e)}")


# Add /store alias for backward compatibility
@router.post("/store")
async def store_memory(memory: MemoryCreate):
    """Alias for /memory endpoint for backward compatibility"""
    return await save_memory(memory)


def extract_media_urls(raw_html: str) -> list:
    """
    Extract image and video URLs from raw HTML
    
    Returns list of dicts: [{"type": "image|video", "url": "..."}, ...]
    """
    media = []
    
    # Extract image URLs
    # Match <img src="..."> and <img src='...'>
    img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
    img_matches = re.findall(img_pattern, raw_html, re.IGNORECASE)
    
    for url in img_matches:
        # Filter out tracking pixels, icons, and very small images
        if not any(skip in url.lower() for skip in ['pixel', 'tracker', '1x1', 'spacer', 'blank.gif']):
            # Only add if it's a reasonable URL
            if url.startswith('http') or url.startswith('//'):
                media.append({"type": "image", "url": url})
    
    # Extract video URLs
    # Match <video src="...">
    video_pattern = r'<video[^>]+src=["\']([^"\']+)["\']'
    video_matches = re.findall(video_pattern, raw_html, re.IGNORECASE)
    
    for url in video_matches:
        if url.startswith('http') or url.startswith('//'):
            media.append({"type": "video", "url": url})
    
    # Extract <source> tags (used in video/audio elements)
    source_pattern = r'<source[^>]+src=["\']([^"\']+)["\']'
    source_matches = re.findall(source_pattern, raw_html, re.IGNORECASE)
    
    for url in source_matches:
        if url.startswith('http') or url.startswith('//'):
            # Determine if it's video or image based on extension
            if any(ext in url.lower() for ext in ['.mp4', '.webm', '.ogg', '.mov']):
                media.append({"type": "video", "url": url})
            elif any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']):
                media.append({"type": "image", "url": url})
    
    # Extract iframe src (often used for embedded videos)
    iframe_pattern = r'<iframe[^>]+src=["\']([^"\']+)["\']'
    iframe_matches = re.findall(iframe_pattern, raw_html, re.IGNORECASE)
    
    for url in iframe_matches:
        # YouTube, Vimeo, etc.
        if any(site in url.lower() for site in ['youtube.com', 'vimeo.com', 'dailymotion.com', 'twitch.tv']):
            media.append({"type": "video", "url": url})
    
    # Remove duplicates while preserving order
    seen = set()
    unique_media = []
    for item in media:
        if item['url'] not in seen:
            seen.add(item['url'])
            unique_media.append(item)
    
    return unique_media


async def enrich_metadata(memory: MemoryCreate) -> dict:
    """
    Use AI to detect content type and extract metadata
    
    Returns enriched metadata dictionary with:
    - type: content type (article, product, video, book, note, todo, quote, image)
    - Additional fields based on type
    """
    try:
        # First try AI-based enrichment
        prompt = METADATA_ENRICHMENT_PROMPT.format(
            url=memory.url or "",
            title=memory.title or "",
            content=memory.content[:1500]  # Limit content length for prompt
        )
        
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        response = model.generate_content(prompt)
        
        # Parse JSON response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        metadata = json.loads(response_text)
        return metadata
        
    except Exception as e:
        print(f"AI metadata enrichment failed: {str(e)}, using fallback")
        # Fallback to basic rule-based detection
        return detect_content_type_basic(memory.url, memory.content, memory.title)


def detect_content_type_basic(url: str, content: str, title: str) -> dict:
    """
    Fallback content detection using URL patterns and content analysis
    """
    metadata = {"type": "article"}  # Default type
    url_lower = (url or "").lower()
    content_lower = (content or "").lower()
    
    # YouTube videos
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        metadata["type"] = "video"
        metadata["platform"] = "youtube"
        
        # Extract video ID
        if url and "v=" in url:
            try:
                video_id = url.split("v=")[1].split("&")[0]
                metadata["video_id"] = video_id
                metadata["thumbnail"] = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
            except:
                pass
        elif url and "youtu.be/" in url:
            try:
                video_id = url.split("youtu.be/")[1].split("?")[0]
                metadata["video_id"] = video_id
                metadata["thumbnail"] = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
            except:
                pass
    
    # Vimeo videos
    elif "vimeo.com" in url_lower:
        metadata["type"] = "video"
        metadata["platform"] = "vimeo"
    
    # E-commerce sites (Products)
    elif any(site in url_lower for site in ["amazon.com", "amazon.in", "ebay.com", "etsy.com", "shopify", "flipkart"]):
        metadata["type"] = "product"
        
        # Try to extract price from content
        price_patterns = [
            r'\$[\d,]+\.?\d*',  # $99.99, $1,299
            r'₹[\d,]+\.?\d*',   # ₹999, ₹1,299.00
            r'€[\d,]+\.?\d*',   # €99.99
            r'£[\d,]+\.?\d*'    # £99.99
        ]
        
        for pattern in price_patterns:
            price_match = re.search(pattern, content)
            if price_match:
                metadata["price"] = price_match.group()
                break
        
        # Extract brand if available
        if "amazon" in url_lower:
            metadata["brand"] = "Amazon"
    
    # Books
    elif any(site in url_lower for site in ["goodreads.com", "books.google.com", "amazon.com/dp/", "amazon.com/gp/product"]):
        metadata["type"] = "book"
        
        # Try to find author in content
        author_patterns = [
            r'by ([A-Z][a-z]+ [A-Z][a-z]+)',
            r'Author: ([A-Za-z\s]+)'
        ]
        for pattern in author_patterns:
            author_match = re.search(pattern, content)
            if author_match:
                metadata["author"] = author_match.group(1).strip()
                break
    
    # Twitter/X posts
    elif "twitter.com" in url_lower or "x.com" in url_lower:
        metadata["type"] = "tweet"
        metadata["platform"] = "twitter"
    
    # GitHub repositories
    elif "github.com" in url_lower:
        metadata["type"] = "code"
        metadata["platform"] = "github"
        
        # Extract repo info
        if url:
            try:
                parts = url.split("github.com/")
                if len(parts) > 1:
                    repo_path = parts[1].split("/")
                    if len(repo_path) >= 2:
                        metadata["repo_owner"] = repo_path[0]
                        metadata["repo_name"] = repo_path[1]
            except:
                pass
    
    # Medium, Dev.to, Substack (Articles)
    elif any(site in url_lower for site in ["medium.com", "dev.to", "substack.com", "hashnode"]):
        metadata["type"] = "article"
        if url:
            try:
                metadata["platform"] = url.split("//")[1].split("/")[0]
            except:
                metadata["platform"] = "unknown"
    
    # Wikipedia
    elif "wikipedia.org" in url_lower:
        metadata["type"] = "article"
        metadata["platform"] = "wikipedia"
    
    # Reddit posts
    elif "reddit.com" in url_lower:
        metadata["type"] = "discussion"
        metadata["platform"] = "reddit"
    
    # Stack Overflow
    elif "stackoverflow.com" in url_lower:
        metadata["type"] = "qa"
        metadata["platform"] = "stackoverflow"
    
    # Image detection
    elif any(ext in url_lower for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']):
        metadata["type"] = "image"
        metadata["image_url"] = url
    
    # Todo detection - check content for task indicators
    elif any(indicator in content_lower for indicator in ['[ ]', '[x]', 'todo', 'task']):
        metadata["type"] = "todo"
        
        # Try to extract task list
        tasks = []
        if content:
            lines = content.split('\n')
            for line in lines:
                if '[ ]' in line or '[x]' in line:
                    task_text = line.replace('[ ]', '').replace('[x]', '').strip()
                    if task_text:
                        tasks.append({
                            "text": task_text,
                            "completed": '[x]' in line
                        })
        if tasks:
            metadata["tasks"] = tasks
    
    # Quote detection
    elif (content and (content.startswith('"') or content.startswith('"'))) or (title and 'quote' in title.lower()):
        metadata["type"] = "quote"
    
    return metadata
