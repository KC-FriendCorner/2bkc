importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
    messagingSenderId: "486986521782" 
});

const messaging = firebase.messaging();

// จัดการเมื่อกดที่แถบแจ้งเตือน
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/#news')
    );
});