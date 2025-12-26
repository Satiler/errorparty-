/**
 * HLS Proxy Service
 * Handles proxying HLS manifests and segments from VK with proper headers
 */

const axios = require('axios');
const { URL } = require('url');

const VK_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://vk.com/',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Origin': 'https://vk.com',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site'
};

class HlsProxyService {
  /**
   * Fetch HLS manifest and rewrite URLs to go through proxy
   */
  async fetchAndRewriteManifest(manifestUrl, trackId, baseProxyUrl) {
    try {
      console.log(`[HLS] Fetching manifest: ${manifestUrl.substring(0, 80)}...`);
      
      const response = await axios.get(manifestUrl, {
        headers: VK_HEADERS,
        timeout: 15000
      });
      
      let manifestContent = response.data;
      
      // Parse manifest to rewrite segment URLs
      if (typeof manifestContent === 'string') {
        const lines = manifestContent.split('\n');
        const rewrittenLines = lines.map(line => {
          // Rewrite relative and absolute URLs for segments
          if (line && !line.startsWith('#') && (line.includes('.ts') || line.includes('index'))) {
            try {
              // Parse the URL - could be relative or absolute
              const segmentUrl = new URL(line, manifestUrl).toString();
              // Replace with proxy endpoint
              return `${baseProxyUrl}/hls-segment?url=${encodeURIComponent(segmentUrl)}&trackId=${trackId}`;
            } catch (e) {
              console.warn(`[HLS] Failed to rewrite line: ${line}`, e.message);
              return line;
            }
          }
          return line;
        });
        
        manifestContent = rewrittenLines.join('\n');
      }
      
      console.log(`[HLS] Manifest rewritten successfully (${manifestContent.length} bytes)`);
      return manifestContent;
      
    } catch (error) {
      console.error(`[HLS] Failed to fetch manifest: ${error.message}`);
      throw new Error(`HLS manifest fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch HLS segment with VK headers
   */
  async fetchSegment(segmentUrl) {
    try {
      console.log(`[HLS] Fetching segment: ${segmentUrl.substring(0, 60)}...`);
      
      const response = await axios.get(segmentUrl, {
        headers: VK_HEADERS,
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      return {
        data: response.data,
        contentType: response.headers['content-type'] || 'video/mp2t',
        contentLength: response.data.length
      };
      
    } catch (error) {
      if (error.response?.status === 403) {
        console.error(`[HLS] 403 Forbidden for segment (URL may have expired)`);
        throw new Error('HLS segment access denied - URL may have expired');
      }
      console.error(`[HLS] Failed to fetch segment: ${error.message}`);
      throw new Error(`HLS segment fetch failed: ${error.message}`);
    }
  }

  /**
   * Check if URL is HLS manifest
   */
  isHlsUrl(url) {
    return url && (url.includes('.m3u8') || url.includes('m3u8'));
  }

  /**
   * Check if URL is HLS segment
   */
  isHlsSegment(url) {
    return url && (url.includes('.ts') || url.includes('segment'));
  }
}

module.exports = new HlsProxyService();
