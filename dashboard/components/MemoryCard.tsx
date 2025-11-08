interface MemoryCardProps {
  item: {
    id: string;
    content: string;
    url: string;
    title: string;
    metadata: any;
    similarity_score?: number;
    timestamp: string;
  };
}

export default function MemoryCard({ item }: MemoryCardProps) {
  const cardStyles: Record<string, string> = {
    article: 'border-l-4 border-blue-500',
    product: 'border-l-4 border-green-500',
    video: 'border-l-4 border-red-500',
    book: 'border-l-4 border-yellow-500',
    note: 'border-l-4 border-purple-500',
    todo: 'border-l-4 border-orange-500',
    tweet: 'border-l-4 border-sky-400',
    code: 'border-l-4 border-gray-700',
    quote: 'border-l-4 border-pink-500',
  };

  const contentType = item.metadata?.type || 'article';
  const typeEmojis: Record<string, string> = {
    article: '📄',
    product: '🛍️',
    video: '🎥',
    book: '📚',
    note: '📝',
    todo: '✓',
    tweet: '🐦',
    code: '💻',
    quote: '💬',
    image: '🖼️',
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${cardStyles[contentType] || ''}`}>
      {/* Video Embed */}
      {contentType === 'video' && item.metadata.video_id && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <iframe
            width="100%"
            height="200"
            src={`https://www.youtube.com/embed/${item.metadata.video_id}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-lg"
          />
        </div>
      )}

      {/* Product Image */}
      {contentType === 'product' && item.metadata.image_url && (
        <img
          src={item.metadata.image_url}
          alt={item.title}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
      )}

      {/* Book Cover */}
      {contentType === 'book' && item.metadata.cover_image && (
        <img
          src={item.metadata.cover_image}
          alt={item.title}
          className="w-full h-64 object-contain rounded-lg mb-4 bg-gray-50"
        />
      )}

      {/* Media Gallery (images and videos from metadata.media) */}
      {(() => {
        // Parse media if it's a JSON string
        let media = item.metadata?.media;
        if (typeof media === 'string') {
          try {
            media = JSON.parse(media);
          } catch (e) {
            media = null;
          }
        }
        // Ensure media is an array
        if (!Array.isArray(media) || media.length === 0) {
          return null;
        }
        
        return (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              {media.slice(0, 4).map((mediaItem: any, idx: number) => (
              <div key={idx} className="relative rounded-lg overflow-hidden">
                {mediaItem.type === 'image' ? (
                  <img
                    src={mediaItem.url}
                    alt={`Media ${idx + 1}`}
                    className="w-full h-32 object-cover hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : mediaItem.type === 'video' ? (
                  <div className="relative w-full h-32 bg-gray-900 flex items-center justify-center">
                    <a 
                      href={mediaItem.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </a>
                  </div>
                ) : null}
              </div>
              ))}
            </div>
            {media.length > 4 && (
              <p className="text-xs text-gray-500 mt-2">
                +{media.length - 4} more media items
              </p>
            )}
          </div>
        );
      })()}

      {/* Title */}
      <h3 className="text-xl font-semibold mb-2 text-gray-900 line-clamp-2">
        {item.title}
      </h3>

      {/* Price (for products) */}
      {contentType === 'product' && item.metadata.price && (
        <p className="text-2xl font-bold text-green-600 mb-2">
          {item.metadata.price}
        </p>
      )}

      {/* Author (for books/articles) */}
      {item.metadata.author && (
        <p className="text-sm text-gray-600 mb-2">
          by {item.metadata.author}
        </p>
      )}

      {/* Platform Badge */}
      {item.metadata.platform && (
        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full mb-2">
          {item.metadata.platform}
        </span>
      )}

      {/* Content Preview */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {item.content}
      </p>

      {/* Tasks (for todos) */}
      {(() => {
        // Parse tasks if it's a JSON string
        let tasks = item.metadata?.tasks;
        if (typeof tasks === 'string') {
          try {
            tasks = JSON.parse(tasks);
          } catch (e) {
            tasks = null;
          }
        }
        // Ensure tasks is an array
        if (contentType !== 'todo' || !Array.isArray(tasks) || tasks.length === 0) {
          return null;
        }
        
        return (
          <div className="mb-4 space-y-1">
            {tasks.slice(0, 3).map((task: any, idx: number) => (
            <div key={idx} className="flex items-center text-sm">
              <span className="mr-2">{task.completed ? '✓' : '○'}</span>
              <span className={task.completed ? 'line-through text-gray-400' : ''}>
                {task.text}
              </span>
            </div>
            ))}
            {tasks.length > 3 && (
              <p className="text-xs text-gray-500">
                +{tasks.length - 3} more tasks
              </p>
            )}
          </div>
        );
      })()}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
        <span className="px-3 py-1 bg-gray-100 rounded-full flex items-center gap-1">
          <span>{typeEmojis[contentType] || '📄'}</span>
          <span className="capitalize">{contentType}</span>
        </span>
        <span>{formatDate(item.timestamp)}</span>
      </div>

      {/* Similarity Score - Only show for search results */}
      {item.similarity_score !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
              style={{ width: `${item.similarity_score * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {(item.similarity_score * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* View Original Link */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block text-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors font-medium"
      >
        View Original →
      </a>
    </div>
  );
}
