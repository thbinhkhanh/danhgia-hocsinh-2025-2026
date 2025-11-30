import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";

const statusMap = {
  "Hoàn thành tốt": "T",
  "Hoàn thành": "H",
  "Chưa hoàn thành": "C",
  "": "",
};

export const exportEvaluationToExcelFromTable = async (
  students,
  selectedClass,
  weekFrom,
  weekTo
) => {
  if (!students || students.length === 0) {
    alert("Không có dữ liệu để xuất Excel!");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Đánh giá");

  // 🔹 Header Hàng 1
  const headerRow1 = ["STT", "HỌ VÀ TÊN", "LỚP"];
  for (let week = weekFrom; week <= weekTo; week++) {
    headerRow1.push(`TUẦN ${week}`, null); // 2 cột/tuần
  }
  headerRow1.push("XẾP LOẠI", "NHẬN XÉT");
  sheet.addRow(headerRow1);

  // 🔹 Header Hàng 2
  const headerRow2 = ["", "", ""];
  for (let week = weekFrom; week <= weekTo; week++) {
    headerRow2.push("HS", "GV");
  }
  headerRow2.push("", "");
  sheet.addRow(headerRow2);

  // 🔹 Merge cột cho TUẦN
  let colIndex = 4; // bắt đầu từ cột 4 (sau STT, HỌ VÀ TÊN, LỚP)
  for (let week = weekFrom; week <= weekTo; week++) {
    sheet.mergeCells(1, colIndex, 1, colIndex + 1);
    colIndex += 2;
  }

  // 🔹 Style header
  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell((cell) => {
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
  });

  // 🔹 Duyệt từng học sinh
  students.forEach((student) => {
    const weekData = [];
    for (let week = weekFrom; week <= weekTo; week++) {
      const weekId = `tuan_${week}`;
      const raw = student.statusByWeek?.[weekId];
      const hs = raw && typeof raw === "object" ? statusMap[raw.hs || ""] : statusMap[raw || ""];
      const gv = raw && typeof raw === "object" ? statusMap[raw.gv || ""] : "";
      weekData.push(hs, gv);
    }

    const rowData = [
      student.stt,
      student.hoVaTen,
      selectedClass,
      ...weekData,
      student.dgtx || "",
      student.nhanXet || "",
    ];

    const row = sheet.addRow(rowData);

    row.eachCell((cell, colNumber) => {
      let alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      if (colNumber === 2 || colNumber === rowData.length) alignment.horizontal = "left";
      cell.alignment = alignment;
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
      if (colNumber === rowData.length - 1) {
        cell.font = {
          color: cell.value === "C" ? { argb: "FFDC2626" } : { argb: "FF1976D2" },
        };
      }
    });
  });

  // 🔹 Đặt độ rộng cột
  sheet.columns.forEach((column, index) => {
    if (index === 0 || (index >= 3 && (index - 3) % 2 === 0)) column.width = 9;
    else if (index === 2) column.width = 10;
    else if (index === 1) column.width = 28.5;
    else if (index === sheet.columns.length - 2) column.width = 12;
    else if (index === sheet.columns.length - 1) column.width = 60;
  });

  // 💾 Xuất file Excel
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `Đánh giá HS ${selectedClass} tuần ${weekFrom}-${weekTo}.xlsx`);
};
