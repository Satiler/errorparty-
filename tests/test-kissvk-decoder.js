/**
 * Test KissVK Decoder v5 - BRUTE FORCE ALL METHODS
 */

const VKAudioDecoder = require('./src/utils/vk-audio-decoder-v5.js');

// Real example from kissvk.top HTML
const testData = [
  {
    title: 'Жиганская - Jakone, Kiliana',
    encodedAudio: 'OYPlGgqyPWiNN3HSEmYgJxg4d4T11lTjLBcG586GIg32q/kDeyZ6IoKRiaycmsH79fm8mUhdFmeS2hK/gfbTi1D7aXzcoclgd72ySTut/FAR+cdcquk0lS9vjTjJLBK8d/XRl+kHOXH0jy3xaz7tpnysPpkeK+H9XvvIoDOvoRkuypE9e0MQeEVQ8njh8E0rsWbOUuz7bywM9QzVaY5hDhyq1P40gQXVyiPTnIGNKyjf1w0MsHtQEFp6DMfCOIgPuiR3HOmXDnFAP364fFAdfGaZaF1BmvuLQwsdEwGRa/ng3RarRXOspcQhf8xcrNMQ6kr1ZhUKhFG+DGJFSQqHQw==:8c0710879a6330472f5767b317458964:97c414a94e374461'
  },
  {
    title: 'БАНК - ICEGERGERT, Zivert',
    encodedAudio: 'viTDQh+fbRtCHSlWSnRP6yD89PV320WM6wfY4yr7NN9HIAFmYN6NwldTqzjxt+/lvG8pwmy1IeA8hpQVnbgbWR0KHjF2OrLyxOQaPP541AJua77q8iFeVou0GaTRNiAvBHXmCzdT5Ct0mpMhWfgFXqCMqxs56w0KmqsJ4L996aSPqgZ7XwNc8EOwVWcoyFZ+t/GFD0bb3oY/R/pz6cDQxWlNyTXpQz1mthCdTZUgPO6L8abp/phnlsYHLypP9EIaOYTGMC68Y5S95r8RXYxqFor6p/hVrBd4cr6y0HQNgvRFZAFbcL147OORo/p0P0E0ORyUPRYS/8QBsQAaG8uVGw==:7b03a3e902f567bfc4a0231373a3baa7:bf59e5517401ecec'
  },
  {
    title: 'ТА4ТО REMIX 2025 - STXPNXY',
    encodedAudio: 'FS+hw0pWOj2z+954gNIxuVrnYM8B8PVn8CrTMfYW1DvAaYHl14+zeRSQZfqXwMrviOlJAcqx+VwK1VLzJNIuByVHDSdNtmg31ysUq1tyfwlnVC4CH2foN/QwStLqj0LZXVCqzCKb04LYj+uS+mTFjZqGeCdM6BFTMoEAh+mLXUOIPo3cgXHwgSUnrtdvTBz63CeGd5pFURqppD7/uu5V0PVayzOktE8qqfXHU98luMUYyOVbQzhguy52zvbUuwFW7uEE7EBiGbyvcxuap0jTDwGZDFJNs2utlaqIgmwvhlAUsd0wpUn8ktIqkMs37mRoicNp09jn9gNjXYrNAbd1PQ==:d0ad9fe17a57e2981d66f09a839adca2:d5c99fc50c4f083f'
  }
];

console.log('Testing KissVK Audio Decoder...\n');

let successCount = 0;
let failCount = 0;

testData.forEach((track, index) => {
  console.log(`\n--- Test ${index + 1}: ${track.title} ---`);
  console.log(`Encoded: ${track.encodedAudio.substring(0, 80)}...`);
  
  const result = VKAudioDecoder.decryptVKAudio(track.encodedAudio);
  
  if (result) {
    console.log(`✓ SUCCESS: ${result}`);
    successCount++;
  } else {
    console.log(`✗ FAILED: Could not decrypt`);
    failCount++;
  }
});

console.log(`\n\n=== SUMMARY ===`);
console.log(`Success: ${successCount}/${testData.length}`);
console.log(`Failed: ${failCount}/${testData.length}`);
console.log(`Success Rate: ${((successCount / testData.length) * 100).toFixed(1)}%`);
