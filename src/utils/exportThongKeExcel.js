import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";

/**
 * Xuất Excel thống kê (kẻ khung – màu – header 2 dòng)
 * @param {Array} rowsToRender  Dữ liệu thống kê
 * @param {Object} config      { hocKy, mon }
 */
export const exportThongKeExcel = async (rowsToRender, config) => {
  if (!rowsToRender || rowsToRender.length === 0) {
    alert("Không có dữ liệu để xuất Excel!");
    return;
  }

  try {
    // ===============================
    // 🔹 NĂM HỌC
    // ===============================
    const getSchoolYear = () => {
      const now = new Date();
      const y = now.getFullYear();
      return now.getMonth() + 1 >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
    };

    const schoolYear = getSchoolYear();
    const subjectLabel =
      config?.mon === "Công nghệ" ? "CÔNG NGHỆ" : "TIN HỌC";

    // ===============================
    // 🔹 WORKBOOK
    // ===============================
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Thống kê", {
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
      },
    });

    // ===============================
    // 🔹 TIÊU ĐỀ
    // ===============================
    const row1 = sheet.addRow(["TRƯỜNG TIỂU HỌC BÌNH KHÁNH"]);
    sheet.mergeCells("A1:H1");
    row1.font = { size: 12, bold: true, color: { argb: "FF0D47A1" } };
    row1.alignment = { horizontal: "left", vertical: "middle" };
    row1.height = 20;

    sheet.addRow([]);

    const row3 = sheet.addRow([
      `THỐNG KÊ ${config?.hocKy?.toUpperCase()} – MÔN ${subjectLabel}`,
    ]);
    sheet.mergeCells("A3:H3");
    row3.font = { size: 14, bold: true, color: { argb: "FF0D47A1" } };
    row3.alignment = { horizontal: "center", vertical: "middle" };
    row3.height = 22;

    const row4 = sheet.addRow([`Năm học: ${schoolYear}`]);
    sheet.mergeCells("A4:H4");
    row4.font = { size: 12, bold: true };
    row4.alignment = { horizontal: "center", vertical: "middle" };

    sheet.addRow([]);

    // ===============================
    // 🔹 HEADER (2 DÒNG)
    // ===============================
    sheet.addRow([
      "KHỐI / LỚP",
      "SĨ SỐ",
      "TỐT",
      "",
      "HT",
      "",
      "CHƯA HT",
      "",
    ]);

    sheet.addRow([
      "",
      "",
      "SL",
      "TL (%)",
      "SL",
      "TL (%)",
      "SL",
      "TL (%)",
    ]);

    sheet.mergeCells("A6:A7");
    sheet.mergeCells("B6:B7");
    sheet.mergeCells("C6:D6");
    sheet.mergeCells("E6:F6");
    sheet.mergeCells("G6:H6");

    [6, 7].forEach((r) => {
      sheet.getRow(r).height = 20;
      sheet.getRow(r).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1976D2" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // ===============================
    // 🔹 DỮ LIỆU
    // ===============================
    rowsToRender.forEach((row) => {
      const siSo =
        (row.tot || 0) +
        (row.hoanThanh || 0) +
        (row.chuaHoanThanh || 0);

      if (row.type === "class" && siSo === 0) return;

      const excelRow = sheet.addRow([
        row.label,
        siSo || "",
        row.tot || "",
        row.totTL || "",
        row.hoanThanh || "",
        row.hoanThanhTL || "",
        row.chuaHoanThanh || "",
        row.chuaHoanThanhTL || "",
      ]);

      excelRow.height = 22;

      excelRow.eachCell((cell, col) => {
        cell.alignment = {
          horizontal: "center", 
          vertical: "middle",
          wrapText: true,
          indent: col === 1 ? 1 : 0,
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };

        // 🔹 KHỐI
        if (row.type === "khoi") {
          cell.font = { bold: true, color: { argb: "FF0D47A1" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE3F2FD" },
          };
        }

        // 🔹 TRƯỜNG
        if (row.type === "truong") {
          cell.font = { bold: true, color: { argb: "FFD32F2F" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFEBEE" },
          };
        }
      });
    });

    // ===============================
    // 🔹 ĐỘ RỘNG CỘT
    // ===============================
    sheet.columns = [
      { width: 15 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
    ];

    // ===============================
    // 💾 LƯU FILE
    // ===============================
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Thong_ke_${config?.hocKy}_${subjectLabel}.xlsx`
    );
  } catch (err) {
    console.error("❌ Lỗi xuất Excel:", err);
    alert("Xuất Excel thất bại!");
  }
};
