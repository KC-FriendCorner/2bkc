const admin = require('firebase-admin');

function initFirebase() {
    if (admin.apps.length === 0) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            };

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://bkc-bc48f-default-rtdb.asia-southeast1.firebasedatabase.app"
        });
    }
    return admin;
}

module.exports = async (req, res) => {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { admin_key, tokens, dataPayload } = req.body;

        // 2. Security Check
        if (admin_key !== "2BKC_SECRET_2026") {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return res.status(400).json({ error: 'No tokens provided' });
        }

        const firebaseAdmin = initFirebase();
        const messaging = firebaseAdmin.messaging();
        const db = firebaseAdmin.database();

        /**
         * 3. สร้าง Payload ที่ "ดีที่สุด" สำหรับทุก Platform
         * iOS (APNs): ต้องการ 'content-available': 1 เพื่อปลุก Service Worker
         * Web: ใช้ 'Urgency: high'
         */
        const message = {
            data: {
                title: dataPayload.title || "📢 ข่าวใหม่จาก 2BKC!",
                body: dataPayload.body || "อัปเดตข่าวใหม่ล่าสุด กดอ่านได้เลย",
                link: dataPayload.link || 'https://2bkc.smtekc.com/#news',
                icon: dataPayload.icon || 'https://2bkc.smtekc.com/img/2bkc.jpg',
                image: dataPayload.image || dataPayload.icon || '' // สำหรับโชว์รูปใหญ่
            },
            android: {
                priority: 'high'
            },
            apns: {
                payload: {
                    aps: {
                        'content-available': 1, // ปลุก Background Process บน iOS
                        mutableContent: 1      // อนุญาตให้แก้ไข Content (ใส่รูป/ปุ่ม)
                    }
                },
                headers: {
                    'apns-priority': '10' // ส่งทันที
                }
            },
            webpush: {
                headers: { Urgency: 'high' },
                fcmOptions: { link: dataPayload.link || 'https://2bkc.smtekc.com/#news' }
            },
            tokens: tokens,
        };

        // 4. ส่งแจ้งเตือน
        const response = await messaging.sendEachForMulticast(message);
        
        /**
         * 5. 🛠 ระบบ Auto-Cleanup (หัวใจของความเสถียร)
         * ตรวจสอบว่ามี Token ไหนที่ "หมดอายุ" หรือ "ผู้ใช้บล็อกไปแล้ว" ให้ลบทิ้งทันที
         */
        const tokensToRemove = [];
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    // รหัสข้อผิดพลาดที่บอกว่า Token ใช้ไม่ได้แล้ว
                    if (
                        error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered'
                    ) {
                        const expiredToken = tokens[idx];
                        // แปลง Token เป็น Key แบบเดียวกับที่เราเซฟ (ใช้ btoa หรือวิธีที่ตรงกัน)
                        const safeKey = Buffer.from(expiredToken).toString('base64').substring(0, 45).replace(/[+/=]/g, "_");
                        tokensToRemove.push(db.ref(`fcm_tokens/${safeKey}`).remove());
                    }
                }
            });

            // รันการลบแบบขนาน (Parallel) เพื่อไม่ให้หน่วง API
            if (tokensToRemove.length > 0) {
                await Promise.all(tokensToRemove);
                console.log(`🧹 Cleaned up ${tokensToRemove.length} invalid tokens.`);
            }
        }

        return res.status(200).json({ 
            success: true, 
            successCount: response.successCount, 
            failureCount: response.failureCount,
            cleanedCount: tokensToRemove.length
        });

    } catch (error) {
        console.error('❌ FCM Error:', error);
        return res.status(500).json({ error: error.message });
    }
};