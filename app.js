/**
 * 2BKC Notification System - Self-Healing Production Version
 */

// ดึงค่าจาก Environment Variable ที่ตั้งไว้ใน Vercel
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;

const isOnline = () => navigator.onLine;

/**
 * 1. ลงทะเบียน Service Worker
 */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((registration) => {
        console.log("✅ SW Registered:", registration.scope);
      })
      .catch((error) => {
        console.error("❌ SW Registration Failed:", error);
      });
  });
}

/**
 * 2. ฟังก์ชันตรวจสอบและซ่อมแซม Token (The Repair Core)
 */
async function forceSyncToken() {
  if (!isOnline()) return;

  // ตรวจสอบว่า Browser รองรับและยอมรับ Permission หรือยัง
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const messaging = firebase.messaging();

    // ดึง Token ปัจจุบัน
    const token = await messaging.getToken({
      serviceWorkerRegistration: registration,
      vapidKey: VAPID_PUBLIC_KEY,
    });

    if (token) {
      const lastToken = localStorage.getItem("fcm_token_last");
      const lastSync = localStorage.getItem("fcm_token_sync_time");
      const now = Date.now();

      // เงื่อนไขการ Sync: 
      // 1. Token เปลี่ยน 
      // 2. ข้อมูลใน Database หาย (ไม่มี lastSync)
      // 3. ไม่ได้อัปเดตมาเกิน 12 ชม. (ปรับให้เร็วขึ้นเพื่อความชัวร์)
      if (token !== lastToken || !lastSync || now - parseInt(lastSync) > 43200000) {
        console.log("♻️ Syncing/Repairing Token...");
        await saveTokenToDatabase(token);
        localStorage.setItem("fcm_token_last", token);
        localStorage.setItem("fcm_token_sync_time", now.toString());
      }
    }
  } catch (error) {
    console.error("❌ Token Sync/Repair Failed:", error);
  }
}

/**
 * 3. บันทึก Token ลง Database
 */
async function saveTokenToDatabase(token) {
  if (!isOnline()) return;

  // สร้าง Key ที่ปลอดภัย
  const safeTokenKey = btoa(token).substring(0, 50).replace(/[+/=]/g, "_");
  const database = firebase.database();

  try {
    await database.ref(`fcm_tokens/${safeTokenKey}`).set({
      token: token,
      lastActive: firebase.database.ServerValue.TIMESTAMP,
      platform: "web_pwa",
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      userAgent: navigator.userAgent // เก็บไว้เช็คกรณี Token มีปัญหา
    });
    console.log("🚀 Token Synced & Repaired!");
  } catch (dbError) {
    console.error("❌ DB Sync Failed:", dbError);
  }
}

/**
 * 4. ระบบ Event Listeners เพื่อการตรวจสอบตลอดเวลา
 */

// ก. เช็คเมื่อโหลดหน้าเว็บ (รอ 4 วิให้ระบบนิ่ง)
window.addEventListener("load", () => {
  setTimeout(forceSyncToken, 4000);
});

// ข. เช็คเมื่อผู้ใช้สลับหน้าจอ กลับมาที่แอป (สำคัญมากสำหรับ PWA)
// ถ้าเขาปิดแอปไปแล้วเปิดใหม่ หรือสลับไปเล่น LINE แล้วกลับมา ระบบจะเช็คทันที
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    forceSyncToken();
  }
});

// ค. เช็คเมื่ออินเทอร์เน็ตกลับมาใช้งานได้
window.addEventListener("online", forceSyncToken);

// ง. กรณี Firebase สั่ง Refresh Token เอง
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
        const messaging = firebase.messaging();
        messaging.onTokenRefresh(async () => {
            console.log("🔄 Token Refreshed by Firebase");
            const refreshedToken = await messaging.getToken({
                serviceWorkerRegistration: registration,
                vapidKey: VAPID_PUBLIC_KEY
            });
            await saveTokenToDatabase(refreshedToken);
        });
    });
}