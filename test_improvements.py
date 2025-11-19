#!/usr/bin/env python3
"""
Test script for RecallHub backend improvements
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
USER_ID = "mvp_demo_user_2024"

def test_health_check():
    """Test health endpoint"""
    print("\n🏥 Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200
    data = response.json()
    print(f"✅ Health check passed: {data}")
    return True

def test_save_video():
    """Test saving a YouTube video"""
    print("\n🎥 Testing video save...")
    payload = {
        "user_id": USER_ID,
        "content": "Learn Python in 10 Minutes\n\nChannel: TechTutorials\nDuration: 10:05",
        "url": "https://www.youtube.com/watch?v=abc123",
        "title": "Learn Python in 10 Minutes",
        "metadata": {
            "type": "video",
            "platform": "youtube",
            "video_id": "abc123",
            "channel": "TechTutorials",
            "duration": "10:05",
            "thumbnail": "https://img.youtube.com/vi/abc123/maxresdefault.jpg"
        }
    }
    
    response = requests.post(f"{BASE_URL}/api/memory", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"✅ Video saved: ID={data['id']}")
    return data['id']

def test_save_product():
    """Test saving a product"""
    print("\n🛒 Testing product save...")
    payload = {
        "user_id": USER_ID,
        "content": "Wireless Bluetooth Headphones\nPrice: $49.99\nBrand: AudioTech",
        "url": "https://www.amazon.com/dp/B08XYZ123",
        "title": "Wireless Bluetooth Headphones",
        "metadata": {
            "type": "product",
            "platform": "amazon",
            "price": 49.99,
            "brand": "AudioTech",
            "rating": 4.5,
            "reviews": 1234,
            "asin": "B08XYZ123"
        }
    }
    
    response = requests.post(f"{BASE_URL}/api/memory", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"✅ Product saved: ID={data['id']}")
    return data['id']

def test_save_article():
    """Test saving an article"""
    print("\n📰 Testing article save...")
    payload = {
        "user_id": USER_ID,
        "content": "Introduction to Machine Learning\n\nMachine learning is a subset of AI...",
        "url": "https://medium.com/@author/ml-intro",
        "title": "Introduction to Machine Learning",
        "metadata": {
            "type": "article",
            "platform": "medium",
            "author": "Jane Doe",
            "read_time": 5
        }
    }
    
    response = requests.post(f"{BASE_URL}/api/memory", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"✅ Article saved: ID={data['id']}")
    return data['id']

def test_semantic_search():
    """Test semantic search"""
    print("\n🔍 Testing semantic search...")
    payload = {
        "query": "learn programming",
        "limit": 10
    }
    
    response = requests.post(f"{BASE_URL}/api/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"✅ Search returned {len(data)} results")
    
    if data:
        print(f"   Top result: {data[0]['title']}")
        print(f"   Similarity: {data[0]['similarity_score']:.4f}")
    
    return len(data) > 0

def test_filtered_search():
    """Test search with type filter"""
    print("\n🎯 Testing filtered search...")
    payload = {
        "query": "wireless headphones",
        "limit": 10,
        "filters": {"type": "product"}
    }
    
    response = requests.post(f"{BASE_URL}/api/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"✅ Filtered search returned {len(data)} products")
    
    return True

def test_stats():
    """Test stats endpoint"""
    print("\n📊 Testing stats...")
    response = requests.get(f"{BASE_URL}/api/stats")
    assert response.status_code == 200
    data = response.json()
    print(f"✅ Stats:")
    print(f"   Total memories: {data['total']}")
    print(f"   By type: {json.dumps(data['by_type'], indent=2)}")
    print(f"   Recent (7 days): {data['recent_count']}")
    return True

def test_delete_memory(memory_id):
    """Test deleting a memory"""
    print(f"\n🗑️  Testing delete memory {memory_id}...")
    response = requests.delete(f"{BASE_URL}/api/delete/{memory_id}")
    assert response.status_code == 200
    data = response.json()
    print(f"✅ Memory deleted: {data['message']}")
    return True

def main():
    """Run all tests"""
    print("=" * 60)
    print("🧪 RecallHub Backend Test Suite")
    print("=" * 60)
    
    try:
        # Test health
        test_health_check()
        
        # Test saving different content types
        video_id = test_save_video()
        product_id = test_save_product()
        article_id = test_save_article()
        
        # Test search
        test_semantic_search()
        test_filtered_search()
        
        # Test stats
        test_stats()
        
        # Test delete (clean up one item)
        test_delete_memory(video_id)
        
        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return 1
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Cannot connect to backend at {BASE_URL}")
        print("   Make sure the backend is running: python backend/app.py")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
