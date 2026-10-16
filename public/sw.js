// PATS Task Manager Service Worker for Desktop, Website, and Mobile Downloaded View (PWA)
// Works even when the app is completely closed, minimized, or phone screen is locked.
const CACHE_NAME = 'pats-cache-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up older caches if any
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

// 🔔 Handle Background Push Events delivered by FCM / Web Push
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'New Task Assigned • PATS Service Desk',
        body: event.data.text()
      };
    }
  }

  const taskId = data.taskId;
  const isPriority = !!data.is_priority;
  const title = data.title || (isPriority ? '🚨 High Priority Task Assigned • PATS Desk' : 'New Task Assigned • PATS Service Desk');
  const body = data.body || 'A service repair ticket has been assigned to you.';

  // Heads-up floating notification configuration for Desktop, Android PWA & Web view
  const options = {
    body: body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    // High-impact vibration pattern: buzz-pause-buzz-pause-long buzz
    vibrate: isPriority ? [500, 150, 500, 150, 800] : [400, 150, 400, 150, 600],
    tag: taskId ? `pats-task-${taskId}` : `pats-alert-${Date.now()}`,
    renotify: true,
    requireInteraction: true, // Crucial: Prompts Android to show heads-up banner & keeps desktop alert visible
    silent: false,
    timestamp: Date.now(),
    data: {
      taskId: taskId,
      url: taskId ? `/?taskId=${taskId}&action=open` : '/',
      assignedAt: Date.now(),
      isPriority: isPriority
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

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Broadcast real-time message to any open tabs/windows so UI updates immediately without waiting for poll
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PATS_PUSH_RECEIVED',
            data: {
              taskId: taskId,
              title: title,
              body: body,
              isPriority: isPriority
            }
          });
        });
      })
    ])
  );
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
      // 1. If an app window is already open, focus it and post direct message to open task
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

// Allow client pages to trigger background notification display via Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    if (self.registration && self.registration.showNotification) {
      event.waitUntil(self.registration.showNotification(title, options));
    }
  }
});
