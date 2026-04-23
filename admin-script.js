// 0. ระบบป้องกัน (Auth Guard) - ตรวจสอบการล็อกอิน
(function checkAuth() {
  const isAdmin = sessionStorage.getItem("isAdminLoggedIn");
  const adminName = sessionStorage.getItem("adminUsername"); // รับชื่อที่เก็บไว้ตอน Login

  if (!isAdmin || isAdmin !== "true") {
    alert("⚠️ กรุณาเข้าสู่ระบบก่อนใช้งานหน้าจัดการ");
    window.location.href = "login.html";
  }

  // แสดงชื่อแอดมินบนหน้าจอ (ถ้ามี Element id="adminDisplayName")
  document.addEventListener("DOMContentLoaded", () => {
    const displayEl = document.getElementById("adminDisplayName");
    if (displayEl && adminName) {
      displayEl.innerText = `ผู้ดูแลระบบ: ${adminName}`;
    }
  });
})();

// 1. ตั้งค่า Firebase
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

// 2. ข้อมูลฝ่ายและตำแหน่ง
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

const positionData = {
  1: [
    { name: "ประธานชมรม", priority: 1 },
    { name: "รองประธานชมรม", priority: 2 },
    { name: "เลขานุการ", priority: 3 },
  ],
  2: [{ name: "เหรัญญิก", priority: 4 }],
  3: [
    { name: "ประธานอนุกรรมการฝ่ายรับเรื่องราวร้องทุกข์", priority: 5 },
    { name: "กรรมการฝ่ายรับเรื่องราวร้องทุกข์", priority: 6 },
  ],
  4: [
    { name: "ประธานอนุกรรมการฝ่ายจัดหาทุน", priority: 7 },
    { name: "กรรมการฝ่ายจัดหาทุน", priority: 8 },
  ],
  5: [
    { name: "ประธานอนุกรรมการฝ่ายสอดส่องดูแล", priority: 9 },
    { name: "กรรมการฝ่ายสอดส่องดูแล", priority: 10 },
  ],
  6: [
    { name: "ประธานอนุกรรมการฝ่ายกิจกรรม", priority: 11 },
    { name: "กรรมการฝ่ายกิจกรรม", priority: 12 },
  ],
  7: [
    { name: "ประธานอนุกรรมการฝ่ายประชาสัมพันธ์", priority: 13 },
    { name: "กรรมการฝ่ายประชาสัมพันธ์", priority: 14 },
  ],
  8: [
    { name: "ผู้จัดการศูนย์เพื่อนใจ", priority: 15 },
    { name: "รองผู้จัดการศูนย์เพื่อนใจ", priority: 16 },
    { name: "สมาชิกศูนย์เพื่อนใจ", priority: 17 },
  ],
};

// 3. ฟังก์ชันอัปเดตตัวเลือกตำแหน่ง
function updatePositions() {
  const deptSelect = document.getElementById("department_id");
  const posSelect = document.getElementById("position");
  const selectedDept = deptSelect.value;
  posSelect.innerHTML =
    '<option value="" disabled selected>--- เลือกตำแหน่ง ---</option>';
  if (selectedDept && positionData[selectedDept]) {
    posSelect.disabled = false;
    positionData[selectedDept].forEach((pos) => {
      const option = document.createElement("option");
      option.value = pos.name;
      option.textContent = pos.name;
      option.dataset.priority = pos.priority;
      posSelect.appendChild(option);
    });
  } else {
    posSelect.disabled = true;
  }
}

// 4. ผูก Event ให้ตำแหน่งเพื่อเก็บ Priority
document.getElementById("position").addEventListener("change", function () {
  const selectedOption = this.options[this.selectedIndex];
  document.getElementById("priority").value = selectedOption.dataset.priority;
});

