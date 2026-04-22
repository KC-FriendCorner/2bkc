async function initNotification() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
        return;
    }

    const messaging = firebase.messaging();
    const database = firebase.database();

    try {
        // 1. รอให้ Service Worker พร้อม (ตัวนี้ช่วยแก้ AbortError)
        const registration = await navigator.serviceWorker.ready;
        console.log('Service Worker พร้อมใช้งานแล้ว:', registration.scope);

        // 2. ขอสิทธิ์
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            // 3. ดึง Token
            const token = await messaging.getToken({
                serviceWorkerRegistration: registration // ระบุลงไปเลยว่าใช้ registration ตัวนี้
            });

            if (token) {
                console.log('Token ปัจจุบัน:', token);
                await saveTokenToDatabase(token);
            }
        }

    } catch (err) {
        console.error('เกิดข้อผิดพลาดในระบบแจ้งเตือน:', err);
    }

    /**
     * ฟังก์ชันย่อยสำหรับบันทึก Token ลง Database
     */
    async function saveTokenToDatabase(token) {
        // ใช้การ replace จุดด้วยขีดล่างเพื่อให้ Key ใน Realtime Database ไม่พัง
        const safeToken = token.replace(/\./g, '_');
        
        try {
            await database.ref(`fcm_tokens/${safeToken}`).set({
                token: token,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                device: navigator.userAgent // เก็บไว้เช็กเผื่อต้อง Debug ว่าเครื่องรุ่นไหน
            });
            console.log('บันทึก Token ลงระบบสำเร็จ');
        } catch (dbErr) {
            console.error('บันทึก Token ลง Database ไม่สำเร็จ:', dbErr);
        }
    }
}

// เรียกใช้งาน
initNotification();