// PATS Task Manager Service Worker for Android PWA and Background Push Notifications
// Works even when the app is completely closed, minimized, or phone screen is locked.
const CACHE_NAME = 'pats-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 🔔 Handle Background Push Events delivered by FCM / Web Push
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'New Task Assigned',
        body: event.data.text()
      };
    }
  }

  const taskId = data.taskId;
  const title = data.title || 'New Task Assigned • PATS Service Desk';
  const body = data.body || 'A new service repair ticket has been assigned to you.';

  // Heads-up floating notification configuration for modern & older Android devices
  const options = {
    body: body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    // High-energy vibration pattern designed for both older and modern Android vibrator motors
    vibrate: [400, 150, 400, 150, 600],
    tag: taskId ? `pats-task-${taskId}` : `pats-task-${Date.now()}`,
    renotify: true,
    requireInteraction: true, // Prompts Android to show heads-up banner
    silent: false,
    timestamp: Date.now(),
    data: {
      taskId: taskId,
      url: taskId ? `/?taskId=${taskId}&action=open` : '/',
      assignedAt: Date.now()
    },
    actions: [
      {
        action: 'open_task',
        title: 'Open Ticket'
      },
      {
        action: 'dismiss_task',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 👆 Handle user tapping on the notification banner or action buttons
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // If user clicked Dismiss action, do nothing further
  if (event.action === 'dismiss_task') {
    return;
  }

  const notificationData = event.notification.data || {};
  const taskId = notificationData.taskId;
  const targetUrl = taskId ? `/?taskId=${taskId}&action=open` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an app window is already open, focus it and post a direct message to navigate/accept
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient && 'postMessage' in focusedClient) {
              focusedClient.postMessage({
                type: 'PATS_OPEN_TASK',
                taskId: taskId
              });
            }
          });
        }
      }

      // 2. If app was completely closed, open a fresh window directly to the task
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Optional periodic sync handler if supported by older/modern Android Chromium
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'pats-check-tasks') {
    event.waitUntil(
      fetch('/api/sync')
        .then((r) => r.json())
        .catch(() => null)
    );
  }
});
