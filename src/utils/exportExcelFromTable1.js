import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";

const statusMap = {
  "Hoàn thành tốt": "T",
  "Hoàn thành": "H",
  "Chưa hoàn thành": "C",
  "": "",
};

/**
 * Xuất Excel từ dữ liệu hiện có trên bảng (students)
 * @param {Array} students - danh sách học sinh đang hiển thị
 * @param {string} selectedClass - tên lớp hiện tại
 * @param {number} weekFrom - tuần bắt đầu
 * @param {number} weekTo - tuần kết thúc
 */
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

  // 🧾 Tạo workbook và worksheet
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Đánh giá");

  // 🔹 Header gồm các tuần
  const headerKeys = ["STT", "HỌ VÀ TÊN", "LỚP"];
  for (let week = weekFrom; week <= weekTo; week++) {
    headerKeys.push(`TUẦN ${week}`);
  }

  const headerRow = sheet.addRow(headerKeys);

  // 🔹 Style header
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1976D2" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // 🔹 Duyệt từng học sinh
  students.forEach((student) => {
    const rowData = [
      student.stt,
      student.hoVaTen,
      selectedClass,
      ...Array.from({ length: weekTo - weekFrom + 1 }, (_, i) => {
        const weekNum = weekFrom + i;
        const weekId = `tuan_${weekNum}`;
        const status = student.statusByWeek?.[weekId] || "";
        return statusMap[status] || "";
      }),
    ];

    const row = sheet.addRow(rowData);

    row.eachCell((cell, colNumber) => {
      const key = headerKeys[colNumber - 1];
      cell.alignment = {
        horizontal: key === "HỌ VÀ TÊN" ? "left" : "center",
        vertical: "middle",
      };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // 🔹 Đặt độ rộng cột hợp lý
  sheet.columns.forEach((column, index) => {
    const key = headerKeys[index];
    if (key === "STT" || key.startsWith("TUẦN")) {
      column.width = 9;
    } else if (key === "LỚP") {
      column.width = 10;
    } else if (key === "HỌ VÀ TÊN") {
      column.width = 28.5;
    }
  });

  // 💾 Xuất file Excel
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `Đánh giá HS ${selectedClass} tuần ${weekFrom}-${weekTo}.xlsx`);
};