// 5. ฟังก์ชันล้างฟอร์มและคืนค่าปุ่ม (Reset)
function resetAdminForm() {
  document.getElementById("memberForm").reset();
  const studentIdInput = document.getElementById("student_id");
  studentIdInput.readOnly = false;
  studentIdInput.style.backgroundColor = "";
  studentIdInput.style.cursor = "text";
  const btnCancel = document.getElementById("btnCancel");
  if (btnCancel) btnCancel.style.display = "none";
  const submitBtn = document.querySelector(".btn-submit");
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fas fa-save"></i> บันทึกข้อมูลลง Database';
    submitBtn.style.background = ""; // กลับเป็นสีเดิมจาก CSS
    submitBtn.classList.remove("edit-mode");
  }
  document.getElementById("position").disabled = true;
  document.getElementById("instagram").value = "";
  document.getElementById("student_level").selectedIndex = 0;
}

// 6. ฟังก์ชันบันทึก/อัปเดตข้อมูล
document.getElementById("memberForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const ADMIN_SECRET = "2BKC_SECRET_2026";
  const studentId = document.getElementById("student_id").value.trim();
  const year = document.getElementById("academic_year").value;

  const memberData = {
    student_id: studentId,
    academic_year: year,
    prefix: document.getElementById("prefix").value,
    first_name: document.getElementById("first_name").value.trim(),
    last_name: document.getElementById("last_name").value.trim(),
    nickname: document.getElementById("nickname").value.trim() || "",
    student_level: document.getElementById("student_level").value,
    instagram: document.getElementById("instagram").value.trim() || "",
    department_id: parseInt(document.getElementById("department_id").value),
    position: document.getElementById("position").value,
    priority: parseInt(document.getElementById("priority").value),
    image_url:
      document.getElementById("image_url").value.trim() ||
      "https://via.placeholder.com/150",
    is_active: true,
    created_at: new Date().toISOString(),
    admin_key: ADMIN_SECRET,
  };

  database
    .ref(`members/${year}/${studentId}`)
    .set(memberData)
    .then(() => {
      alert(`✅ ดำเนินการสำเร็จ!`);
      resetAdminForm(); // *** คืนค่าปุ่มและล้างฟอร์มทันทีที่บันทึกสำเร็จ ***
    })
    .catch((error) => {
      alert(
        "❌ เกิดข้อผิดพลาด: " +
          (error.message.includes("PERMISSION_DENIED")
            ? "สิทธิ์ Admin ไม่ถูกต้อง"
            : error.message),
      );
    });
});

// 7. ฟังก์ชันดึงข้อมูลมาแสดงในตาราง (เพิ่มการแสดงผล ระดับชั้น และ IG)
function loadMembersTable() {
  const tableBody = document.getElementById("memberTableBody");
  const filterYear = document.getElementById("filter_year");
  if (!tableBody || !filterYear) return;
  const selectedYear = filterYear.value;

  tableBody.innerHTML =
    '<tr><td colspan="6" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> กำลังดึงข้อมูล...</td></tr>';

  database.ref(`members/${selectedYear}`).on("value", (snapshot) => {
    tableBody.innerHTML = "";
    const data = snapshot.val();
    if (!data) {
      tableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center; padding:30px; color:#999;">ไม่พบข้อมูลในปีการศึกษานี้</td></tr>';
      return;
    }

    const membersArray = Object.values(data).sort(
      (a, b) => (a.priority || 99) - (b.priority || 99),
    );

    membersArray.forEach((member) => {
      // สร้างลิงก์ IG ถ้ามีการกรอกข้อมูลมา
      const igDisplay = member.instagram
        ? `<br><small style="color:#E11D48;"><i class="fab fa-instagram"></i> @${member.instagram}</small>`
        : "";

      const row = `
                <tr>
                    <td style="vertical-align: middle;">
                        <img src="${member.image_url || "https://via.placeholder.com/150"}" 
                             style="width:45px; height:45px; border-radius:50%; object-fit:cover; border:2px solid #eee;">
                    </td>
                    <td style="vertical-align: middle; font-weight:600;">${member.student_id}</td>
                    <td style="vertical-align: middle;">
                        <div style="line-height: 1.4;">
                            <strong>${member.prefix}${member.first_name} ${member.last_name}</strong>
                            <br>
                            <small style="color:#888;">
                                ชั้น: ${member.student_level || "-"} | ชื่อเล่น: ${member.nickname || "-"}
                            </small>
                            ${igDisplay}
                        </div>
                    </td>
                    <td style="vertical-align: middle;">${deptNames[member.department_id] || member.department_id}</td>
                    <td style="vertical-align: middle;"><span class="badge">${member.position}</span></td>
                    <td style="vertical-align: middle;">
                        <button onclick="editMember('${member.academic_year}', '${member.student_id}')" class="btn-edit" style="color:#f39c12; border:none; background:none; cursor:pointer; margin-right:12px; font-size:1.1rem;"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteMember('${member.academic_year}', '${member.student_id}', '${member.first_name}')" class="btn-delete" style="color:#ff4d4d; border:none; background:none; cursor:pointer; font-size:1.1rem;"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>`;
      tableBody.insertAdjacentHTML("beforeend", row);
    });
  });
}

