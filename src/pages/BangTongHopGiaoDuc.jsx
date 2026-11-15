
import React, { useMemo, useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";

import {
  Box,
  Card,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  InputAdornment,
  Paper,
} from "@mui/material";
import { db } from "../firebase";
import {
  Download,
  Printer,
  FileSpreadsheet,
  FolderUp,
  Search,
  GraduationCap,
  Edit,
  Settings2
} from "lucide-react";

import * as XLSX from "xlsx";
import { printBangTongHop } from "../utils/printBangTongHop";
import { Upload } from "lucide-react";
import { X } from "lucide-react";

import UploadPhanCongGVBM from "../utils/UploadPhanCongGVBM";
import CapNhatPhanCongDialog from "../dialog/CapNhatPhanCongDialog";
import BangTongHopDialog from "../dialog/BangTongHopDialog";

// ======================================================
// HÀM ĐỌC GIÁ TRỊ Ô EXCEL
// ======================================================

const getCellValue = (worksheet, row, col) => {
  const address = XLSX.utils.encode_cell({
    r: row,
    c: col
  });

  const cell = worksheet[address];

  if (!cell || cell.v === undefined || cell.v === null) {
    return "";
  }

  // Ưu tiên giá trị gốc, tránh phụ thuộc định dạng hiển thị cell.w
  return String(cell.v).trim();
};

// ======================================================
// CHUẨN HÓA CHUỖI
// ======================================================

const normalizeText = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

// ======================================================
// QUÉT TOÀN BỘ CÁC Ô CÓ DỮ LIỆU TRONG EXCEL
// Không phụ thuộc địa chỉ ô hoặc dòng cố định
// ======================================================

const getWorksheetCells = (worksheet) => {
  if (!worksheet) return [];

  return Object.keys(worksheet)
    .filter((key) => /^[A-Z]+[0-9]+$/.test(key))
    .map((address) => {
      const cell = worksheet[address];

      const position = XLSX.utils.decode_cell(address);

      return {
        address,
        row: position.r,
        col: position.c,
        value: String(cell?.v ?? "").trim()
      };
    })
    .filter((item) => item.value !== "");
};

// ======================================================
// TÌM Ô CHỨA NỘI DUNG CHỮ KÝ
// ======================================================

const findSignatures = (worksheet) => {
  const cells = getWorksheetCells(worksheet);

  // Tìm ô có nội dung Giáo viên chủ nhiệm
  const gvcnCell = cells.find((item) => {
    const value = normalizeText(item.value);

    return (
      value.includes("gv. chu nhiem") ||
      value.includes("gv chu nhiem") ||
      value.includes("giao vien chu nhiem")
    );
  });

  // Tìm ô có nội dung Hiệu trưởng
  const bghCell = cells.find((item) => {
    const value = normalizeText(item.value);

    return (
      value.includes("hieu truong") ||
      value.includes("pho hieu truong")
    );
  });

  return {
    gvcn: gvcnCell ? [gvcnCell.value] : [],
    bgh: bghCell ? [bghCell.value] : []
  };
};

// ======================================================
// TÌM TÊN LỚP TRONG TOÀN BỘ WORKSHEET
// ======================================================

const findClassFromWorksheet = (worksheet) => {
  const cells = getWorksheetCells(worksheet);

  for (const item of cells) {
    const value = normalizeText(item.value);

    const match = value.match(
      /\blop\s*:?\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\b/
    );

    if (match) {
      return `${match[1]}.${match[2]}`;
    }
  }

  return "";
};

const isStudentNumber = (value) => {
  return /^\d+$/.test(String(value || "").trim());
};

const isStudentRow = (worksheet, row, startCol = 0) => {
  const stt = getCellValue(
    worksheet,
    row,
    startCol
  ).trim();

  const name = getCellValue(
    worksheet,
    row,
    startCol + 1
  ).trim();

  return isStudentNumber(stt) && name !== "";
};

// ======================================================
// TÌM DÒNG TIÊU ĐỀ
// ======================================================

const findHeaderRow = (worksheet, range) => {
  // Kiểm tra ô A7
  const sttA7 = normalizeText(
    getCellValue(worksheet, 6, 0)
  );

  if (sttA7 === "stt") {
    return 6;
  }

  // Tìm STT ở cột A nếu không nằm tại A7
  for (let r = range.s.r; r <= range.e.r; r++) {
    const value = normalizeText(
      getCellValue(worksheet, r, 0)
    );

    if (value === "stt") {
      return r;
    }
  }

  return -1;
};

// ======================================================
// TÌM DÒNG HỌC SINH ĐẦU TIÊN
// ======================================================

const findFirstStudentRow = (worksheet, range) => {
  for (let r = range.s.r; r <= range.e.r; r++) {
    if (
      isStudentRow(
        worksheet,
        r,
        range.s.c
      )
    ) {
      return r;
    }
  }

  return -1;
};

// ======================================================
// TÌM DÒNG HỌC SINH CUỐI CÙNG
// ======================================================

const findLastStudentRow = (worksheet, range) => {
  for (let r = range.e.r; r >= range.s.r; r--) {
    if (
      isStudentRow(
        worksheet,
        r,
        range.s.c
      )
    ) {
      return r;
    }
  }

  return -1;
};

// ======================================================
// TÌM DÒNG CHỮ KÝ
// ======================================================

const findSignatureRow = (worksheet, range) => {
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const value = normalizeText(
        getCellValue(worksheet, r, c)
      );

      if (
        value.includes("gv. chu nhiem") ||
        value.includes("hieu truong") ||
        value.includes("ky va ghi ro ho ten") ||
        value.includes("ky ho ten")
      ) {
        return r;
      }
    }
  }

  return -1;
};

// ======================================================
// PHÂN LOẠI TIÊU ĐỀ
// ======================================================

const getTitleGroup = (value) => {
  const normalized = normalizeText(value);

  if (
    normalized.includes("ubnd xa") ||
    normalized.includes("th binh khanh") ||
    normalized.includes("phan hieu")
  ) {
    return "unit";
  }

  if (
    normalized.includes("bang tong hop") ||
    normalized.includes("ket qua danh gia") ||
    normalized.includes("hoc ky") ||
    normalized.includes("nam hoc")
  ) {
    return "main";
  }

  return "";
};

// ======================================================
// DỰNG TIÊU ĐỀ EXCEL NHIỀU TẦNG THEO Ô GỘP
// ======================================================

