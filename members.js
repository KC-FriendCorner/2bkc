// ==========================================
// 1. ตั้งค่า Firebase
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDi_0wqnyZ8AChvTXguj3Xwv07jEW7TOok",
  authDomain: "bkc-bc48f.firebaseapp.com",
  projectId: "bkc-bc48f",
  storageBucket: "bkc-bc48f.firebasestorage.app",
  messagingSenderId: "486986521782",
  appId: "1:486986521782:web:da67a6a47d6f01b98e9a17",
  databaseURL:
    "https://bkc-bc48f-default-rtdb.asia-southeast1.firebasedatabase.app",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

const deptNames = {
  1: "ฝ่ายอำนวยการ",
  2: "ฝ่ายเหรัญญิก",
  3: "ฝ่ายรับเรื่องราวร้องทุกข์",
  4: "ฝ่ายจัดหาทุน",
  5: "ฝ่ายสอดส่องดูแล",
  6: "ฝ่ายกิจกรรม",
  7: "ฝ่ายประชาสัมพันธ์",
  8: "ฝ่ายศูนย์เพื่อนใจ",
};

// ==========================================
// 2. ระบบดึงข้อมูลสมาชิกจาก Firebase
// ==========================================
function changeYear(year) {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.innerText.includes(year));
  });

  const displayArea = document.getElementById("memberDisplayArea");
  if (!displayArea) return;

  displayArea.innerHTML =
    '<div style="text-align:center; width:100%; padding:50px; color: #E11D48;">กำลังโหลดข้อมูลคณะกรรมการ...</div>';

  database.ref(`members/${year}`).once("value", (snapshot) => {
    const data = snapshot.val();
    displayArea.innerHTML = "";

    if (!data) {
      displayArea.innerHTML = `<p style="text-align:center; width:100%; color:#999; padding:50px;">ไม่พบข้อมูลคณะกรรมการในปีการศึกษา ${year}</p>`;
      return;
    }

    const membersArray = Object.values(data).sort(
      (a, b) => (a.priority || 99) - (b.priority || 99),
    );

    // สร้าง Grid 6 คอลัมน์
    let htmlContent = `<div class="unified-member-grid">`;

    // แก้ไขในส่วน loop membersArray.forEach
    membersArray.forEach((m) => {
      const memberDataStr = encodeURIComponent(JSON.stringify(m));
      htmlContent += `
        <div class="member-card-standard" onclick="showMemberDetail('${memberDataStr}')">
            <div class="avatar-box">
                <img src="${m.image_url}" alt="${m.first_name}" loading="lazy" onerror="this.src='https://via.placeholder.com/150'">
                <div class="view-overlay"><i class="fas fa-search-plus"></i></div>
            </div>
            <div class="member-info">
                <h4 class="member-name">${m.first_name} ${m.last_name}</h4>
            </div>
        </div>
    `;
    });

    htmlContent += `</div>`;
    displayArea.innerHTML = htmlContent;
  });
}

// เก็บสถานะปัจจุบัน
let currentYear = '2568';
let currentDept = 'all';

// ฟังก์ชันเมื่อเปลี่ยนปีการศึกษา
function changeYear(year) {
    currentYear = year;
    document.querySelectorAll("#yearFilterContainer .filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.innerText.includes(year));
    });
    fetchMembersData();
}

// ฟังก์ชันเมื่อเปลี่ยนฝ่ายจาก Dropdown
function filterByDept() {
    currentDept = document.getElementById("deptDropdown").value;
    fetchMembersData();
}

// ฟังก์ชันหลักดึงข้อมูล
function fetchMembersData() {
    const displayArea = document.getElementById("memberDisplayArea");
    if (!displayArea) return;

    displayArea.innerHTML = '<div style="text-align:center; width:100%; padding:50px; color: #E11D48;">กำลังโหลดข้อมูลคณะกรรมการ...</div>';

    // ดึงตามโครงสร้าง: members > ปี > เลขบัตร (Object.values จะเอาข้อมูลข้างในเลขบัตรมาเลย)
    database.ref(`members/${currentYear}`).once("value", (snapshot) => {
        const data = snapshot.val();
        displayArea.innerHTML = "";

        if (!data) {
            displayArea.innerHTML = `<p style="text-align:center; width:100%; color:#999; padding:50px;">ไม่พบข้อมูลคณะกรรมการในปี ${currentYear}</p>`;
            return;
        }

        let membersArray = Object.values(data).sort(
            (a, b) => (a.priority || 99) - (b.priority || 99)
        );

        // กรองตาม department_id (ตรงตามรูป Database ของคุณ)
        if (currentDept !== 'all') {
            membersArray = membersArray.filter(m => String(m.department_id) === String(currentDept));
        }

        if (membersArray.length === 0) {
            displayArea.innerHTML = `<p style="text-align:center; width:100%; color:#999; padding:50px;">ไม่พบสมาชิกในฝ่ายที่เลือก</p>`;
            return;
        }

        let htmlContent = `<div class="unified-member-grid">`;
        membersArray.forEach((m) => {
            const memberDataStr = encodeURIComponent(JSON.stringify(m));
            // ใช้รูปสำรองกรณีไม่มีภาพ หรือรูปจาก link เดิมโหลดไม่ได้
            const imgPath = m.image_url ? m.image_url : 'https://ui-avatars.com/api/?name=' + m.first_name + '&background=random';
            
            htmlContent += `
                <div class="member-card-standard" onclick="showMemberDetail('${memberDataStr}')">
                    <div class="avatar-box">
                        <img src="${imgPath}" alt="${m.first_name}" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=User'">
                        <div class="view-overlay"><i class="fas fa-search-plus"></i></div>
                    </div>
                    <div class="member-info">
                        <h4 class="member-name">${m.first_name} ${m.last_name}</h4>
                        <p class="member-dept-label" style="font-size: 0.8rem; color: #E11D48;">${deptNames[m.department_id] || ''}</p>
                    </div>
                </div>
            `;
        });

        htmlContent += `</div>`;
        displayArea.innerHTML = htmlContent;
    });
}