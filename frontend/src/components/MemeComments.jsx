import { useState, useEffect } from 'react';
import { FaComment, FaTrash, FaPaperPlane } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const MemeComments = ({ memeId, className = '', toast }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchComments();
    fetchCurrentUser();
  }, [memeId]);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/memes/${memeId}/comments`);
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
      if (toast) {
        toast.error('Войдите через Steam, чтобы оставлять комментарии');
      } else {
        alert('Войдите через Steam, чтобы оставлять комментарии');
      }
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/memes/${memeId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newComment.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setComments([data.comment, ...comments]);
        setNewComment('');
        if (toast) {
          toast.success('Комментарий добавлен!');
        }
      } else {
        const errorData = await response.json();
        if (toast) {
          toast.error(errorData.error || 'Ошибка при добавлении комментария');
        } else {
          alert(errorData.error || 'Ошибка при добавлении комментария');
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      if (toast) {
        toast.error('Ошибка при добавлении комментария');
      } else {
        alert('Ошибка при добавлении комментария');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Удалить комментарий?')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/memes/${memeId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        if (toast) {
          toast.success('Комментарий удалён');
        }
      } else {
        const errorData = await response.json();
        if (toast) {
          toast.error(errorData.error || 'Ошибка при удалении комментария');
        } else {
          alert(errorData.error || 'Ошибка при удалении комментария');
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      if (toast) {
        toast.error('Ошибка при удалении комментария');
      } else {
        alert('Ошибка при удалении комментария');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <FaComment className="text-purple-400 text-xl" />
        <h3 className="text-xl font-bold text-white">
          Комментарии ({comments.length})
        </h3>
      </div>

      {/* Add Comment Form */}
      {currentUser ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Добавьте комментарий..."
              maxLength={1000}
              className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              disabled={submitting}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FaPaperPlane />
              {submitting ? 'Отправка...' : 'Отправить'}
            </motion.button>
          </div>
          <div className="text-right text-xs text-gray-400 mt-1">
            {newComment.length}/1000
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600 text-center">
          <p className="text-gray-400">
            Войдите через Steam, чтобы оставлять комментарии
          </p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          Пока нет комментариев. Будьте первым!
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-gray-700/30 rounded-lg p-4 border border-gray-600"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={comment.author?.avatar || '/default-avatar.png'}
                      alt={comment.author?.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="font-semibold text-white">
                        {comment.author?.username}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(comment.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  {currentUser && (currentUser.id === comment.userId || currentUser.role === 'admin') && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      title="Удалить комментарий"
                    >
                      <FaTrash />
                    </motion.button>
                  )}
                </div>
                
                <p className="text-gray-300 whitespace-pre-wrap">
                  {comment.text}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default MemeComments;
