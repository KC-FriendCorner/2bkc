/**
 * 2BKC Notification System - Enhanced Production Version
 */

const VAPID_PUBLIC_KEY = "BGul7Ob55G5r8huiGNlqFVtkSAB72MCGD6jEuiSyRJiYYmYiq6PIEEq3jq62xIHKM1odTfDulIZwIviON0MpYmw";

/**
 * 1. ฟังก์ชันช่วยตรวจสอบสถานะออนไลน์ (กัน Error เวลาเน็ตหลุด)
 */
const isOnline = () => navigator.onLine;

/**
 * 2. ลงทะเบียน Service Worker
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
 * 3. ฟังก์ชันหลักในการตั้งค่าการแจ้งเตือน
 */
async function initNotification() {
  if (!isOnline()) return; // ถ้าออฟไลน์อยู่ ไม่ต้องรัน

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("Browser not supported for notifications.");
    return;
  }

  // ถ้า Permission ถูกปิดไว้ ไม่ต้องรบกวนผู้ใช้
  if (Notification.permission === "denied") return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const messaging = firebase.messaging();

      // การต่ออายุ Token อัตโนมัติ (Heartbeat)
      messaging.onTokenRefresh(async () => {
        try {
          const refreshedToken = await messaging.getToken({
            serviceWorkerRegistration: registration,
            vapidKey: VAPID_PUBLIC_KEY,
          });
          if (refreshedToken) await saveTokenToDatabase(refreshedToken);
        } catch (err) {
          console.error("Token refresh failed:", err);
        }
      });

      // ดึง Token ปัจจุบัน
      const token = await messaging.getToken({
        serviceWorkerRegistration: registration,
        vapidKey: VAPID_PUBLIC_KEY,
      });

      if (token) {
        // เช็คก่อนว่าต้องอัปเดตไหม เพื่อลดการเขียน Database พร่ำเพรื่อ
        const lastToken = localStorage.getItem("fcm_token_last");
        const lastSync = localStorage.getItem("fcm_token_sync_time");
        const now = Date.now();

        // บันทึกใหม่ถ้า Token เปลี่ยน หรือไม่ได้อัปเดตมาเกิน 24 ชม.
        if (token !== lastToken || !lastSync || now - lastSync > 86400000) {
          await saveTokenToDatabase(token);
          localStorage.setItem("fcm_token_last", token);
          localStorage.setItem("fcm_token_sync_time", now.toString());
        }
      }
    }
  } catch (error) {
    console.error("❌ Notification Initialization Error:", error);
  }
}

/**
 * 4. บันทึก Token ลง Database (ปรับปรุงโครงสร้าง)
 */
async function saveTokenToDatabase(token) {
  if (!isOnline()) return;

  // ใช้การ Hash หรือ Key ที่ปลอดภัยขึ้น (ใน Firebase Key ห้ามมี . # $ [ ])
  const safeTokenKey = btoa(token).substring(0, 50).replace(/\//g, "_");
  const database = firebase.database();

  try {
    await database.ref(`fcm_tokens/${safeTokenKey}`).set({
      token: token,
      lastActive: firebase.database.ServerValue.TIMESTAMP,
      platform: "web_pwa",
      isStandalone: window.matchMedia('(display-mode: standalone)').matches, // เช็คว่าเป็น PWA ไหม
    });
    console.log("🚀 Token Synced Successfully!");
  } catch (dbError) {
    console.error("❌ Database Sync Failed:", dbError);
  }
}

/**
 * 5. สั่งงานเมื่อพร้อม
 */
window.addEventListener("load", () => {
  // ใช้ช่วงเวลาที่ User มีปฏิสัมพันธ์กับหน้าเว็บ จะช่วยให้ Permission ขอผ่านง่ายขึ้น
  setTimeout(initNotification, 4000);
});