# backend/routes/search.py
"""
Search endpoints for semantic and natural language search
"""

from fastapi import APIRouter, HTTPException
from typing import List
import google.generativeai as genai
from datetime import datetime, timedelta
import json

from models.models import SearchRequest, SearchResult
from constants import (
    EMBEDDING_MODEL_NAME,
    QUERY_ANALYSIS_PROMPT,
    USER_ID  # MVP: Hardcoded user ID
)

router = APIRouter()

# Global variables to be injected
collection = None


def init_search_router(chroma_collection):
    """Initialize the search router with ChromaDB collection"""
    global collection
    collection = chroma_collection


@router.post("/search", response_model=List[SearchResult])
async def semantic_search(request: SearchRequest):
    """
    Semantic search endpoint - searches using vector similarity
    
    Example request:
    {
        "query": "machine learning articles",
        "user_id": "user123",
        "limit": 20
    }
    """
    try:
        if collection is None:
            raise HTTPException(status_code=500, detail="Collection not initialized")
        
        # 1. Generate embedding for search query using Gemini
        query_embedding_result = genai.embed_content(
            model=EMBEDDING_MODEL_NAME,
            content=request.query,
            task_type="retrieval_query"
        )
        query_embedding = query_embedding_result['embedding']

        # 2. Build where clause with user filter
        # MVP: Use constant USER_ID instead of request.user_id
        where_clause = {"user_id": USER_ID}  # MVP: Always use constant
        
        # Add additional filters if provided
        if request.filters:
            where_clause.update(request.filters)

        # 3. Query ChromaDB with the embedding
        print(f"🔍 Searching with query: '{request.query}', user_id filter: {where_clause}")
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=request.limit,
            where=where_clause,
            include=["documents", "metadatas", "distances"]
        )
        
        print(f"🔍 Search query returned {len(results.get('ids', [[]])[0]) if results.get('ids') else 0} results")

        # 4. Format results
        search_results = []
        if results['ids'] and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                metadata = results['metadatas'][0][i]
                
                search_results.append(SearchResult(
                    id=results['ids'][0][i],
                    content=results['documents'][0][i],
                    url=metadata.get('url', ''),
                    title=metadata.get('title', 'Untitled'),
                    metadata=metadata,
                    similarity_score=1 - results['distances'][0][i],  # Convert distance to similarity
                    timestamp=metadata.get('time', metadata.get('timestamp', ''))
                ))
        else:
            print(f"⚠️ No search results found for query: '{request.query}'")

        print(f"✅ Returning {len(search_results)} formatted search results")
        return search_results

    except Exception as e:
        print(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}") from e


@router.post("/search/nl", response_model=List[SearchResult])
async def natural_language_search(request: SearchRequest):
    """
    Natural Language search endpoint - understands complex queries
    
    Examples:
    - "Show me articles about AI I saved last month"
    - "Black leather shoes under $300"
    - "What did Karpathy say about tokenization"
    """
    try:
        if collection is None:
            raise HTTPException(status_code=500, detail="Collection not initialized")
        
        # 1. Use Gemini to parse and understand the query
        query_analysis = await analyze_search_query(request.query)
        
        # 2. Generate embedding for the semantic part of the query
        semantic_query = query_analysis.get('semantic_query', request.query)
        query_embedding_result = genai.embed_content(
            model=EMBEDDING_MODEL_NAME,
            content=semantic_query,
            task_type="retrieval_query"
        )
        query_embedding = query_embedding_result['embedding']

        # 3. Build ChromaDB where clause from extracted filters
        # MVP: Use constant USER_ID instead of request.user_id
        where_clause = {"user_id": USER_ID}  # MVP: Always use constant

        # Add content type filter
        if query_analysis.get('content_type'):
            where_clause["type"] = query_analysis['content_type']

        # Add date filter
        if query_analysis.get('date_filter'):
            where_clause["time"] = {"$gte": query_analysis['date_filter']}
        
        # Note: Price and author filters would need to be handled post-query
        # as ChromaDB's where clause is limited
        
        # 4. Query ChromaDB
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=request.limit,
            where=where_clause,
            include=["documents", "metadatas", "distances"]
        )

        # 5. Format and post-filter results
        search_results = []
        if results['ids'] and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                metadata = results['metadatas'][0][i]
                
                # Post-filter for price if needed
                if query_analysis.get('price_max'):
                    item_price = metadata.get('price', '')
                    if item_price:
                        # Extract numeric price
                        import re
                        price_match = re.search(r'[\d,]+\.?\d*', str(item_price))
                        if price_match:
                            numeric_price = float(price_match.group().replace(',', ''))
                            if numeric_price > query_analysis['price_max']:
                                continue  # Skip items over price limit
                
                # Post-filter for author if needed
                if query_analysis.get('author'):
                    item_author = metadata.get('author', '').lower()
                    if query_analysis['author'].lower() not in item_author:
                        continue  # Skip if author doesn't match
                
                search_results.append(SearchResult(
                    id=results['ids'][0][i],
                    content=results['documents'][0][i],
                    url=metadata.get('url', ''),
                    title=metadata.get('title', 'Untitled'),
                    metadata=metadata,
                    similarity_score=1 - results['distances'][0][i],
                    timestamp=metadata.get('time', metadata.get('timestamp', ''))
                ))

        return search_results

    except Exception as e:
        print(f"Natural language search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}") from e


async def analyze_search_query(query: str) -> dict:
    """
    Use Gemini to understand search intent and extract filters
    
    Returns a dictionary with:
    - semantic_query: The core meaning to search for
    - content_type: Type filter (article, product, video, book, note, todo, quote)
    - date_filter: ISO date string if time mentioned
    - price_max: Maximum price if mentioned
    - author: Author/person name if mentioned
    """
    try:
        prompt = QUERY_ANALYSIS_PROMPT.format(query=query)
        
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
        
        parsed = json.loads(response_text)
        return parsed
        
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"Query analysis error: {str(e)}, using fallback")
        # Fallback: return the original query without filters
        return {
            "semantic_query": query,
            "content_type": None,
            "date_filter": None,
            "price_max": None,
            "author": None
        }


def parse_date_filter(date_str: str) -> str:
    """
    Convert relative date strings to ISO format
    Examples: "last week", "yesterday", "last month"
    """
    now = datetime.now()
    
    if "yesterday" in date_str.lower():
        target_date = now - timedelta(days=1)
    elif "last week" in date_str.lower():
        target_date = now - timedelta(weeks=1)
    elif "last month" in date_str.lower():
        target_date = now - timedelta(days=30)
    elif "last year" in date_str.lower():
        target_date = now - timedelta(days=365)
    else:
        target_date = now - timedelta(days=30)  # Default to last month
    
    return target_date.isoformat()
