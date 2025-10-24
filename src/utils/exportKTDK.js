// ✅ exportKTDK.js
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";

/**
 * Xuất danh sách kiểm tra định kỳ ra Excel (giấy ngang, ô tự co giãn)
 * @param {Array} students - Mảng học sinh
 * @param {string} className - Tên lớp (ví dụ: "4.1")
 * @param {string} term - Học kỳ ("HK1" hoặc "HK2" hoặc "CN")
 */
export const exportKTDK = async (students, className, term = "HK1") => {
  if (!students || students.length === 0) {
    alert("❌ Không có dữ liệu học sinh để xuất!");
    return;
  }

  try {
    // 🧾 Tạo workbook và worksheet
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("KTĐK", {
      pageSetup: {
        paperSize: 9, // A4
        orientation: "landscape", // ✅ giấy ngang
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          top: 0.5,
          bottom: 0.5,
          left: 0.5,
          right: 0.5,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    // 🔹 Tiêu đề trường
    const schoolRow = sheet.addRow(["TRƯỜNG TIỂU HỌC BÌNH KHÁNH"]);
    schoolRow.font = { bold: true, size: 12 };
    sheet.mergeCells(`A1:H1`);
    schoolRow.alignment = { horizontal: "left" };

    // 🔹 Tiêu đề chính
    const titleRow = sheet.addRow([`DANH SÁCH KIỂM TRA ĐỊNH KỲ LỚP ${className}`]);
    titleRow.font = { bold: true, size: 14, color: { argb: "FF0D47A1" } };
    sheet.mergeCells(`A2:H2`);
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 25;

    // 🔹 Học kỳ & Năm học (ví dụ: "Học kì I – NH: 2025-2026")
    const currentYear = new Date().getFullYear();
    const subRow = sheet.addRow([
      `Học kì ${term === "HK1" ? "I" : term === "HK2" ? "II" : "Cả năm"} – NH: ${currentYear}-${currentYear + 1}`,
    ]);
    subRow.font = { italic: true, size: 12 };
    sheet.mergeCells(`A3:H3`);
    subRow.alignment = { horizontal: "center" };
    sheet.addRow([]);

    // 🔹 Header
    const header = [
      "STT",
      "Họ và tên",
      "ĐGTX",
      "Lí thuyết",
      "Thực hành",
      "Tổng cộng",
      "Mức đạt",
      "Nhận xét",
    ];
    const headerRow = sheet.addRow(header);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1976D2" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // 🔹 Ghi dữ liệu học sinh
    students.forEach((s, idx) => {
      const row = sheet.addRow([
        idx + 1,
        s.hoVaTen,
        s.dgtx || "",
        s.tracNghiem || "",
        s.thucHanh || "",
        s.tongCong || "",
        s.xepLoai || "",
        s.nhanXet || "",
      ]);

      row.eachCell((cell, col) => {
        cell.font = { size: 12 };
        cell.alignment = {
          vertical: "middle",
          horizontal: col === 2 || col === 8 ? "left" : "center",
          wrapText: true, // ✅ tự co giãn dòng
          indent: col === 2 || col === 8 ? 1 : 0,
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // 🔹 Độ rộng cột
    sheet.columns = [
      { width: 6 },   // STT
      { width: 35 },  // Họ và tên
      { width: 10 },  // ĐGTX
      { width: 11 },  // Lí thuyết
      { width: 11 },  // Thực hành
      { width: 11 },  // Tổng cộng
      { width: 11 },  // Mức đạt
      { width: 45 },  // Nhận xét
    ];

    // 💾 Xuất file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `KTĐK_${className}_${term}.xlsx`);
  } catch (err) {
    console.error("❌ Lỗi khi xuất Excel:", err);
    alert("Xuất danh sách KTĐK thất bại!");
  }
};
