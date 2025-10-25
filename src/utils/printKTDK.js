/**
 * In danh sách kiểm tra định kỳ trực tiếp trên trình duyệt
 * @param {Array} students - Mảng học sinh đang hiển thị trong bảng
 * @param {string} className - Tên lớp (VD: "4.1")
 * @param {string} term - Học kỳ ("HK1", "HK2" hoặc "CN")
 */
export const printKTDK = (students, className, term = "HK1") => {
  if (!students || students.length === 0) {
    alert("❌ Không có dữ liệu để in!");
    return;
  }

  // 🔹 Lấy năm học và học kỳ
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const hocKy =
    term === "HK1" ? "Học kì I" : term === "HK2" ? "Học kì II" : "Cả năm";

  // 🔹 Sắp xếp theo tên
  const sorted = [...students].sort((a, b) => {
    const nameA = a.hoVaTen.toLowerCase().trim().split(" ").pop();
    const nameB = b.hoVaTen.toLowerCase().trim().split(" ").pop();
    return nameA.localeCompare(nameB, "vi", { sensitivity: "base" });
  });

  // 🔹 Thêm STT
  const list = sorted.map((s, i) => ({ stt: i + 1, ...s }));

  // 🔹 HTML in
  const htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>KTĐK ${className}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 0.5in;
        }
        body {
          font-family: "Times New Roman", serif;
          font-size: 13px;
          color: #000;
        }
        .school-name {
          text-align: left;
          font-weight: bold;
          font-size: 14px;
        }
        .title {
          text-align: center;
          color: #0d47a1;
          font-weight: bold;
          font-size: 18px;
          margin-top: 5px;
        }
        .subtext {
          text-align: center;
          font-size: 14px;
          margin-top: 2px;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed; /* ✅ giúp chia cột cố định */
        }
        th, td {
          border: 1px solid #000;
          padding: 3px 4px;
          line-height: 1.2;
          word-wrap: break-word;
          white-space: normal;
        }
        th {
          background-color: #1976d2;
          color: #fff;
          text-align: center;
          vertical-align: middle;
        }
        td {
          vertical-align: middle;
          text-align: center;
        }
        td:nth-child(2),
        td:last-child {
          text-align: left;
          padding-left: 6px;
        }
        tr {
          height: auto;
        }
      </style>
    </head>
    <body>
      <div class="school-name">TRƯỜNG TIỂU HỌC BÌNH KHÁNH</div>
      <div class="title">DANH SÁCH KIỂM TRA ĐỊNH KỲ LỚP ${className}</div>
      <div class="subtext">${hocKy} – NH: ${currentYear}-${nextYear}</div>

      <table>
        <thead>
          <tr>
            <th style="width:5%">STT</th>
            <th style="width:23%">Họ và tên</th>
            <th style="width:7%">ĐGTX</th>
            <th style="width:7%">Lí<br>thuyết</th>
            <th style="width:7%">Thực<br>hành</th>
            <th style="width:7%">Tổng<br>cộng</th>
            <th style="width:7%">Mức<br>đạt</th>
            <th style="width:38%">Nhận xét</th>
          </tr>
        </thead>
        <tbody>
          ${list
            .map(
              (s) => `
            <tr>
              <td>${s.stt}</td>
              <td>${s.hoVaTen || ""}</td>
              <td>${s.dgtx || ""}</td>
              <td>${s.tracNghiem || ""}</td>
              <td>${s.thucHanh || ""}</td>
              <td>${s.tongCong || ""}</td>
              <td>${s.xepLoai || ""}</td>
              <td>${s.nhanXet || ""}</td>
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
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};