const extractMultiLevelHeaders = (
  worksheet,
  range,
  headerRow,
  firstStudentRow
) => {
  const merges = worksheet["!merges"] || [];

  const headerRows = [];
  const occupied = new Set();

  const lastHeaderRow = firstStudentRow - 1;

  for (
    let r = headerRow;
    r <= lastHeaderRow;
    r++
  ) {
    const cells = [];

    for (
      let c = range.s.c;
      c <= range.e.c;
      c++
    ) {
      const key = `${r}-${c}`;

      if (occupied.has(key)) {
        continue;
      }

      const merge = merges.find(
        (m) =>
          r >= m.s.r &&
          r <= m.e.r &&
          c >= m.s.c &&
          c <= m.e.c
      );

      let rowSpan = 1;
      let colSpan = 1;
      let value = "";

      if (merge) {
        const startRow = Math.max(
          merge.s.r,
          headerRow
        );

        const endRow = Math.min(
          merge.e.r,
          lastHeaderRow
        );

        const startCol = Math.max(
          merge.s.c,
          range.s.c
        );

        const endCol = Math.min(
          merge.e.c,
          range.e.c
        );

        if (
          r !== startRow ||
          c !== startCol
        ) {
          continue;
        }

        rowSpan = endRow - startRow + 1;
        colSpan = endCol - startCol + 1;

        value = getCellValue(
          worksheet,
          merge.s.r,
          merge.s.c
        ).trim();

        for (
          let mr = startRow;
          mr <= endRow;
          mr++
        ) {
          for (
            let mc = startCol;
            mc <= endCol;
            mc++
          ) {
            if (
              mr !== startRow ||
              mc !== startCol
            ) {
              occupied.add(`${mr}-${mc}`);
            }
          }
        }
      } else {
        value = getCellValue(
          worksheet,
          r,
          c
        ).trim();
      }

      cells.push({
        id: `${r}-${c}`,
        value,
        rowSpan,
        colSpan,
        excelRow: r,
        excelCol: c
      });
    }

    headerRows.push({
      id: `header-row-${r}`,
      excelRow: r,
      cells
    });
  }

  return headerRows;
};

// ======================================================
// - Dùng ID ô tiêu đề thay vì xoay cả cột.
// ======================================================

const getRotatedHeaderCellIds = (
  worksheet,
  headerRows,
  range
) => {
  const rotatedIds = new Set();

  if (!headerRows?.length) {
    return rotatedIds;
  }

  const targetHeaders = new Set([
    "yeu nuoc",
    "nhan ai",
    "cham chi",
    "trung thuc",
    "trach nhiem",
    "tu chu va tu hoc",
    "giao tiep va hop tac",
    "gqvd va sang tao",
    "ngon ngu",
    "tinh toan",
    "khoa hoc",
    "cong nghe",
    "tin hoc",
    "tham mi",
    "the chat",
    "am nhac",
    "mi thuat",
    "muc dat duoc",
    "diem ktdk",
    "hoan thanh xuat sac",
    "hoan thanh tot",
    "hoan thanh",
    "chua hoan thanh",
    "cuoi nam",
    "khen dot xuat",
    "chua duoc len lop"
  ]);

  const merges = worksheet["!merges"] || [];

  const allCells = headerRows.flatMap(
    (row) => row.cells || []
  );

  const getCellAt = (row, col) => {
    return allCells.find((cell) => {
      const cellStartCol = cell.excelCol;
      const cellEndCol =
        cellStartCol + (cell.colSpan || 1) - 1;

      const cellStartRow = cell.excelRow;
      const cellEndRow =
        cellStartRow + (cell.rowSpan || 1) - 1;

      return (
        row >= cellStartRow &&
        row <= cellEndRow &&
        col >= cellStartCol &&
        col <= cellEndCol
      );
    });
  };

  const getPathForColumn = (col) => {
    const path = [];

    for (
      let row = headerRows[0].excelRow;
      row <= headerRows[headerRows.length - 1].excelRow;
      row++
    ) {
      const cell = getCellAt(row, col);

      if (
        cell?.value &&
        !path.some((item) => item.id === cell.id)
      ) {
        path.push(cell);
      }
    }

    return path;
  };

  const isSubjectGroup = (path) => {
    return path.some((cell) => {
      const value = normalizeText(cell.value);

      return (
        value.includes("mon hoc va hoat dong giao duc") ||
        value === "mon hoc" ||
        value === "hoat dong giao duc"
      );
    });
  };

  const isQualityOrCompetency = (path) => {
    return path.some((cell) =>
      targetHeaders.has(normalizeText(cell.value))
    );
  };

  // Tìm các nhóm tiêu đề môn học dựa trên ô gộp
  const subjectGroups = [];

  merges.forEach((merge) => {
    if (
      merge.s.r < headerRows[0].excelRow ||
      merge.s.r >= headerRows[headerRows.length - 1].excelRow
    ) {
      return;
    }

    if (merge.e.c <= merge.s.c) {
      return;
    }

    const value = normalizeText(
      getCellValue(
        worksheet,
        merge.s.r,
        merge.s.c
      )
    );

    if (!value) return;

    const isParentSubject =
      !value.includes("diem ktdk") &&
      !value.includes("dat duoc") &&
      !value.includes("muc dat duoc") &&
      !value.includes("mon hoc va hoat dong giao duc");

    if (!isParentSubject) return;

    const groupPath = getPathForColumn(merge.s.c);

    if (!isSubjectGroup(groupPath)) return;

    subjectGroups.push({
      startCol: merge.s.c,
      endCol: merge.e.c,
      headerCell: allCells.find(
        (cell) =>
          cell.excelRow === merge.s.r &&
          cell.excelCol === merge.s.c
      ),
      label: value
    });
  });

  // Xử lý từng cột trong bảng
  for (
    let col = range.s.c + 2;
    col <= range.e.c;
    col++
  ) {
    const path = getPathForColumn(col);

    // ------------------------------------------
    // PHẨM CHẤT VÀ NĂNG LỰC
    // ------------------------------------------

    if (isQualityOrCompetency(path)) {
      const targetCell = [...path]
        .reverse()
        .find((cell) => {
          const value = normalizeText(cell.value);

          return (
            targetHeaders.has(value) &&
            (cell.colSpan || 1) === 1
          );
        });

      if (targetCell) {
        rotatedIds.add(targetCell.id);
      }

      continue;
    }

    // ------------------------------------------
    // MÔN HỌC CHỈ CÓ NHẬN XÉT
    // ------------------------------------------

    if (!isSubjectGroup(path)) {
      continue;
    }

    const group = subjectGroups.find(
      (item) =>
        col >= item.startCol &&
        col <= item.endCol
    );

    if (!group || !group.headerCell) {
      continue;
    }

    const hasKTDK = allCells.some((cell) => {
      const value = normalizeText(cell.value);

      if (!value.includes("diem ktdk")) {
        return false;
      }

      const start = cell.excelCol;
      const end =
        start + (cell.colSpan || 1) - 1;

      return (
        start >= group.startCol &&
        end <= group.endCol
      );
    });

    if (!hasKTDK) {
      rotatedIds.add(group.headerCell.id);
    }
  }

  // Bổ sung trường hợp tiêu đề môn không nằm trong ô gộp ngang:
  // lấy tiêu đề môn có nhánh con nhận xét nhưng không có Điểm KTĐK.
  const candidateCells = allCells.filter((cell) => {
    const value = normalizeText(cell.value);

    return (
      cell.colSpan === 1 &&
      value &&
      !value.includes("diem ktdk") &&
      !value.includes("dat duoc") &&
      !value.includes("muc dat duoc") &&
      !value.includes("mon hoc va hoat dong giao duc") &&
      cell.excelCol > range.s.c + 1
    );
  });

  candidateCells.forEach((cell) => {
    const path = getPathForColumn(cell.excelCol);

    if (!isSubjectGroup(path)) return;

    const isAlreadyRotated = rotatedIds.has(cell.id);
    if (isAlreadyRotated) return;

    // Chỉ xét ô tiêu đề môn nằm ở tầng trên cùng của nhánh
    // và không có Điểm KTĐK trong cùng nhánh cột.
    const hasKTDKBelow = allCells.some((child) => {
      const childValue = normalizeText(child.value);

      if (!childValue.includes("diem ktdk")) {
        return false;
      }

      return (
        child.excelCol === cell.excelCol ||
        (
          child.excelCol >= cell.excelCol &&
          child.excelCol <
            cell.excelCol + (cell.colSpan || 1)
        )
      );
    });

    if (!hasKTDKBelow) {
      const isLeafTarget = path.some(
        (item) => item.id === cell.id
      );

      if (isLeafTarget && cell.rowSpan > 1) {
        rotatedIds.add(cell.id);
      }
    }
  });

  return rotatedIds;
};

