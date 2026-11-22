import React from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
} from "@mui/material";

const BangTongHopDGTX = ({
  showWeeks,
  selectedSemester,
  hocKyMap,
  students,
  setStudents,
  namHocKey,
  selectedClass,
  selectedSubject,
  setDgtxMucDatForClass,
}) => {
  const { from: startWeek, to: endWeek } = hocKyMap[selectedSemester] || { from: 1, to: 9 };
  const totalWeeks = endWeek - startWeek + 1;

  // Helper chuyển đổi chữ sang dạng ngắn
  const toShort = (statusStr) =>
    statusStr === "Hoàn thành tốt" ? "T" :
    statusStr === "Hoàn thành" ? "H" :
    statusStr === "Chưa hoàn thành" ? "C" : "";

  // Hàm xử lý khi chọn dropdown ở tiêu đề cột Giáo viên (áp dụng hàng loạt hoặc xử lý chung nếu cần)
  const handleHeaderTeacherChange = (val) => {
    setStudents((prev) =>
      prev.map((s) => {
        const hs = s.xepLoai?.trim();
        const gv = val?.trim();
        let chung = "";

        if (!hs && gv) chung = gv;
        else if (!gv) chung = hs;
        else {
          if (hs === "T" && gv === "T") chung = "T";
          else if (hs === "H" && gv === "T") chung = "T";
          else if (hs === "C" && gv === "T") chung = "H";
          else if (hs === "T" && gv === "H") chung = "H";
          else if (hs === "H" && gv === "H") chung = "H";
          else if (hs === "C" && gv === "H") chung = "H";
          else if (hs === "T" && gv === "C") chung = "H";
          else if (hs === "H" && gv === "C") chung = "C";
          else if (hs === "C" && gv === "C") chung = "C";
          else chung = hs;
        }

        return {
          ...s,
          dgtx_gv: val,
          dgtx: chung,
        };
      })
    );
  };

  return (        
    <TableContainer
      component={Paper}
        sx={{
          width: "100%",
          maxWidth: "100%",
          maxHeight: "calc(100vh - 220px)",
          overflowX: "auto",
          overflowY: "auto",
          display: "block",
        }}
    >
      <Table
        stickyHeader
        size="small"
        sx={{
          width: showWeeks ? "max-content" : "fit-content",
          minWidth: showWeeks ? "100%" : "auto",
          margin: showWeeks ? 0 : "0 auto",
          tableLayout: "auto",
          borderCollapse: "separate",
          borderSpacing: 0,
          border: "1px solid #e0e0e0",

          "& td, & th": {
            borderRight: "1px solid #e0e0e0",
            borderBottom: "1px solid #e0e0e0",
            whiteSpace: "nowrap",
          },

          "& th:last-child, & td:last-child": {
            borderRight: "1px solid #e0e0e0",
          },
          "& .week-cell": {
            width: "55px",
            minWidth: "55px",
            maxWidth: "55px",
            padding: "6px 4px !important",
            textAlign: "center",
            fontSize: "14px",
            boxSizing: "border-box",
          },
        }}
      >
        <TableHead>
          {/* HÀNG HEADER 1 — merge tuần */}
          <TableRow>
            <TableCell
              rowSpan={2}
              align="center"
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                width: 45,
                minWidth: 45,
                maxWidth: 45,
                position: "sticky",
                top: 0,
                left: 0,
                zIndex: 10,
              }}
            >
              STT
            </TableCell>

            <TableCell
              rowSpan={2}
              align="center"
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                width: 220,
                minWidth: 220,
                maxWidth: 220,
                position: "sticky",
                top: 0,
                left: 45,
                zIndex: 10,
              }}
            >
              HỌ VÀ TÊN
            </TableCell>

            {showWeeks &&
              Array.from({ length: totalWeeks }, (_, i) => {
                const weekNum = startWeek + i;

                return (
                  <TableCell
                    key={weekNum}
                    align="center"
                    colSpan={4}
                    sx={{
                      backgroundColor: "#1976d2",
                      color: "white",
                      padding: "4px 0",
                    }}
                  >
                    TUẦN {weekNum}
                  </TableCell>
                );
              })}

            <TableCell
              rowSpan={2}
              align="center"
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                width: 30,
              }}
            >
              Học sinh
            </TableCell>

            <TableCell
              rowSpan={2}
              align="center"
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                width: 50,
                px: 0.5,
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={0.3}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "white", fontSize: 14 }}
                >
                  Giáo viên
                </Typography>

                <FormControl
                  variant="standard"
                  sx={{ m: 0, minWidth: 16 }}
                >
                  <Select
                    defaultValue=""
                    displayEmpty
                    disableUnderline
                    onChange={(e) =>
                      handleHeaderTeacherChange(e.target.value)
                    }
                    renderValue={() => (
                      <span style={{ fontSize: 18, lineHeight: 1 }}>
                        ▾
                      </span>
                    )}
                    sx={{
                      width: 16,
                      minWidth: 16,
                      color: "white",
                      fontSize: 10,
                      "& .MuiSelect-select": {
                        padding: "0 !important",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      "& .MuiSelect-icon": {
                        display: "none",
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>-</em>
                    </MenuItem>
                    <MenuItem value="T">T</MenuItem>
                    <MenuItem value="H">H</MenuItem>
                    <MenuItem value="C">C</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </TableCell>

            <TableCell
              rowSpan={2}
              align="center"
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                width: 30,
              }}
            >
              Mức đạt
            </TableCell>
          </TableRow>

          {/* HÀNG HEADER 2 — NX, KTBC, BT, PHT */}
          <TableRow>
            {showWeeks &&
              Array.from({ length: totalWeeks }, (_, i) => (
                <React.Fragment key={`sub-${i}`}>
                  {["ĐG", "BC", "BT", "PH"].map((label) => (
                    <TableCell
                      key={`${i}-${label}`}
                      align="center"
                      className="week-cell"
                      sx={{
                        backgroundColor: "#1976d2",
                        color: "white",
                        position: "sticky",
                        top: 33,
                        zIndex: 5,
                      }}
                    >
                      <Tooltip
                        title={
                          {
                            ĐG: "Đánh giá tuần",
                            BC: "Kiểm tra bài cũ",
                            BT: "Bài tập tuần",
                            PH: "Phiếu học tập",
                          }[label]
                        }
                        arrow
                        placement="top"
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            width: "100%",
                            cursor: "help",
                          }}
                        >
                          {label}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  ))}
                </React.Fragment>
              ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {students.map((student, idx) => {
            const isSpecialNote = [
              "khuyết tật",
              "chuyển trường",
              "bỏ học",
            ].includes(
              String(student.ghiChu || "").trim().toLowerCase()
            );

            return (
              <TableRow
                key={student.maDinhDanh}
                hover
                sx={{
                  backgroundColor: isSpecialNote
                    ? "#f3f3f3"
                    : "inherit",
                  color: isSpecialNote ? "red" : "inherit",
                  "& td": {
                    color: isSpecialNote ? "red" : "inherit",
                  },
                  "&:hover": {
                    backgroundColor: isSpecialNote
                      ? "#d6d6d6"
                      : "rgba(25,118,210,0.05)",
                  },
                }}
              >
                <TableCell
                  align="center"
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 4,
                    width: 45,
                    minWidth: 45,
                    maxWidth: 45,
                    backgroundColor: isSpecialNote ? "#f3f3f3" : "#fff",
                  }}
                >
                  {student.stt}
                </TableCell>

                <TableCell
                  align="left"
                  sx={{
                    position: "sticky",
                    left: 45,
                    zIndex: 4,
                    width: 220,
                    minWidth: 220,
                    maxWidth: 220,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    backgroundColor: isSpecialNote ? "#f3f3f3" : "#fff",
                  }}
                >
                  {student.hoVaTen}
                </TableCell>

                {/* CÁC CỘT TUẦN */}
                {showWeeks &&
                  Array.from({ length: totalWeeks }, (_, i) => {
                    const weekNum = startWeek + i;
                    const weekId = `tuan_${weekNum}`;
                    const raw = student.statusByWeek?.[weekId] || {};

                    const hs =
                      raw && typeof raw === "object"
                        ? raw.hs || ""
                        : raw || "";

                    const gv =
                      raw && typeof raw === "object"
                        ? raw.gv || ""
                        : "";

                    const hsShort = toShort(hs);
                    const gvShort = toShort(gv);

                    const ktbcRaw =
                      raw?.KTBC_diem ??
                      raw?.TN_diem ??
                      student[`Tuan_${weekNum}_KTBC`] ??
                      "";

                    // Chuẩn hóa điểm KTBC về T/H/C nếu dữ liệu là số phần trăm
                    const ktbcNumber = Number(ktbcRaw);
                    const ktbcDiem =
                      raw?.KTBC_diem ??
                      student[`Tuan_${weekNum}_KTBC`] ??
                      "";

                    const phtDiem =
                      raw?.PHT_diem ??
                      student[`Tuan_${weekNum}_PHT`] ??
                      "";

                    return (
                      <React.Fragment key={weekNum}>
                        {/* Nhận xét học sinh */}
                        <TableCell
                          align="center"
                          className="week-cell"
                        >
                          {hsShort}
                        </TableCell>

                        {/* Kiểm tra bài cũ */}
                        <TableCell
                          align="center"
                          className="week-cell"
                          sx={{
                            fontWeight: 400,
                            color:
                              ktbcDiem === "C"
                                ? "#dc2626"
                                : ktbcDiem === "T"
                                  ? "#15803d"
                                  : ktbcDiem === "H"
                                    ? "#1976d2"
                                    : "inherit",
                          }}
                        >
                          {ktbcDiem || ""}
                        </TableCell>

                        {/* Bài tập giáo viên */}
                        <TableCell
                          align="center"
                          className="week-cell"
                          sx={{
                            color:
                              gvShort === "C"
                                ? "#dc2626"
                                : "#1976d2",
                          }}
                        >
                          {gvShort}
                        </TableCell>

                        {/* Xếp loại Phiếu học tập */}
                        <TableCell
                          align="center"
                          className="week-cell"
                          sx={{
                            fontWeight: 400,
                            color:
                              phtDiem === "C"
                                ? "#dc2626"
                                : phtDiem === "T"
                                  ? "#15803d"
                                  : phtDiem === "H"
                                    ? "#1976d2"
                                    : "inherit",
                          }}
                        >
                          {phtDiem || ""}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}

                {/* CỘT XẾP LOẠI HỌC SINH */}
                <TableCell
                  align="center"
                  sx={{
                    px: 1,
                    color:
                      student.xepLoai === "C"
                        ? "#dc2626"
                        : (theme) => theme.palette.primary.main,
                  }}
                >
                  <FormControl
                    variant="standard"
                    fullWidth
                    sx={{
                      "& .MuiSelect-icon": {
                        opacity: 0,
                        transition: "0.2s",
                      },
                      "&:hover .MuiSelect-icon": {
                        opacity: 1,
                      },
                    }}
                  >
                    <Select
                      value={student.xepLoai || ""}
                      onChange={(e) => {
                        const newHS = e.target.value;

                        setStudents((prev) =>
                          prev.map((s) => {
                            if (
                              s.maDinhDanh !== student.maDinhDanh
                            ) {
                              return s;
                            }

                            const updated = {
                              ...s,
                              xepLoai: newHS,
                            };

                            const hs = newHS;
                            const gv = updated.dgtx_gv;
                            const diemMap = {
                              T: 3,
                              H: 2,
                              C: 1,
                            };

                            let chung = hs || gv;

                            if (hs && gv) {
                              const avg =
                                (diemMap[hs] + diemMap[gv]) / 2;

                              if (avg >= 2.5) chung = "T";
                              else if (avg >= 1.5) chung = "H";
                              else chung = "C";
                            }

                            updated.dgtx = chung;
                            return updated;
                          })
                        );
                      }}
                      disableUnderline
                      sx={{
                        textAlign: "center",
                        "& .MuiSelect-select": {
                          py: 0.5,
                          fontSize: "14px",
                          color:
                            student.xepLoai === "C"
                              ? "#dc2626"
                              : (theme) =>
                                  theme.palette.primary.main,
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>-</em>
                      </MenuItem>
                      <MenuItem value="T">T</MenuItem>
                      <MenuItem value="H">H</MenuItem>
                      <MenuItem value="C">C</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>

                {/* CỘT GIÁO VIÊN */}
                <TableCell
                  align="center"
                  sx={{
                    px: 1,
                    color:
                      student.dgtx_gv === "C"
                        ? "#dc2626"
                        : (theme) => theme.palette.primary.main,
                  }}
                >
                  <FormControl
                    variant="standard"
                    fullWidth
                    sx={{
                      "& .MuiSelect-icon": {
                        opacity: 0,
                        transition: "opacity 0.2s ease",
                      },
                      "&:hover .MuiSelect-icon": {
                        opacity: 1,
                      },
                    }}
                  >
                    <Select
                      value={student.dgtx_gv || ""}
                      onChange={(e) => {
                        const newVal = e.target.value;

                        setStudents((prev) =>
                          prev.map((s) => {
                            if (
                              s.maDinhDanh !== student.maDinhDanh
                            ) {
                              return s;
                            }

                            const updated = {
                              ...s,
                              dgtx_gv: newVal,
                            };

                            const hs = updated.xepLoai?.trim();
                            const gv = newVal?.trim();
                            let chung = "";

                            if (!hs && gv) chung = gv;
                            else if (!gv) chung = hs;
                            else {
                              if (hs === "T" && gv === "T")
                                chung = "T";
                              else if (hs === "H" && gv === "T")
                                chung = "T";
                              else if (hs === "C" && gv === "T")
                                chung = "H";
                              else if (hs === "T" && gv === "H")
                                chung = "H";
                              else if (hs === "H" && gv === "H")
                                chung = "H";
                              else if (hs === "C" && gv === "H")
                                chung = "H";
                              else if (hs === "T" && gv === "C")
                                chung = "H";
                              else if (hs === "H" && gv === "C")
                                chung = "C";
                              else if (hs === "C" && gv === "C")
                                chung = "C";
                              else chung = hs;
                            }

                            updated.dgtx = chung;

                            // Cập nhật Context nếu có hàm truyền vào
                            if (setDgtxMucDatForClass) {
                              const classKey = (
                                selectedClass || ""
                              ).replace(".", "_");

                              const subjectKey =
                                selectedSubject === "Công nghệ"
                                  ? "CongNghe"
                                  : "TinHoc";

                              const mapTerm = {
                                "Giữa kỳ I": "GKI",
                                "Cuối kỳ I": "CKI",
                                "Giữa kỳ II": "GKII",
                                "Cuối năm": "CN",
                              };

                              const termDoc =
                                mapTerm[selectedSemester] || "CN";

                              setDgtxMucDatForClass(
                                namHocKey,
                                classKey,
                                subjectKey,
                                termDoc,
                                {
                                  [student.maDinhDanh]: chung || "",
                                }
                              );
                            }

                            return updated;
                          })
                        );
                      }}
                      disableUnderline
                      id={`teacher-dgtx-${idx}`}
                      sx={{
                        textAlign: "center",
                        px: 1,
                        "& .MuiSelect-select": {
                          py: 0.5,
                          fontSize: "14px",
                          color:
                            student.dgtx_gv === "C"
                              ? "#dc2626"
                              : (theme) =>
                                  theme.palette.primary.main,
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>-</em>
                      </MenuItem>
                      <MenuItem value="T">T</MenuItem>
                      <MenuItem value="H">H</MenuItem>
                      <MenuItem value="C">C</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>

                {/* CỘT MỨC ĐẠT CHUNG */}
                <TableCell
                  align="center"
                  sx={{
                    color:
                      student.dgtx === "C"
                        ? "#dc2626"
                        : (theme) => theme.palette.primary.main,
                  }}
                >
                  {student.dgtx || ""}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BangTongHopDGTX;