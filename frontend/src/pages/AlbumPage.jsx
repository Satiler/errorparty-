import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaPlay,
  FaPause,
  FaHeart,
  FaRegHeart,
  FaShare,
  FaDownload,
  FaComment,
  FaArrowLeft,
  FaMusic
} from 'react-icons/fa';
import axios from 'axios';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function AlbumPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [comments, setComments] = useState([]);
  const [similarAlbums, setSimilarAlbums] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useMusicPlayer();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAlbum();
    fetchComments();
    fetchSimilarAlbums();
  }, [id]);

  const fetchAlbum = async () => {
    try {
      const response = await axios.get(`${API_URL}/music/albums/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setAlbum(response.data.album);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching album:', error);
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API_URL}/music/albums/${id}/comments`);
      setComments(response.data.comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchSimilarAlbums = async () => {
    try {
      const response = await axios.get(`${API_URL}/music/albums/${id}/similar`);
      setSimilarAlbums(response.data.albums);
    } catch (error) {
      console.error('Error fetching similar albums:', error);
    }
  };

  const toggleLike = async () => {
    if (!token) {
      alert('Войдите, чтобы лайкнуть альбом');
      return;
    }

    try {
      if (album.isLiked) {
        await axios.delete(`${API_URL}/music/albums/${id}/like`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAlbum({ ...album, isLiked: false, likeCount: album.likeCount - 1 });
      } else {
        await axios.post(`${API_URL}/music/albums/${id}/like`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAlbum({ ...album, isLiked: true, likeCount: album.likeCount + 1 });
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handlePlayTrack = async (track) => {
    const albumTracks = album?.tracks || [];
    await playTrack(track, albumTracks);
    
    if (token) {
      axios.post(`${API_URL}/music/tracks/${track.id}/listen`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => console.error('Error recording listen:', err));
    }
  };

  const shareAlbum = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Ссылка скопирована!');
  };

  const addComment = async () => {
    if (!token) {
      alert('Войдите, чтобы комментировать');
      return;
    }

    if (!newComment.trim()) return;

    try {
      const response = await axios.post(
        `${API_URL}/music/albums/${id}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([response.data.comment, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Альбом не найден</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="p-6">
        <button
          onClick={() => navigate('/music')}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition"
        >
          <FaArrowLeft /> Назад к музыке
        </button>
      </div>

      {/* Album Header */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          {/* Album Cover */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl"
          >
            {album.coverPath ? (
              <img
                src={album.coverPath}
                alt={album.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <FaMusic className="text-8xl opacity-30" />
              </div>
            )}
          </motion.div>

          {/* Album Info */}
          <div className="flex flex-col justify-center">
            <motion.h1
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl font-bold mb-4"
            >
              {album.title}
            </motion.h1>

            <motion.p
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-2xl text-purple-300 mb-2"
            >
              {album.artist}
            </motion.p>

            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 text-gray-400 mb-6"
            >
              <span>{album.releaseYear}</span>
              <span>•</span>
              <span>{album.genre}</span>
              <span>•</span>
              <span>{album.totalTracks} треков</span>
            </motion.div>

            {album.description && (
              <motion.p
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-300 mb-6"
              >
                {album.description}
              </motion.p>
            )}

            {/* Actions */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex gap-4"
            >
              <button
                onClick={toggleLike}
                className={`flex items-center gap-2 px-6 py-3 rounded-full transition ${
                  album.isLiked
                    ? 'bg-gradient-to-r from-pink-500 to-red-500'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {album.isLiked ? <FaHeart /> : <FaRegHeart />}
                {album.likeCount}
              </button>

              <button
                onClick={shareAlbum}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-gray-700 hover:bg-gray-600 transition"
              >
                <FaShare /> Поделиться
              </button>
            </motion.div>
          </div>
        </div>

        {/* Tracks List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold mb-6">Треки</h2>
          <div className="space-y-2">
            {album.tracks?.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer group"
                onClick={() => {
                  if (currentTrack?.id === track.id) {
                    togglePlayPause();
                  } else {
                    handlePlayTrack(track);
                  }
                }}
              >
                <span className="text-gray-400 w-8">{track.trackNumber || index + 1}</span>
                <button className="text-purple-400 opacity-0 group-hover:opacity-100 transition">
                  {currentTrack?.id === track.id && isPlaying ? <FaPause /> : <FaPlay />}
                </button>
                <div className="flex-1">
                  <div className="font-medium">{track.title}</div>
                  <div className="text-sm text-gray-400">{track.artist}</div>
                </div>
                <div className="text-gray-400">
                  {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Comments Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <FaComment /> Комментарии ({comments.length})
          </h2>

          {token && (
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Оставьте комментарий..."
                className="w-full p-4 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none resize-none"
                rows="3"
              />
              <button
                onClick={addComment}
                className="mt-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:shadow-lg transition"
              >
                Отправить
              </button>
            </div>
          )}

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
                  <div>
                    <div className="font-medium">{comment.user.username}</div>
                    <div className="text-sm text-gray-400">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <p className="text-gray-300">{comment.content}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Similar Albums */}
        {similarAlbums.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-bold mb-6">Похожие альбомы</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {similarAlbums.map((similarAlbum) => (
                <motion.div
                  key={similarAlbum.id}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate(`/music/albums/${similarAlbum.id}`)}
                  className="cursor-pointer group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-2">
                    {similarAlbum.coverPath ? (
                      <img src={similarAlbum.coverPath} alt={similarAlbum.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600"></div>
                    )}
                  </div>
                  <div className="text-sm font-medium truncate">{similarAlbum.title}</div>
                  <div className="text-xs text-gray-400 truncate">{similarAlbum.artist}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
