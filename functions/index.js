const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendNewsNotification = functions
  .region("asia-southeast1") // สิงคโปร์ Latency ต่ำที่สุดสำหรับไทย
  .database.ref("/news/{newsId}")
  .onCreate(async (snapshot, context) => {
    const newsData = snapshot.val();
    if (!newsData) return null;

    try {
      // 1. ดึง Tokens และใช้ Set เพื่อกรองตัวซ้ำทันที (ลด Load ของ FCM)
      const tokensSnapshot = await admin.database().ref("fcm_tokens").once("value");
      const tokensData = tokensSnapshot.val();

      if (!tokensData) {
        console.log("No followers to notify.");
        return null;
      }

      // ดึงเฉพาะ Token ที่ไม่ซ้ำกัน
      const registrationTokens = [...new Set(Object.values(tokensData).map(item => item.token))];
      
      // 2. ตั้งค่า Payload ให้สมบูรณ์แบบ (รองรับทั้ง Web, Android, iOS PWA)
      const message = {
        notification: {
          title: "📢 ข่าวใหม่จาก 2BKC!",
          body: newsData.title || "อัปเดตข่าวใหม่ล่าสุด กดอ่านได้เลย",
        },
        data: {
          // ใส่ข้อมูลสำรองเผื่อ Service Worker ดึงจาก Data field
          title: "📢 ข่าวใหม่จาก 2BKC!",
          body: newsData.title || "อัปเดตข่าวใหม่ล่าสุด กดอ่านได้เลย",
          link: "https://2bkc.smtekc.com/#news", // แนะนำให้ใช้ Full URL เพื่อความชัวร์ใน PWA
          newsId: context.params.newsId
        },
        webpush: {
          headers: {
            Urgency: "high"
          },
          notification: {
            icon: "https://2bkc.smtekc.com/img/2bkc.jpg",
            badge: "https://2bkc.smtekc.com/img/icon-192.png",
            requireInteraction: true, // แจ้งเตือนไม่หายไปจนกว่าจะกดปิด
          },
          fcmOptions: {
            link: "https://2bkc.smtekc.com/#news"
          }
        },
        tokens: registrationTokens,
      };

      // 3. ส่งแจ้งเตือนแบบ Multicast (รองรับสูงสุด 500 tokens ต่อรอบ)
      // หากในอนาคตสมาชิกเกิน 500 คน ควรใช้การแบ่ง Array (Chunking)
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Successfully sent to ${response.successCount} devices.`);

      // 4. ระบบจัดการ Token เสีย (Optimization)
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            // เช็คสาเหตุเฉพาะที่ควรลบ (เช่น Token หมดอายุ หรือ ไม่ใช่ผู้รับที่ถูกต้อง)
            const error = resp.error.code;
            if (error === 'messaging/invalid-registration-token' || 
                error === 'messaging/registration-token-not-registered') {
              failedTokens.push(registrationTokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          const updates = {};
          // วนลูปหา key ใน database ที่ตรงกับ token ที่เสียเพื่อลบทิ้ง
          // วิธีนี้เร็วกว่าการสั่ง .remove() ทีละตัว
          Object.keys(tokensData).forEach(key => {
            if (failedTokens.includes(tokensData[key].token)) {
              updates[`fcm_tokens/${key}`] = null;
            }
          });
          await admin.database().ref().update(updates);
          console.log(`Cleaned up ${failedTokens.length} expired tokens.`);
        }
      }
    } catch (error) {
      console.error("FCM Delivery Error:", error);
    }
    return null;
  });