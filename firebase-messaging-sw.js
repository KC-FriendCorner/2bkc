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

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

/**
 * ปรับปรุงส่วนนี้เพื่อกันการเด้งซ้ำ
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background Message Received:', payload);

  // 1. ถ้า FCM ส่ง 'notification' มาด้วย เบราว์เซอร์ส่วนใหญ่จะจัดการเด้งให้เองอัตโนมัติ
  // หากเราสั่ง showNotification ซ้ำในนี้ มันจะกลายเป็น 2 อันทันที
  // เราจะสั่ง showNotification เองเฉพาะในกรณีที่ payload.notification ไม่มีค่า (ส่งแบบ data-only)
  if (payload.notification) {
    console.log('[SW] Browser will handle notification display.');
    return; 
  }

  // 2. กรณีส่งมาเฉพาะ 'data' (Data-only messages) เราถึงจะสั่งเด้งเอง
  const notificationTitle = payload.data?.title || "📢 ข่าวใหม่จาก 2BKC!";
  const notificationOptions = {
    body: payload.data?.body || "กดเพื่ออ่านรายละเอียดเพิ่มเติม",
    icon: payload.data?.icon || '/img/2bkc.jpg',
    badge: '/img/2bkc.jpg',
    // การใส่ Tag เดียวกันจะช่วยให้แจ้งเตือนที่ส่งมาพร้อมกันทับกันเอง ไม่เด้งแยก
    tag: 'bkc-news-sync', 
    renotify: true,
    data: {
      link: payload.data?.link || '/#news'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * ส่วนจัดการคลิก (คงเดิมแต่เพิ่มความเสถียร)
 */
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // ป้องกัน Error กรณี link ไม่มีค่า
  const relativeUrl = event.notification.data?.link || '/#news';
  const targetUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(targetUrl).then(c => c.focus());
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});