// ======================================================
// TRÍCH XUẤT TIÊU ĐỀ ĐƠN VỊ VÀ TÊN BẢNG
// ======================================================

const extractTitles = (worksheet, range, headerRow) => {
  const unitTitles = [];
  const mainTitles = [];

  const merges = worksheet["!merges"] || [];

  const coveredCells = new Set();

  merges.forEach((merge) => {
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (
          r === merge.s.r &&
          c === merge.s.c
        ) {
          continue;
        }

        coveredCells.add(`${r}-${c}`);
      }
    }
  });

  for (let r = range.s.r; r < headerRow; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (coveredCells.has(`${r}-${c}`)) {
        continue;
      }

      const value = getCellValue(
        worksheet,
        r,
        c
      ).trim();

      if (!value) continue;

      const group = getTitleGroup(value);

      if (
        group === "unit" &&
        !unitTitles.includes(value)
      ) {
        unitTitles.push(value);
      }

      if (
        group === "main" &&
        !mainTitles.includes(value)
      ) {
        mainTitles.push(value);
      }
    }
  }

  return {
    unitTitles,
    mainTitles
  };
};

// ======================================================
// TRANG IN BẢNG TỔNG HỢP
// ======================================================

export default function BangTongHopGiaoDuc({
  selectedFile,
  onClose,
}) {
  const [worksheet, setWorksheet] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openCapNhatPhanCong, setOpenCapNhatPhanCong] = useState(false);

  const [phanCongGVBM, setPhanCongGVBM] = useState([]);
  const [phanCongReload, setPhanCongReload] = useState(0);

  const [openPrintDialog, setOpenPrintDialog] = useState(false);
  const [hidePrincipalName, setHidePrincipalName] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  // ====================================================
  // PHÂN TÍCH CẤU TRÚC FILE EXCEL
  // ====================================================

  const parsedData = useMemo(() => {
    const emptyData = {
      unitTitles: [],
      mainTitles: [],
      headerRows: [],
      rotatedHeaderCellIds: new Set(),
      students: [],
      signatures: {
        gvcn: [],
        bgh: []
      },
      totalColumns: 0,
      startColumn: 0
    };

    if (!worksheet || !worksheet["!ref"]) {
      return emptyData;
    }

    const range = XLSX.utils.decode_range(
      worksheet["!ref"]
    );

    const headerRow = findHeaderRow(
      worksheet,
      range
    );

    const firstStudentRow = findFirstStudentRow(
      worksheet,
      range
    );

    const lastStudentRow = findLastStudentRow(
      worksheet,
      range
    );

    

    const totalColumns =
      range.e.c - range.s.c + 1;

    // ----------------------------------------------
    // TIÊU ĐỀ ĐƠN VỊ VÀ TÊN BẢNG
    // ----------------------------------------------

    const {
      unitTitles,
      mainTitles
    } = headerRow !== -1
      ? extractTitles(
          worksheet,
          range,
          headerRow
        )
      : {
          unitTitles: [],
          mainTitles: []
        };

    // ----------------------------------------------
    // TIÊU ĐỀ NHIỀU TẦNG
    // ----------------------------------------------

    const headerRows =
      headerRow !== -1 &&
      firstStudentRow !== -1
        ? extractMultiLevelHeaders(
            worksheet,
            range,
            headerRow,
            firstStudentRow
          )
        : [];

    // ----------------------------------------------
    // XÁC ĐỊNH Ô TIÊU ĐỀ CẦN XOAY
    // ----------------------------------------------

    const rotatedHeaderCellIds =
      getRotatedHeaderCellIds(
        worksheet,
        headerRows,
        range
      );

    // ----------------------------------------------
    // DỮ LIỆU HỌC SINH
    // ----------------------------------------------

    const students = [];

    if (
      firstStudentRow !== -1 &&
      lastStudentRow !== -1
    ) {
      for (
        let r = firstStudentRow;
        r <= lastStudentRow;
        r++
      ) {
        if (
          !isStudentRow(
            worksheet,
            r,
            range.s.c
          )
        ) {
          continue;
        }

        const stt = getCellValue(
          worksheet,
          r,
          range.s.c
        ).trim();

        const fullName = getCellValue(
          worksheet,
          r,
          range.s.c + 1
        ).trim();

        const details = [];

        for (
          let c = range.s.c + 2;
          c <= range.e.c;
          c++
        ) {
          const value = getCellValue(
            worksheet,
            r,
            c
          ).trim();

          details.push({
            label: `Cột ${c - range.s.c + 1}`,
            value: value || ""
          });
        }

        students.push({
          id: `${r}-${stt}`,
          stt,
          fullName,
          details
        });
      }
    }

    // ----------------------------------------------
    // ----------------------------------------------
// LẤY NỘI DUNG CHỮ KÝ GVCN VÀ BAN GIÁM HIỆU
// ----------------------------------------------

    const signatures = findSignatures(worksheet);

    return {
      unitTitles,
      mainTitles,
      headerRows,
      rotatedHeaderCellIds,
      students,
      signatures,
      totalColumns,
      startColumn: range.s.c
    };
  }, [worksheet]);

  // ====================================================
  // LẤY DANH SÁCH GIÁO VIÊN BỘ MÔN THEO LỚP
  // ====================================================

  // Lấy tên lớp từ tiêu đề bảng Excel
  const currentClass = useMemo(() => {
    const title = String(worksheet?.A4?.v || "").trim();

    const match = title.match(
      /LỚP\s*:?\s*(\d{1,2}\.\d{1,2})/i
    );

    return match ? match[1] : "";
  }, [worksheet]);
  // Chuẩn hóa tên lớp để so sánh
  const normalizeClass = (value) => {
    return normalizeText(value)
      .replace(/^lop\s*/, "")
      .replace(/[./\-\s]/g, "");
  };

  // Đọc phân công giáo viên bộ môn từ Firestore
  useEffect(() => {
    let cancelled = false;

    const loadPhanCongGVBM = async () => {
      if (!currentClass) {
        setPhanCongGVBM([]);
        return;
      }

      try {
        const ref = doc(
          db,
          "INDANHGIA_2026-2027",
          "PhanCongVGBM"
        );

        const snapshot = await getDoc(ref);

        if (!snapshot.exists()) {
          setPhanCongGVBM([]);
          return;
        }

        const docData = snapshot.data();

        const allRows = Array.isArray(docData.data)
          ? docData.data
          : Array.isArray(docData.PhanCongVGBM)
            ? docData.PhanCongVGBM
            : [];

        const classKey = normalizeClass(currentClass);

        const filteredRows = allRows.filter((item) => {
          return (
            normalizeClass(item.lop) === classKey &&
            String(item.monHoc || "").trim() &&
            String(item.giaoVienBoMon || "").trim()
          );
        });

        if (!cancelled) {
          setPhanCongGVBM(filteredRows);
        }
      } catch (error) {
        console.error(
          "Lỗi tải phân công giáo viên bộ môn:",
          error
        );

        if (!cancelled) {
          setPhanCongGVBM([]);
        }
      }
    };

    loadPhanCongGVBM();

    return () => {
      cancelled = true;
    };
  }, [currentClass, phanCongReload]);

  // ====================================================
  // TÌM KIẾM HỌC SINH
  // ====================================================

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) {
      return parsedData.students;
    }

    const keyword = normalizeText(searchQuery);

    return parsedData.students.filter((student) => {
      return (
        normalizeText(student.fullName).includes(keyword) ||
        student.stt.includes(keyword)
      );
    });
  }, [parsedData.students, searchQuery]);

  // ====================================================
  // CHỌN VÀ ĐỌC FILE EXCEL
  // ====================================================

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = file.name
      .split(".")
      .pop()
      .toLowerCase();

    if (!["xlsx", "xls"].includes(extension)) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn file Excel .xlsx hoặc .xls!",
        severity: "warning"
      });

      event.target.value = "";
      return;
    }

    try {
      setLoading(true);

      const arrayBuffer = await file.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellDates: false,
        cellStyles: true
      });

      if (
        !workbook.SheetNames ||
        workbook.SheetNames.length === 0
      ) {
        throw new Error(
          "File Excel không có trang tính."
        );
      }

      const selectedSheet =
        workbook.SheetNames.find((name) =>
          normalizeText(name).includes("bangtonghop")
        ) || workbook.SheetNames[0];

      const ws = workbook.Sheets[selectedSheet];

      if (!ws || !ws["!ref"]) {
        throw new Error(
          "Không tìm thấy dữ liệu trong file Excel."
        );
      }

      const range = XLSX.utils.decode_range(
        ws["!ref"]
      );

      const headerRow = findHeaderRow(
        ws,
        range
      );

      const firstStudentRow = findFirstStudentRow(
        ws,
        range
      );

      if (headerRow === -1) {
        throw new Error(
          "Không tìm thấy dòng tiêu đề STT và Họ và tên học sinh."
        );
      }

      if (firstStudentRow === -1) {
        throw new Error(
          "Không tìm thấy dữ liệu học sinh trong file."
        );
      }

      setWorksheet(ws);
      setOriginalFile(file);
      setSearchQuery("");

      /*setSnackbar({
        open: true,
        message: `Đã tải thành công ${file.name}`,
        severity: "success"
      });*/
    } catch (error) {
      console.error("Lỗi đọc Excel:", error);

      setSnackbar({
        open: true,
        message:
          error.message ||
          "Không thể đọc file Excel!",
        severity: "error"
      });
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  // ====================================================
  // TẢI FILE EXCEL GỐC
  // ====================================================

  const handleDownload = () => {
    if (!originalFile) return;

    const url = URL.createObjectURL(originalFile);

    const link = document.createElement("a");

    link.href = url;
    link.download = originalFile.name;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // ====================================================
  // IN BẢNG
  // ====================================================

  const handlePrint = () => {
    if (!worksheet) {
      setSnackbar({
        open: true,
        message: "Vui lòng tải file Excel trước khi in!",
        severity: "warning"
      });

      return;
    }

    setOpenPrintDialog(true);
  };

  const handlePrintConfirm = (hideName, printDate) => {
    setHidePrincipalName(hideName);
    printBangTongHop(hideName, printDate);
    setOpenPrintDialog(false);
  };

  const [uploadSnackbar, setUploadSnackbar] = useState({
    open: false,
    severity: "success",
    message: ""
  });

  const handleUploadPhanCong = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await UploadPhanCongGVBM({
        file,
        db,
      });

      setPhanCongReload((prev) => prev + 1);

      setUploadSnackbar({
        open: true,
        severity: "success",
        message: `Tải dữ liệu thành công! `
      });

    } catch (error) {
      setUploadSnackbar({
        open: true,
        severity: "error",
        message: error.message || "Không thể tải dữ liệu lên Firestore."
      });
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    if (!selectedFile) return;

    handleUpload({
      target: {
        files: [selectedFile],
        value: ""
      }
    });
  }, [selectedFile]);
  // ====================================================
  // GIAO DIỆN
  // ====================================================

  
