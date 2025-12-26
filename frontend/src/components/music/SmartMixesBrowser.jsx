import { useState, useEffect } from 'react';
import { Sun, Moon, Focus, Dumbbell, CloudMoon, Clock, Play, Music } from 'lucide-react';
import axios from 'axios';
import { useMusicPlayer } from '../../contexts/MusicPlayerContext';
import './SmartMixesBrowser.css';

const SmartMixesBrowser = () => {
  const [smartMixes, setSmartMixes] = useState({});
  const [currentMix, setCurrentMix] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack } = useMusicPlayer();

  const mixConfigs = [
    {
      key: 'morning',
      name: 'Morning Energy',
      icon: Sun,
      color: '#FFB84D',
      description: 'Бодрящий микс для начала дня',
      timeRange: '05:00 - 10:00',
      bpmRange: '120-180',
      characteristics: ['Энергичная музыка', 'Высокий темп', 'Позитивный настрой']
    },
    {
      key: 'focus',
      name: 'Focus Flow',
      icon: Focus,
      color: '#4D9FFF',
      description: 'Концентрация и продуктивность',
      timeRange: '09:00 - 17:00',
      bpmRange: '80-120',
      characteristics: ['Инструментальная', 'Средний темп', 'Без вокала']
    },
    {
      key: 'evening',
      name: 'Evening Chill',
      icon: Moon,
      color: '#B84DFF',
      description: 'Расслабляющий вечерний микс',
      timeRange: '18:00 - 22:00',
      bpmRange: '60-100',
      characteristics: ['Расслабляющая', 'Спокойный темп', 'Атмосферная']
    },
    {
      key: 'workout',
      name: 'Workout Power',
      icon: Dumbbell,
      color: '#FF4D4D',
      description: 'Мощная энергия для тренировок',
      timeRange: 'В любое время',
      bpmRange: '140-180',
      characteristics: ['Максимальная энергия', 'Быстрый темп', 'Мотивирующая']
    },
    {
      key: 'sleep',
      name: 'Sleep Sounds',
      icon: CloudMoon,
      color: '#4D7FFF',
      description: 'Умиротворяющая музыка для сна',
      timeRange: '22:00 - 05:00',
      bpmRange: '40-80',
      characteristics: ['Тихая и спокойная', 'Медленный темп', 'Расслабляющая']
    }
  ];

  useEffect(() => {
    loadSmartMixes();
    // Auto-load current mix based on time
    loadCurrentMix();
  }, []);

  const loadSmartMixes = async () => {
    setIsLoading(true);
    try {
      const responses = await Promise.all(
        mixConfigs.map(mix =>
          axios.get(`/api/music/recommendations/smart-mixes/${mix.key}`)
            .then(res => ({ key: mix.key, data: res.data }))
            .catch(() => ({ key: mix.key, data: null }))
        )
      );

      const mixesData = {};
      responses.forEach(({ key, data }) => {
        if (data) {
          mixesData[key] = data;
        }
      });

      setSmartMixes(mixesData);
    } catch (error) {
      console.error('Error loading smart mixes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentMix = async () => {
    try {
      const response = await axios.get('/api/music/recommendations/smart-mixes/current');
      if (response.data) {
        setCurrentMix(response.data);
      }
    } catch (error) {
      console.error('Error loading current mix:', error);
    }
  };

  const playMix = (mixKey) => {
    const mix = smartMixes[mixKey];
    if (mix?.tracks?.length > 0) {
      playTrack(mix.tracks[0], mix.tracks);
    }
  };

  const getCurrentTimeIndicator = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'morning';
    if (hour >= 9 && hour < 17) return 'focus';
    if (hour >= 18 && hour < 22) return 'evening';
    if (hour >= 22 || hour < 5) return 'sleep';
    return null;
  };

  const currentTimeKey = getCurrentTimeIndicator();

  if (isLoading) {
    return (
      <div className="smart-mixes-loading">
        <Music className="loading-icon" size={48} />
        <p>Загрузка умных миксов...</p>
      </div>
    );
  }

  return (
    <div className="smart-mixes-browser">
      <div className="smart-mixes-header">
        <div className="header-content">
          <Clock size={32} />
          <div>
            <h1>Smart Mixes</h1>
            <p>Музыка под каждый момент вашего дня</p>
          </div>
        </div>
        {currentMix && (
          <div className="current-mix-indicator">
            <span className="indicator-label">Сейчас рекомендуется:</span>
            <span className="indicator-mix">{currentMix.name}</span>
          </div>
        )}
      </div>

      <div className="smart-mixes-grid">
        {mixConfigs.map((config) => {
          const Icon = config.icon;
          const mix = smartMixes[config.key];
          const isCurrentTime = config.key === currentTimeKey;
          const trackCount = mix?.tracks?.length || 0;

          return (
            <div
              key={config.key}
              className={`smart-mix-card ${isCurrentTime ? 'current-time' : ''}`}
              style={{ '--mix-color': config.color }}
            >
              <div className="mix-card-header">
                <div className="mix-icon" style={{ backgroundColor: config.color }}>
                  <Icon size={32} strokeWidth={2} />
                </div>
                {isCurrentTime && (
                  <span className="current-time-badge">Сейчас</span>
                )}
              </div>

              <div className="mix-card-content">
                <h3 className="mix-name">{config.name}</h3>
                <p className="mix-description">{config.description}</p>

                <div className="mix-info">
                  <div className="info-item">
                    <Clock size={14} />
                    <span>{config.timeRange}</span>
                  </div>
                  <div className="info-item">
                    <Music size={14} />
                    <span>BPM {config.bpmRange}</span>
                  </div>
                  <div className="info-item">
                    <span className="track-count">{trackCount} треков</span>
                  </div>
                </div>

                <div className="mix-characteristics">
                  {config.characteristics.map((char, idx) => (
                    <span key={idx} className="characteristic-tag">
                      {char}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mix-card-footer">
                <button
                  className="play-mix-button"
                  onClick={() => playMix(config.key)}
                  disabled={trackCount === 0}
                >
                  <Play size={18} fill="currentColor" />
                  <span>Играть</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="smart-mixes-info">
        <h3>О Smart Mixes</h3>
        <p>
          Умные миксы автоматически подбирают музыку на основе времени суток, ваших предпочтений
          и контекста прослушивания. Алгоритм анализирует BPM, энергию треков и вашу историю
          прослушивания для создания идеального плейлиста для каждого момента.
        </p>
      </div>
    </div>
  );
};

export default SmartMixesBrowser;
