/**
 * Example: How to integrate Steam Match History into your app
 * 
 * This shows different ways to use the feature
 */

import React, { useState } from 'react';
import axios from 'axios';
import SteamMatchHistory from './components/SteamMatchHistory';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ============================================================
// Example 1: Simple Integration - Just add the component
// ============================================================

function ProfilePage() {
  return (
    <div className="profile-page">
      <h1>My CS2 Profile</h1>
      
      {/* Just add the component - it handles everything */}
      <SteamMatchHistory />
    </div>
  );
}

// ============================================================
// Example 2: Custom Implementation - Full control
// ============================================================

function CustomMatchHistory() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMatches = async () => {
    setLoading(true);
    
    try {
      // Get user from localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      
      if (!user?.steamId) {
        throw new Error('Steam ID not found');
      }

      // Fetch HTML from Steam (user must be logged in)
      const steamUrl = `https://steamcommunity.com/profiles/${user.steamId}/gcpd/730/?tab=matchhistorypremier`;
      const htmlResponse = await fetch(steamUrl, {
        credentials: 'include'
      });
      
      if (!htmlResponse.ok) {
        throw new Error('Failed to fetch from Steam. Make sure you are logged in.');
      }

      const html = await htmlResponse.text();

      // Send to backend for parsing
      const result = await axios.post(
        `${API_URL}/api/cs2/steam-history/parse`,
        { html, tab: 'matchhistorypremier' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (result.data.success) {
        setMatches(result.data.matches);
      }

    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={fetchMatches} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch My Matches'}
      </button>

      <div>
        {matches.map((match, i) => (
          <div key={i}>
            <h3>{match.mapName}</h3>
            <p>Score: {match.teamAScore} : {match.teamBScore}</p>
            <p>Result: {match.result}</p>
            {match.userStats && (
              <p>
                K/D/A: {match.userStats.kills}/{match.userStats.deaths}/{match.userStats.assists}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Example 3: Auto-Sync on Page Load
// ============================================================

function AutoSyncProfile() {
  const [syncStatus, setSyncStatus] = useState(null);

  React.useEffect(() => {
    // Auto-sync matches when user visits profile
    syncMatchesInBackground();
  }, []);

  const syncMatchesInBackground = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');

      if (!user?.steamId || !token) return;

      const steamUrl = `https://steamcommunity.com/profiles/${user.steamId}/gcpd/730/?tab=matchhistorypremier`;
      const htmlResponse = await fetch(steamUrl, {
        credentials: 'include'
      });

      if (!htmlResponse.ok) return;

      const html = await htmlResponse.text();

      // Sync to database
      const result = await axios.post(
        `${API_URL}/api/cs2/steam-history/sync`,
        { html, tab: 'matchhistorypremier' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (result.data.success) {
        setSyncStatus(`Synced ${result.data.saved} new matches`);
      }

    } catch (error) {
      console.error('Background sync error:', error);
    }
  };

  return (
    <div>
      <h1>Profile</h1>
      {syncStatus && <p>✅ {syncStatus}</p>}
      {/* Your profile content */}
    </div>
  );
}

// ============================================================
// Example 4: Backend API Usage (from other services)
// ============================================================

async function exampleBackendUsage() {
  const steamMatchHistoryService = require('./services/steamMatchHistoryService');
  const { User, CS2Match } = require('./models');

  // Example: Manual sync for a user
  async function syncUserMatches(userId, html) {
    const user = await User.findByPk(userId);
    
    if (!user?.steamId) {
      throw new Error('User has no Steam ID');
    }

    // Parse HTML
    const result = steamMatchHistoryService.parseMatchHistoryHTML(html, user.steamId);

    if (!result.success) {
      throw new Error(result.error);
    }

    // Save matches
    let saved = 0;
    for (const match of result.matches) {
      if (!match.userStats) continue;

      // Check if exists
      const exists = await CS2Match.findOne({
        where: {
          userId,
          playedAt: match.date,
          mapName: match.mapName
        }
      });

      if (exists) continue;

      // Create new match
      await CS2Match.create({
        userId,
        playedAt: match.date,
        mapName: match.mapName,
        isWin: match.result === 'win',
        kills: match.userStats.kills,
        deaths: match.userStats.deaths,
        assists: match.userStats.assists,
        mvps: match.userStats.mvps,
        score: match.userStats.score,
        headshotPercentage: match.userStats.headshotPercentage
      });

      saved++;
    }

    return { saved, total: result.matches.length };
  }

  // Example: Get match types for dropdown
  function getMatchTypesForUI() {
    const types = steamMatchHistoryService.getAvailableMatchTypes();
    return types.map(t => ({
      value: t.id,
      label: t.name
    }));
  }

  return { syncUserMatches, getMatchTypesForUI };
}

// ============================================================
// Example 5: Advanced - Multiple Match Types
// ============================================================

function AdvancedMatchHistory() {
  const [selectedType, setSelectedType] = useState('matchhistorypremier');
  const [matchTypes, setMatchTypes] = useState([]);
  const [matches, setMatches] = useState([]);

  React.useEffect(() => {
    // Load match types
    axios.get(`${API_URL}/api/cs2/steam-history/match-types`)
      .then(res => {
        if (res.data.success) {
          setMatchTypes(res.data.types);
        }
      });
  }, []);

  const fetchMatchesForType = async (type) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    const steamUrl = `https://steamcommunity.com/profiles/${user.steamId}/gcpd/730/?tab=${type}`;
    const htmlResponse = await fetch(steamUrl, { credentials: 'include' });
    const html = await htmlResponse.text();

    const result = await axios.post(
      `${API_URL}/api/cs2/steam-history/parse`,
      { html, tab: type },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (result.data.success) {
      setMatches(result.data.matches);
    }
  };

  return (
    <div>
      <select 
        value={selectedType}
        onChange={(e) => {
          setSelectedType(e.target.value);
          fetchMatchesForType(e.target.value);
        }}
      >
        {matchTypes.map(type => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
      </select>

      <div>
        {matches.map((match, i) => (
          <div key={i}>
            <h4>{match.mapName}</h4>
            <p>{match.result === 'win' ? '✅ WIN' : '❌ LOSS'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Example 6: Statistics Dashboard
// ============================================================

function MatchStatistics() {
  const [stats, setStats] = useState(null);

  React.useEffect(() => {
    calculateStats();
  }, []);

  const calculateStats = async () => {
    // Fetch matches from database or parse fresh
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    const steamUrl = `https://steamcommunity.com/profiles/${user.steamId}/gcpd/730/?tab=matchhistorypremier`;
    const htmlResponse = await fetch(steamUrl, { credentials: 'include' });
    const html = await htmlResponse.text();

    const result = await axios.post(
      `${API_URL}/api/cs2/steam-history/parse`,
      { html, tab: 'matchhistorypremier' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (result.data.success) {
      const matches = result.data.matches;
      
      // Calculate statistics
      const wins = matches.filter(m => m.result === 'win').length;
      const losses = matches.filter(m => m.result === 'loss').length;
      const totalKills = matches.reduce((sum, m) => sum + (m.userStats?.kills || 0), 0);
      const totalDeaths = matches.reduce((sum, m) => sum + (m.userStats?.deaths || 0), 0);
      const avgHS = matches.reduce((sum, m) => sum + (m.userStats?.headshotPercentage || 0), 0) / matches.length;

      setStats({
        totalMatches: matches.length,
        wins,
        losses,
        winRate: ((wins / (wins + losses)) * 100).toFixed(1),
        kd: (totalKills / totalDeaths).toFixed(2),
        avgHeadshot: avgHS.toFixed(1)
      });
    }
  };

  return (
    <div>
      <h2>Your Statistics</h2>
      {stats && (
        <div>
          <p>Total Matches: {stats.totalMatches}</p>
          <p>Wins: {stats.wins} | Losses: {stats.losses}</p>
          <p>Win Rate: {stats.winRate}%</p>
          <p>K/D Ratio: {stats.kd}</p>
          <p>Avg Headshot: {stats.avgHeadshot}%</p>
        </div>
      )}
    </div>
  );
}

// Export all examples
export {
  ProfilePage,
  CustomMatchHistory,
  AutoSyncProfile,
  exampleBackendUsage,
  AdvancedMatchHistory,
  MatchStatistics
};
