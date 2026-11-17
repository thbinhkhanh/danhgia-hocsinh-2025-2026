/**
 * Xử lý đọc và kiểm tra file Excel upload
 */
export const processExcelFile = async (event, XLSX, normalizeText, findHeaderRow, findFirstStudentRow) => {
  const file = event.target.files?.[0];

  if (!file) {
    return { success: false, cancelled: true };
  }

  const extension = file.name
    .split(".")
    .pop()
    .toLowerCase();

  if (!["xlsx", "xls"].includes(extension)) {
    throw new Error("Vui lòng chọn file Excel .xlsx hoặc .xls!");
  }

  const arrayBuffer = await file.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: false,
    cellStyles: true
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("File Excel không có trang tính.");
  }

  const selectedSheet =
    workbook.SheetNames.find((name) =>
      normalizeText(name).includes("bangtonghop")
    ) || workbook.SheetNames[0];

  const ws = workbook.Sheets[selectedSheet];

  if (!ws || !ws["!ref"]) {
    throw new Error("Không tìm thấy dữ liệu trong file Excel.");
  }

  const range = XLSX.utils.decode_range(ws["!ref"]);

  const headerRow = findHeaderRow(ws, range);
  const firstStudentRow = findFirstStudentRow(ws, range);

  if (headerRow === -1) {
    throw new Error("Không tìm thấy dòng tiêu đề STT và Họ và tên học sinh.");
  }

  if (firstStudentRow === -1) {
    throw new Error("Không tìm thấy dữ liệu học sinh trong file.");
  }

  return {
    success: true,
    file,
    ws,
    range
  };
};