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
    article: 'border-l-4 border-[var(--border)]',
    product: 'border-l-4 border-[var(--border)]',
    video: 'border-l-4 border-[var(--border)]',
    book: 'border-l-4 border-[var(--border)]',
    note: 'border-l-4 border-[var(--border)]',
    todo: 'border-l-4 border-[var(--border)]',
    tweet: 'border-l-4 border-[var(--border)]',
    code: 'border-l-4 border-[var(--border)]',
    quote: 'border-l-4 border-[var(--border)]',
  };

  const contentType = item.metadata?.type || 'article';
  const typeSVGs: Record<string, string> = {
    article: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 8H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    product: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3l-2 4H10L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    video: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M22 7l-6 4v2l6 4V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    book: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 4.5A2.5 2.5 0 016.5 7H20v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    note: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 11h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    todo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    tweet: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0012 7v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    code: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    quote: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 10h-6v7h6v-7zM9 10H3v7h6v-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    image: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 15l6-6 4 4 6-6v10H3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>'
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
    <div className={`card p-6 transition-all duration-200 transform hover:-translate-y-1 ${cardStyles[contentType] || ''}`}>
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
          className="w-full h-64 object-contain rounded-lg mb-4 bg-[var(--bg-soft)]"
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
      <h3 className="text-lg font-semibold mb-2 text-[var(--text)] line-clamp-2">
        {item.title}
      </h3>

      {/* Price (for products) */}
      {contentType === 'product' && item.metadata.price && (
        <p className="text-2xl font-bold text-[var(--text)] mb-2">
          {item.metadata.price}
        </p>
      )}

      {/* Author (for books/articles) */}
      {item.metadata.author && (
        <p className="text-sm muted mb-2">by {item.metadata.author}</p>
      )}

      {/* Platform Badge */}
      {item.metadata.platform && (
        <span className="inline-block px-2 py-1 text-xs bg-[var(--bg-soft)] text-[var(--text)] rounded-full mb-2">
          {item.metadata.platform}
        </span>
      )}

      {/* Content Preview */}
      <p className="muted-2 text-sm mb-4 line-clamp-3">
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
      <div className="flex items-center justify-between text-sm muted-2 pt-4 border-t" style={{borderTopColor: 'var(--border)'}}>
        <span className="px-3 py-1 bg-[var(--bg-soft)] rounded-full flex items-center gap-2 text-[var(--text)]">
            <span className="text-sm" dangerouslySetInnerHTML={{ __html: typeSVGs[contentType] || typeSVGs.article }} />
          <span className="capitalize text-sm">{contentType}</span>
        </span>
        <span className="text-sm muted">{formatDate(item.timestamp)}</span>
      </div>

      {/* Similarity Score - Only show for search results */}
      {item.similarity_score !== undefined && (
        <div className="mt-2">
          <div className="w-full bg-[var(--border)] rounded-full h-2">
            <div style={{ width: `${item.similarity_score * 100}%`, height: '8px', background: 'var(--accent)', borderRadius: 8 }} />
          </div>
          <div className="text-xs muted mt-1">{(item.similarity_score * 100).toFixed(0)}%</div>
        </div>
      )}

      {/* View Original Link */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block btn-outline text-center w-full text-sm font-medium"
      >
        View Original →
      </a>
    </div>
  );
}