return (
  <Box
    className="in-bang-tong-hop-page"
    sx={{
      minHeight: "100vh",
      backgroundColor: "#e3f2fd",
      pt: 3,
      pb: 4
    }}
  >
    {/* ================= CSS MÀN HÌNH ================= */}
    <style>{`

      /* =====================================================
        GIAO DIỆN CHUNG
      ===================================================== */

      @media screen {
        .bang-tong-hop-container {
          width: 100%;
        }

        .student-table-wrapper {
          max-width: 100%;
        }
      }

      /* =====================================================
        TIÊU ĐỀ ĐƠN VỊ
      ===================================================== */

      .bang-tong-hop-title {
        display: grid;
        grid-template-columns: 1fr 1.5fr 1fr;
        align-items: center;
        gap: 0;
        width: 100%;
        box-sizing: border-box;
        padding: 18px 0 20px;
        margin-bottom: 12px;
        font-family: "Roboto", serif;
        color: #111;
        background: #fff;
      }

      .bang-tong-hop-title-unit {
        grid-column: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
        padding-left: 0 !important;
        margin-left: -40px !important;
        text-align: center;
        line-height: 1.6;
      }

      .bang-tong-hop-title-main {
        grid-column: 2 / 4;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        line-height: 1.5;
        transform: translateX(-60px);
      }

      /* =====================================================
        KHUNG NGOÀI BẢNG
      ===================================================== */

      .student-table-wrapper {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        overflow-y: auto !important;
        background: #fff;
        box-sizing: border-box;
      }

      /* =====================================================
        BẢNG EXCEL
      ===================================================== */

      .student-excel-table {
          width: max-content !important;
          min-width: max-content !important;
          max-width: none !important;
          table-layout: auto !important;
          /* Đổi từ separate sang collapse để đồng bộ độ dày nét vẽ toàn bảng */
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          /* Gom khung ngoài của bảng chung một nét */
          border: 1px solid #000 !important;
          font-family: "Roboto", serif;
          font-size: 13px;
          color: #111827;
          background: #fff;
          box-sizing: border-box;
          margin-top: 6px !important;
      }

      /* =====================================================
        ĐƯỜNG VIỀN CÁC Ô
      ===================================================== */

      .student-excel-table th,
      .student-excel-table td {
          /* Đồng bộ tất cả các ô đều có viền 1px solid #000 */
          border: 1px solid #000 !important;
          outline: none !important;
          box-shadow: none !important;
          padding: 2px 8px;
          text-align: center;
          vertical-align: middle;
          min-width: 0;
          max-width: none;
          white-space: normal;
          overflow-wrap: break-word;
          line-height: 1.4;
          box-sizing: border-box !important;
          background-clip: padding-box !important;
      }

      /* =====================================================
        TIÊU ĐỀ NHIỀU TẦNG
      ===================================================== */

      .student-excel-table thead th {
          position: sticky;
          top: 0;
          z-index: 3;
          background: #dbeafe;
          color: #1e3a8a;
          font-weight: 700;
          text-transform: none;
          text-align: center;
          vertical-align: middle;
          line-height: 1.35;
          min-height: 40px;
          padding: 7px 5px;
          white-space: normal;
          overflow-wrap: break-word;
      }

      .student-excel-table thead tr:nth-child(1) th {
          background: #dbeafe;
          font-weight: 800;
      }

      .student-excel-table thead tr:nth-child(n + 2) th {
          font-weight: 400 !important;
      }

      .student-excel-table thead tr:nth-child(2) th {
          background: #e8f1fc;
      }

      .student-excel-table thead tr:nth-child(3) th {
          background: #eff6ff;
      }

      .student-excel-table thead tr:nth-child(4) th {
          background: #f1f5f9;
      }

      .student-excel-table thead .col-stt,
      .student-excel-table thead .col-name {
          background: #dbeafe;
      }

      .student-excel-table thead .header-empty {
          background: #fff;
      }

      /* =====================================================
        TIÊU ĐỀ XOAY DỌC
      ===================================================== */

      .student-excel-table thead th.rotate-header {
          writing-mode: horizontal-tb !important;
          transform: none !important;
          width: 30px !important;
          min-width: 30px !important;
          max-width: 30px !important;
          height: 100px !important;
          min-height: 100px !important;
          padding: 4px 2px !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap !important;
      }

      .student-excel-table thead th.rotate-header .rotated-header-text {
          display: inline-block;
          writing-mode: vertical-rl !important;
          text-orientation: mixed !important;
          transform: rotate(180deg) !important;
          white-space: nowrap !important;
          word-break: keep-all !important;
          overflow-wrap: normal !important;
          text-align: center;
          vertical-align: middle;
          line-height: 1.2;
      }

      /* =====================================================
        CỘT STT
      ===================================================== */

      .student-excel-table .col-stt,
      .student-excel-table .cell-stt {
          width: 1% !important;
          min-width: 0 !important;
      }

      .student-excel-table .col-stt {
          background: #e2e8f0;
      }

      .student-excel-table .cell-stt {
          font-weight: 400;
      }

      /* =====================================================
        CỘT HỌ TÊN
      ===================================================== */

      .student-excel-table .col-name,
      .student-excel-table .cell-name {
          width: 1% !important;
          min-width: 0 !important;
          max-width: none !important;
          white-space: nowrap !important;
          word-break: keep-all !important;
          overflow-wrap: normal !important;
      }

      .student-excel-table .col-name {
          text-align: center;
          background: #e2e8f0;
      }

      .student-excel-table .cell-name {
          text-align: left !important;
          font-weight: 400 !important;
          color: #1e293b;
      }

      /* =====================================================
        CỘT NGÀY SINH
      ===================================================== */

      .student-excel-table .col-date,
      .student-excel-table .cell-date {
          width: 90px !important;
          min-width: 90px !important;
          max-width: 90px !important;
          box-sizing: border-box !important;
      }

      .student-excel-table thead th.col-date {
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
          line-height: 1.2 !important;
          text-align: center !important;
      }

      .student-excel-table tbody td.cell-date {
          white-space: nowrap !important;
          overflow: hidden !important;
      }

      /* =====================================================
        TĂNG ĐỘ RỘNG CỘT DỮ LIỆU
      ===================================================== */

      .student-excel-table tbody td.cell-data {
          min-width: 35px !important;
          padding-left: 10px !important;
          padding-right: 10px !important;
      }

      .student-excel-table thead tr:first-child th:nth-child(n + 5) {
          min-width: 35px !important;
          padding-left: 10px !important;
          padding-right: 10px !important;
      }

      /* =====================================================
        NỘI DUNG BẢNG
      ===================================================== */

      .student-excel-table tbody th,
      .student-excel-table tbody td,
      .student-excel-table .cell-data,
      .student-excel-table .cell-stt,
      .student-excel-table .cell-name,
      .student-excel-table .cell-date {
          font-weight: 400 !important;
      }

      .student-excel-table .cell-empty {
          color: #94a3b8;
      }

      .student-excel-table tbody tr:nth-child(even) {
          background: #f8fafc;
      }

      .student-excel-table tbody tr:hover {
          background: #eff6ff;
      }

      .student-excel-table .cell-no-data {
          padding: 24px;
          color: #64748b;
          text-align: center;
      }

      /* =====================================================
        CHỮ KÝ
      ===================================================== */

      .bang-tong-hop-signatures {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin-top: 2mm !important;
        padding: 0 !important;
        align-items: start !important;
      }

      .bang-tong-hop-signatures > div {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        text-align: center !important;
        line-height: 1.5 !important;
      }

      .bang-tong-hop-signatures > div:first-child {
        grid-column: 1 !important;
      }

      .bang-tong-hop-signatures > div:last-child {
        grid-column: 2 !important;
      }

    `}</style>

    {/* ================= CARD CHÍNH ================= */}
    
    <Card
      className="bang-tong-hop-container"
      elevation={6}
      sx={{
        p: 4,
        borderRadius: 3,
        maxWidth: 1420,
        mx: "auto",
        position: "relative",
        overflow: "hidden",
        bgcolor: "#f8fafc"
      }}
    >
      {/* ================= THANH ĐIỀU KHIỂN ================= */}
      <Box
        className="no-print"
        component="div"
        sx={{
          //mb: 1,
          mt: -1,
          minHeight: 42,
          position: "relative"
        }}
      >
        {/* CỤM ICON GÓC TRÊN BÊN TRÁI */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 0.8,
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 2
          }}
        >
          {/* CHỌN FILE EXCEL */}
          <Tooltip title="Chọn file Excel" arrow>
            <IconButton
              component="label"
              size="small"
              sx={{
                width: 36,
                height: 36,
                color: "#1976d2",
                backgroundColor: "#eaf3fc",
                border: "1px solid #cfe2f5",
                borderRadius: "9px",
                "&:hover": {
                  backgroundColor: "#d8eafb"
                }
              }}
            >
              <FolderUp size={19} />
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={handleUpload}
              />
            </IconButton>
          </Tooltip>

          {/* TẢI FILE EXCEL GỐC */}
          {/*<Tooltip title="Tải file Excel gốc" arrow>
            <span>
              <IconButton
                size="small"
                onClick={handleDownload}
                disabled={!originalFile}
                sx={{
                  width: 36,
                  height: 36,
                  color: "#16834a",
                  backgroundColor: "#e8f5ed",
                  border: "1px solid #c9e7d3",
                  borderRadius: "9px",
                  "&:hover": {
                    backgroundColor: "#d5eddf"
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "#f1f3f5",
                    color: "#b0b8c1"
                  }
                }}
              >
                <Download size={19} />
              </IconButton>
            </span>
          </Tooltip>*/}

          {/* IN BẢNG TỔNG HỢP */}
          <Tooltip title="In bảng tổng hợp" arrow>
            <span>
              <IconButton
                size="small"
                onClick={handlePrint}
                disabled={!worksheet}
                sx={{
                  width: 36,
                  height: 36,
                  color: "#16834a",
                  backgroundColor: "#e8f5ed",
                  border: "1px solid #c9e7d3",
                  borderRadius: "9px",
                  "&:hover": {
                    backgroundColor: "#d5eddf"
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "#f1f3f5",
                    color: "#b0b8c1"
                  }
                }}
              >
                <Printer size={19} />
              </IconButton>
            </span>
          </Tooltip>

          {/* CẬP NHẬT PHÂN CÔNG */}
          <Tooltip title="Cập nhật dữ liệu phân công">
            <IconButton
              color="primary"
              size="small"
              onClick={() => setOpenCapNhatPhanCong(true)}
              sx={{
                width: 36,
                height: 36,
                borderRadius: "9px"
              }}
            >
              <Edit size={20} />
            </IconButton>
          </Tooltip>

          {/* TẢI FILE PHÂN CÔNG */}
          {/*<Tooltip title="Tải file phân công lên">
            <IconButton
              component="label"
              color="success"
              size="small"
              sx={{
                width: 36,
                height: 36,
                borderRadius: "9px"
              }}
            >
              <Upload size={20} />
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={handleUploadPhanCong}
              />
            </IconButton>
          </Tooltip>  */}       

          {/* SĨ SỐ */}
          {/*{parsedData.students.length > 0 && (
            <Typography
              sx={{
                fontSize: "8.5pt",
                fontWeight: 700,
                color: "#64748b",
                ml: 0.3
              }}
            >
              {parsedData.students.length} học sinh
            </Typography>
          )}*/}

          {/*<Tooltip title="Tùy chỉnh in bảng tổng hợp" arrow>
            <IconButton
              onClick={() => setOpenPrintDialog(true)}
              sx={{
                width: 36,
                height: 36,
                color: "#64748b",
                backgroundColor: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: "9px",
                "&:hover": {
                  color: "#1d4ed8",
                  backgroundColor: "#dbeafe",
                  borderColor: "#bfdbfe"
                }
              }}
            >
              <Settings2 size={19} />
            </IconButton>
          </Tooltip>*/}
        </Box>

        {/* TIÊU ĐỀ */}
        {/*<Box sx={{ textAlign: "center", pt: 0.5 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            color="primary"
          >
            BẢNG TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ GIÁO DỤC
          </Typography>
        </Box>*/}

        {/* NÚT ĐÓNG GÓC TRÊN BÊN PHẢI */}
        <Tooltip title="Đóng bảng tổng hợp" arrow>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              zIndex: 3,
              width: 36,
              height: 36,
              color: "#64748b",
              backgroundColor: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "9px",
              "&:hover": {
                color: "#dc2626",
                backgroundColor: "#fee2e2",
                borderColor: "#fecaca"
              }
            }}
          >
            <X size={20} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ================= TRẠNG THÁI ĐỌC FILE ================= */}
      {loading && (
        <Box
          className="no-print"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 3
          }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2">
            Đang đọc dữ liệu Excel...
          </Typography>
        </Box>
      )}

      {/* ================= NỘI DUNG CHÍNH ================= */}
      {!worksheet ? (
        <Box
          className="no-print"
          sx={{
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            p: 4,
            bgcolor: "#ffffff"
          }}
        >
          <FileSpreadsheet size={64} color="#94a3b8" />

          <Typography
            variant="h6"
            fontWeight={700}
            color="text.secondary"
          >
            Chưa có dữ liệu bảng tổng hợp
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
          >
            Chọn file Excel bảng tổng hợp kết quả đánh giá
            để hiển thị danh sách học sinh dưới dạng bảng.
          </Typography>
        </Box>
      ) : (
        <Box
          className="bang-tong-hop-content"
          sx={{
            p: {
              xs: 1.5,
              sm: 2.5
            }
          }}
        >
          {/* TIÊU ĐỀ ĐƠN VỊ VÀ TÊN BẢNG - BỎ PAPER, GIỮ NỀN TRẮNG */}
          {(parsedData.unitTitles.length > 0 ||
            parsedData.mainTitles.length > 0) && (
            <Box
              className="bang-tong-hop-title"
              sx={{
                p: 2.5,
                mb: 2.5,
                bgcolor: "transparent",
                border: "1px solid #cbd5e1",
                borderRadius: 3,
                boxShadow: "none",
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(260px, 0.85fr) minmax(450px, 1.8fr)"
                },
                gap: 2,
                alignItems: "center",
                width: "100%",
                boxSizing: "border-box"
              }}
            >
              <Box
                className="bang-tong-hop-title-unit"
                sx={{ textAlign: "center" }}
              >
                {parsedData.unitTitles.map((line, idx) => (
                  <Typography
                    key={`unit-${idx}`}
                    component="div"
                    sx={{
                      fontFamily: '"Times New Roman", serif',
                      textTransform: "uppercase",
                      color: "#111827",
                      fontSize: idx === 1 ? 16 : 13,
                      fontWeight: idx === 1 ? 800 : 700,
                      lineHeight: 1.6,
                      fontStyle: idx === 2 ? "italic" : "normal"
                    }}
                  >
                    {line}
                  </Typography>
                ))}
              </Box>

              <Box
                className="bang-tong-hop-title-main"
                sx={{ textAlign: "center" }}
              >
                {parsedData.mainTitles.map((line, idx) => (
                  <Typography
                    key={`main-${idx}`}
                    component="div"
                    sx={{
                      fontFamily: '"Times New Roman", serif',
                      textTransform: "uppercase",
                      color: idx === 0 ? "#17365d" : "#334155",
                      fontWeight: 800,
                      fontSize: idx === 0 ? 19 : 15,
                      lineHeight: 1.5,
                      letterSpacing: idx === 0 ? 0.3 : 0.5,
                      mt: idx === 1 ? 0.8 : 0,
                      ...(idx === 1
                        ? {
                            display: "inline-block",
                            borderTop: "1px solid #64748b",
                            borderBottom: "1px solid #64748b",
                            px: 2,
                            py: 0.4
                          }
                        : {})
                    }}
                  >
                    {line}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          {/* BẢNG TỔNG HỢP HỌC SINH */}
          <Paper
            elevation={0}
            className="student-table-wrapper"
            sx={{
              width: "100%",
              overflow: "auto",
              border: "1px solid #cbd5e1",
              borderRadius: 2,
              bgcolor: "#fff"
            }}
          >
            <table className="student-excel-table">
              <thead>
                {parsedData.headerRows.map((row) => (
                  <tr key={row.id}>
                    {row.cells.map((cell) => (
                      <th
                        key={cell.id}
                        rowSpan={cell.rowSpan}
                        colSpan={cell.colSpan}
                        className={[
                          cell.excelCol === parsedData.startColumn
                            ? "col-stt"
                            : "",
                          cell.excelCol === parsedData.startColumn + 1
                            ? "col-name"
                            : "",
                          normalizeText(cell.value).includes("ngay thang nam sinh")
                            ? "col-date"
                            : "",
                          cell.value
                            ? "header-cell"
                            : "header-cell header-empty",
                          parsedData.rotatedHeaderCellIds.has(cell.id)
                            ? "rotate-header"
                            : ""
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title={cell.value}
                      >
                        {parsedData.rotatedHeaderCellIds.has(cell.id) ? (
                          <span className="rotated-header-text">
                            {cell.value}
                          </span>
                        ) : (
                          cell.value
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="cell-stt">
                        {student.stt}
                      </td>

                      <td className="cell-name">
                        {student.fullName}
                      </td>

                      {student.details.map((item, detailIndex) => {
                        const isDateColumn = parsedData.headerRows.some(
                          (row) =>
                            row.cells.some((cell) => {
                              const startCol = cell.excelCol;
                              const endCol =
                                startCol + (cell.colSpan || 1) - 1;

                              return (
                                normalizeText(cell.value)
                                  .replace(/[.,;:]/g, "")
                                  .replace(/\s+/g, " ")
                                  .trim()
                                  .includes("ngay thang nam sinh") &&
                                parsedData.startColumn + 2 + detailIndex >= startCol &&
                                parsedData.startColumn + 2 + detailIndex <= endCol
                              );
                            })
                        );

                        return (
                          <td
                            key={`${student.id}-${detailIndex}`}
                            className={[
                              item.value === "—" ? "cell-empty" : "cell-data",
                              isDateColumn ? "cell-date" : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            title={item.label}
                          >
                            {item.value}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={Math.max(parsedData.totalColumns, 2)}
                      className="cell-no-data"
                    >
                      Không tìm thấy học sinh phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Paper>

          {/* THỐNG KÊ SỐ HỌC SINH */}
          {/*<Box
            className="no-print"
            sx={{
              mt: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Đang hiển thị {filteredStudents.length} /{" "}
              {parsedData.students.length} học sinh
            </Typography>
          </Box>*/}

          {/* CHỮ KÝ GVCN VÀ BAN GIÁM HIỆU */}
          {(parsedData.signatures.gvcn.length > 0 ||
            parsedData.signatures.bgh.length > 0) && (
            <Box
              className="bang-tong-hop-signatures"
              sx={{
                mt: 0,
                pt: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                width: "100%",
                alignItems: "start"
              }}
            >
              {/* GVCN BÊN TRÁI */}
              <Box
                className="signature-gvcn"
                sx={{
                  transform: "translateX(-30px)"
                }}
              >
                {parsedData.signatures.gvcn.map((sig, idx) => {
                  const lines = sig.split("\n");
                  const lastLineIndex = lines.length - 1;

                  return lines.map((line, lineIdx) => {
                    const content = line.trim();

                    const isSignatureInstruction =
                      /^\(Ký,.*\)$/i.test(content);

                    const isBold =
                      content !== "" &&
                      (lineIdx === 0 || lineIdx === lastLineIndex);

                    return (
                      <Typography
                        key={`gvcn-${idx}-${lineIdx}`}
                        variant="body2"
                        sx={{
                          fontFamily: '"Times New Roman", serif',
                          textAlign: "center",
                          fontWeight: isBold ? 700 : 400,
                          fontStyle: isSignatureInstruction ? "italic" : "normal",
                          whiteSpace: "pre-line",
                          lineHeight: 1.5,
                          minHeight: content ? "auto" : "1.5em",
                          mt: lineIdx === 0 ? "0.3em" : 0
                        }}
                      >
                        {content || "\u00A0"}
                      </Typography>
                    );
                  });
                })}

                {/* DANH SÁCH GIÁO VIÊN BỘ MÔN */}
                {phanCongGVBM.length > 0 && (
                  <Box
                    className="bang-tong-hop-gvbm"
                    sx={{
                      mt: 2,
                      ml: "60px",
                      width: "calc(100% - 20px)",
                      alignSelf: "stretch",
                      boxSizing: "border-box",
                      fontFamily: '"Times New Roman", serif',
                      color: "#111",
                      textAlign: "left",
                      p: 1
                    }}
                  >
                    {[...phanCongGVBM]
                      .sort((a, b) =>
                        a.monHoc.localeCompare(b.monHoc, "vi", {
                          sensitivity: "base"
                        })
                      )
                      .map((item, index) => (
                        <Box
                          key={`${item.lop}-${item.monHoc}-${item.giaoVienBoMon}-${index}`}
                          className="gvbm-signature-row"
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "300px 1fr",
                            alignItems: "baseline",
                            columnGap: 1,
                            width: "100%",
                            mb: 1.5
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: '"Times New Roman", serif',
                              fontSize: 14,
                              lineHeight: 1.5,
                              textAlign: "left",
                              fontWeight: 400
                            }}
                          >
                            {index + 1}. Môn {item.monHoc}: {item.giaoVienBoMon}
                          </Typography>

                          <Typography
                            sx={{
                              fontFamily: '"Times New Roman", serif',
                              fontSize: 14,
                              lineHeight: 1.5,
                              textAlign: "left",
                              whiteSpace: "nowrap",
                              letterSpacing: 1
                            }}
                          >
                            ......................
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                )}
              </Box>

              {/* HIỆU TRƯỞNG BÊN PHẢI */}
              <Box className="signature-bgh">
                {parsedData.signatures.bgh.map((sig, idx) => {
                  const lines = sig.split("\n");
                  const lastLineIndex = lines.length - 1;

                  return lines.map((line, lineIdx) => {
                    const content = line.trim();

                    const isSignatureInstruction =
                      /^\(Ký,.*\)$/i.test(content);

                    const isDateLine =
                      /ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d+/i.test(content);

                    const isBold =
                      content !== "" &&
                      !isDateLine &&
                      (
                        lineIdx === 0 ||
                        lineIdx === lastLineIndex ||
                        /^Hiệu trưởng$/i.test(content)
                      );

                    return (
                      <Typography
                        key={`bgh-${idx}-${lineIdx}`}
                        variant="body2"
                        sx={{
                          fontFamily: '"Times New Roman", serif',
                          textAlign: "center",
                          fontWeight: isBold ? 700 : 400,
                          fontStyle: isSignatureInstruction ? "italic" : "normal",
                          whiteSpace: "pre-line",
                          lineHeight: 1.5,
                          minHeight: content ? "auto" : "1.5em"
                        }}
                      >
                        {content || "\u00A0"}
                      </Typography>
                    );
                  });
                })}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Card>


    {/* ================= SNACKBAR ================= */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={4000}
      onClose={() =>
        setSnackbar((prev) => ({
          ...prev,
          open: false
        }))
      }
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right"
      }}
    >
      <Alert
        severity={snackbar.severity}
        variant="filled"
        onClose={() =>
          setSnackbar((prev) => ({
            ...prev,
            open: false
          }))
        }
      >
        {snackbar.message}
      </Alert>
    </Snackbar>

    {/* ================= DIALOG CẬP NHẬT PHÂN CÔNG ================= */}
    <CapNhatPhanCongDialog
      open={openCapNhatPhanCong}
      onClose={() => {
        setOpenCapNhatPhanCong(false);
        setPhanCongReload((prev) => prev + 1);
      }}
      db={db}
    />

    <BangTongHopDialog
      open={openPrintDialog}
      onClose={() => setOpenPrintDialog(false)}
      onPrint={handlePrintConfirm}
      onOptionsChange={setHidePrincipalName}
      initialOptions={{
        hidePrincipalName
      }}
    />

    {/* ================= SNACKBAR UPLOAD ================= */}
    <Snackbar
      open={uploadSnackbar.open}
      autoHideDuration={4000}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right"
      }}
      onClose={() =>
        setUploadSnackbar(prev => ({
          ...prev,
          open: false
        }))
      }
    >
      <Alert
        onClose={() =>
          setUploadSnackbar(prev => ({
            ...prev,
            open: false
          }))
        }
        severity={uploadSnackbar.severity}
        variant="filled"
        sx={{
          width: "100%",
          boxShadow: 3
        }}
      >
        {uploadSnackbar.message}
      </Alert>
    </Snackbar>
  </Box>
);

}