// 8. ฟังก์ชันแก้ไขสมาชิก
function editMember(year, id) {
  database.ref(`members/${year}/${id}`).once("value", (snapshot) => {
    const member = snapshot.val();
    if (!member) return;
    const sid = document.getElementById("student_id");
    sid.value = member.student_id;
    sid.readOnly = true;
    sid.style.backgroundColor = "#f0f0f0";
    sid.style.cursor = "not-allowed";
    document.getElementById("academic_year").value = member.academic_year;
    document.getElementById("prefix").value = member.prefix;
    document.getElementById("first_name").value = member.first_name;
    document.getElementById("last_name").value = member.last_name;
    document.getElementById("nickname").value = member.nickname || "";
    // เพิ่มการดึงค่าไปใส่ในฟอร์มตอนกด Edit
    document.getElementById("student_level").value =
      member.student_level || "ม.3";
    document.getElementById("instagram").value = member.instagram || "";
    document.getElementById("image_url").value = member.image_url || "";
    document.getElementById("department_id").value = member.department_id;
    if (document.getElementById("btnCancel"))
      document.getElementById("btnCancel").style.display = "block";
    updatePositions();
    setTimeout(() => {
      document.getElementById("position").value = member.position;
      document.getElementById("priority").value = member.priority || "10";
    }, 150);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const submitBtn = document.querySelector(".btn-submit");
    if (submitBtn) {
      submitBtn.innerHTML =
        '<i class="fas fa-sync-alt"></i> อัปเดตข้อมูลสมาชิก';
      submitBtn.style.background = "linear-gradient(135deg, #f39c12, #e67e22)";
    }
  });
}

// 9. ฟังก์ชันลบสมาชิก
function deleteMember(year, id, name) {
  if (confirm(`⚠️ ยืนยันการลบข้อมูลของ "${name}"?`)) {
    database
      .ref(`members/${year}/${id}`)
      .remove()
      .catch((error) => alert("❌ ลบไม่สำเร็จ: " + error.message));
  }
}

// แก้ไขส่วน "โหลดข้อมูลเริ่มต้น" (ประมาณบรรทัดที่ 245)
document.addEventListener("DOMContentLoaded", () => {
  loadMembersTable();
  loadAdminList(); // โหลดรายชื่อแอดมิน

  // --- เพิ่มบรรทัดนี้เพื่อกำหนดให้หน้าแรกคือหน้าข่าวสาร ---
  showSection("news");

  const filterYear = document.getElementById("filter_year");
  if (filterYear) filterYear.addEventListener("change", loadMembersTable);
});

// --- ส่วนควบคุมการสลับเมนู ---
document.querySelectorAll(".sidebar nav a").forEach((link, index) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    // ลบ class active จากทุกปุ่ม
    document
      .querySelectorAll(".sidebar nav a")
      .forEach((l) => l.classList.remove("active"));
    this.classList.add("active");

    // สลับการแสดงผล Section
    const memberSection = document.querySelector(".form-section"); // Section แรก
    const tableSection = document.querySelector(".table-section");
    const settingSection = document.getElementById("settings-section");

    if (this.innerText.includes("ตั้งค่าระบบ")) {
      memberSection.style.display = "none";
      tableSection.style.display = "none";
      settingSection.style.display = "block";
      loadSystemSettings(); // โหลดข้อมูลมาโชว์ในฟอร์ม
    } else {
      memberSection.style.display = "block";
      tableSection.style.display = "block";
      settingSection.style.display = "none";
    }
  });
});

