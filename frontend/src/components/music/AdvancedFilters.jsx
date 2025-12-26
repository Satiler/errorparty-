import { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useMusicLibrary } from '../../contexts/MusicLibraryContext';
import './AdvancedFilters.css';

const AdvancedFilters = ({ isOpen, onToggle }) => {
  const { filters, genres, updateFilters, resetFilters } = useMusicLibrary();
  
  const [localFilters, setLocalFilters] = useState(filters);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    setHasChanges(true);
  };

  const handleApply = () => {
    updateFilters(localFilters);
    setHasChanges(false);
  };

  const handleReset = () => {
    resetFilters();
    setLocalFilters({
      genre: '',
      yearFrom: '',
      yearTo: '',
      durationMin: '',
      durationMax: '',
      onlyVerified: false,
      provider: ''
    });
    setHasChanges(false);
  };

  const activeFiltersCount = Object.values(localFilters).filter(v => 
    v !== '' && v !== false
  ).length;

  if (!isOpen) {
    return (
      <button className="filters-toggle" onClick={onToggle}>
        <Filter size={18} />
        <span>Фильтры</span>
        {activeFiltersCount > 0 && (
          <span className="filter-badge">{activeFiltersCount}</span>
        )}
        <ChevronDown size={16} />
      </button>
    );
  }

  return (
    <div className="advanced-filters">
      <div className="filters-header">
        <div className="filters-title">
          <Filter size={20} />
          <h3>Расширенные фильтры</h3>
          {activeFiltersCount > 0 && (
            <span className="filter-badge">{activeFiltersCount}</span>
          )}
        </div>
        <button className="filters-close" onClick={onToggle}>
          <ChevronUp size={20} />
        </button>
      </div>

      <div className="filters-body">
        {/* Genre Filter */}
        <div className="filter-group">
          <label className="filter-label">Жанр</label>
          <select
            className="filter-select"
            value={localFilters.genre}
            onChange={(e) => handleFilterChange('genre', e.target.value)}
          >
            <option value="">Все жанры</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        {/* Year Range */}
        <div className="filter-group">
          <label className="filter-label">Год выпуска</label>
          <div className="filter-range">
            <input
              type="number"
              className="filter-input"
              placeholder="От"
              min="1900"
              max={new Date().getFullYear()}
              value={localFilters.yearFrom}
              onChange={(e) => handleFilterChange('yearFrom', e.target.value)}
            />
            <span className="range-separator">—</span>
            <input
              type="number"
              className="filter-input"
              placeholder="До"
              min="1900"
              max={new Date().getFullYear()}
              value={localFilters.yearTo}
              onChange={(e) => handleFilterChange('yearTo', e.target.value)}
            />
          </div>
        </div>

        {/* Duration Range */}
        <div className="filter-group">
          <label className="filter-label">Длительность (сек)</label>
          <div className="filter-range">
            <input
              type="number"
              className="filter-input"
              placeholder="От"
              min="0"
              value={localFilters.durationMin}
              onChange={(e) => handleFilterChange('durationMin', e.target.value)}
            />
            <span className="range-separator">—</span>
            <input
              type="number"
              className="filter-input"
              placeholder="До"
              min="0"
              value={localFilters.durationMax}
              onChange={(e) => handleFilterChange('durationMax', e.target.value)}
            />
          </div>
        </div>

        {/* Provider Filter */}
        <div className="filter-group">
          <label className="filter-label">Источник</label>
          <select
            className="filter-select"
            value={localFilters.provider}
            onChange={(e) => handleFilterChange('provider', e.target.value)}
          >
            <option value="">Все источники</option>
            <option value="lmusic">Lmusic</option>
            <option value="kissvk">KissVK</option>
            <option value="local">Локальные</option>
            <option value="hitmo">Hitmo</option>
            <option value="musify">Musify</option>
          </select>
        </div>

        {/* Verified Only */}
        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={localFilters.onlyVerified}
              onChange={(e) => handleFilterChange('onlyVerified', e.target.checked)}
            />
            <span>Только проверенные треки</span>
          </label>
        </div>
      </div>

      <div className="filters-footer">
        <button 
          className="filter-button filter-button-reset"
          onClick={handleReset}
          disabled={activeFiltersCount === 0}
        >
          <X size={16} />
          Сбросить
        </button>
        <button
          className="filter-button filter-button-apply"
          onClick={handleApply}
          disabled={!hasChanges}
        >
          <Filter size={16} />
          Применить
        </button>
      </div>
    </div>
  );
};

export default AdvancedFilters;
