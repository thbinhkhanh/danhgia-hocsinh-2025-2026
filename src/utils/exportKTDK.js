import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";

/**
 * Xuất danh sách kiểm tra định kỳ ra Excel (giữ định dạng bảng cũ)
 * @param {Array} students - Mảng học sinh
 * @param {string} className - Tên lớp
 * @param {string} term - GKI, CKI, GKII, CN
 */
export const exportKTDK = async (students, className, term = "CKI", subject = "Tin học", namHoc) => {
  if (!students || students.length === 0) {
    alert("❌ Không có dữ liệu học sinh để xuất!");
    return;
  }

  const termMap = {
    GKI: "Giữa kì I",
    CKI: "Cuối kì I",
    GKII: "Giữa kì II",
    CN: "Cuối năm",
  };
  const termLabel = termMap[term] || term;
    const subjectLabel =
    subject?.toLowerCase() === "công nghệ"
      ? "CÔNG NGHỆ"
      : "TIN HỌC";


  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("KTĐK", {
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
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
    sheet.mergeCells(`A1:H1`);
    schoolRow.font = { bold: true, size: 12 };
    schoolRow.alignment = {
      horizontal: "left",
      vertical: "middle", // 👈 căn giữa theo chiều cao
    };

    // nếu muốn tăng chiều cao cho đẹp
    sheet.getRow(1).height = 35;
    // 🔹 Tiêu đề chính
    //const titleRow = sheet.addRow([`KẾT QUẢ KTĐK - LỚP ${className}`]);
    const titleRow = sheet.addRow([
      `MÔN ${subjectLabel} - LỚP ${className}`,
    ]);

    titleRow.font = { bold: true, size: 14, color: { argb: "FF0D47A1" } };
    sheet.mergeCells(`A2:H2`);
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 35;

    // 🔹 Dòng học kỳ & năm học
    const subRow = sheet.addRow([`${termLabel} – NH: ${namHoc}`]);
    subRow.font = { italic: true, size: 12 };
    sheet.mergeCells(`A3:H3`);
    subRow.alignment = {
      horizontal: "center",
      vertical: "middle", // 👈 căn giữa theo chiều cao
    };
    // (khuyến nghị) tăng chiều cao cho đẹp
    sheet.getRow(3).height = 35;

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
    headerRow.height = 35;
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

    // 🔹 Dữ liệu (sửa field đúng)
    students.forEach((s, idx) => {
      const row = sheet.addRow([
        idx + 1,
        s.hoVaTen ?? "",
        s.dgtx_mucdat ?? "",
        s.lyThuyet ?? "",
        s.thucHanh ?? "",
        s.tongCong ?? "",
        s.mucDat ?? "",
        s.nhanXet ?? "",
      ]);

      row.eachCell((cell, col) => {
        cell.font = { size: 12 };
        cell.alignment = {
          vertical: "middle",
          horizontal: col === 2 || col === 8 ? "left" : "center",
          wrapText: true,
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
      { width: 6 },
      { width: 35 },
      { width: 10 },
      { width: 11 },
      { width: 11 },
      { width: 11 },
      { width: 11 },
      { width: 45 },
    ];

    // 💾 Xuất file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    //saveAs(blob, `KTĐK_${className}_${term}.xlsx`);
    saveAs(blob, `${subject}_${term}_${className}.xlsx`);
  } catch (err) {
    console.error("❌ Lỗi khi xuất Excel:", err);
    alert("Xuất danh sách KTĐK thất bại!");
  }
};
