# backend/app.py
import os
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import chromadb
from chromadb.config import Settings
import google.generativeai as genai
from dotenv import load_dotenv
from chromadb.errors import NotFoundError
import json

# Import constants
from constants import (
    COLLECTION_NAME,
    API_VERSION,
    API_TITLE,
    API_DESCRIPTION
)

# Import Gemini utilities
from utils.gemini import (
    create_gemini_embedding_function
)

# Import Pydantic models
from models.models import (
    StoreRequest,
    ContextRequest,
    SearchRequest,
    SearchResult,
    MemoryCreate
)

# Import business logic modules
from src.context import (
    store_conversation,
    get_all_conversations,
    clear_all_data as clear_all_data_func,
    clear_user_data as clear_user_data_func,
    delete_context_by_id as delete_context_by_id_func
)
from src.generate_context import (
    generate_context_from_all_conversations,
    generate_context_from_specific_conversation
)

# Load environment variables from .env file
load_dotenv()

# Environment-based configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Set GEMINI_API_KEY in environment or .env file")

genai.configure(api_key=GEMINI_API_KEY)

# Chroma client - local persistent folder
client = chromadb.PersistentClient(path="./chroma_data")

# Single collection for user memory
try:
    collection = client.get_collection(name=COLLECTION_NAME)
except NotFoundError:
    # Collection doesn't exist, create it
    collection = client.create_collection(name=COLLECTION_NAME)

# Create Gemini embedding function instance
gemini_ef = create_gemini_embedding_function()


app = FastAPI(title=API_TITLE, version=API_VERSION)

