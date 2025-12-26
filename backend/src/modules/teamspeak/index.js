/**
 * TeamSpeak Module
 * Интеграция с TeamSpeak 3 сервером
 */
const teamspeakRoutes = require('./teamspeak.routes');
const teamspeakService = require('../../services/teamspeakService');

module.exports = {
  name: 'teamspeak',
  routePrefix: '/api/teamspeak',
  routes: teamspeakRoutes,

  /**
   * Initialize TeamSpeak module
   */
  async initialize(app, io) {
    if (!process.env.TS_HOST) {
      console.log('  ⚠️  TeamSpeak disabled (no TS_HOST)');
      return;
    }

    console.log('  🎙️  TeamSpeak module ready');
    
    // Setup Socket.IO events for TeamSpeak updates
    if (io) {
      // Forward TeamSpeak events to Socket.IO
      teamspeakService.on('clientConnect', (client) => {
        io.emit('teamspeak:join', client);
      });

      teamspeakService.on('clientDisconnect', (client) => {
        io.emit('teamspeak:leave', client);
      });

      teamspeakService.on('clientMoved', (client) => {
        io.emit('teamspeak:move', client);
      });

      teamspeakService.on('channelCreate', (channel) => {
        io.emit('teamspeak:channel:create', channel);
      });

      teamspeakService.on('channelDelete', (channel) => {
        io.emit('teamspeak:channel:delete', channel);
      });
    }

    this.io = io;
    this.service = teamspeakService;
  },

  /**
   * Get TeamSpeak service instance
   */
  getService() {
    return this.service;
  }
};
