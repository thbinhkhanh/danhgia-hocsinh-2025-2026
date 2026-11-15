import React, { useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { FileSpreadsheet } from "lucide-react";
import { injectBangTongHopStyles } from "../utils/bangTongHopStyles";

export default function BangTongHopContent({
  worksheet,
  parsedData,
  filteredStudents = [],
  phanCongGVBM = [],
  normalizeText
}) {
  // Tự động tiêm CSS vào trang khi component được mount
  useEffect(() => {
    injectBangTongHopStyles();
  }, []);

  if (!worksheet) {
    return (
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
    );
  }

  return (
    <Box
      className="bang-tong-hop-content"
      sx={{
        p: {
          xs: 1.5,
          sm: 2.5
        }
      }}
    >
      {/* ================= TIÊU ĐỀ ĐƠN VỊ VÀ TÊN BẢNG ================= */}
      {(parsedData.unitTitles.length > 0 ||
        parsedData.mainTitles.length > 0) && (
        <Paper
          elevation={0}
          className="bang-tong-hop-title"
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 2.5,
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(260px, 0.85fr) minmax(450px, 1.8fr)"
            },
            gap: 2,
            alignItems: "center"
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
        </Paper>
      )}

      {/* ================= BẢNG TỔNG HỢP HỌC SINH ================= */}
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
                      cell.excelCol === parsedData.startColumn ? "col-stt" : "",
                      cell.excelCol === parsedData.startColumn + 1 ? "col-name" : "",
                      normalizeText(cell.value).includes("ngay thang nam sinh") ? "col-date" : "",
                      cell.value ? "header-cell" : "header-cell header-empty",
                      parsedData.rotatedHeaderCellIds.has(cell.id) ? "rotate-header" : ""
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
                    const isDateColumn = parsedData.headerRows.some((row) =>
                      row.cells.some((cell) => {
                        const startCol = cell.excelCol;
                        const endCol = startCol + (cell.colSpan || 1) - 1;

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

      {/* ================= THỐNG KÊ SỐ HỌC SINH ================= */}
      <Box
        className="no-print"
        sx={{
          mt: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Đang hiển thị {filteredStudents.length} / {parsedData.students.length} học sinh
        </Typography>
      </Box>

      {/* ================= CHỮ KÝ GVCN VÀ BAN GIÁM HIỆU ================= */}
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
                const isSignatureInstruction = /^\(Ký,.*\)$/i.test(content);
                const isBold =
                  content !== "" && (lineIdx === 0 || lineIdx === lastLineIndex);

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
                  ml: "100px",
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
                        gridTemplateColumns: "350px 1fr",
                        alignItems: "baseline",
                        columnGap: 1,
                        width: "100%",
                        mb: 1.5
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"Times New Roman", serif',
                          fontSize: 16,
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
                        ................................
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
                const isSignatureInstruction = /^\(Ký,.*\)$/i.test(content);
                const isDateLine =
                  /ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d+/i.test(content);
                const isBold =
                  content !== "" &&
                  !isDateLine &&
                  (lineIdx === 0 ||
                    lineIdx === lastLineIndex ||
                    /^Hiệu trưởng$/i.test(content));

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
  );
}