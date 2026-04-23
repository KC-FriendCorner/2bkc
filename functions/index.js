const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendNewsNotification = functions
  .region("asia-southeast1")
  .database.ref("/news/{newsId}")
  .onCreate(async (snapshot, context) => {
    const newsData = snapshot.val();
    if (!newsData) return null;

    try {
      const tokensSnapshot = await admin.database().ref("fcm_tokens").once("value");
      const tokensData = tokensSnapshot.val();

      if (!tokensData) return null;

      const registrationTokens = [...new Set(Object.values(tokensData).map(item => item.token))];
      
      // --- ปรับปรุงตรงนี้: เอา notification: { ... } ออก ---
      const message = {
        data: {
          title: "📢 ข่าวใหม่จาก 2BKC!",
          body: newsData.title || "อัปเดตข่าวใหม่ล่าสุด กดอ่านได้เลย",
          link: "https://2bkc.smtekc.com/#news",
          icon: "https://2bkc.smtekc.com/img/2bkc.jpg"
        },
        webpush: {
          headers: {
            Urgency: "high"
          },
          fcmOptions: {
            link: "https://2bkc.smtekc.com/#news"
          }
        },
        tokens: registrationTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Sent to ${response.successCount} devices.`);

      // ระบบลบ Token เสีย (คงเดิม)
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error.code;
            if (error === 'messaging/invalid-registration-token' || 
                error === 'messaging/registration-token-not-registered') {
              failedTokens.push(registrationTokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          const updates = {};
          Object.keys(tokensData).forEach(key => {
            if (failedTokens.includes(tokensData[key].token)) {
              updates[`fcm_tokens/${key}`] = null;
            }
          });
          await admin.database().ref().update(updates);
        }
      }
    } catch (error) {
      console.error("FCM Delivery Error:", error);
    }
    return null;
  });