// --- ส่วนจัดการแอดมิน (Admin Management) ---

// 1. โหลดรายชื่อแอดมินมาแสดง พร้อมปุ่มแก้ไขและลบ
function loadAdminList() {
  const adminTable = document.getElementById("adminListTable");
  if (!adminTable) return;

  database.ref("admin").on("value", (snapshot) => {
    adminTable.innerHTML = "";
    const admins = snapshot.val();

    if (admins) {
      Object.keys(admins).forEach((username) => {
        const row = `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding:10px; font-weight:600;">${username}</td>
                        <td style="padding:10px;">${admins[username].password}</td>
                        <td style="padding:10px;">
                            <button onclick="prepareEditAdmin('${username}', '${admins[username].password}')" style="color:#f39c12; border:none; background:none; cursor:pointer; margin-right:15px;">
                                <i class="fas fa-edit"></i> แก้ไข
                            </button>
                            <button onclick="deleteAdmin('${username}')" style="color:#ff4d4d; border:none; background:none; cursor:pointer;">
                                <i class="fas fa-trash"></i> ลบ
                            </button>
                        </td>
                    </tr>`;
        adminTable.insertAdjacentHTML("beforeend", row);
      });
    }
  });
}

// 2. ฟังก์ชันเตรียมการแก้ไข (เอาข้อมูลขึ้นไปบนฟอร์ม)
function prepareEditAdmin(user, pass) {
  const userField = document.getElementById("adm_username");
  const passField = document.getElementById("adm_password");
  const submitBtn = document.getElementById("btnAdminSubmit");
  const cancelBtn = document.getElementById("btnAdminCancel");

  userField.value = user;
  userField.readOnly = true; // ห้ามแก้ Username เพราะเป็น Key ของ Database
  userField.style.background = "#f0f0f0";

  passField.value = pass;
  passField.focus();

  submitBtn.innerHTML = '<i class="fas fa-sync-alt"></i> อัปเดตรหัสผ่าน';
  submitBtn.style.background = "#e67e22"; // เปลี่ยนสีให้รู้ว่ากำลังแก้ไข
  cancelBtn.style.display = "block";
}

// 3. ฟังก์ชันรีเซ็ตฟอร์มกลับเป็นโหมดเพิ่มแอดมินปกติ
function resetAdminManageForm() {
  const userField = document.getElementById("adm_username");
  const submitBtn = document.getElementById("btnAdminSubmit");
  const cancelBtn = document.getElementById("btnAdminCancel");

  document.getElementById("adminManageForm").reset();

  userField.readOnly = false;
  userField.style.background = "#ffffff";

  submitBtn.innerHTML = '<i class="fas fa-save"></i> บันทึก/เพิ่มแอดมิน';
  submitBtn.style.background = "#3498db";
  cancelBtn.style.display = "none";
}

// 4. บันทึกข้อมูล (ใช้ได้ทั้งเพิ่มใหม่และอัปเดต)
document
  .getElementById("adminManageForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("adm_username").value.trim();
    const password = document.getElementById("adm_password").value.trim();

    if (username && password) {
      database
        .ref(`admin/${username}`)
        .set({
          password: password,
        })
        .then(() => {
          alert("✅ ดำเนินการสำเร็จ");
          resetAdminManageForm();
        })
        .catch((err) => alert("❌ ผิดพลาด: " + err.message));
    }
  });

// 5. ลบแอดมิน
function deleteAdmin(username) {
  const currentAdmin = sessionStorage.getItem("adminUsername");
  if (username === currentAdmin) {
    alert("❌ คุณไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้");
    return;
  }

  if (confirm(`คุณต้องการลบแอดมิน ${username} ใช่หรือไม่?`)) {
    database.ref(`admin/${username}`).remove();
  }
}

