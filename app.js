function setupNotifications() {
    const messaging = firebase.messaging();
    const database = firebase.database();

    messaging.requestPermission()
        .then(() => {
            console.log('Permission granted!');
            return messaging.getToken();
        })
        .then((token) => {
            if (token) {
                console.log('User Token:', token);
                // เก็บ Token ลงใน Database ที่พาธ /fcm_tokens
                // ใช้ token เป็น key (ตัดจุดออกเพราะ DB ไม่ยอมรับจุดใน Key)
                const safeToken = token.replace(/\./g, '_');
                database.ref('fcm_tokens/' + safeToken).set({
                    token: token,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            }
        })
        .catch((err) => {
            console.log('Unable to get permission:', err);
        });
}

// เรียกใช้งานเมื่อโหลดหน้าเว็บ หรือเมื่อผู้ใช้กดปุ่ม "เปิดแจ้งเตือน"
// setupNotifications();