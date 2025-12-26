import { motion } from 'framer-motion';
import { FaPlay, FaPause, FaMusic } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useMusicPlayer } from '../../contexts/MusicPlayerContext';

/**
 * Карточка альбома в стиле Spotify
 */
export default function AlbumCard({ album, index = 0 }) {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack } = useMusicPlayer();
  
  const isCurrentAlbum = currentTrack?.albumId === album.id;
  const showPlayButton = isCurrentAlbum && isPlaying;

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (album.tracks && album.tracks.length > 0) {
      playTrack(album.tracks[0], album.tracks);
    }
  };

  const handleCardClick = () => {
    // Route path is `/music/albums/:id` (plural)
    navigate(`/music/albums/${album.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleCardClick}
      className="group relative bg-gray-900/40 hover:bg-gray-800/60 rounded-lg p-3 cursor-pointer transition-all duration-300 backdrop-blur-sm"
    >
      {/* Обложка */}
      <div className="relative aspect-square mb-3 rounded-md overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
        {album.coverUrl ? (
          <img
            src={album.coverUrl}
            alt={album.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FaMusic className="w-10 h-10 text-white/30" />
          </div>
        )}
        
        {/* Кнопка воспроизведения */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          className="absolute bottom-1.5 right-1.5 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onClick={handlePlayClick}
        >
          {showPlayButton ? (
            <FaPause className="w-4 h-4 text-black" />
          ) : (
            <FaPlay className="w-4 h-4 text-black ml-0.5" />
          )}
        </motion.button>
      </div>

      {/* Информация */}
      <div className="space-y-0.5">
        <h3 className="text-white font-semibold text-sm truncate group-hover:text-green-400 transition-colors">
          {album.title}
        </h3>
        <p className="text-gray-400 text-xs truncate">
          {album.artist}
        </p>
        {album.year && (
          <p className="text-gray-500 text-xs">
            {album.year}
          </p>
        )}
      </div>
    </motion.div>
  );
}
