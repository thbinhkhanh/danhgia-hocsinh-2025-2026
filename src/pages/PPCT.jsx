import React, { useState, useEffect } from "react";

import {
  Box,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  LinearProgress,
  FormControlLabel,
  Switch,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import FileUploadIcon from "@mui/icons-material/FileUpload";

import { useNavigate } from "react-router-dom";

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase";

import { ConfigContext } from "../context/ConfigContext";

import { uploadPPCT } from "../utils/uploadPPCT";

export default function PPCT() {
  const navigate = useNavigate();

  const { config, setConfig } =
    React.useContext(ConfigContext);

  // =========================================================
  // STATE
  // =========================================================

  const [ppct, setPpct] = useState([]);

  // MÔN
  // Tin học dùng dữ liệu Firestore hiện tại.
  // Công nghệ dùng document riêng.
  const [selectedMon, setSelectedMon] =
    useState("Tin học");

  const [selectedKhoi, setSelectedKhoi] =
    useState("khoi4");

  const [showChuDe, setShowChuDe] =
    useState(false);

  const [ppctReloadKey, setPpctReloadKey] =
    useState(0);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [uploading, setUploading] =
    useState(false);

  const [selectedNamHoc, setSelectedNamHoc] =
    useState(config?.namHoc || "");

  const fileInputRef = React.useRef(null);

  // =========================================================
  // NĂM HỌC KEY
  // =========================================================

  const namHocKey = (
    config?.namHoc || "2025-2026"
  ).replace(/-/g, "_");

  // =========================================================
  // XÁC ĐỊNH DOCUMENT PPCT
  // =========================================================
  //
  // TIN HỌC:
  // Giữ nguyên dữ liệu hiện tại:
  //
  // PPCT/khoi4_2025-2026
  // PPCT/khoi4_2026-2027
  // PPCT/khoi5_2025-2026
  // PPCT/khoi5_2026-2027
  //
  // CÔNG NGHỆ:
  //
  // PPCT/CongNghe_khoi4_2025-2026
  // PPCT/CongNghe_khoi4_2026-2027
  // PPCT/CongNghe_khoi5_2025-2026
  // PPCT/CongNghe_khoi5_2026-2027
  //
  // =========================================================

  const getPPCTDocId = () => {
    if (selectedMon === "Tin học") {
      return `${selectedKhoi}_${config?.namHoc}`;
    }

    return `CongNghe_${selectedKhoi}_${config?.namHoc}`;
  };

  // =========================================================
  // LẤY CONFIG REALTIME
  // Nguồn sự thật duy nhất
  // =========================================================

  useEffect(() => {
    const docRef = doc(
      db,
      "CONFIG",
      "config"
    );

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) return;

        const data = docSnap.data();

        const namHoc =
          data.namHoc || "2025-2026";

        const lop =
          data.lop || "";

        // Merge config
        // Không overwrite các trường khác
        setConfig((prev) => ({
          ...prev,
          namHoc,
          lop,
        }));

        // Đồng bộ năm học cho UI
        setSelectedNamHoc(namHoc);
      }
    );

    return () => unsubscribe();
  }, [setConfig]);

  // =========================================================
  // LẤY PPCT TỪ FIRESTORE
  // =========================================================

  useEffect(() => {
    if (
      !selectedMon ||
      !selectedKhoi ||
      !config?.namHoc
    ) {
      return;
    }

    const fetchPPCT = async () => {
      try {
        // =====================================================
        // XÁC ĐỊNH DOCUMENT THEO MÔN
        // =====================================================

        const ppctDocId =
          selectedMon === "Tin học"
            ? `${selectedKhoi}_${config.namHoc}`
            : `CongNghe_${selectedKhoi}_${config.namHoc}`;

        const docRef = doc(
          db,
          "PPCT",
          ppctDocId
        );

        const snap =
          await getDoc(docRef);

        if (!snap.exists()) {
          setPpct([]);
          return;
        }

        const data = snap.data();

        // =====================================================
        // CHUYỂN DỮ LIỆU FIRESTORE THÀNH MẢNG
        // =====================================================

        const list = Object.entries(data)
          .map(([key, value]) => {
            const weekRaw = key.replace("tuan_", "");

            const weekParts = weekRaw
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);

            let weekText = weekRaw;

            if (weekParts.length === 1) {
              // 17 → 17
              weekText = weekParts[0];
            } else if (weekParts.length === 2) {
              const start = Number(weekParts[0]);
              const end = Number(weekParts[1]);

              // Nếu là đúng 2 tuần liên tiếp → +
              // Ví dụ: 1,2 → 1 + 2
              //        7,8 → 7 + 8
              if (end - start === 1) {
                weekText = `${weekParts[0]} + ${weekParts[1]}`;
              } else {
                // Khoảng từ 2 số nhưng không liên tiếp → -
                weekText = `${weekParts[0]} - ${weekParts[1]}`;
              }
            } else {
              // Có từ 3 tuần trở lên → -
              // Ví dụ: 6,7,8 → 6 - 8
              //        9,10,11,12 → 9 - 12
              weekText = `${weekParts[0]} - ${
                weekParts[weekParts.length - 1]
              }`;
            }

            const firstWeek = parseInt(
              weekParts[0],
              10
            );

            return {
              tuan: weekText,

              chuDe:
                value?.chuDe || "",

              tenBaiHoc:
                value?.tenBaiHoc || "",

              lt:
                value?.lt || "",

              th:
                value?.th || "",

              _sortWeek: firstWeek,
            };
          })

          .sort(
            (a, b) =>
              a._sortWeek -
              b._sortWeek
          )

          .map(
            ({
              _sortWeek,
              ...rest
            }) => rest
          );

        // =====================================================
        // MERGE CHỦ ĐỀ - ROWSPAN
        // =====================================================

        const processed = [];

        let i = 0;

        while (i < list.length) {
          const currentChuDe =
            list[i].chuDe;

          let rowSpan = 1;

          for (
            let j = i + 1;
            j < list.length;
            j++
          ) {
            if (
              list[j].chuDe ===
              currentChuDe
            ) {
              rowSpan++;
            } else {
              break;
            }
          }

          processed.push({
            ...list[i],

            _showChuDe: true,

            _rowSpan: rowSpan,
          });

          for (
            let k = 1;
            k < rowSpan;
            k++
          ) {
            processed.push({
              ...list[i + k],

              _showChuDe: false,

              _rowSpan: 0,
            });
          }

          i += rowSpan;
        }

        setPpct(processed);
      } catch (err) {
        console.error(
          "❌ Lỗi lấy PPCT:",
          err
        );

        setPpct([]);
      }
    };

    fetchPPCT();
  }, [
    selectedMon,
    selectedKhoi,
    config?.namHoc,
    ppctReloadKey,
  ]);

  // =========================================================
  // TỔNG LÝ THUYẾT
  // =========================================================

  const tongLT = ppct.reduce(
    (sum, row) =>
      sum + (Number(row.lt) || 0),
    0
  );

  // =========================================================
  // TỔNG THỰC HÀNH
  // Bỏ các tiết Ôn tập + Kiểm tra
  // =========================================================

  const tongTH = ppct.reduce(
    (sum, row) => {
      const ten =
        row.tenBaiHoc
          ?.toLowerCase() || "";

      if (
        ten.includes("ôn tập") ||
        ten.includes("kiểm tra")
      ) {
        return sum;
      }

      return (
        sum +
        (Number(row.th) || 0)
      );
    },
    0
  );

  // =========================================================
  // MỞ CHỌN FILE EXCEL
  // =========================================================

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // =========================================================
  // UPLOAD PPCT
  // =========================================================

  const handleFileChange = async (e) => {
    const files = Array.from(
      e.target.files || []
    );

    if (!files.length) return;

    setUploading(true);

    setUploadProgress(0);

    try {
      for (
        let i = 0;
        i < files.length;
        i++
      ) {
        const file = files[i];

        await uploadPPCT({
          file,

          db,

          namHoc: config?.namHoc,

          // MÔN
          mon: selectedMon,

          // KHỐI
          khoi: selectedKhoi,

          onProgress: (p) => {
            const global =
              Math.round(
                ((i + p / 100) /
                  files.length) *
                  100
              );

            setUploadProgress(
              global
            );
          },
        });
      }

      // =====================================================
      // RELOAD PPCT
      // =====================================================

      setPpctReloadKey(
        (key) => key + 1
      );

      setUploadProgress(100);
    } catch (err) {
      console.error(
        "❌ Lỗi upload PPCT:",
        err
      );
    } finally {
      setTimeout(() => {
        setUploading(false);

        setUploadProgress(0);
      }, 500);

      // Cho phép chọn lại cùng một file
      e.target.value = null;
    }
  };

  // =========================================================
  // ĐỔI NĂM HỌC
  // =========================================================

  const handleNamHocChange = async (e) => {
    const newNamHoc =
      e.target.value;

    try {
      await setDoc(
        doc(
          db,
          "CONFIG",
          "config"
        ),
        {
          namHoc: newNamHoc,
        },
        {
          merge: true,
        }
      );
    } catch (err) {
      console.error(
        "❌ Lỗi cập nhật năm học:",
        err
      );
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

return (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      background:
        "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
      pt: 3,
      px: 3,
    }}
  >
    <Paper
      elevation={6}
      sx={{
        p: 4,
        borderRadius: 3,
        width: "100%",
        maxWidth: showChuDe ? 1100 : 700,
        bgcolor: "white",
        position: "relative",
      }}
    >
      {/* ===================================================
          NÚT ĐÓNG
      =================================================== */}

      <IconButton
        onClick={() => navigate("/dashboard")}
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          color: "#64748b",
          backgroundColor: "#f1f5f9",
          "&:hover": {
            backgroundColor: "#e2e8f0",
            color: "#ef4444",
          },
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <CloseIcon />
      </IconButton>

      {/* ===================================================
          ICON UPLOAD
      =================================================== */}

      <Box
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          gap: 1,
          zIndex: 1000,
        }}
      >
        <Tooltip
          title={`Tải PPCT môn ${selectedMon} từ Excel`}
        >
          <IconButton
            onClick={handleUploadClick}
            disabled={uploading}
            sx={{
              color: "#1976d2",
              bgcolor: "rgba(25,118,210,0.1)",
              "&:hover": {
                bgcolor: "rgba(25,118,210,0.2)",
              },
            }}
          >
            <FileUploadIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ===================================================
          TIÊU ĐỀ
      =================================================== */}

      <Box
        sx={{
          textAlign: "center",
          mt: {
            xs: 4,
            sm: 0,
          },
          mb: 3,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{
            color: "#1976d2",
          }}
        >
          PHÂN PHỐI CHƯƠNG TRÌNH
        </Typography>
      </Box>

      {/* ===================================================
          BỘ LỌC
      =================================================== */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mb: 2,
          gap: 1.5,
          flexWrap: {
            xs: "wrap",
            sm: "nowrap",
          },
        }}
      >

        {/* =================================================
            MÔN
        ================================================= */}

        <FormControl
          size="small"
          sx={{
            width: {
              xs: 130,
              sm: 130,
            },
            flexShrink: 0,
          }}
        >
          <InputLabel id="label-mon">
            Môn
          </InputLabel>

          <Select
            labelId="label-mon"
            value={selectedMon}
            onChange={(e) =>
              setSelectedMon(e.target.value)
            }
            label="Môn"
          >
            <MenuItem value="Tin học">
              Tin học
            </MenuItem>

            <MenuItem value="Công nghệ">
              Công nghệ
            </MenuItem>
          </Select>
        </FormControl>

        {/* =================================================
            LỚP
        ================================================= */}

        <FormControl
          size="small"
          sx={{
            width: {
              xs: 80,
              sm: 80,
            },
            flexShrink: 0,
          }}
        >
          <InputLabel id="label-khoi">
            Lớp
          </InputLabel>

          <Select
            labelId="label-khoi"
            value={selectedKhoi}
            onChange={(e) =>
              setSelectedKhoi(e.target.value)
            }
            label="Lớp"
          >
            <MenuItem value="khoi4">
              4
            </MenuItem>

            <MenuItem value="khoi5">
              5
            </MenuItem>
          </Select>
        </FormControl>

        {/* =================================================
            NĂM HỌC
        ================================================= */}

        {/*<FormControl
          size="small"
          sx={{
            width: {
              xs: 140,
              sm: 140,
            },
            flexShrink: 0,
          }}
        >
          <InputLabel id="label-namhoc">
            Năm học
          </InputLabel>

          <Select
            labelId="label-namhoc"
            value={selectedNamHoc}
            onChange={handleNamHocChange}
            label="Năm học"
          >
            <MenuItem value="2025-2026">
              2025-2026
            </MenuItem>

            <MenuItem value="2026-2027">
              2026-2027
            </MenuItem>

            <MenuItem value="2027-2028">
              2027-2028
            </MenuItem>

            <MenuItem value="2028-2029">
              2028-2029
            </MenuItem>

            <MenuItem value="2029-2030">
              2029-2030
            </MenuItem>
          </Select>
        </FormControl>*/}

        {/* =================================================
            HIỆN CHỦ ĐỀ
            - Desktop: cùng hàng
            - Điện thoại: xuống hàng
        ================================================= */}

        <FormControlLabel
          sx={{
            ml: {
              xs: 0,
              sm: 1,
            },
            width: {
              xs: "100%",
              sm: "auto",
            },
            justifyContent: {
              xs: "center",
              sm: "flex-start",
            },
            flexShrink: 0,
          }}
          control={
            <Switch
              checked={showChuDe}
              onChange={(e) =>
                setShowChuDe(e.target.checked)
              }
              color="primary"
            />
          }
          label="Hiện Chủ đề"
        />
      </Box>

      {/* ===================================================
          PROGRESS UPLOAD
      =================================================== */}

      {uploading && (
        <Box
          sx={{
            mt: 3,
            mb: 2,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              width: "25%",
              minWidth: 220,
            }}
          >
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                height: 3,
                borderRadius: 5,
                bgcolor: "rgba(25,118,210,0.15)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 5,
                },
                mb: 1,
              }}
            />

            <Typography
              fontSize={14}
              mb={0.5}
              textAlign="center"
            >
              Đang tải dữ liệu: {uploadProgress}%
            </Typography>
          </Box>
        </Box>
      )}

      {/* ===================================================
          BẢNG PPCT
      =================================================== */}

      <TableContainer
        component={Paper}
        sx={{
          boxShadow: "none",
          border: "1px solid rgba(0,0,0,0.12)",
          overflowX: "auto",
        }}
      >
        <Table
          size="small"
          sx={{
            tableLayout: "fixed",
            minWidth: showChuDe ? 1020 : 700,
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <TableHead>
            <TableRow>

              {/* TUẦN */}

              <TableCell
                align="center"
                sx={{
                  width: 80,
                  bgcolor: "#1976d2",
                  color: "#fff",
                  border:
                    "1px solid rgba(0,0,0,0.12)",
                  whiteSpace: "nowrap",
                }}
              >
                TUẦN
              </TableCell>

              {/* CHỦ ĐỀ */}

              {showChuDe && (
                <TableCell
                  align="center"
                  sx={{
                    width: 320,
                    bgcolor: "#1976d2",
                    color: "#fff",
                    border:
                      "1px solid rgba(0,0,0,0.12)",
                    whiteSpace: "nowrap",
                  }}
                >
                  CHỦ ĐỀ
                </TableCell>
              )}

              {/* TÊN BÀI HỌC */}

              <TableCell
                align="center"
                sx={{
                  width: 320,
                  bgcolor: "#1976d2",
                  color: "#fff",
                  border:
                    "1px solid rgba(0,0,0,0.12)",
                  whiteSpace: "nowrap",
                }}
              >
                TÊN BÀI HỌC
              </TableCell>

              {/* LÝ THUYẾT */}

              <TableCell
                align="center"
                sx={{
                  width: 60,
                  bgcolor: "#1976d2",
                  color: "#fff",
                  border:
                    "1px solid rgba(0,0,0,0.12)",
                  whiteSpace: "nowrap",
                }}
              >
                L.THUYẾT
              </TableCell>

              {/* THỰC HÀNH */}

              <TableCell
                align="center"
                sx={{
                  width: 60,
                  bgcolor: "#1976d2",
                  color: "#fff",
                  border:
                    "1px solid rgba(0,0,0,0.12)",
                  whiteSpace: "nowrap",
                }}
              >
                T.HÀNH
              </TableCell>
            </TableRow>
          </TableHead>

          {/* =================================================
              BODY
          ================================================= */}

          <TableBody>
            {ppct.map((row, idx) => {
              const isOnTap =
                row.tenBaiHoc
                  ?.toLowerCase()
                  .includes("ôn tập");

              const isKiemTra =
                row.tenBaiHoc
                  ?.toLowerCase()
                  .includes("kiểm tra");

              const bgColor = isOnTap
                ? "#fff8e1"
                : isKiemTra
                ? "#e3f2fd"
                : "transparent";

              return (
                <TableRow
                  key={idx}
                  sx={{
                    bgcolor: bgColor,
                  }}
                >
                  {/* TUẦN */}

                  <TableCell
                    align="center"
                    sx={{
                      width: 80,
                      border:
                        "1px solid rgba(0,0,0,0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.tuan}
                  </TableCell>

                  {/* CHỦ ĐỀ */}

                  {showChuDe &&
                    row._showChuDe && (
                      <TableCell
                        rowSpan={row._rowSpan}
                        sx={{
                          width: 320,
                          maxWidth: 320,
                          border:
                            "1px solid rgba(0,0,0,0.12)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          verticalAlign: "middle",
                          textTransform: "uppercase",
                        }}
                        title={row.chuDe}
                      >
                        {row.chuDe}
                      </TableCell>
                    )}

                  {/* TÊN BÀI HỌC */}

                  <TableCell
                    sx={{
                      width: 320,
                      maxWidth: 320,
                      border:
                        "1px solid rgba(0,0,0,0.12)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontWeight: isKiemTra
                        ? 600
                        : 400,
                    }}
                    title={row.tenBaiHoc}
                  >
                    {row.tenBaiHoc}
                  </TableCell>

                  {/* LT */}

                  <TableCell
                    align="center"
                    sx={{
                      width: 60,
                      border:
                        "1px solid rgba(0,0,0,0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.lt || ""}
                  </TableCell>

                  {/* TH */}

                  <TableCell
                    align="center"
                    sx={{
                      width: 60,
                      border:
                        "1px solid rgba(0,0,0,0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.th || ""}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* =================================================
                DÒNG TỔNG
            ================================================= */}

            <TableRow
              sx={{
                bgcolor: "#ffcc80",
              }}
            >
              {/* TUẦN */}

              <TableCell
                align="center"
                sx={{
                  border:
                    "1px solid rgba(0,0,0,0.12)",
                  fontWeight: 600,
                }}
              >
                TỔNG
              </TableCell>

              {/* CHỦ ĐỀ */}

              {showChuDe && (
                <TableCell
                  sx={{
                    border:
                      "1px solid rgba(0,0,0,0.12)",
                  }}
                />
              )}

              {/* TÊN BÀI HỌC */}

              <TableCell
                sx={{
                  border:
                    "1px solid rgba(0,0,0,0.12)",
                  fontWeight: 600,
                }}
              />

              {/* LT */}

              <TableCell
                align="center"
                sx={{
                  border:
                    "1px solid rgba(0,0,0,0.12)",
                  fontWeight: 700,
                }}
              >
                {tongLT}
              </TableCell>

              {/* TH */}

              <TableCell
                align="center"
                sx={{
                  border:
                    "1px solid rgba(0,0,0,0.12)",
                  fontWeight: 700,
                }}
              >
                {tongTH}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>

    {/* =====================================================
        FILE INPUT
    ===================================================== */}

    <input
      ref={fileInputRef}
      type="file"
      hidden
      accept=".xlsx"
      multiple
      onChange={handleFileChange}
    />
  </Box>
);
}