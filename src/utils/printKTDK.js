export const printKTDK = (students, className, selectedSemester = "Giữa kỳ I", subject = "Tin học") => {
  if (!students || students.length === 0) {
    alert("❌ Không có dữ liệu để in!");
    return;
  }

  // 🔹 Chuẩn hoá môn
  const subjectLabel =
    subject?.trim().toLowerCase() === "công nghệ"
      ? "CÔNG NGHỆ"
      : "TIN HỌC";

  // 🔹 Xác định termDoc
  let termDoc;
  switch (selectedSemester) {
    case "Giữa kỳ I":
      termDoc = "GKI";
      break;
    case "Cuối kỳ I":
      termDoc = "CKI";
      break;
    case "Giữa kỳ II":
      termDoc = "GKII";
      break;
    default:
      termDoc = "CN";
      break;
  }

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const hocKy =
    termDoc === "GKI" ? "Giữa kỳ I" :
    termDoc === "CKI" ? "Cuối kỳ I" :
    termDoc === "GKII" ? "Giữa kỳ II" :
    "Cả năm";

  // 🔹 Sắp xếp theo tên cuối
  const sorted = [...students].sort((a, b) => {
    const nameA = a.hoVaTen.toLowerCase().trim().split(" ").pop();
    const nameB = b.hoVaTen.toLowerCase().trim().split(" ").pop();
    return nameA.localeCompare(nameB, "vi", { sensitivity: "base" });
  });

  const list = sorted.map((s, i) => ({ stt: i + 1, ...s }));

  // 🔹 HTML in
  const htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>KTĐK ${className}</title>
      <style>
        @page { size: A4 landscape; margin: 0.5in; }
        body { font-family: "Times New Roman", serif; font-size: 13px; color: #000; }
        .school-name { text-align: left; font-weight: bold; font-size: 14px; }
        .title { text-align: center; color: #0d47a1; font-weight: bold; font-size: 18px; margin-top: 5px; }
        .subtext { text-align: center; font-size: 14px; margin-top: 2px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #000; padding: 3px 4px; line-height: 1.2; word-wrap: break-word; white-space: normal; }
        th { background-color: #fff; color: #0d47a1; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #000; }
        td { vertical-align: middle; text-align: center; }
        td:nth-child(2), td:last-child { text-align: left; padding-left: 6px; }
        tr { height: auto; }
      </style>
    </head>
    <body>
      <div class="school-name">TRƯỜNG TIỂU HỌC BÌNH KHÁNH</div>
      <div class="title">MÔN ${subjectLabel} - LỚP ${className}</div>
      <div class="subtext" style="font-size:16px; margin-top:10px; margin-bottom:15px;">
        ${hocKy} – NH: ${currentYear}-${nextYear}
      </div>

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
          ${list.map(s => `
            <tr>
              <td>${s.stt}</td>
              <td>${s.hoVaTen || ""}</td>
              <td>${s.dgtx_mucdat || ""}</td>
              <td>${s.lyThuyet || ""}</td>
              <td>${s.thucHanh || ""}</td>
              <td>${termDoc === "GKI" || termDoc === "GKII" ? "" : s.tongCong ?? ""}</td>
              <td>${termDoc === "GKI" || termDoc === "GKII" ? s.dgtx_mucdat : s.mucDat || ""}</td>
              <td>${termDoc === "GKI" || termDoc === "GKII" ? s.dgtx_nx || "" : s.nhanXet || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};
