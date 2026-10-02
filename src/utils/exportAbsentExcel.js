import ExcelJS from "exceljs/dist/exceljs.min.js";
import dayjs from "dayjs";

// =========================
// ĐỊNH DẠNG HỌ TÊN
// =========================
export const formatHoTen = (hoVaTen = "") => {
  return hoVaTen
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

// =========================
// XUẤT EXCEL DANH SÁCH VẮNG
// =========================
export const exportAbsentExcel = async ({
  selectedClass,
  students,
  monthDays,
  monthlyAttendance,
  attendanceDate,
}) => {
  if (!selectedClass || students.length === 0) {
    return;
  }

  // Những ngày có ít nhất 1 học sinh vắng
  const absentDates = monthDays.filter((date) =>
    students.some(
      (student) =>
        monthlyAttendance[
          student.maDinhDanh
        ]?.[date] === true
    )
  );

  if (absentDates.length === 0) {
    alert("Không có học sinh vắng trong tháng này.");
    return;
  }

  // Chỉ lấy học sinh có ít nhất 1 ngày vắng
  const absentStudents = students.filter((student) =>
    absentDates.some(
      (date) =>
        monthlyAttendance[
          student.maDinhDanh
        ]?.[date] === true
    )
  );

  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet(
    "Danh sách vắng"
  );

  const totalColumns =
    2 + absentDates.length;

  // =========================
  // DÒNG 1: TIÊU ĐỀ
  // =========================
  worksheet.mergeCells(
    1,
    1,
    1,
    totalColumns
  );

  const titleCell =
    worksheet.getCell(1, 1);

  titleCell.value =
    "ĐIỂM DANH TIN HỌC";

  titleCell.font = {
    name: "Aptos",
    bold: true,
    size: 12,
  };

  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.getRow(1).height = 28;

  // =========================
  // DÒNG 2: LỚP
  // =========================
  worksheet.mergeCells(
    2,
    1,
    2,
    totalColumns
  );

  const classCell =
    worksheet.getCell(2, 1);

  classCell.value =
    `LỚP: ${selectedClass}`;

  classCell.font = {
    name: "Aptos",
    bold: true,
    size: 12,
  };

  classCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.getRow(2).height = 28;

  // =========================
  // DÒNG 3: TRỐNG
  // =========================
  worksheet.getRow(3).height = 28;

  // =========================
  // DÒNG 4: TIÊU ĐỀ BẢNG
  // =========================
  worksheet.getCell(4, 1).value =
    "STT";

  worksheet.getCell(4, 2).value =
    "HỌ VÀ TÊN";

  absentDates.forEach(
    (date, index) => {
      worksheet.getCell(
        4,
        index + 3
      ).value =
        dayjs(date).format(
          "DD/MM/YYYY"
        );
    }
  );

  const headerRow =
    worksheet.getRow(4);

  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Aptos",
      bold: true,
      size: 12,
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // =========================
  // DỮ LIỆU HỌC SINH
  // =========================
  absentStudents.forEach(
    (student, index) => {
      const rowNumber = index + 5;

      worksheet.getCell(
        rowNumber,
        1
      ).value = index + 1;

      worksheet.getCell(
        rowNumber,
        2
      ).value = formatHoTen(
        student.hoVaTen
      );

      absentDates.forEach(
        (date, dateIndex) => {
          const isAbsent =
            monthlyAttendance[
              student.maDinhDanh
            ]?.[date] === true;

          worksheet.getCell(
            rowNumber,
            dateIndex + 3
          ).value = isAbsent
            ? "X"
            : "";
        }
      );

      const row =
        worksheet.getRow(rowNumber);

      row.height = 28;

      row.eachCell(
        (cell, colNumber) => {
          cell.font = {
            name: "Aptos",
            size: 12,
          };

          cell.alignment = {
            horizontal:
              colNumber === 2
                ? "left"
                : "center",
            vertical: "middle",
          };

          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      );
    }
  );

  // =========================
  // ĐỘ RỘNG CỘT
  // =========================
  worksheet.getColumn(1).width = 8;
  worksheet.getColumn(2).width = 30;

  absentDates.forEach(
    (_, index) => {
      worksheet.getColumn(
        index + 3
      ).width = 15;
    }
  );

  // =========================
  // XUẤT FILE
  // =========================
  const monthName =
    dayjs(attendanceDate).format(
      "MM-YYYY"
    );

  const fileName =
    `Danh_sach_hoc_sinh_vang_${selectedClass}_${monthName}.xlsx`;

  const buffer =
    await workbook.xlsx.writeBuffer();

  const blob = new Blob(
    [buffer],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );

  const url =
    window.URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
};