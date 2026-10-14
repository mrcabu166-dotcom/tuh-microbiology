# 🏥 Smart Critical Microbiology Alert: ระบบแจ้งและยืนยันผลตรวจวิกฤตทางจุลชีววิทยา & เชื้อดื้อยา (Real-time)

**งานจุลชีววิทยา ฝ่ายสหเวชศาสตร์ โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ (TUH)**

---

## 📌 บทนำและวัตถุประสงค์ระบบ (System Overview)

ระบบ **Smart Critical Microbiology Alert** เป็นระบบแจ้งและยืนยันการรับทราบผลตรวจวิกฤตทางจุลชีววิทยา (Positive Hemoculture, CSF/Sterile body fluids Gram stain, MDROs/AMR) แบบ **Closed-loop Real-time Notification & Acknowledgement** ช่วยให้หอผู้ป่วยและทีมดูแลผู้ป่วยรับทราบผลวิกฤตได้ภายใน **15 นาที ไม่น้อยกว่า 95%** ตามมาตรฐาน HA และ Patient Safety

---

## 🚀 สถาปัตยกรรมระบบ (Architecture)

```text
[ ห้องปฏิบัติการจุลชีววิทยา (MT) ]
                │
                ▼ (บันทึกผลวิกฤต / AMR ผ่าน Web UI)
┌────────────────────────────────────────────────────────┐
│             Next.js 14 Web Application                │
│  - Live Kanban Board (จับเวลา Real-time)               │
│  - ปุ่ม [✅ กดยืนยันรับทราบผล] บน Web Dashboard ได้ทันที │
│  - เชื้อดื้อยา AMR Surveillance (CRAB, CRE, MRSA, VRE) │
│  - Safety Net Protocol (เบอร์โทรต่อสายด่วนหอผู้ป่วย)     │
└────────────────────────────────────────────────────────┘
        │                                 │
        ▼ (บันทึกข้อมูลและ Audit Trail)     ▼ (ยิงแจ้งเตือนพร้อมปุ่ม Inline Button)
[ PostgreSQL / Supabase ]        [ Telegram Bot API ]
                                          │
                                          ▼
                                [ กลุ่ม Telegram หอผู้ป่วย ]
                                 (กดปุ่มรับทราบผลในแชทได้)
                                          │
                                          ▼ (Two-way Webhook Callback)
                                [ อัปเดตข้อความ & ปิดแจ้งเตือน ]
```

---

## 🛠️ จุดเด่นของระบบที่พัฒนา (Key Features)

1. **ปุ่มรับทราบผลบน Web Dashboard โดยตรง (Web Acknowledge):**
   - พยาบาลหรือนักเทคนิคการแพทย์สามารถกดปุ่ม `[ ✅ กดยืนยันรับทราบผล ]` บนการ์ดเคสในหน้าเว็บได้ทันที
   - ระบบจะอัปเดตสถานะเป็น `ACKNOWLEDGED` และไปลบปุ่มใน Telegram พร้อมระบุว่า *"รับทราบแล้วผ่าน Web Dashboard"* ทันที
2. **ระบบเชื้อดื้อยา AMR (Antimicrobial Resistance Surveillance):**
   - มีปุ่มลัดมาตรฐานสำหรับ: **CRAB**, **CRE**, **MRSA**, **VRE**, **MDR-Pseudomonas**, **ESBL**
   - ดึงข้อมูลความไวต่อยา (Antibiogram AST) และมาตรการควบคุมการติดเชื้อ (เช่น Contact Precautions) แสดงให้อัตโนมัติ
3. **ระบบการเตือนอย่างสุภาพ (Gentle Escalation - No Spam):**
   - **0 นาที:** ส่งแจ้งเตือนหลักเข้า Telegram
   - **10 นาที:** ส่งแจ้งเตือนซ้ำสุภาพ **1 ครั้ง**
   - **15 นาที (Escalated):** ขึ้น Danger Zone สีแดงกะพริบบนหน้าจอ แสดงเบอร์โทรศัพท์สายในของวอร์ด และส่งแจ้งเตือนเข้า Telegram **1 ครั้งสุดท้าย** (ไม่สแปมข้อความซ้ำ)
4. **รายงานตัวชี้วัด HA/CQI & สถิติเชื้อดื้อยา:**
   - คำนวณ Median Result-to-Acknowledgement Time (เป้าหมาย $\le 5$ นาที)
   - คำนวณ % รับทราบภายใน 15 นาที (เป้าหมาย $\ge 95\%$)
   - สรุปเคสเชื้อดื้อยาประจำเดือนสำหรับคณะกรรมการ IC
   - ส่งออก Audit Trail เป็นไฟล์ CSV ได้ในคลิกเดียว

---

## ⚙️ การตั้งค่า Environment Variables (`.env`)

```env
# ฐานข้อมูล Supabase Cloud PostgreSQL
DATABASE_URL="postgresql://postgres.tgctyouhzsyizlosrmqh:euKpcT2ScEMIaHMW@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"

# Telegram Bot Token และ Chat ID (ใช้ตัวเดิมของคุณ)
TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
TELEGRAM_CHAT_ID="YOUR_TELEGRAM_GROUP_CHAT_ID"
```

---

## 🖥️ วิธีการรันระบบใช้งาน (How to Run)

### 1. วิธีง่ายที่สุด (Double-click):
ดับเบิลคลิกไฟล์ **`START_SMART_CRITICAL.bat`** บน Desktop เพื่อเปิดระบบอัตโนมัติ

### 2. วิธีรันผ่าน Terminal:
```bash
# ติดตั้ง dependencies (ทำครั้งแรก)
npm install

# รันโหมด Development
npm run dev

# เข้าใช้งานผ่านเบราว์เซอร์
http://localhost:3000
```

---

## 📡 การตั้งค่า Telegram Webhook (เมื่อ Deploy ขึ้น Production)

เมื่อนำขึ้น Production (เช่น Vercel หรือเซิร์ฟเวอร์โรงพยาบาล) ให้ตั้งค่า Webhook เพียงครั้งเดียวด้วยคำสั่ง:

```bash
curl -F "url=https://your-domain.com/api/telegram/webhook" https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook
```
