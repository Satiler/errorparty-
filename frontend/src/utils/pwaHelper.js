/**
 * PWA Helper - Service Worker and Push Notifications
 */

import { getApiUrl } from './apiConfig';

const API_URL = getApiUrl();

/**
 * Register Service Worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    // Сначала удалить все старые регистрации
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of existingRegistrations) {
      await registration.unregister();
      console.log('🗑️ Removed old SW:', registration.scope);
    }

    // Очистить все кеши
    const cacheNames = await caches.keys();
    for (let cacheName of cacheNames) {
      await caches.delete(cacheName);
      console.log('🗑️ Deleted cache:', cacheName);
    }

    // Небольшая задержка перед регистрацией нового
    await new Promise(resolve => setTimeout(resolve, 500));

    // Зарегистрировать новый Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    console.log('✅ Service Worker registered:', registration);

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister Service Worker
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.unregister();
    console.log('✅ Service Worker unregistered');
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('📢 Notification permission:', permission);
  return permission;
}

/**
 * Get VAPID public key from server
 */
async function getVapidPublicKey() {
  try {
    const response = await fetch(`${API_URL}/notifications/vapid-public-key`);
    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('Failed to get VAPID key:', error);
    return null;
  }
}

/**
 * Convert base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications() {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications not supported');
    return { success: false, error: 'Not supported' };
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Permission denied' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      return { success: false, error: 'Failed to get VAPID key' };
    }

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('✅ Push subscription created:', subscription);

    // Send subscription to server
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ subscription })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Push subscription saved to server');
      return { success: true, subscription };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications() {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Not supported' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('✅ Push subscription removed');
    }

    // Remove from server
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return { success: data.success };
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check subscription status
 */
export async function getPushSubscriptionStatus() {
  if (!isPushNotificationSupported()) {
    return { supported: false, subscribed: false };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return {
      supported: true,
      subscribed: !!subscription,
      permission: Notification.permission
    };
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return { supported: true, subscribed: false, permission: 'default' };
  }
}

/**
 * Send test notification
 */
export async function sendTestNotification() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return { success: data.success };
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if app is installed (PWA)
 */
export function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Show install prompt
 */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('💡 Install prompt available');
});

export async function showInstallPrompt() {
  if (!deferredPrompt) {
    return { success: false, error: 'Install prompt not available' };
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`User response to install prompt: ${outcome}`);
  deferredPrompt = null;

  return { success: outcome === 'accepted' };
}

export function isInstallPromptAvailable() {
  return !!deferredPrompt;
}
