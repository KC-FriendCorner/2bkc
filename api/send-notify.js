const admin = require('firebase-admin');

// ฟังก์ชันสำหรับ Initialize ป้องกันการรันซ้ำ
function initFirebase() {
    if (admin.apps.length === 0) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://bkc-bc48f-default-rtdb.asia-southeast1.firebasedatabase.app"
            });
        } else {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
                databaseURL: "https://bkc-bc48f-default-rtdb.asia-southeast1.firebasedatabase.app"
            });
        }
    }
    return admin.messaging();
}

module.exports = async (req, res) => {
    // 1. ตั้งค่า CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        // 2. ดึงข้อมูลจาก Body มาตรวจสอบ (ย้ายมาไว้ข้างในนี้)
        const { admin_key, tokens, token, title, body, link } = req.body;

        // 3. ตรวจสอบ Admin Key ทันที
        if (admin_key !== "2BKC_SECRET_2026") {
            return res.status(403).json({ error: 'Unauthorized: Invalid Admin Key' });
        }

        // 4. เตรียมข้อมูล Tokens
        const targetTokens = tokens || (token ? [token] : []);

        if (targetTokens.length === 0 || !title || !body) {
            return res.status(400).json({ error: 'Missing tokens, title, or body' });
        }

        const messaging = initFirebase();
        const defaultLink = link || 'https://2bkc.smtekc.com/#news';
        const defaultIcon = 'https://2bkc.smtekc.com/img/2bkc.jpg';

        // 5. สร้างโครงสร้างข้อความ (Multicast)
        const message = {
            notification: { title, body },
            android: {
                priority: 'high',
                notification: {
                    icon: 'stock_ticker_update',
                    color: '#E91E63',
                    clickAction: defaultLink,
                }
            },
            webpush: {
                headers: { Urgency: 'high' },
                notification: {
                    icon: defaultIcon,
                    requireInteraction: true,
                },
                fcmOptions: { link: defaultLink }
            },
            tokens: targetTokens,
        };

        // 6. ส่งแบบกลุ่ม
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