# Add global exception handler for 422 validation errors (debugging)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Custom handler for 422 validation errors.
    Logs the request body and validation errors for debugging.
    """
    # Try to get the request body
    try:
        body = await request.body()
        body_str = body.decode('utf-8')
        try:
            body_json = json.loads(body_str)
        except:
            body_json = body_str
    except:
        body_json = "Could not read body"
    
    # Log the error details
    print("=" * 80)
    print("🚨 VALIDATION ERROR (422)")
    print(f"URL: {request.url}")
    print(f"Method: {request.method}")
    print(f"Headers: {dict(request.headers)}")
    print(f"Body: {body_json}")
    print(f"Errors: {exc.errors()}")
    print("=" * 80)
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": body_json,
            "message": "Validation error - check logs for details"
        }
    )

# Add CORS middleware to allow requests from anywhere
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Import and initialize routers
from routes.search import router as search_router, init_search_router
from routes.memory import router as memory_router, init_memory_router

# Initialize routers with collection
init_search_router(collection)
init_memory_router(collection)

# Include routers
# Include routers
app.include_router(search_router, prefix="/api", tags=["search"])
app.include_router(memory_router, prefix="/api", tags=["memory"])

# Mount /store endpoint at root for backward compatibility with extension
from routes.memory import save_memory as memory_save_memory

@app.post("/store")
async def store_legacy(memory: MemoryCreate):
    """
    Legacy /store endpoint for backward compatibility.
    Now uses the new MemoryCreate model and supports media extraction.
    """
    return await memory_save_memory(memory)

@app.post("/api/save")
async def save_content(req: StoreRequest):
    """
    Save content with content type and metadata support.
    Compatible with extension's smart save feature.
    """
    try:
        # Generate embedding using Gemini
        embedding_result = genai.embed_content(
            model="models/text-embedding-004",
            content=req.text,
            task_type="retrieval_document"
        )
        embedding = embedding_result['embedding']
        
        # Create unique ID and timestamp
        import uuid
        from datetime import datetime
        
        memory_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Parse metadata if it's a JSON string
        metadata_dict = {}
        if req.metadata:
            try:
                import json
                metadata_dict = json.loads(req.metadata) if isinstance(req.metadata, str) else req.metadata
            except:
                pass
        
        # Prepare metadata for ChromaDB
        final_metadata = {
            "user_id": req.user_id,
            "source": req.source,
            "url": req.url or "",
            "title": req.title or "Untitled",
            "timestamp": timestamp,
            "time": timestamp,
            "content_type": req.content_type or "note",
            **metadata_dict
        }
        
        # Store in ChromaDB
        collection.add(
            ids=[memory_id],
            embeddings=[embedding],
            documents=[req.text],
            metadatas=[final_metadata]
        )
        
        return {
            "id": memory_id,
            "status": "success",
            "message": f"{req.content_type or 'Content'} saved successfully",
            "content_type": req.content_type
        }
        
    except Exception as e:
        print(f"Error saving content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save content: {str(e)}")

@app.get("/api/stats")
async def get_stats(user_id: str):
    """Get statistics for a user's saved content"""
    try:
        # Get all items for user
        results = collection.get(
            where={"user_id": user_id}
        )
        
        if not results or not results['ids']:
            return {
                "total": 0,
                "by_type": {},
                "recent_count": 0
            }
        
        # Count by content type
        by_type = {}
        for metadata in results['metadatas']:
            content_type = metadata.get('content_type', 'note')
            by_type[content_type] = by_type.get(content_type, 0) + 1
        
        # Count recent (last 7 days)
        from datetime import datetime, timedelta
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        recent_count = sum(1 for m in results['metadatas'] if m.get('timestamp', '') >= week_ago)
        
        return {
            "total": len(results['ids']),
            "by_type": by_type,
            "recent_count": recent_count
        }
        
    except Exception as e:
        print(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@app.delete("/api/delete/{memory_id}")
async def delete_memory(
    memory_id: str,
    user_id: str = Query(..., description="User ID to verify ownership")
):
    """Delete a specific memory by ID"""
    try:
        # Verify ownership
        result = collection.get(
            ids=[memory_id],
            where={"user_id": user_id}
        )
        
        if not result or not result['ids']:
            raise HTTPException(status_code=404, detail="Memory not found or access denied")
        
        # Delete the memory
        collection.delete(ids=[memory_id])
        
        return {
            "status": "success",
            "message": "Memory deleted successfully",
            "id": memory_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting memory: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete memory: {str(e)}")

@app.get("/get_all")
async def get_all(user_id: str):
    return await get_all_conversations(user_id, collection)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if collection exists and is accessible
        collections = client.list_collections()
        collection_exists = any(c.name == COLLECTION_NAME for c in collections)
        
        return {
            "status": "healthy",
            "collection_exists": collection_exists,
            "api_version": API_VERSION
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.delete("/clear")
async def clear_all_data():
    """Clear all data from ChromaDB collection"""
    return await clear_all_data_func(collection)

@app.delete("/clear/{user_id}")
async def clear_user_data(user_id: str):
    """Clear all data for a specific user"""
    return await clear_user_data_func(user_id, collection)

@app.delete("/delete_context/{context_id}")
async def delete_context(
    context_id: str,
    user_id: str = Query(..., description="User ID to verify ownership")
):
    """Delete a specific context by context_id, verifying it belongs to user_id"""
    return await delete_context_by_id_func(context_id, user_id, collection)


@app.post("/generate_context")
async def generate_context(request: ContextRequest):
    """Generate intelligent context summary using Gemini from stored conversations"""
    return await generate_context_from_all_conversations(request, collection)

@app.get("/generate_context/{context_id}")
async def generate_context_by_id(
    context_id: str, 
    user_id: str = Query(..., description="User ID"), 
    max_length: int = Query(2000, description="Maximum context length")
):
    """Generate intelligent context summary for a specific stored conversation"""
    return await generate_context_from_specific_conversation(context_id, user_id, max_length, collection)

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": API_TITLE,
        "version": API_VERSION,
        "description": API_DESCRIPTION,
        "endpoints": {
            "POST /store": "Store conversation data with auto-generated title",
            "POST /api/save": "Save content with content type and metadata (smart save)",
            "GET /api/stats": "Get user statistics by content type",
            "DELETE /api/delete/{memory_id}": "Delete a specific memory by ID",
            "GET /get_all": "Retrieve all conversations for a user",
            "POST /api/search": "Semantic search for memories",
            "POST /api/search/nl": "Natural language search with filters",
            "POST /api/memory": "Save memory with enhanced metadata",
            "POST /generate_context": "Generate intelligent context summary from all conversations",
            "GET /generate_context/{context_id}": "Generate intelligent context summary for specific conversation",
            "DELETE /clear": "Clear all data",
            "DELETE /clear/{user_id}": "Clear data for specific user",
            "DELETE /delete_context/{context_id}": "Delete a specific context by context_id (requires user_id query param)",
            "GET /health": "Health check"
        }
    }

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Get port from environment (Railway sets this)
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print("🚀 Starting SabkiSoch Backend...")
    print(f"📡 API will be available at: http://{host}:{port}")
    print(f"📚 API docs available at: http://{host}:{port}/docs")
    print(f"❤️  Health check at: http://{host}:{port}/health")
    print("=" * 50)
    
    uvicorn.run(app, host=host, port=port)