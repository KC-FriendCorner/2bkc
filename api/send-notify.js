const admin = require('firebase-admin');

// ฟังก์ชันสำหรับ Initialize ป้องกันการรันซ้ำ
function initFirebase() {
    if (admin.apps.length === 0) {
        // กรณีใช้ก้อน JSON เดียวใน Vercel Environment Variables
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://bkc-bc48f-default-rtdb.asia-southeast1.firebasedatabase.app"
            });
        } 
        // กรณีแยกตัวแปร (Fallback)
        else {
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
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // รับ tokens (แบบ Array) หรือ token (แบบใบเดียว)
    const { tokens, token, title, body, recipientUid, link } = req.body;
    const targetTokens = tokens || (token ? [token] : []);

    if (targetTokens.length === 0 || !title || !body) {
        return res.status(400).json({ error: 'Missing tokens, title, or body' });
    }

    try {
        const messaging = initFirebase();
        const defaultLink = link || 'https://2bkc.smtekc.com/#news';
        const defaultIcon = 'https://2bkc.smtekc.com/img/2bkc.jpg';

        // สร้างโครงสร้างข้อความ (Multicast)
        const message = {
            notification: { title, body },
            android: {
                priority: 'high',
                notification: {
                    icon: 'stock_ticker_update', // หรือชื่อ icon ในโปรเจกต์
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
            tokens: targetTokens, // ใส่เป็น Array
        };

        // เปลี่ยนเป็นส่งแบบกลุ่ม
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