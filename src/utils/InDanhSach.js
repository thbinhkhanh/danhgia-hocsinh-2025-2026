import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * In danh sách học sinh của một lớp trực tiếp trên trình duyệt
 * @param {string} className - Tên lớp (ví dụ: "4.5_CN")
 */
export const inDanhsach = async (className) => {
  if (!className) {
    alert("❌ Thiếu tên lớp để in danh sách!");
    return;
  }

  try {
    // 🔹 Lấy dữ liệu từ Firestore
    const classDocRef = doc(db, "DANHSACH", className);
    const classSnap = await getDoc(classDocRef);

    if (!classSnap.exists()) {
      alert(`Không tìm thấy danh sách học sinh của lớp "${className}"`);
      return;
    }

    const data = classSnap.data();

    // 🔹 Chuyển dữ liệu học sinh sang mảng
    let students = Object.entries(data).map(([maDinhDanh, info]) => ({
      maDinhDanh,
      hoVaTen: info.hoVaTen || "",
      ghiChu: "",
    }));

    // 🔹 Sắp xếp theo tên (từ phải sang trái)
    students.sort((a, b) => {
      const partsA = a.hoVaTen.replace(/\//g, " ").trim().split(/\s+/);
      const partsB = b.hoVaTen.replace(/\//g, " ").trim().split(/\s+/);
      const len = Math.max(partsA.length, partsB.length);
      for (let i = 1; i <= len; i++) {
        const wordA = partsA[partsA.length - i] || "";
        const wordB = partsB[partsB.length - i] || "";
        const cmp = wordA.localeCompare(wordB, "vi", { sensitivity: "base" });
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    // 🔹 Thêm STT
    students = students.map((stu, idx) => ({
      stt: idx + 1,
      ...stu,
    }));

    // 🔹 HTML nội dung in
    const htmlContent = `
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Danh sách HS lớp ${className}</title>
        <style>
          @page {
            size: A4 portrait;
            margin-top: 0.5in;
            margin-bottom: 0.25in;
            margin-left: 0.5in;
            margin-right: 0.5in;
          }
          body {
            font-family: "Times New Roman", serif;
            font-size: 14px;
            color: #000;
          }
          .school-name {
            text-align: left;
            font-weight: bold;
            margin-bottom: 5px;
            color: #000;
          }
          .title {
            text-align: center;
            color: #0d47a1;
            font-size: 20px;
            margin-top: 10px;
            margin-bottom: 20px; /* ✅ cách bảng 1 hàng trống */
          }
          .subtext {
            text-align: center;
            font-size: 14px;
            margin-top: -12px;
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #000;
            padding: 2px 4px;
          }
          th {
            background-color: #1976d2;
            color: white;
            text-align: center;
            vertical-align: middle;
          }
          td {
            vertical-align: middle;
          }
          td:nth-child(3) {
            text-align: left;
            padding-left: 10px; /* ✅ thêm khoảng cách trái */
          }
          td:nth-child(1), td:nth-child(2), td:nth-child(4) {
            text-align: center;
          }
          tr {
            height: 28px;
          }
        </style>
      </head>
      <body>
        <div class="school-name">TRƯỜNG TIỂU HỌC BÌNH KHÁNH</div>

        <h1 class="title">DANH SÁCH HỌC SINH LỚP ${className}</h1>

        <div class="subtext">(Năm học ${new Date().getFullYear()} - ${new Date().getFullYear() + 1})</div>

        <table>
          <thead>
            <tr>
              <th style="width:6%;">STT</th>
              <th style="width:20%;">MÃ Đ.DANH</th>
              <th style="width:42%;">HỌ VÀ TÊN</th>
              <th style="width:32%;">GHI CHÚ</th>
            </tr>
          </thead>
          <tbody>
            ${students
              .map(
                (s) => `
              <tr>
                <td>${s.stt}</td>
                <td>${s.maDinhDanh}</td>
                <td>${s.hoVaTen}</td>
                <td>${s.ghiChu}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // 🔹 Mở cửa sổ in
    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // ✅ Đợi nội dung tải xong rồi mới in
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  } catch (err) {
    console.error("❌ Lỗi khi in danh sách:", err);
    alert("In danh sách thất bại. Vui lòng thử lại!");
  }
};