// เรียกใช้งาน
document.addEventListener("DOMContentLoaded", loadAdminList);

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".sidebar-overlay");

  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");

  // เปลี่ยนไอคอนปุ่ม (ทางเลือก)
  const icon = document.querySelector(".menu-toggle i");
  if (sidebar.classList.contains("active")) {
    icon.className = "fas fa-times"; // เปลี่ยนเป็นรูปกากบาท
  } else {
    icon.className = "fas fa-bars"; // เปลี่ยนกลับเป็น 3 ขีด
  }
}

// ปิดเมนูเมื่อกดที่รายการเมนู (สำหรับอุปกรณ์มือถือ)
document.querySelectorAll(".sidebar nav a").forEach((link) => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      toggleSidebar();
    }
  });
});

function logoutAdmin() {
  // 1. แสดงกล่องยืนยันเพื่อป้องกันการกดพลาด
  if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
    // 2. ลบข้อมูลการล็อกอินที่เก็บไว้ (ปรับตามที่คุณใช้)
    localStorage.removeItem("adminLoggedIn"); // หรือชื่อ key ที่คุณตั้งไว้
    sessionStorage.clear(); // ล้าง session ทั้งหมด

    // 3. ถ้าคุณใช้ Firebase Auth (ถ้ามี)
    // firebase.auth().signOut();

    // 4. ส่งกลับไปหน้า Login หรือหน้าแรก
    window.location.href = "login.html";
  }
}

// ==========================================
// 1. การตั้งค่าคงที่และตัวแปร Global
// ==========================================
const IMGBB_API_KEY = "09b1806a38e859fb428ab5eac50ebda1";
const ADMIN_SECRET = "2BKC_SECRET_2026";

let selectedFiles = []; // เก็บไฟล์รูปภาพใหม่ (File Objects)
window.existingImages = []; // เก็บ URL รูปภาพเดิมจาก Database (Strings)

// ==========================================
// 2. ฟังก์ชันตัวช่วย (Helpers & Navigation)
// ==========================================

// ระบบสลับหน้า Section ใน Dashboard
function showSection(sectionId) {
  // ซ่อนทุก Section
  document.querySelectorAll(".admin-section").forEach((section) => {
    section.style.display = "none";
  });

  // แสดงเฉพาะ Section ที่เลือก
  const targetSection = document.getElementById(sectionId + "-section");
  if (targetSection) targetSection.style.display = "block";

  // ปรับสถานะปุ่มใน Sidebar
  document.querySelectorAll(".sidebar nav a").forEach((link) => {
    link.classList.remove("active");
  });
  const activeNav = document.getElementById("nav-" + sectionId);
  if (activeNav) activeNav.classList.add("active");

  // เปลี่ยนหัวข้อบน Top Bar
  const titles = {
    news: "จัดการข่าวสารและกิจกรรม",
    members: "จัดการคณะกรรมการชมรม",
    settings: "ตั้งค่าระบบแอดมิน",
  };
  const titleElement = document.getElementById("current-page-title");
  if (titleElement) titleElement.innerText = titles[sectionId] || "Dashboard";

  // ปิด Sidebar มือถืออัตโนมัติ
  if (window.innerWidth <= 768 && typeof toggleSidebar === "function") {
    toggleSidebar();
  }
}

// อัปโหลดรูปภาพไปยัง ImgBB
async function uploadToImgBB(file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append("image", file);
  try {
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: "POST",
        body: formData,
      },
    );
    const data = await response.json();
    return data.success ? data.data.url : null;
  } catch (error) {
    console.error("Upload Error:", error);
    return null;
  }
}

// ล้างฟอร์มข่าวสาร
function resetNewsForm() {
  document.getElementById("newsForm").reset();
  document.getElementById("editNewsId").value = "";
  selectedFiles = [];
  window.existingImages = [];
  renderEditPreviews();

  const submitBtn = document.getElementById("btnNewsSubmit");
  submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> ประกาศข่าวสาร';
  submitBtn.style.background = "";
  document.getElementById("btnCancelNewsEdit").style.display = "none";

  const statusText = document.getElementById("uploadStatus");
  if (statusText) statusText.innerText = "";
}

