const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendNewsNotification = functions
  .region("asia-southeast1")
  .database.ref("/news/{newsId}")
  .onCreate(async (snapshot, context) => {
    const newsData = snapshot.val();
    if (!newsData) return null;

    // 1. ไปดึง Tokens ทั้งหมดที่เก็บไว้ใน /fcm_tokens
    const tokensSnapshot = await admin
      .database()
      .ref("fcm_tokens")
      .once("value");
    const tokensData = tokensSnapshot.val();

    if (!tokensData) return console.log("ไม่มีผู้ติดตาม");

    // 2. รวบรวม Token ทั้งหมดใส่ Array
    const registrationTokens = Object.values(tokensData).map(
      (item) => item.token,
    );

    // 3. สร้างข้อความแจ้งเตือน
    const message = {
      notification: {
        title: "📢 ข่าวสารใหม่จาก 2BKC!",
        body: newsData.title || "อัปเดตข่าวใหม่ล่าสุด กดอ่านได้เลย",
      },
      data: {
        link: "/#news", // สำหรับระบบ Hash
      },
      tokens: registrationTokens, // ส่งหาหลายคนพร้อมกัน
    };

    // 4. สั่งส่งแจ้งเตือนแบบ Multicast
    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log("ส่งแจ้งเตือนสำเร็จ:", response.successCount, "คน");

      // (Optional) ลบ Token ที่ใช้งานไม่ได้แล้วออกเพื่อไม่ให้เปลืองแรงส่งครั้งหน้า
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(registrationTokens[idx]);
          }
        });

        // ลบ Token ที่ส่งไม่ผ่านออกจาก Database
        const promises = failedTokens.map((t) => {
          const safeT = t.replace(/\./g, "_");
          return admin.database().ref(`fcm_tokens/${safeT}`).remove();
        });
        await Promise.all(promises);
        console.log(`ลบ Token ที่หมดอายุแล้ว ${failedTokens.length} รายการ`);
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการส่ง:", error);
    }
  });
