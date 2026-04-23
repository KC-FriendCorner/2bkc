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
    return admin.messaging();
}

module.exports = async (req, res) => {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        // 2. รับข้อมูล (ดึง dataPayload ออกมา)
        const { admin_key, tokens, dataPayload } = req.body;

        // 3. ตรวจสอบความปลอดภัย
        if (admin_key !== "2BKC_SECRET_2026") {
            return res.status(403).json({ error: 'รหัสลับไม่ถูกต้อง (Unauthorized)' });
        }

        if (!tokens || tokens.length === 0 || !dataPayload) {
            return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน (Missing tokens or dataPayload)' });
        }

        const messaging = initFirebase();

        // 4. สร้าง Payload แบบ "Data-Only" 
        // การเอา notification: { ... } ออก จะช่วยให้ Service Worker จัดการ "เด้งเดียว" ได้แม่นยำ
        const message = {
            data: {
                title: dataPayload.title || "📢 ข่าวใหม่จาก 2BKC!",
                body: dataPayload.body || "อัปเดตข่าวใหม่ล่าสุด กดอ่านได้เลย",
                link: dataPayload.link || 'https://2bkc.smtekc.com/#news',
                icon: dataPayload.icon || 'https://2bkc.smtekc.com/img/2bkc.jpg'
            },
            webpush: {
                headers: { Urgency: 'high' },
                fcmOptions: { link: dataPayload.link || 'https://2bkc.smtekc.com/#news' }
            },
            tokens: tokens,
        };

        const response = await messaging.sendEachForMulticast(message);
        
        return res.status(200).json({ 
            success: true, 
            successCount: response.successCount, 
            failureCount: response.failureCount 
        });

    } catch (error) {
        console.error('❌ FCM Error:', error);
        return res.status(500).json({ error: error.message });
    }
};