import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";

/**
 * Xuất kết quả kiểm tra ra Excel đẹp
 * @param {Array} results - Mảng kết quả học sinh
 * @param {string} className - Tên lớp
 * @param {string} mon - Tên môn
 */
export const exportKetQuaExcel = async (results, className, mon) => {
  if (!results || results.length === 0) {
    alert("Không có dữ liệu để xuất Excel!");
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Kết quả", {
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
    });

    // 🔹 Tiêu đề
    const titleRow = sheet.addRow([`KẾT QUẢ KIỂM TRA`]);
    titleRow.font = { size: 14, bold: true, color: { argb: "FF0D47A1" } };
    sheet.mergeCells(`A1:G1`);
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 28;
    sheet.addRow([]);

    // 🔹 Header
    const headerKeys = ["STT", "HỌ VÀ TÊN", "Lớp", "Môn", "Ngày", "Thời gian", "Điểm"];
    const headerRow = sheet.addRow(headerKeys);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1976D2" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // 🔹 Dữ liệu
    results.forEach((r, idx) => {
      const row = sheet.addRow([
        r.stt || idx + 1,
        r.hoVaTen || "",
        r.lop || "",
        r.mon || "",
        r.ngayKiemTra || "",
        r.thoiGianLamBai || "",
        r.diem || "",
      ]);
      row.height = 30;
      row.eachCell((cell, colNumber) => {
        const key = headerKeys[colNumber - 1];
        cell.alignment = {
          horizontal: key === "HỌ VÀ TÊN" ? "left" : "center",
          vertical: "middle",
          wrapText: true,
          indent: key === "HỌ VÀ TÊN" ? 1 : 0,
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // 🔹 Đặt độ rộng cột
    sheet.columns = [
      { width: 6 },   // STT
      { width: 30 },  // HỌ VÀ TÊN
      { width: 10 },  // Lớp
      { width: 12 },  // Môn
      { width: 15 },  // Ngày
      { width: 15 },  // Thời gian
      { width: 10 },  // Điểm
    ];

    // 💾 Xuất file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Ket qua_${className}_${mon}.xlsx`);
  } catch (err) {
    console.error("❌ Lỗi khi xuất Excel:", err);
    alert("Xuất Excel thất bại!");
  }
};
