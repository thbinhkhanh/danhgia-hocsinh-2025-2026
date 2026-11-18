
import React, { useMemo, useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";

import {
  Box,
  Card,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";

import { db } from "../firebase";
import * as XLSX from "xlsx";

import { printBangTongHop } from "../utils/printBangTongHop";
import UploadPhanCongGVBM from "../utils/UploadPhanCongGVBM";
import { BANG_TONG_HOP_CSS } from '../utils/tableStyles';
import { processExcelFile } from "../utils/excelUploadUtils";

import CapNhatPhanCongDialog from "../dialog/CapNhatPhanCongDialog";
import BangTongHopDialog from "../dialog/BangTongHopDialog";

import BangTongHopContent from "../components/BangTongHopContent";
import BangTongHopToolbar from "../components/BangTongHopToolbar";

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
    const titleA4 = String(worksheet?.A4?.v || "").trim();
    const titleA3 = String(worksheet?.A3?.v || "").trim();

    const regex = /LỚP\s*:?\s*(\d{1,2}[./]\d{1,2})/i;

    const matchA4 = titleA4.match(regex);
    const matchA3 = titleA3.match(regex);

    return matchA4?.[1] || matchA3?.[1] || "";
  }, [worksheet]);

  // Kiểm tra trường học từ ô A2
  const isBinhKhanhSchool = useMemo(() => {
    const schoolName = normalizeText(
      String(worksheet?.A2?.v || "").trim()
    );

    return schoolName === normalizeText("TH BÌNH KHÁNH");
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
      if (!isBinhKhanhSchool || !currentClass) {
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
  }, [currentClass, isBinhKhanhSchool, phanCongReload]);

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
  try {
    setLoading(true);

    const result = await processExcelFile(
      event,
      XLSX,
      normalizeText,
      (ws, range) => findHeaderRow(ws, range),
      (ws, range) => findFirstStudentRow(ws, range)
    );

    if (result.cancelled) return;

    // Kiểm tra file hợp lệ
    if (!result.success) {
      setSnackbar({
        open: true,
        message: result.error || "File Excel không hợp lệ!",
        severity: "error",
      });
      return;
    }

    // Chỉ cập nhật khi file hợp lệ
    setWorksheet(result.ws);
    setOriginalFile(result.file);
    setSearchQuery("");

  } catch (error) {
    console.error("Lỗi đọc Excel:", error);

    setSnackbar({
      open: true,
      message: error.message || "Không thể đọc file Excel!",
      severity: error.message?.includes("Vui lòng chọn")
        ? "warning"
        : "error",
    });
  } finally {
    setLoading(false);

    if (event.target) {
      event.target.value = "";
    }
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
      <style>{BANG_TONG_HOP_CSS}</style>

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
        <BangTongHopToolbar
          worksheet={worksheet}
          originalFile={originalFile}
          studentCount={parsedData.students.length}
          handleUpload={handleUpload}
          handleDownload={handleDownload}
          handlePrint={handlePrint}
          handleUploadPhanCong={handleUploadPhanCong}
          setOpenCapNhatPhanCong={setOpenCapNhatPhanCong}
          setOpenPrintDialog={setOpenPrintDialog}
          onClose={onClose}
        />

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
        <BangTongHopContent
          worksheet={worksheet}
          parsedData={parsedData}
          filteredStudents={filteredStudents}
          phanCongGVBM={phanCongGVBM}
          normalizeText={normalizeText}
      />
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