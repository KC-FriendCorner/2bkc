importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyDi_0wqnyZ8AChvTXguj3Xwv07jEW7TOok",
  authDomain: "bkc-bc48f.firebaseapp.com",
  databaseURL: "https://bkc-bc48f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bkc-bc48f",
  storageBucket: "bkc-bc48f.firebasestorage.app",
  messagingSenderId: "486986521782",
  appId: "1:486986521782:web:da67a6a47d6f01b98e9a17"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/**
 * 1. ช่วยให้ Service Worker ตัวใหม่ทำงานทันทีที่มีการอัปเดต (สำคัญมากสำหรับ PWA)
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

/**
 * 2. จัดการรับข้อความเมื่อแอปอยู่เบื้องหลัง (Background Message)
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background Message:', payload);

  // ดึงค่าจากทั้ง notification และ data (เผื่อกรณีส่งแบบ Data-only)
  const notificationTitle = payload.notification?.title || payload.data?.title || "📢 ข่าวใหม่จาก 2BKC!";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "กดเพื่ออ่านรายละเอียดเพิ่มเติม",
    icon: payload.notification?.icon || payload.data?.icon || '/img/2bkc.jpg',
    badge: '/img/2bkc.jpg', // ไอคอนขนาดเล็กบน Status Bar (Android)
    tag: 'bkc-news-notification', // ป้องกันการเด้งซ้ำซ้อนถ้าเป็นหัวข้อเดียวกัน
    renotify: true,
    data: {
      // รวมทุกช่องทางที่ลิงก์อาจจะส่งมา
      link: payload.data?.link || payload.notification?.click_action || '/#news'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * 3. จัดการการคลิกแจ้งเตือน
 */
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // ดึง Link ที่แนบมา หรือ Default ไปหน้าข่าว
  const targetUrl = new URL(event.notification.data?.link || '/#news', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 1. ถ้ามี Tab เปิดอยู่แล้ว (ไม่ว่าจะหน้าไหน)
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // ถ้าเป็น Tab เดิม ให้เปลี่ยน URL และ Focus
          return client.navigate(targetUrl).then(c => c.focus());
        }
      }
      // 2. ถ้าไม่มี Tab เปิดอยู่เลย ให้เปิดหน้าใหม่แบบ Standalone (โหมด PWA)
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});