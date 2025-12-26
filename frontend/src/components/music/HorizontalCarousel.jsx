import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * Горизонтальная карусель для отображения плейлистов/треков
 * Похожа на Spotify и Яндекс.Музыку
 */
export default function HorizontalCarousel({ items = [], renderItem }) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    checkScroll();
  }, [items]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  const handleScroll = () => {
    checkScroll();
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });

      // Проверим через некоторое время
      setTimeout(checkScroll, 100);
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="relative group">
      {/* Left Arrow */}
      <motion.button
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition ${
          canScrollLeft ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 cursor-default'
        }`}
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
      >
        <FaChevronLeft size={24} />
      </motion.button>

      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="snap-start"
          >
            {renderItem(item)}
          </div>
        ))}
      </div>

      {/* Right Arrow */}
      <motion.button
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition ${
          canScrollRight ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 cursor-default'
        }`}
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
      >
        <FaChevronRight size={24} />
      </motion.button>

      {/* Hide scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