// ==========================================
// 3. ระบบจัดการรูปภาพ (Preview & Selection)
// ==========================================

function renderEditPreviews() {
  const container = document.getElementById("imagePreviewContainer");
  const countText = document.getElementById("fileCountText");
  if (!container) return;
  container.innerHTML = "";

  // 1. วาดรูปเก่า (สีน้ำเงิน - จาก Database)
  window.existingImages.forEach((url, index) => {
    const div = document.createElement("div");
    div.className = "preview-item existing";
    div.style =
      "position: relative; width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 2px solid #3498db; display: inline-block; margin: 5px;";
    div.innerHTML = `
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
            <button type="button" onclick="removeExistingImage(${index})" style="position: absolute; top: 0; right: 0; background: #e74c3c; color: white; border: none; cursor: pointer; padding: 2px 6px;"><i class="fas fa-times"></i></button>
            <span style="position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(52,152,219,0.8); color: white; font-size: 10px; text-align: center;">รูปเดิม</span>
        `;
    container.appendChild(div);
  });

  // 2. วาดรูปใหม่ (สีเขียว - จากเครื่องผู้ใช้)
  selectedFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const div = document.createElement("div");
      div.className = "preview-item new";
      div.style =
        "position: relative; width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 2px solid #2ecc71; display: inline-block; margin: 5px;";
      div.innerHTML = `
                <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
                <button type="button" onclick="removeFile(${index})" style="position: absolute; top: 0; right: 0; background: #e74c3c; color: white; border: none; cursor: pointer; padding: 2px 6px;"><i class="fas fa-times"></i></button>
            `;
      container.appendChild(div);
    };
    reader.readAsDataURL(file);
  });

  const total = window.existingImages.length + selectedFiles.length;
  if (countText) countText.innerText = `รวมทั้งหมด ${total} รูป`;
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderEditPreviews();
}

function removeExistingImage(index) {
  window.existingImages.splice(index, 1);
  renderEditPreviews();
}

// ==========================================
// 4. ฟังก์ชันหลัก News CRUD (Firebase)
// ==========================================

