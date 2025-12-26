import { useState, useEffect } from 'react';
import { FaThumbsUp, FaThumbsDown } from 'react-icons/fa';
import { motion } from 'framer-motion';

const MemeRating = ({ memeId, initialLikes = 0, initialDislikes = 0, className = '', toast }) => {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [userRating, setUserRating] = useState(null); // 'like', 'dislike', or null
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's current rating
  useEffect(() => {
    const fetchUserRating = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch(`/api/memes/${memeId}/rating`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserRating(data.rating);
        }
      } catch (error) {
        console.error('Error fetching user rating:', error);
      }
    };

    fetchUserRating();
  }, [memeId]);

  const handleRate = async (rating) => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (toast) {
        toast.error('Войдите через Steam, чтобы оценивать мемы');
      } else {
        alert('Войдите через Steam, чтобы оценивать мемы');
      }
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/memes/${memeId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update UI based on action
        if (data.action === 'removed') {
          // User removed their rating
          if (rating === 'like') {
            setLikes(prev => prev - 1);
          } else {
            setDislikes(prev => prev - 1);
          }
          setUserRating(null);
        } else if (data.action === 'changed') {
          // User changed from like to dislike or vice versa
          if (rating === 'like') {
            setLikes(prev => prev + 1);
            setDislikes(prev => prev - 1);
          } else {
            setDislikes(prev => prev + 1);
            setLikes(prev => prev - 1);
          }
          setUserRating(rating);
        } else if (data.action === 'added') {
          // User added new rating
          if (rating === 'like') {
            setLikes(prev => prev + 1);
          } else {
            setDislikes(prev => prev + 1);
          }
          setUserRating(rating);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Ошибка при оценке мема');
      }
    } catch (error) {
      console.error('Error rating meme:', error);
      alert('Ошибка при оценке мема');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Like button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleRate('like')}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          userRating === 'like'
            ? 'bg-green-600 text-white'
            : 'bg-gray-700/50 text-gray-300 hover:bg-green-600/20 hover:text-green-400'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <FaThumbsUp className={userRating === 'like' ? 'text-white' : ''} />
        <span className="font-semibold">{likes}</span>
      </motion.button>

      {/* Dislike button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleRate('dislike')}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          userRating === 'dislike'
            ? 'bg-red-600 text-white'
            : 'bg-gray-700/50 text-gray-300 hover:bg-red-600/20 hover:text-red-400'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <FaThumbsDown className={userRating === 'dislike' ? 'text-white' : ''} />
        <span className="font-semibold">{dislikes}</span>
      </motion.button>
    </div>
  );
};

export default MemeRating;
