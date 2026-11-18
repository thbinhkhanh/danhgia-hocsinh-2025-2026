
/**
 * Xử lý đọc và kiểm tra file Excel upload
 */
export const processExcelFile = async (
  event,
  XLSX,
  normalizeText,
  findHeaderRow,
  findFirstStudentRow
) => {
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

  // Tìm sheet theo 1 trong 2 điều kiện
  const selectedSheet = workbook.SheetNames.find((name) => {
    // Điều kiện 1: Tên sheet chính xác
    if (name === "BangTongHopKetQuaGiaoDuc") {
      return true;
    }

    // Điều kiện 2: Tiêu đề tại ô A3 hoặc A4
    const ws = workbook.Sheets[name];

    const titleA3 = String(ws?.A3?.v ?? "");
    const titleA4 = String(ws?.A4?.v ?? "");

    return (
      titleA3.includes("BẢNG TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ GIÁO DỤC") ||
      titleA4.includes("BẢNG TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ GIÁO DỤC")
    );
  });

  if (!selectedSheet) {
    throw new Error(
      "File không hợp lệ! Không tìm thấy sheet tổng hợp kết quả đánh giá giáo dục."
    );
  }

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
