import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SteamMatchHistory.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SteamMatchHistory = ({ steamId: propSteamId }) => {
  const [matchTypes, setMatchTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('matchhistorypremier');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [userSteamId, setUserSteamId] = useState(propSteamId || null);
  const [fetchingSteamId, setFetchingSteamId] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualHtml, setManualHtml] = useState('');

  // Get Steam ID from props, API, or localStorage
  useEffect(() => {
    const fetchUserSteamId = async () => {
      if (propSteamId) {
        setUserSteamId(propSteamId);
        return;
      }

      // Try to get from localStorage first
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user?.steamId) {
          setUserSteamId(user.steamId);
          return;
        }
      } catch (err) {
        console.error('Failed to get user from localStorage:', err);
      }

      // If not in localStorage, fetch from API
      try {
        setFetchingSteamId(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please login to view match history');
          return;
        }

        const response = await axios.get(`${API_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success && response.data.user?.steamId) {
          setUserSteamId(response.data.user.steamId);
          // Save to localStorage for future use
          localStorage.setItem('user', JSON.stringify(response.data.user));
        } else {
          setError('Steam ID not found. Please link your Steam account.');
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setError('Please login to view match history');
      } finally {
        setFetchingSteamId(false);
      }
    };

    fetchUserSteamId();
  }, [propSteamId]);

  // Load available match types
  useEffect(() => {
    loadMatchTypes();
  }, []);

  const loadMatchTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cs2/steam-history/match-types`);
      if (response.data.success) {
        setMatchTypes(response.data.types);
      }
    } catch (err) {
      console.error('Failed to load match types:', err);
    }
  };

  const fetchMatchHistory = async () => {
    setLoading(true);
    setError(null);
    setMatches([]);
    setSyncResult(null);

    try {
      // Check if we have Steam ID
      if (!userSteamId) {
        throw new Error('Steam ID not found. Please login with Steam first.');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please login.');
      }

      // Open Steam page in new tab
      const steamUrl = `https://steamcommunity.com/profiles/${userSteamId}/gcpd/730/?tab=${selectedType}`;
      
      throw new Error(
        `Due to Steam's security restrictions, automatic fetching is not possible. ` +
        `Please:\n\n` +
        `1. Open this URL in a new tab: ${steamUrl}\n` +
        `2. Make sure you're logged into Steam\n` +
        `3. Right-click on the page → View Page Source (Ctrl+U)\n` +
        `4. Copy all the HTML (Ctrl+A, Ctrl+C)\n` +
        `5. Click "Manual Input" below and paste the HTML`
      );

      // Parse the HTML
      const parseResponse = await axios.post(
        `${API_URL}/api/cs2/steam-history/parse`,
        {
          html: fetchResponse.data.html,
          tab: selectedType
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (parseResponse.data.success) {
        setMatches(parseResponse.data.matches);
      } else {
        setError(parseResponse.data.error || 'Failed to parse match history');
      }

    } catch (err) {
      console.error('Error fetching match history:', err);
      setError(err.message || 'Failed to fetch match history');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Parse manually pasted HTML
   */
  const parseManualHtml = async () => {
    if (!manualHtml.trim()) {
      setError('Please paste the HTML content');
      return;
    }

    setLoading(true);
    setError(null);
    setMatches([]);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please login.');
      }

      const parseResponse = await axios.post(
        `${API_URL}/api/cs2/steam-history/parse`,
        {
          html: manualHtml,
          tab: selectedType
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (parseResponse.data.success) {
        setMatches(parseResponse.data.matches);
        setShowManualInput(false);
        setManualHtml('');
      } else {
        setError(parseResponse.data.error || 'Failed to parse match history');
      }
    } catch (err) {
      console.error('Error parsing manual HTML:', err);
      setError(err.response?.data?.error || err.message || 'Failed to parse HTML');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sync matches to database
   */
  const syncMatches = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      // Check if we have Steam ID
      if (!userSteamId) {
        throw new Error('Steam ID not found. Please login with Steam first.');
      }

      if (!manualHtml.trim()) {
        const steamUrl = `https://steamcommunity.com/profiles/${userSteamId}/gcpd/730/?tab=${selectedType}`;
        throw new Error(
          `Please use Manual Input mode to sync matches. Open: ${steamUrl}`
        );
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please login.');
      }

      // Sync to database
      const syncResponse = await axios.post(
        `${API_URL}/api/cs2/steam-history/sync`,
        {
          html: manualHtml,
          tab: selectedType
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (syncResponse.data.success) {
        setSyncResult(syncResponse.data);
      } else {
        setError(syncResponse.data.error || 'Failed to sync matches');
      }

    } catch (err) {
      console.error('Error syncing matches:', err);
      setError(err.message || 'Failed to sync matches');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="steam-match-history">
      <div className="header">
        <h2>CS2 Match History from Steam</h2>
        {userSteamId ? (
          <p className="info">
            <small>Steam ID: {userSteamId}</small>
          </p>
        ) : (
          <p className="info error">
            ⚠️ Steam ID not found. Please make sure you are logged in.
          </p>
        )}
      </div>

      <div className="controls">
        <div className="control-group">
          <label htmlFor="matchType">Match Type:</label>
          <select
            id="matchType"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            disabled={loading || syncing}
          >
            {matchTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="button-group">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            disabled={loading || syncing || !userSteamId}
            className="btn btn-secondary"
          >
            {showManualInput ? '✕ Close Manual Input' : '📝 Manual Input'}
          </button>

          <button
            onClick={syncMatches}
            disabled={loading || syncing || !userSteamId || !manualHtml.trim()}
            className="btn btn-success"
          >
            {syncing ? 'Syncing...' : 'Sync to Database'}
          </button>
        </div>
      </div>

      {showManualInput && (
        <div className="manual-input-section">
          <div className="instructions">
            <h3>📋 How to get match history HTML:</h3>
            <ol>
              <li>
                Open Steam page: <a 
                  href={`https://steamcommunity.com/profiles/${userSteamId}/gcpd/730/?tab=${selectedType}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Click here to open in new tab
                </a>
              </li>
              <li>Make sure you're logged into Steam Community</li>
              <li>Right-click on the page → <strong>View Page Source</strong> (or press <kbd>Ctrl+U</kbd>)</li>
              <li>Select all HTML (<kbd>Ctrl+A</kbd>) and copy it (<kbd>Ctrl+C</kbd>)</li>
              <li>Paste the HTML in the box below and click "Parse HTML"</li>
            </ol>
          </div>
          <textarea
            className="html-input"
            placeholder="Paste Steam Community page HTML here..."
            value={manualHtml}
            onChange={(e) => setManualHtml(e.target.value)}
            rows={10}
          />
          <div className="button-group">
            <button
              onClick={parseManualHtml}
              disabled={loading || !manualHtml.trim()}
              className="btn btn-primary"
            >
              {loading ? 'Parsing...' : 'Parse HTML'}
            </button>
            <button
              onClick={() => setManualHtml('')}
              disabled={loading}
              className="btn btn-secondary"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> <pre style={{whiteSpace: 'pre-wrap'}}>{error}</pre>
        </div>
      )}

      {syncResult && (
        <div className="alert alert-success">
          <strong>Sync Complete!</strong>
          <ul>
            <li>Saved: {syncResult.saved} matches</li>
            <li>Skipped: {syncResult.skipped} matches (duplicates)</li>
            {syncResult.errors > 0 && <li>Errors: {syncResult.errors}</li>}
          </ul>
        </div>
      )}

      {matches.length > 0 && (
        <div className="matches-container">
          <h3>Found {matches.length} Matches</h3>
          <div className="matches-list">
            {matches.map((match, index) => (
              <div key={index} className={`match-card ${match.result}`}>
                <div className="match-header">
                  <div className="map-info">
                    {match.mapImage && (
                      <img src={match.mapImage} alt={match.mapName} className="map-image" />
                    )}
                    <span className="map-name">{match.mapName}</span>
                  </div>
                  <div className="match-result">
                    <span className={`result-badge ${match.result}`}>
                      {match.result === 'win' ? '✓ WIN' : match.result === 'loss' ? '✗ LOSS' : '?'}
                    </span>
                  </div>
                </div>

                <div className="match-info">
                  <div className="info-item">
                    <strong>Score:</strong> {match.teamAScore} : {match.teamBScore}
                  </div>
                  <div className="info-item">
                    <strong>Date:</strong> {new Date(match.date).toLocaleString()}
                  </div>
                  {match.duration && (
                    <div className="info-item">
                      <strong>Duration:</strong> {match.duration}
                    </div>
                  )}
                  {match.ranked !== undefined && (
                    <div className="info-item">
                      <strong>Ranked:</strong> {match.ranked ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                {match.userStats && (
                  <div className="user-stats">
                    <h4>Your Stats</h4>
                    <div className="stats-grid">
                      <div className="stat">
                        <span className="stat-label">K/D/A</span>
                        <span className="stat-value">
                          {match.userStats.kills}/{match.userStats.deaths}/{match.userStats.assists}
                        </span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Score</span>
                        <span className="stat-value">{match.userStats.score}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">MVPs</span>
                        <span className="stat-value">{match.userStats.mvps}</span>
                      </div>
                      {match.userStats.headshotPercentage && (
                        <div className="stat">
                          <span className="stat-label">HS%</span>
                          <span className="stat-value">{match.userStats.headshotPercentage.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="players-section">
                  <h4>Players ({match.players.length})</h4>
                  <div className="players-grid">
                    {match.players.map((player, pIndex) => (
                      <div key={pIndex} className="player-item">
                        {player.avatarUrl && (
                          <img src={player.avatarUrl} alt={player.nickname} className="player-avatar" />
                        )}
                        <div className="player-info">
                          <span className="player-name">{player.nickname}</span>
                          <span className="player-stats">
                            {player.kills}/{player.deaths}/{player.assists}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SteamMatchHistory;
