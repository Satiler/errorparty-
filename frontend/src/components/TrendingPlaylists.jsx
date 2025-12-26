import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TrendingPlaylists.css';

const TrendingPlaylists = ({ userId }) => {
  const [trendingPlaylists, setTrendingPlaylists] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trending');

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Загрузка трендовых плейлистов
      const playlistsResponse = await axios.get('/api/playlists/trending');
      setTrendingPlaylists(playlistsResponse.data.data || []);

      // Загрузка новых релизов
      const releasesResponse = await axios.get('/api/tracks/new-releases');
      setNewReleases(releasesResponse.data.data || []);

      // Загрузка персональных рекомендаций
      if (userId) {
        const recsResponse = await axios.get(`/api/auto-update/recommendations/${userId}`);
        setRecommendations(recsResponse.data.data || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const playTrack = (trackId) => {
    // Интеграция с вашим аудиоплеером
    console.log('Playing track:', trackId);
  };

  const addToFavorites = async (trackId) => {
    try {
      await axios.post(`/api/favorites/${trackId}`);
      alert('Добавлено в избранное!');
    } catch (error) {
      console.error('Ошибка добавления в избранное:', error);
      alert('Ошибка при добавлении в избранное');
    }
  };

  if (loading) {
    return (
      <div className="trending-container">
        <div className="loading-spinner">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="trending-container">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'trending' ? 'active' : ''}`}
          onClick={() => setActiveTab('trending')}
        >
          🔥 В тренде
        </button>
        <button
          className={`tab ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          ✨ Новинки
        </button>
        {userId && (
          <button
            className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            💡 Для вас
          </button>
        )}
      </div>

      {activeTab === 'trending' && (
        <div className="content-section">
          <h2>Актуальные плейлисты</h2>
          <p className="subtitle">Автоматически обновляемые подборки на основе мировых чартов</p>
          
          <div className="playlists-grid">
            {trendingPlaylists.map((playlist) => (
              <div key={playlist.id} className="playlist-card">
                <div className="playlist-cover">
                  {playlist.cover_url ? (
                    <img src={playlist.cover_url} alt={playlist.name} />
                  ) : (
                    <div className="placeholder-cover">🎵</div>
                  )}
                  <div className="playlist-overlay">
                    <button className="btn-play">▶</button>
                  </div>
                </div>
                <div className="playlist-info">
                  <h3>{playlist.name}</h3>
                  <p>{playlist.description}</p>
                  <div className="playlist-meta">
                    <span>📊 {playlist.track_count} треков</span>
                    {playlist.updated_at && (
                      <span className="updated-badge">
                        Обновлено {new Date(playlist.updated_at).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'new' && (
        <div className="content-section">
          <h2>Новые релизы</h2>
          <p className="subtitle">Свежие треки из мировых чартов и kissvk</p>
          
          <div className="tracks-list">
            {newReleases.map((track, index) => (
              <div key={track.id} className="track-row">
                <div className="track-number">{index + 1}</div>
                <div className="track-cover">
                  {track.cover_url ? (
                    <img src={track.cover_url} alt={track.title} />
                  ) : (
                    <div className="placeholder-cover-small">🎵</div>
                  )}
                </div>
                <div className="track-info-main">
                  <div className="track-title">{track.title}</div>
                  <div className="track-artist">{track.artist}</div>
                </div>
                <div className="track-meta">
                  {track.created_at && (
                    <span className="new-badge">
                      {Math.floor((new Date() - new Date(track.created_at)) / (1000 * 60 * 60 * 24))} дн. назад
                    </span>
                  )}
                </div>
                <div className="track-actions">
                  <button
                    className="btn-icon"
                    onClick={() => playTrack(track.id)}
                    title="Воспроизвести"
                  >
                    ▶
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => addToFavorites(track.id)}
                    title="Добавить в избранное"
                  >
                    ♥
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && userId && (
        <div className="content-section">
          <h2>Рекомендации для вас</h2>
          <p className="subtitle">Подборка на основе ваших предпочтений и мировых трендов</p>
          
          <div className="tracks-list">
            {recommendations.map((rec, index) => (
              <div key={rec.trackId} className="track-row">
                <div className="track-number">{index + 1}</div>
                <div className="track-score">{(rec.score * 100).toFixed(0)}%</div>
                <div className="track-info-main">
                  <div className="track-title">{rec.title}</div>
                  <div className="track-artist">{rec.artist}</div>
                  {rec.reason && (
                    <div className="recommendation-reason">{rec.reason}</div>
                  )}
                </div>
                <div className="track-actions">
                  <button
                    className="btn-icon"
                    onClick={() => playTrack(rec.trackId)}
                    title="Воспроизвести"
                  >
                    ▶
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => addToFavorites(rec.trackId)}
                    title="Добавить в избранное"
                  >
                    ♥
                  </button>
                </div>
              </div>
            ))}
          </div>

          {recommendations.length === 0 && (
            <div className="empty-state">
              <p>Начните слушать музыку, чтобы получить персональные рекомендации!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrendingPlaylists;
