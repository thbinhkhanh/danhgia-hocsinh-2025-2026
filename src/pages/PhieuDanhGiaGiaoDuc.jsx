
import React, { useState, useEffect, useRef } from "react";
// ================= MUI =================
import {
  Box,
  Card,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";

import * as XLSX from "xlsx";
import { useSelectedClass } from "../context/SelectedClassContext";
import { printPhieuDanhGia } from "../utils/printPhieuDanhGia";
import { extractStudentsFromExcelFiles } from "../utils/extractStudentsFromExcel";
import { handleFolderUploadLogic } from "../utils/folderUploadUtils";
import MonhocNLPC from '../components/Monhoc_NLPC';
import ThongTinHocSinh from '../components/ThongTinHocSinh';
import PhieuDanhGiaToolbar from "../components/PhieuDanhGiaToolbar";
import BangTongHopGiaoDuc from "./BangTongHopGiaoDuc";
import PhieuDanhGiaDialog from "../dialog/PhieuDanhGiaDialog";

export default function PhieuDanhGiaGIaoDuc() {
  const bangTongHopInputRef = useRef(null);
  const [bangTongHopFile, setBangTongHopFile] = useState(null);  

  const { classes, selectedClass, setSelectedClass } = useSelectedClass();

  const [students, setStudents] = useState([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [activeView, setActiveView] = useState("phieu");
  const [showPrincipalSignature, setShowPrincipalSignature] = useState(true);

  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const [printOptions, setPrintOptions] = useState({
    confirmationType: "principal",
    printDate: ""
  });

  // Học kỳ được đọc trực tiếp từ tiêu đề file Excel
  const [selectedTermLabel, setSelectedTermLabel] = useState(
    "GIỮA HỌC KỲ I"
  );

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ================= FORM DATA =================
  const [formData, setFormData] = useState({
    studentName: "",
    className: selectedClass || "",
    schoolName: "",
    idCode: "",
    teacherName: "",
    phone: "",
    absentDays: "0 (CP) - 0 (KP)",
    principalName: "",
    height: "",
    weight: "",
    locationDate: "",
    rewards: "",
    subjects: [],

    competenciesCore: [],
    competenciesCoreNote: "",

    competenciesSpecific: [],
    competenciesSpecificNote: "",

    qualities: [],
    qualitiesNote: ""
  });

  // ================= DỮ LIỆU PHIẾU TRẮNG =================
  const emptyFormData = {
    studentName: "",
    className: "", 
    schoolName: "TRƯỜNG TIỂU HỌC BÌNH KHÁNH",
    idCode: "",
    teacherName: "",
    phone: "",
    absentDays: "0 (CP) - 0 (KP)",
    principalName: "",
    height: "",
    weight: "",
    locationDate: "",
    rewards: "",
    subjects: [],

    competenciesCore: [],
    competenciesCoreNote: "",

    competenciesSpecific: [],
    competenciesSpecificNote: "",

    qualities: [],
    qualitiesNote: ""
  };

  // ================= CHUẨN HÓA CHỮ =================
  
  const normalizeText = (value) => {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };


  // ================= LÀM SẠCH GIÁ TRỊ =================
  const cleanValue = (value) => {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // ================= TÌM GIÁ TRỊ THEO NHÃN =================
  // Hỗ trợ:
  // Giáo viên: Nguyễn Văn A
  // Hoặc: | Giáo viên | Nguyễn Văn A |
  const getValueByLabel = (data, labels) => {
    const normalizedLabels = labels.map(normalizeText);

    for (const row of data) {
      for (let i = 0; i < row.length; i++) {
        const cell = cleanValue(row[i]);
        if (!cell) continue;

        const normalizedCell = normalizeText(cell);

        for (const label of normalizedLabels) {
          // Trường hợp nhãn và giá trị cùng một ô
          if (
            normalizedCell === label ||
            normalizedCell.startsWith(label + ":") ||
            normalizedCell.startsWith(label + "：")
          ) {
            const colonIndex = Math.max(
              cell.indexOf(":"),
              cell.indexOf("：")
            );

            if (colonIndex >= 0) {
              const sameCellValue = cleanValue(
                cell.substring(colonIndex + 1)
              );

              if (sameCellValue) return sameCellValue;
            }

            // Trường hợp giá trị nằm ở ô kế tiếp
            for (let j = i + 1; j < row.length; j++) {
              const nextValue = cleanValue(row[j]);
              if (nextValue) return nextValue;
            }
          }
        }
      }
    }

    return "";
  };

  // ================= LẤY NGÀY THÁNG TỪ SHEET =================
  const getLocationDate = (data) => {
    for (const row of data || []) {
      for (const cell of row) {
        const value = String(cell ?? "").trim();
        if (!value) continue;

        const match = value.match(
          /(?:Bình Khánh\s*,?\s*)?ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}/i
        );

        if (match) {
          return match[0].trim();
      }
    }
  }

  return "";
};

  // ================= TÌM DÒNG NL-PC =================
  const findNLPCRow = (data, label) => {
    const target = normalizeText(label);

    return data.find(row =>
      row.some(cell => normalizeText(cell) === target)
    );
  };

  // ================= LẤY MỨC ĐẠT =================
  // ================= LẤY MỨC ĐẠT THEO HAI HỌC KỲ =================
  const getLevelsFromRow = (row) => {
    if (!row) {
      return {
        midTermLevel: "",
        finalTermLevel: ""
      };
    }

    const levels = row
      .map(cell => cleanValue(cell).toUpperCase())
      .filter(value => ["T", "Đ", "D", "C"].includes(value))
      .map(value => value === "D" ? "Đ" : value);

    return {
      midTermLevel: levels[0] || "",
      finalTermLevel: levels[1] || ""
    };
  };

  // ================= LẤY NHẬN XÉT =================
  const getNoteFromRow = (row) => {
    if (!row) return "";

    const candidates = row
      .map(cell => cleanValue(cell))
      .filter(value => {
        if (!value || value.length <= 20) return false;

        const normalized = normalizeText(value);

        const labels = [
          "năng lực cốt lõi",
          "năng lực chung",
          "năng lực đặc thù",
          "phẩm chất chủ yếu",
          "mức đạt được",
          "điểm mạnh và các mặt cần rèn luyện"
        ];

        return !labels.includes(normalized);
      });

    return candidates.sort((a, b) => b.length - a.length)[0] || "";
  };

  const getNLPCLevels = (data, label) => {
    return getLevelsFromRow(findNLPCRow(data, label));
  };

  const getNLPCNote = (data, label) => {
    return getNoteFromRow(findNLPCRow(data, label));
  };

  // ================= ĐỌC THƯ MỤC EXCEL =================
  
  const handleFolderUpload = async (e) => {
    await handleFolderUploadLogic({
      e,
      XLSX,
      normalizeText,
      cleanValue,
      getValueByLabel,     // <-- Truyền vào đây
      getLocationDate,     // <-- Truyền vào đây
      getNLPCLevels,       // <-- Truyền vào đây
      getNLPCNote,         // <-- Truyền vào đây
      extractStudentsFromExcelFiles,
      selectedClass,
      setSnackbar,
      setSelectedTermLabel,
      setStudents,
      setSelectedStudentIndex
    });
  };


  // ================= MỞ HỘP THOẠI IN TOÀN BỘ =================
  const handleOpenPrintDialog = () => {
    if (!students || students.length === 0) {
      setSnackbar({
        open: true,
        message: "⚠️ Chưa có dữ liệu học sinh để in!",
        severity: "warning"
      });
      return;
    }

    setPrintDialogOpen(true);
  };

  // ================= IN TOÀN BỘ =================
  const handlePrintAll = (options) => {
    if (!students || students.length === 0) {
      setSnackbar({
        open: true,
        message: "⚠️ Chưa có dữ liệu học sinh để in!",
        severity: "warning"
      });
      return;
    }

    console.log("Tùy chọn in nhận được:", options);

    printPhieuDanhGia(
      students,
      selectedClass,
      selectedTermLabel,
      options
    );

    setPrintDialogOpen(false);
  };

  // ================= CẬP NHẬT XEM TRƯỚC =================
  useEffect(() => {
    if (!students || students.length === 0) return;

    const currentStudent =
      students[selectedStudentIndex] || students[0];

    setFormData({
      studentName: currentStudent.hoTen || "",
      className:
        currentStudent.className ||
        selectedClass ||
        "",

      schoolName: currentStudent.schoolName || "",
      idCode: currentStudent.maDinhDanh || "",
      teacherName: currentStudent.teacherName || "",
      phone: currentStudent.phone || "",
      absentDays: currentStudent.nghiPhep || "",
      principalName: "Đặng Thái Bình",
      height: currentStudent.chieuCao || "",
      weight: currentStudent.canNang || "",
      locationDate: currentStudent.locationDate || "",
      rewards: currentStudent.khenThuong || "",

      subjects: currentStudent.subjects || [],

      competenciesCore: currentStudent.competenciesCore || [],
      competenciesCoreNote: currentStudent.competenciesCoreNote || "",

      competenciesSpecific: currentStudent.competenciesSpecific || [],
      competenciesSpecificNote: currentStudent.competenciesSpecificNote || "",

      qualities: currentStudent.qualities || [],
      qualitiesNote: currentStudent.qualitiesNote || ""
    });

  }, [selectedStudentIndex, students, selectedClass]);

  // ================= GIAO DIỆN =================
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#e3f2fd",
        pt: 3,
        pb: 4
      }}
    >
      <style>{`
        .excel-font {
          font-family: "Times New Roman", Times, serif;
          color: #000;
        }

        .excel-tb {
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }

        .excel-tb th,
        .excel-tb td {
          border: 1px solid #000;
          padding: 1px 3px;
          vertical-align: middle;
        }

        .print-two-columns {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          column-gap: 5mm;
          align-items: start;
          width: 100%;
        }

        .signature-reward-line {
          display: block;
          min-height: 16px;
          border-bottom: 1px solid #000;
          padding-left: 3px;
        }
      `}</style>

      <Card
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          maxWidth: 1420,
          mx: "auto",
          position: "relative"
        }}
      >
        {/* ================= THANH ĐIỀU KHIỂN ================= */}
        <Box component="div" sx={{ mb: 3 }}>

          {/* CỤM ICON GÓC TRÊN BÊN TRÁI */}
          <PhieuDanhGiaToolbar
            students={students}
            handleFolderUpload={handleFolderUpload}
            handleOpenPrintDialog={handleOpenPrintDialog}
            bangTongHopInputRef={bangTongHopInputRef}
            setBangTongHopFile={setBangTongHopFile}
            setPrintDialogOpen={setPrintDialogOpen}
          />

          {/* TIÊU ĐỀ */}
          <Box sx={{ textAlign: "center", pt: 0.5 }}>
            <Typography
              variant="h5"
              fontWeight="bold"
              color="primary"
            >
              {`PHIẾU ĐÁNH GIÁ HỌC TẬP ${selectedTermLabel}`}
            </Typography>
          </Box>

        </Box>

        {/* ================= KHU VỰC XEM TRƯỚC PHIẾU ĐÁNH GIÁ ================= */}
        {activeView !== "tongHop" && (
          <Box component="div">
            {(() => {
              const previewData = students.length > 0
                ? formData
                : emptyFormData;

              return (
                <Box
                  component="div"
                  className="w-full max-w-[285mm] mx-auto bg-white text-black p-[5mm] rounded-sm border border-slate-200"
                  sx={{
                    boxSizing: "border-box"
                  }}
                >
                  <Box
                    component="div"
                    className="excel-font w-full bg-white text-black text-[8.5pt] leading-[1.15]"
                  >
                    {/* THÔNG TIN HỌC SINH */}
                    <ThongTinHocSinh
                      formData={previewData}
                      students={students}
                      selectedStudentIndex={selectedStudentIndex}
                      setSelectedStudentIndex={setSelectedStudentIndex}
                      
                    />

                    {/* HAI CỘT */}
                    <MonhocNLPC
                      selectedTermLabel={selectedTermLabel}
                      normalizeText={normalizeText}
                      formData={previewData}
                      showPrincipalSignature={showPrincipalSignature}
                    />
                  </Box>
                </Box>
              );
            })()}
          </Box>
        )}
      </Card>

      {/* ================= BẢNG TỔNG HỢP ================= */}
      {bangTongHopFile && (
        <Box sx={{ mt: 3 }}>
          <BangTongHopGiaoDuc
            selectedFile={bangTongHopFile}
            onClose={() => setBangTongHopFile(null)}
          />
        </Box>
      )}

      <PhieuDanhGiaDialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        onPrint={handlePrintAll}
        initialOptions={printOptions}
      />

      {/* ================= SNACKBAR ================= */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() =>
          setSnackbar(prev => ({ ...prev, open: false }))
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right"
        }}
      >
        <Alert
          onClose={() =>
            setSnackbar(prev => ({ ...prev, open: false }))
          }
          severity={snackbar.severity}
          sx={{ width: "100%", boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
