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
        maxHeight: "none",
        overflowY: "visible",
        overflowX: "auto",
      }}
    >
      <Table
        stickyHeader
        size="small"
        sx={{
          tableLayout: "auto",
          minWidth: 600,
          borderCollapse: "collapse",
          "& td, & th": { borderRight: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0" },
          "& th:last-child, & td:last-child": { borderRight: "none" },
        }}
      >
        <TableHead>
          {/* HÀNG HEADER 1 — merge tuần */}
          <TableRow>
            <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>STT</TableCell>
            <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 220 }}>Họ và tên</TableCell>

            {showWeeks &&
              Array.from({ length: totalWeeks }, (_, i) => {
                const weekNum = startWeek + i;
                return (
                  <TableCell
                    key={weekNum}
                    align="center"
                    colSpan={2}
                    sx={{ backgroundColor: "#1976d2", color: "white", width: 60 }}
                  >
                    Tuần {weekNum}
                  </TableCell>
                );
              })}

            <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>Học sinh</TableCell>
            
            <TableCell
              rowSpan={2}
              align="center"
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                width: 50,
                px: 0.5
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="center" gap={0.3}>
                <Typography variant="body2" sx={{ color: "white", fontSize: 14 }}>
                  Giáo viên
                </Typography>
                <FormControl variant="standard" sx={{ m: 0, minWidth: 16 }}>
                  <Select
                    defaultValue=""
                    displayEmpty
                    disableUnderline
                    onChange={(e) => handleHeaderTeacherChange(e.target.value)}
                    renderValue={() => <span style={{ fontSize: 18, lineHeight: 1 }}>▾</span>}
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
                      "& .MuiSelect-icon": { display: "none" },
                    }}
                  >
                    <MenuItem value=""><em>-</em></MenuItem>
                    <MenuItem value="T">T</MenuItem>
                    <MenuItem value="H">H</MenuItem>
                    <MenuItem value="C">C</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </TableCell>
            <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>Mức đạt</TableCell>
          </TableRow>

          {/* HÀNG HEADER 2 — HS, GV cho từng tuần */}
          <TableRow>
            {showWeeks &&
              Array.from({ length: totalWeeks }, (_, i) => (
                <React.Fragment key={`sub-${i}`}>
                  <TableCell align="center" sx={{ backgroundColor: "#42a5f5", color: "white", width: 30 }}>NX</TableCell>
                  <TableCell align="center" sx={{ backgroundColor: "#42a5f5", color: "white", width: 30 }}>BT</TableCell>
                </React.Fragment>
              ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {students.map((student, idx) => {
            const isSpecialNote = ["khuyết tật", "chuyển trường", "bỏ học"].includes(
              String(student.ghiChu || "").trim().toLowerCase()
            );

            return (
              <TableRow
                key={student.maDinhDanh}
                hover
                sx={{
                  backgroundColor: isSpecialNote ? "#f3f3f3" : "inherit",
                  color: isSpecialNote ? "red" : "inherit",
                  "& td": { color: isSpecialNote ? "red" : "inherit" },
                  "&:hover": {
                    backgroundColor: isSpecialNote ? "#d6d6d6" : "rgba(25,118,210,0.05)",
                  },
                }}
              >
                <TableCell align="center">{student.stt}</TableCell>
                <TableCell
                  align="left"
                  sx={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 220,
                  }}
                >
                  {student.hoVaTen}
                </TableCell>

                {/* Các cột tuần */}
                {showWeeks &&
                  Array.from({ length: totalWeeks }, (_, i) => {
                    const weekNum = startWeek + i;
                    const weekId = `tuan_${weekNum}`;
                    const raw = student.statusByWeek?.[weekId];
                    const hs = raw && typeof raw === "object" ? (raw.hs || "") : (raw || "");
                    const gv = raw && typeof raw === "object" ? (raw.gv || "") : "";

                    const hsShort = toShort(hs);
                    const gvShort = toShort(gv);

                    return (
                      <React.Fragment key={weekNum}>
                        <TableCell align="center" sx={{ width: 30 }}>{hsShort}</TableCell>
                        <TableCell
                          align="center"
                          sx={{ width: 30, color: gvShort === "C" ? "#dc2626" : "#1976d2" }}
                        >
                          {gvShort}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}

                {/* Cột Xếp loại học sinh */}
                <TableCell
                  align="center"
                  sx={{
                    px: 1,
                    color: student.xepLoai === "C" ? "#dc2626" : (theme) => theme.palette.primary.main,
                  }}
                >
                  <FormControl variant="standard" fullWidth sx={{ "& .MuiSelect-icon": { opacity: 0, transition: "0.2s" }, "&:hover .MuiSelect-icon": { opacity: 1 } }}>
                    <Select
                      value={student.xepLoai || ""}
                      onChange={(e) => {
                        const newHS = e.target.value;
                        setStudents((prev) =>
                          prev.map((s) => {
                            if (s.maDinhDanh !== student.maDinhDanh) return s;
                            const updated = { ...s, xepLoai: newHS };
                            const hs = newHS;
                            const gv = updated.dgtx_gv;
                            const diemMap = { T: 3, H: 2, C: 1 };
                            let chung = hs || gv;

                            if (hs && gv) {
                              const avg = (diemMap[hs] + diemMap[gv]) / 2;
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
                          color: student.xepLoai === "C" ? "#dc2626" : (theme) => theme.palette.primary.main,
                        },
                      }}
                    >
                      <MenuItem value=""><em>-</em></MenuItem>
                      <MenuItem value="T">T</MenuItem>
                      <MenuItem value="H">H</MenuItem>
                      <MenuItem value="C">C</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>

                {/* Cột Giáo viên */}
                <TableCell
                  align="center"
                  sx={{
                    px: 1,
                    color: student.dgtx_gv === "C" ? "#dc2626" : (theme) => theme.palette.primary.main,
                  }}
                >
                  <FormControl variant="standard" fullWidth sx={{ "& .MuiSelect-icon": { opacity: 0, transition: "opacity 0.2s ease" }, "&:hover .MuiSelect-icon": { opacity: 1 } }}>
                    <Select
                      value={student.dgtx_gv || ""}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setStudents((prev) =>
                          prev.map((s) => {
                            if (s.maDinhDanh !== student.maDinhDanh) return s;
                            const updated = { ...s, dgtx_gv: newVal };
                            const hs = updated.xepLoai?.trim();
                            const gv = newVal?.trim();
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

                            updated.dgtx = chung;

                            // Cập nhật Context nếu có hàm truyền vào
                            if (setDgtxMucDatForClass) {
                              const classKey = (selectedClass || "").replace(".", "_");
                              const subjectKey = selectedSubject === "Công nghệ" ? "CongNghe" : "TinHoc";
                              const mapTerm = {
                                "Giữa kỳ I": "GKI",
                                "Cuối kỳ I": "CKI",
                                "Giữa kỳ II": "GKII",
                                "Cuối năm": "CN",
                              };
                              const termDoc = mapTerm[selectedSemester] || "CN";

                              setDgtxMucDatForClass(
                                namHocKey,
                                classKey,
                                subjectKey,
                                termDoc,
                                { [student.maDinhDanh]: chung || "" }
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
                          color: student.dgtx_gv === "C" ? "#dc2626" : (theme) => theme.palette.primary.main,
                        },
                      }}
                    >
                      <MenuItem value=""><em>-</em></MenuItem>
                      <MenuItem value="T">T</MenuItem>
                      <MenuItem value="H">H</MenuItem>
                      <MenuItem value="C">C</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>

                {/* Cột Mức đạt chung */}
                <TableCell
                  align="center"
                  sx={{
                    color: student.dgtx === "C" ? "#dc2626" : (theme) => theme.palette.primary.main,
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