// โหลดข้อมูลข่าวลงตาราง
function loadNewsTable() {
  const tableBody = document.getElementById("newsTableBody");
  if (!tableBody) return;

  database.ref("news").on("value", (snapshot) => {
    tableBody.innerHTML = "";
    const newsData = snapshot.val();
    if (!newsData) {
      tableBody.innerHTML =
        '<tr><td colspan="3" style="text-align:center; padding:20px; color:#999;">ยังไม่มีข้อมูลข่าวสาร</td></tr>';
      return;
    }

    const newsArray = Object.keys(newsData)
      .map((key) => ({ id: key, ...newsData[key] }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    newsArray.forEach((item) => {
      const row = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; white-space: nowrap;">${item.date}</td>
                    <td style="padding: 12px;"><strong>${item.title}</strong></td>
                    <td style="padding: 12px; text-align: center; white-space: nowrap;">
                        <button onclick="editNews('${item.id}')" class="btn-edit" style="color:#f39c12; border:none; background:none; cursor:pointer; margin-right:15px; font-size:1.1rem;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteNews('${item.id}', '${item.title}')" class="btn-delete" style="color:#ff4d4d; border:none; background:none; cursor:pointer; font-size:1.1rem;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>`;
      tableBody.insertAdjacentHTML("beforeend", row);
    });
  });
}

// เตรียมข้อมูลเพื่อแก้ไข
async function editNews(id) {
  const snapshot = await database.ref(`news/${id}`).once("value");
  const news = snapshot.val();
  if (!news) return;

  document.getElementById("editNewsId").value = id;
  document.getElementById("newsTitle").value = news.title;
  document.getElementById("newsDate").value = news.date;
  document.getElementById("newsContent").value = news.content;

  // โหลดรูปเก่าเข้าระบบ Preview
  window.existingImages = news.more_images || (news.image ? [news.image] : []);
  selectedFiles = [];

  renderEditPreviews();
  window.scrollTo({ top: 0, behavior: "smooth" });

  const submitBtn = document.getElementById("btnNewsSubmit");
  submitBtn.innerHTML = '<i class="fas fa-save"></i> บันทึกการแก้ไข';
  submitBtn.style.background = "#27ae60";
  document.getElementById("btnCancelNewsEdit").style.display = "inline-block";
}

// ลบข่าว
function deleteNews(id, title) {
  if (confirm(`⚠️ คุณต้องการลบข่าว "${title}" ใช่หรือไม่?`)) {
    database
      .ref(`news/${id}`)
      .remove()
      .then(() => alert("ลบข่าวสารเรียบร้อยแล้ว"))
      .catch((err) => alert("❌ ไม่สามารถลบได้: " + err.message));
  }
}

// ==========================================
// 5. การจัดการ Event Listeners
// ==========================================

// จัดการ Submit ฟอร์ม (เพิ่ม/แก้ไข)
document
  .getElementById("newsForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const submitBtn = document.getElementById("btnNewsSubmit");
    const statusText = document.getElementById("uploadStatus");
    const editId = document.getElementById("editNewsId").value; // เช็คว่าเป็นเคสแก้ไขไหม

    // 1. ตรวจสอบรูปภาพ
    if (selectedFiles.length === 0 && window.existingImages.length === 0) {
      alert("กรุณาเลือกรูปภาพอย่างน้อย 1 รูป");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> กำลังดำเนินการ...';

    try {
      let finalImages = [...window.existingImages];

      // 2. อัปโหลดรูปใหม่ (ถ้ามี)
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          if (statusText)
            statusText.innerText = `⌛ กำลังอัปโหลดรูปใหม่ที่ ${i + 1}/${selectedFiles.length}...`;
          const url = await uploadToImgBB(selectedFiles[i]);
          if (url) finalImages.push(url);
        }
      }

      const newsData = {
        title: document.getElementById("newsTitle").value.trim(),
        date: document.getElementById("newsDate").value,
        content: document.getElementById("newsContent").value.trim(),
        image: finalImages.length > 0 ? finalImages[0] : "img/default-news.jpg",
        more_images: finalImages,
        admin_key: ADMIN_SECRET,
        updated_at: new Date().toISOString(),
      };

      // 3. แยกการทำงานระหว่าง "เพิ่มใหม่" กับ "แก้ไข"
      if (editId) {
        // --- กรณีแก้ไขข่าวเดิม ---
        await database.ref(`news/${editId}`).update(newsData);
        alert("✅ อัปเดตข้อมูลข่าวสารเรียบร้อย!");
      } else {
        // --- กรณีเพิ่มข่าวใหม่ ---
        newsData.created_at = new Date().toISOString();
        await database.ref("news").push(newsData);

        // ส่งแจ้งเตือนเฉพาะข่าวใหม่เท่านั้น
        if (typeof notifyAllMembers === "function") {
          await notifyAllMembers(newsData.title);
        }
        alert("✅ ประกาศข่าวสารและส่งแจ้งเตือนเรียบร้อย!");
      }

      resetNewsForm(); // ล้างฟอร์มกลับเป็นปกติ
    } catch (error) {
      console.error("Submit Error:", error);
      alert("❌ ผิดพลาด: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> ประกาศข่าวสาร';
      if (statusText) statusText.innerText = "";
    }
  });

// จัดการการเลือกรูปภาพเพิ่ม (Multiple Selection Accumulation)
document
  .getElementById("newsMoreImagesFiles")
  .addEventListener("change", function (e) {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const isDuplicate = selectedFiles.some(
        (f) => f.name === file.name && f.size === file.size,
      );
      if (!isDuplicate) selectedFiles.push(file);
    });
    renderEditPreviews();
    this.value = ""; // Reset เพื่อให้เลือกไฟล์เดิมซ้ำได้ถ้าต้องการ
  });

// เริ่มต้นทำงานเมื่อโหลดหน้าเว็บ
document.addEventListener("DOMContentLoaded", () => {
  loadNewsTable();
});
