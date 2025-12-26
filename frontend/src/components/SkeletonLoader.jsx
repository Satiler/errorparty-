/**
 * Skeleton loader для сеток плейлистов/альбомов
 */
export function SkeletonPlaylistGrid({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse">
          {/* Cover */}
          <div className="bg-gray-800 aspect-square rounded-lg mb-4"></div>
          {/* Title */}
          <div className="bg-gray-800 h-4 rounded w-3/4 mb-2"></div>
          {/* Subtitle */}
          <div className="bg-gray-800 h-3 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader для списка треков
 */
export function SkeletonTrackList({ count = 8 }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg animate-pulse">
          {/* Index/Play button */}
          <div className="bg-gray-800 w-8 h-8 rounded"></div>
          {/* Cover */}
          <div className="bg-gray-800 w-12 h-12 rounded"></div>
          {/* Track info */}
          <div className="flex-1">
            <div className="bg-gray-800 h-4 rounded w-1/3 mb-2"></div>
            <div className="bg-gray-800 h-3 rounded w-1/4"></div>
          </div>
          {/* Album */}
          <div className="bg-gray-800 h-3 rounded w-32 hidden md:block"></div>
          {/* Duration */}
          <div className="bg-gray-800 h-3 rounded w-12"></div>
          {/* Actions */}
          <div className="bg-gray-800 w-8 h-8 rounded"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader для таблицы треков
 */
export function SkeletonTrackTable({ count = 10 }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-800 mb-2">
        <div className="col-span-1 bg-gray-800 h-4 rounded w-8"></div>
        <div className="col-span-5 bg-gray-800 h-4 rounded w-20"></div>
        <div className="col-span-3 bg-gray-800 h-4 rounded w-24 hidden md:block"></div>
        <div className="col-span-2 bg-gray-800 h-4 rounded w-16 hidden lg:block"></div>
        <div className="col-span-1 bg-gray-800 h-4 rounded w-12"></div>
      </div>
      
      {/* Rows */}
      {[...Array(count)].map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3 items-center animate-pulse">
          {/* # */}
          <div className="col-span-1 bg-gray-800 h-4 rounded w-6"></div>
          {/* Track + Artist */}
          <div className="col-span-5 flex items-center gap-3">
            <div className="bg-gray-800 w-10 h-10 rounded"></div>
            <div className="flex-1">
              <div className="bg-gray-800 h-4 rounded w-3/4 mb-1"></div>
              <div className="bg-gray-800 h-3 rounded w-1/2"></div>
            </div>
          </div>
          {/* Album */}
          <div className="col-span-3 bg-gray-800 h-3 rounded w-32 hidden md:block"></div>
          {/* Date */}
          <div className="col-span-2 bg-gray-800 h-3 rounded w-20 hidden lg:block"></div>
          {/* Duration */}
          <div className="col-span-1 bg-gray-800 h-3 rounded w-10"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader для карточки плейлиста (детальная страница)
 */
export function SkeletonPlaylistHeader() {
  return (
    <div className="flex items-end gap-6 mb-8 animate-pulse">
      {/* Cover */}
      <div className="bg-gray-800 w-48 h-48 md:w-60 md:h-60 rounded-lg shadow-2xl flex-shrink-0"></div>
      
      {/* Info */}
      <div className="flex-1 pb-4">
        <div className="bg-gray-800 h-3 rounded w-20 mb-4"></div>
        <div className="bg-gray-800 h-12 rounded w-3/4 mb-6"></div>
        <div className="bg-gray-800 h-4 rounded w-1/2 mb-4"></div>
        <div className="flex items-center gap-4">
          <div className="bg-gray-800 h-10 rounded-full w-32"></div>
          <div className="bg-gray-800 h-10 w-10 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader для карточек жанров
 */
export function SkeletonGenreGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="relative h-32 rounded-lg overflow-hidden animate-pulse"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-gray-700 h-6 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Простой loader (спиннер)
 */
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-8 w-8 border-2',
    md: 'h-16 w-16 border-4',
    lg: 'h-24 w-24 border-4'
  };

  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className={`animate-spin rounded-full ${sizes[size]} border-t-green-500 border-r-transparent border-b-transparent border-l-transparent`}></div>
    </div>
  );
}
