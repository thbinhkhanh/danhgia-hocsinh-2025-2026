// folderUploadUtils.js

export const handleFolderUploadLogic = async ({
  e,
  XLSX,
  normalizeText,
  cleanValue,
  getValueByLabel,     // <-- Bổ sung
  getLocationDate,     // <-- Bổ sung
  getNLPCLevels,       // <-- Bổ sung
  getNLPCNote,         // <-- Bổ sung
  extractStudentsFromExcelFiles,
  selectedClass,
  // Các hàm callback cập nhật state
  setSnackbar,
  setSelectedTermLabel,
  setStudents,
  setSelectedStudentIndex
}) => {
  const files = Array.from(e.target.files || []);

  if (files.length === 0) return;

  try {
    // Chỉ kiểm tra file Excel đầu tiên
    const firstFile = files.find(file =>
      /\.(xlsx|xls)$/i.test(file.name)
    );

    if (!firstFile) {
      setSnackbar({
        open: true,
        message: "⚠️ Không tìm thấy file Excel trong thư mục!",
        severity: "warning"
      });
      return;
    }

    // Đọc file đầu tiên để kiểm tra A1
    const buffer = await firstFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const cellA1 = cleanValue(
      worksheet?.A1?.v ?? ""
    );

    // Kiểm tra nội dung A1
    if (
      !normalizeText(cellA1).includes(
        normalizeText("PHIẾU ĐÁNH GIÁ HỌC TẬP")
      )
    ) {
      setSnackbar({
        open: true,
        message: "❌ Dữ liệu không hợp lệ! Phải chọn thư mục chứa PHIẾU ĐÁNH GIÁ HỌC TẬP.",
        severity: "error"
      });
      return;
    }

    // File hợp lệ: truyền đầy đủ các hàm helper vào extractStudentsFromExcelFiles
    const result = await extractStudentsFromExcelFiles({
      files,
      XLSX,
      normalizeText,
      cleanValue,
      getValueByLabel,
      getLocationDate,
      getNLPCLevels,
      getNLPCNote,
      selectedClass
    });

    if (result.totalFiles === 0) {
      setSnackbar({
        open: true,
        message: "⚠️ Không tìm thấy file Excel hợp lệ trong thư mục!",
        severity: "warning"
      });
      return;
    }

    if (result.selectedTermLabel) {
      setSelectedTermLabel(result.selectedTermLabel);
    }

    if (result.students.length > 0) {
      setStudents(result.students);
      setSelectedStudentIndex(0);

      setSnackbar({
        open: true,
        message: `✅ Đã tải thành công ${result.students.length} học sinh!`,
        severity: "success"
      });
    } else {
      setSnackbar({
        open: true,
        message: "⚠️ Không trích xuất được dữ liệu học sinh từ thư mục!",
        severity: "error"
      });
    }

  } catch (error) {
    console.error("Folder upload error:", error); // Giúp bạn xem lỗi cụ thể trong F12 Console nếu còn vấn đề khác
    setSnackbar({
      open: true,
      message: "❌ Có lỗi xảy ra khi đọc dữ liệu Excel!",
      severity: "error"
    });

  } finally {
    if (e.target) {
      e.target.value = "";
    }
  }
};