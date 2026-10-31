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
  TextField,
} from "@mui/material";

export default function BangNhapDiemKTDK({
  students,
  setStudents,
  selectedSubject,
  config,
  fillLyThuyet,
  setFillLyThuyet,
  fillThucHanh,
  setFillThucHanh,
  handleCellChange,
  handleKeyNavigation,
  generateNhanXet,
}) {
  const readOnlyCellSx = { backgroundColor: "#f9f9f9", px: 1 };

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
          tableLayout: "fixed",
          minWidth: 800,
          borderCollapse: "collapse",
          "& td, & th": {
            borderRight: "1px solid #e0e0e0",
            borderBottom: "1px solid #e0e0e0",
          },
          "& th:last-child, & td:last-child": {
            borderRight: "none",
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 50, px: 1, whiteSpace: "nowrap" }}>STT</TableCell>
            <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 220, px: 1, whiteSpace: "nowrap" }}>Họ và tên</TableCell>            
            <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 60, px: 1, whiteSpace: "nowrap" }}>ĐGTX</TableCell>
            
            {/* Cột Lí thuyết & Fill All */}
            <TableCell
              align="center"
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                width: 70,
                px: 0.5,
                whiteSpace: "nowrap"
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="center" gap={0.3}>
                <Typography variant="body2" sx={{ color: "white" }}>
                  Lí thuyết
                </Typography>

                {/* 🔥 FILL ALL LÍ THUYẾT */}
                <FormControl variant="standard" sx={{ minWidth: 16 }}>
                  <Select
                    value={fillLyThuyet}
                    displayEmpty
                    disableUnderline
                    onChange={(e) => {
                      const val = e.target.value;
                      setFillLyThuyet(val);

                      setStudents((prev) =>
                        prev.map((s) => {
                          let updated = { ...s };

                          if (val === "-") {
                            return {
                              ...s,
                              lyThuyet: "",
                              tongCong: null,
                              mucDat: "",
                              nhanXet: "",
                            };
                          }

                          updated.lyThuyet = val;

                          // ===== TIN HỌC =====
                          if (selectedSubject === "Tin học") {
                            const lt = parseFloat(val);
                            const th = parseFloat(s.thucHanh);

                            if (!isNaN(lt) && !isNaN(th)) {
                              updated.tongCong = Math.round(lt + th);
                              updated.mucDat =
                                updated.tongCong >= 9 ? "T" :
                                updated.tongCong >= 5 ? "H" : "C";

                              updated.nhanXet = generateNhanXet(
                                updated,
                                selectedSubject,
                                updated.tongCong,
                                updated.mucDat
                              );
                            } else {
                              updated.tongCong = null;
                              updated.mucDat = "";
                              updated.nhanXet = "";
                            }
                          }

                          // ===== CÔNG NGHỆ =====
                          if (selectedSubject === "Công nghệ") {
                            const lt = parseFloat(val);

                            if (!isNaN(lt)) {
                              updated.tongCong = Math.round(lt);
                              updated.mucDat =
                                lt >= 9 ? "T" :
                                lt >= 5 ? "H" : "C";

                              updated.nhanXet = generateNhanXet(
                                updated,
                                selectedSubject,
                                updated.tongCong,
                                updated.mucDat
                              );
                            } else {
                              updated.tongCong = null;
                              updated.mucDat = "";
                              updated.nhanXet = "";
                            }
                          }

                          return updated;
                        })
                      );

                      setFillLyThuyet("");
                    }}
                    renderValue={() => "▾"}
                    sx={{
                      color: "white",
                      fontSize: 18,
                      "& .MuiSelect-icon": { display: "none" }
                    }}
                  >
                    {selectedSubject === "Tin học"
                      ? ["-", 0, 1, 2, 3, 4, 5].map((v) => (
                          <MenuItem key={v} value={v}>{v}</MenuItem>
                        ))
                      : ["-", 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                          <MenuItem key={v} value={v}>{v}</MenuItem>
                        ))
                    }
                  </Select>
                </FormControl>
              </Box>
            </TableCell>

            {/* Cột Thực hành & Fill All */}
            <TableCell
              align="center"
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                width: 80,
                px: 0.5,
                whiteSpace: "nowrap"
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="center" gap={0.3}>
                <Typography variant="body2" sx={{ color: "white" }}>
                  Thực hành
                </Typography>

                {/* 🔥 FILL ALL THỰC HÀNH */}
                <FormControl variant="standard" sx={{ minWidth: 16 }}>
                  <Select
                    value={fillThucHanh}
                    displayEmpty
                    disableUnderline
                    onChange={(e) => {
                      const val = e.target.value;
                      setFillThucHanh(val);

                      setStudents((prev) =>
                        prev.map((s) => {
                          if (val === "-") {
                            return {
                              ...s,
                              thucHanh: "",
                              tongCong: null,
                              mucDat: "",
                              nhanXet: "",
                            };
                          }

                          let updated = { ...s, thucHanh: val };

                          // ===== TIN HỌC =====
                          if (selectedSubject === "Tin học") {
                            const lt = parseFloat(s.lyThuyet);
                            const th = parseFloat(val);

                            if (!isNaN(lt) && !isNaN(th)) {
                              updated.tongCong = Math.round(lt + th);
                              updated.mucDat =
                                updated.tongCong >= 9 ? "T" :
                                updated.tongCong >= 5 ? "H" : "C";

                              updated.nhanXet = generateNhanXet(
                                updated,
                                selectedSubject,
                                updated.tongCong,
                                updated.mucDat
                              );
                            } else {
                              updated.tongCong = null;
                              updated.mucDat = "";
                              updated.nhanXet = "";
                            }
                          }

                          // ===== CÔNG NGHỆ =====
                          if (selectedSubject === "Công nghệ") {
                            const lt = parseFloat(s.lyThuyet);

                            if (!isNaN(lt)) {
                              updated.tongCong = Math.round(lt);
                              updated.mucDat =
                                lt >= 9 ? "T" : lt >= 5 ? "H" : "C";

                              updated.nhanXet = generateNhanXet(
                                updated,
                                selectedSubject,
                                updated.tongCong,
                                updated.mucDat
                              );
                            } else {
                              updated.tongCong = null;
                              updated.mucDat = "";
                              updated.nhanXet = "";
                            }
                          }

                          return updated;
                        })
                      );

                      setFillThucHanh("");
                    }}
                    renderValue={() => "▾"}
                    sx={{
                      color: "white",
                      fontSize: 18,
                      "& .MuiSelect-icon": { display: "none" }
                    }}
                  >
                    {selectedSubject === "Tin học" ? (
                      ["-", 0, 1, 2, 3, 4, 5].map((v) => (
                        <MenuItem key={v} value={v}>{v}</MenuItem>
                      ))
                    ) : (
                      ["-", "T", "H", "C"].map((v) => (
                        <MenuItem key={v} value={v}>{v}</MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Box>
            </TableCell>

            <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>
              Tổng cộng
            </TableCell>

            {/* Cột động theo học kỳ */}
            {config.hocKy === "Cuối kỳ I" && (
              <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                GKI
              </TableCell>
            )}

            {config.hocKy === "Giữa kỳ II" && (
              <>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                  GKI
                </TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                  CKI
                </TableCell>
              </>
            )}

            {config.hocKy === "Cuối năm" && (
              <>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                  GKI
                </TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                  CKI
                </TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                  GKII
                </TableCell>
              </>
            )}

            <TableCell
              align="center"
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                width: 70,
                px: 1,
                whiteSpace: "nowrap"
              }}
            >
              {config.hocKy === "Giữa kỳ I"
                ? "GKI"
                : config.hocKy === "Cuối kỳ I"
                ? "CKI"
                : config.hocKy === "Giữa kỳ II"
                ? "GKII"
                : "CN"}
            </TableCell>
            <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 500, px: 1, whiteSpace: "nowrap" }}>Nhận xét</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {students.map((student, idx) => {
            const isKhuyetTat = String(student.ghiChu || "").trim().toLowerCase() === "khuyết tật";
            return (
              <TableRow
                key={student.maDinhDanh}
                hover
                sx={{
                  backgroundColor: isKhuyetTat ? "#f5f5f5" : "inherit",
                  color: isKhuyetTat ? "red" : "inherit",
                  "&:hover": {
                    backgroundColor: isKhuyetTat ? "#eeeeee" : "rgba(25,118,210,0.05)",
                  },
                  "& td": {
                    color: isKhuyetTat ? "red" : "inherit",
                  },
                }}
              >
                <TableCell align="center" sx={{ px: 1 }}>{student.stt}</TableCell>
                <TableCell align="left" sx={{ px: 1 }}>{student.hoVaTen}</TableCell>

                {/* Cột ĐGTX */}
                <TableCell align="center" sx={{ px: 1 }}>
                  <Box sx={{ textAlign: "center", fontSize: "14px", py: 0.5 }}>
                    {student.dgtx_mucdat || "-"}
                  </Box>
                </TableCell>

                {/* Cột Lí thuyết */}
                <TableCell align="center" sx={{ px: 1 }}>
                  <Box
                    sx={{
                      borderRadius: 1,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#ffffff",
                        boxShadow: "inset 0 0 0 1px #1976d2",
                      },
                      "&:focus-within": {
                        backgroundColor: "#ffffff",
                        boxShadow: "inset 0 0 0 2px #1976d2",
                      },
                    }}
                  >
                    <TextField
                      variant="standard"
                      value={student.lyThuyet ?? ""}
                      onChange={(e) =>
                        handleCellChange(
                          student.maDinhDanh,
                          "lyThuyet",
                          e.target.value
                        )
                      }
                      fullWidth
                      inputProps={{
                        style: {
                          textAlign: "center",
                          padding: "4px 8px",
                        },
                      }}
                      id={`lyThuyet-${idx}`}
                      onKeyDown={(e) =>
                        handleKeyNavigation(e, idx, "lyThuyet")
                      }
                      InputProps={{ disableUnderline: true }}
                    />
                  </Box>
                </TableCell>

                {/* Cột Thực hành */}
                <TableCell align="center" sx={{ px: 1 }}>
                  {selectedSubject === "Công nghệ" ? (
                    <Box
                      sx={{
                        borderRadius: 1,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor: "#ffffff",
                          boxShadow: "inset 0 0 0 1px #1976d2",
                        },
                        "&:focus-within": {
                          backgroundColor: "#ffffff",
                          boxShadow: "inset 0 0 0 2px #1976d2",
                        },
                        "& .MuiSelect-icon": {
                          opacity: 0,
                          transition: "opacity 0.2s ease",
                        },
                        "&:hover .MuiSelect-icon": {
                          opacity: 1,
                        },
                      }}
                    >
                      <FormControl variant="standard" fullWidth>
                        <Select
                          value={student.thucHanh ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStudents((prev) =>
                              prev.map((s) => {
                                if (s.maDinhDanh !== student.maDinhDanh) return s;
                                let updated = { ...s };

                                if (val === "") {
                                  return {
                                    ...s,
                                    thucHanh: "",
                                    tongCong: null,
                                    mucDat: "",
                                    nhanXet: "",
                                  };
                                }

                                updated.thucHanh = val;

                                if (selectedSubject === "Công nghệ") {
                                  const lt = parseFloat(s.lyThuyet);
                                  if (!isNaN(lt)) {
                                    updated.tongCong = Math.round(lt);
                                    updated.mucDat =
                                      lt >= 9 ? "T" : lt >= 5 ? "H" : "C";
                                    updated.nhanXet = generateNhanXet(
                                      updated,
                                      selectedSubject,
                                      updated.tongCong,
                                      updated.mucDat
                                    );
                                  }
                                }
                                return updated;
                              })
                            );
                          }}
                          disableUnderline
                          id={`thucHanh-${idx}`}
                          sx={{
                            textAlign: "center",
                            px: 1,
                            "& .MuiSelect-select": {
                              py: "4px",
                              fontSize: "14px",
                              textAlign: "center",
                            },
                          }}
                          onKeyDown={(e) =>
                            handleKeyNavigation(e, idx, "thucHanh")
                          }
                        >
                          <MenuItem value=""><em>-</em></MenuItem>
                          <MenuItem value="T">T</MenuItem>
                          <MenuItem value="H">H</MenuItem>
                          <MenuItem value="C">C</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        borderRadius: 1,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor: "#ffffff",
                          boxShadow: "inset 0 0 0 1px #1976d2",
                        },
                        "&:focus-within": {
                          backgroundColor: "#ffffff",
                          boxShadow: "inset 0 0 0 2px #1976d2",
                        },
                      }}
                    >
                      <TextField
                        variant="standard"
                        value={student.thucHanh ?? ""}
                        onChange={(e) =>
                          handleCellChange(
                            student.maDinhDanh,
                            "thucHanh",
                            e.target.value
                          )
                        }
                        fullWidth
                        inputProps={{
                          style: {
                            textAlign: "center",
                            padding: "4px 6px",
                          },
                        }}
                        id={`thucHanh-${idx}`}
                        onKeyDown={(e) =>
                          handleKeyNavigation(e, idx, "thucHanh")
                        }
                        InputProps={{ disableUnderline: true }}
                      />
                    </Box>
                  )}
                </TableCell>

                <TableCell align="center" sx={{ px: 1, fontWeight: "bold" }}>
                  {student.tongCong || ""}
                </TableCell>

                {config.hocKy === "Cuối kỳ I" && (
                  <TableCell align="center" sx={readOnlyCellSx}>
                    {student.lyThuyet != null && student.thucHanh != null ? (student.mucDat_GKI || "-") : ""}
                  </TableCell>
                )}

                {config.hocKy === "Giữa kỳ II" && (
                  <>
                    <TableCell align="center" sx={readOnlyCellSx}>
                      {student.mucDat_GKI || "-"}
                    </TableCell>
                    <TableCell align="center" sx={readOnlyCellSx}>
                      {student.mucDat_CKI || "-"}
                    </TableCell>
                  </>
                )}

                {config.hocKy === "Cuối năm" && (
                  <>
                    <TableCell align="center" sx={readOnlyCellSx}>
                      {student.mucDat_GKI || "-"}
                    </TableCell>
                    <TableCell align="center" sx={readOnlyCellSx}>
                      {student.mucDat_CKI || "-"}
                    </TableCell>
                    <TableCell align="center" sx={readOnlyCellSx}>
                      {student.mucDat_GKII || "-"}
                    </TableCell>
                  </>
                )}

                {/* Cột Mức đạt chính */}
                <TableCell align="center" sx={{ px: 1 }}>
                  <Box
                    sx={{
                      borderRadius: 1,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#ffffff",
                        boxShadow: "inset 0 0 0 1px #1976d2",
                      },
                      "&:focus-within": {
                        backgroundColor: "#ffffff",
                        boxShadow: "inset 0 0 0 2px #1976d2",
                      },
                      "& .MuiSelect-icon": {
                        opacity: 0,
                        transition: "opacity 0.2s ease",
                      },
                      "&:hover .MuiSelect-icon": {
                        opacity: 1,
                      },
                    }}
                  >
                    <FormControl variant="standard" fullWidth>
                      <Select
                        value={selectedSubject === "Tin học" && (student.lyThuyet == null || student.thucHanh == null) ? "" : (student.mucDat || "")}
                        onChange={(e) =>
                          handleCellChange(
                            student.maDinhDanh,
                            "mucDat",
                            e.target.value
                          )
                        }
                        disableUnderline
                        id={`mucDat-${idx}`}
                        sx={{
                          textAlign: "center",
                          px: 1,
                          "& .MuiSelect-select": {
                            py: "4px",
                            fontSize: "14px",
                            textAlign: "center",
                          },
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const next = document.getElementById(
                              `mucDat-${idx + 1}`
                            );
                            if (next) next.focus();
                          }
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

                {/* Cột Nhận xét */}
                <TableCell align="left" sx={{ px: 1 }}>
                  <TextField
                    variant="standard"
                    value={selectedSubject === "Tin học" && (student.lyThuyet == null || student.thucHanh == null) ? "" : (student.nhanXet ?? "")}
                    onChange={(e) =>
                      handleCellChange(
                        student.maDinhDanh,
                        "nhanXet",
                        e.target.value
                      )
                    }
                    fullWidth
                    id={`nhanXet-${idx}`}
                    onKeyDown={(e) => handleKeyNavigation(e, idx, "nhanXet")}
                    InputProps={{ disableUnderline: true }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}