import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PendingChangesManager.css';

const PendingChangesManager = () => {
  const [pendingChanges, setPendingChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingChanges();
  }, []);

  const fetchPendingChanges = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auto-update/pending-changes');
      setPendingChanges(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки изменений:', error);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (changeId) => {
    if (!window.confirm('Одобрить эти изменения?')) return;

    try {
      setActionLoading(true);
      await axios.post(`/api/auto-update/pending-changes/${changeId}/approve`);
      alert('Изменения одобрены и применены!');
      fetchPendingChanges();
      setSelectedChange(null);
    } catch (error) {
      console.error('Ошибка одобрения:', error);
      alert('Ошибка при одобрении изменений');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (changeId) => {
    if (!window.confirm('Отклонить эти изменения?')) return;

    try {
      setActionLoading(true);
      await axios.post(`/api/auto-update/pending-changes/${changeId}/reject`);
      alert('Изменения отклонены');
      fetchPendingChanges();
      setSelectedChange(null);
    } catch (error) {
      console.error('Ошибка отклонения:', error);
      alert('Ошибка при отклонении изменений');
    } finally {
      setActionLoading(false);
    }
  };

  const viewDetails = (change) => {
    setSelectedChange(change);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="pending-changes-manager">
      <div className="header">
        <h2>Изменения, ожидающие модерации</h2>
        <button onClick={fetchPendingChanges} className="btn-refresh">
          🔄 Обновить
        </button>
      </div>

      {pendingChanges.length === 0 ? (
        <div className="no-changes">
          <p>Нет изменений, ожидающих модерации</p>
        </div>
      ) : (
        <div className="changes-grid">
          <div className="changes-list">
            {pendingChanges.map((change) => (
              <div
                key={change.id}
                className={`change-card ${selectedChange?.id === change.id ? 'selected' : ''}`}
                onClick={() => viewDetails(change)}
              >
                <div className="change-header">
                  <h3>{change.playlist_name}</h3>
                  <span className="change-date">
                    {new Date(change.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="change-summary">
                  {(() => {
                    const data = JSON.parse(change.changes_data);
                    return (
                      <>
                        <span className="add">+{data.toAdd?.length || 0}</span>
                        <span className="remove">-{data.toRemove?.length || 0}</span>
                        <span className="keep">={data.toKeep?.length || 0}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>

          {selectedChange && (
            <div className="change-details">
              <h3>Детали изменений: {selectedChange.playlist_name}</h3>
              
              {(() => {
                const data = JSON.parse(selectedChange.changes_data);
                
                return (
                  <>
                    {/* Треки для добавления */}
                    {data.toAdd && data.toAdd.length > 0 && (
                      <div className="tracks-section add-section">
                        <h4>Добавить ({data.toAdd.length})</h4>
                        <div className="tracks-list">
                          {data.toAdd.map((track, idx) => (
                            <div key={idx} className="track-item">
                              <span className="track-score">{track.score?.toFixed(2)}</span>
                              <div className="track-info">
                                <div className="track-title">{track.title}</div>
                                <div className="track-artist">{track.artist}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Треки для удаления */}
                    {data.toRemove && data.toRemove.length > 0 && (
                      <div className="tracks-section remove-section">
                        <h4>Удалить ({data.toRemove.length})</h4>
                        <div className="tracks-list">
                          {data.toRemove.map((track, idx) => (
                            <div key={idx} className="track-item">
                              <div className="track-info">
                                <div className="track-title">{track.title}</div>
                                <div className="track-artist">{track.artist}</div>
                                <div className="track-meta">
                                  В плейлисте: {track.days_in_playlist?.toFixed(0)} дней
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Сводка */}
                    {data.summary && (
                      <div className="summary">
                        <h4>Итог</h4>
                        <div className="summary-grid">
                          <div>Текущих треков: {data.summary.currentCount}</div>
                          <div>Останется: {data.summary.keepCount}</div>
                          <div>Будет добавлено: {data.summary.addCount}</div>
                          <div>Будет удалено: {data.summary.removeCount}</div>
                          <div className="final-count">
                            Итого треков: {data.summary.finalCount}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="actions">
                      <button
                        onClick={() => handleApprove(selectedChange.id)}
                        disabled={actionLoading}
                        className="btn-approve"
                      >
                        ✓ Одобрить
                      </button>
                      <button
                        onClick={() => handleReject(selectedChange.id)}
                        disabled={actionLoading}
                        className="btn-reject"
                      >
                        ✕ Отклонить
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingChangesManager;
