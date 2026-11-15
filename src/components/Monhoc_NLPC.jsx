import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Component hiển thị bảng điểm, năng lực, phẩm chất và khu vực chữ ký / khen thưởng học sinh.
 */
export default function MonhocNLPC({
  selectedTermLabel = "GIỮA HỌC KỲ I",
  normalizeText,
  formData = {},
  showPrincipalSignature = true
}) {
  const normalizedTerm = normalizeText ? normalizeText(selectedTermLabel) : selectedTermLabel.toLowerCase();

  // Cuối học kỳ I và cuối năm học dùng chung cấu trúc cuối kỳ
  const isFinalLayout =
    normalizedTerm.includes("cuoi hoc ky") ||
    normalizedTerm.includes("cuoi nam hoc");

  const finalTermTitle = normalizedTerm.includes("cuoi nam hoc")
    ? "CUỐI NĂM HỌC"
    : "CUỐI HỌC KỲ I";

  const formatTermTitle = (prefix) => {
    const formatted = (selectedTermLabel || "GIỮA HỌC KỲ I")
      .toLowerCase()
      .replace(/\bi\b/gi, "I")
      .replace(/\bii\b/gi, "II");
    return `${prefix} ${formatted}`;
  };

  return (
    <Box component="div" className="print-two-columns">
      {/* ================= CỘT TRÁI: MÔN HỌC ================= */}
      <Box component="div" className="print-column-left">
        <Typography
          component="h3"
          sx={{
            fontWeight: "bold",
            fontSize: "11pt",
            mb: "10px",
            mt: "10pt"
          }}
        >
          {formatTermTitle("I. Các môn học và hoạt động giáo dục")}
        </Typography>

        <Box component="table" className="excel-tb text-[8pt]">
          <Box component="colgroup">
            {isFinalLayout ? (
              <>
                <Box component="col" style={{ width: "6%" }} />
                <Box component="col" style={{ width: "24%" }} />
                <Box component="col" style={{ width: "9%" }} />
                <Box component="col" style={{ width: "9%" }} />
                <Box component="col" style={{ width: "9%" }} />
                <Box component="col" style={{ width: "9%" }} />
                <Box component="col" style={{ width: "34%" }} />
              </>
            ) : (
              <>
                <Box component="col" style={{ width: "6%" }} />
                <Box component="col" style={{ width: "24%" }} />
                <Box component="col" style={{ width: "10%" }} />
                <Box component="col" style={{ width: "10%" }} />
                <Box component="col" style={{ width: "50%" }} />
              </>
            )}
          </Box>
          
          <Box component="thead">
            {isFinalLayout ? (
              <>
                <Box component="tr" className="text-center font-bold">
                  <Box component="th" rowSpan={2}>STT</Box>
                  <Box component="th" rowSpan={2}>
                    Môn học và hoạt động
                    <br />
                    giáo dục
                  </Box>
                  <Box component="th" colSpan={2}>
                    {(
                      selectedTermLabel === "GIỮA HỌC KỲ II" ||
                      selectedTermLabel === "CUỐI NĂM HỌC"
                    ) ? "GKII" : "GKI"}
                  </Box>
                  <Box component="th" colSpan={2}>
                    {finalTermTitle === "CUỐI NĂM HỌC" ? "CUỐI NĂM" : "CKI"}
                  </Box>
                  <Box component="th" rowSpan={2}>
                    Điểm mạnh và các mặt cần rèn luyện
                  </Box>
                </Box>
                <Box component="tr" className="text-center font-bold">
                  <Box component="th">Mức đạt</Box>
                  <Box component="th">Điểm KTĐK</Box>
                  <Box component="th">Mức đạt</Box>
                  <Box component="th">Điểm KTĐK</Box>
                </Box>
              </>
            ) : (
              <>
                <Box component="tr" className="text-center font-bold">
                  <Box component="th" rowSpan={2}>STT</Box>
                  <Box component="th" rowSpan={2}>
                    Môn học và hoạt động
                    <br />
                    giáo dục
                  </Box>
                  <Box component="th" colSpan={2}>
                    {(
                      selectedTermLabel === "GIỮA HỌC KỲ II" ||
                      selectedTermLabel === "CUỐI NĂM HỌC"
                    ) ? "GKII" : "GKI"}
                  </Box>
                  <Box component="th" rowSpan={2}>
                    Điểm mạnh và các mặt cần rèn luyện
                  </Box>
                </Box>
                <Box component="tr" className="text-center font-bold">
                  <Box component="th">Mức đạt</Box>
                  <Box component="th">Điểm KTĐK</Box>
                </Box>
              </>
            )}
          </Box>

          <Box component="tbody">
            {(formData.subjects || []).map((item, idx) => (
              <Box
                component="tr"
                key={item.stt || idx}
                className="h-[16px]"
              >
                <Box
                  component="td"
                  sx={{
                    textAlign: "center !important",
                    verticalAlign: "middle",
                    padding: "0 !important"
                  }}
                >
                  {item.stt}
                </Box>

                <Box component="td" className="pl-1">
                  {item.name}
                </Box>

                {isFinalLayout ? (
                  <>
                    <Box component="td" sx={{ textAlign: "center" }}>
                      {item.midTermLevel}
                    </Box>
                    <Box component="td" sx={{ textAlign: "center" }}>
                      {item.midTermPoint}
                    </Box>
                    <Box component="td" sx={{ textAlign: "center" }}>
                      {item.finalTermLevel}
                    </Box>
                    <Box component="td" sx={{ textAlign: "center" }}>
                      {item.finalTermPoint}
                    </Box>
                  </>
                ) : (
                  <>
                    <Box component="td" sx={{ textAlign: "center" }}>
                      {item.midTermLevel}
                    </Box>
                    <Box component="td" sx={{ textAlign: "center" }}>
                      {item.midTermPoint}
                    </Box>
                  </>
                )}

                <Box component="td" className="pl-1 leading-tight">
                  {item.note}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ================= CỘT PHẢI: NĂNG LỰC - PHẨM CHẤT ================= */}
      <Box component="div" className="print-column-right">
        <Typography
          component="h3"
          sx={{
            fontWeight: "bold",
            fontSize: "11pt",
            mb: "10px",
            mt: "10pt"
          }}
        >
          {formatTermTitle("II. Các năng lực cốt lõi, phẩm chất chủ yếu")}
        </Typography>
        
        <Box component="table" className="excel-tb text-[8pt]">
          <Box component="colgroup">
            <Box
              component="col"
              style={{ width: isFinalLayout ? "30%" : "38%" }}
            />
            {isFinalLayout ? (
              <>
                <Box component="col" style={{ width: "10%" }} />
                <Box component="col" style={{ width: "10%" }} />
                <Box component="col" style={{ width: "50%" }} />
              </>
            ) : (
              <>
                <Box component="col" style={{ width: "20%" }} />
                <Box component="col" style={{ width: "42%" }} />
              </>
            )}
          </Box>

          <Box component="thead">
            {isFinalLayout ? (
              <>
                <Box component="tr" className="text-center font-bold">
                  <Box component="th" rowSpan={2}>
                    Các năng lực cốt lõi,
                    <br />
                    phẩm chất chủ yếu
                  </Box>
                  <Box component="th">
                    {(
                      selectedTermLabel === "GIỮA HỌC KỲ II" ||
                      selectedTermLabel === "CUỐI NĂM HỌC"
                    ) ? "GKII" : "GKI"}
                  </Box>
                  <Box component="th">
                    {finalTermTitle === "CUỐI NĂM HỌC" ? "CN" : "CKI"}
                  </Box>
                  <Box component="th" rowSpan={2}>
                    Điểm mạnh và các mặt cần rèn luyện
                  </Box>
                </Box>
                <Box component="tr" className="text-center font-bold">
                  <Box component="th">Mức đạt</Box>
                  <Box component="th">Mức đạt</Box>
                </Box>
              </>
            ) : (
              <Box component="tr" className="text-center font-bold">
                <Box component="th">
                  Các năng lực cốt lõi,
                  <br />
                  phẩm chất chủ yếu
                </Box>
                <Box component="th">
                  {selectedTermLabel === "GIỮA HỌC KỲ II" ? "GKII" : "GKI"}
                  <br />
                  Mức đạt
                </Box>
                <Box component="th">
                  Điểm mạnh và các mặt cần rèn luyện
                </Box>
              </Box>
            )}
          </Box>

          <Box component="tbody">
            {/* NĂNG LỰC CỐT LÕI */}
            <Box component="tr" className="font-bold bg-slate-50">
              <Box
                component="td"
                colSpan={isFinalLayout ? 3 : 2}
                className="py-0.5 pl-1"
                sx={{ fontWeight: "bold" }}
              >
                Năng lực cốt lõi
              </Box>
              <Box
                component="td"
                rowSpan={5}
                className="align-top p-1"
                sx={{ verticalAlign: "top" }}
              >
                {formData.competenciesCoreNote}
              </Box>
            </Box>

            <Box component="tr" className="font-bold bg-slate-50">
              <Box
                component="td"
                colSpan={isFinalLayout ? 3 : 2}
                className="pl-1"
                sx={{ fontWeight: "bold" }}
              >
                Năng lực chung
              </Box>
            </Box>

            {(formData.competenciesCore || []).map((item, idx) => (
              <Box
                component="tr"
                key={`core-${idx}`}
                className="h-[15px]"
              >
                <Box component="td" className="pl-1">
                  {item.name}
                </Box>
                <Box
                  component="td"
                  sx={{ textAlign: "center", fontWeight: "500" }}
                >
                  {item.midTermLevel}
                </Box>
                {isFinalLayout && (
                  <Box
                    component="td"
                    sx={{ textAlign: "center", fontWeight: "500" }}
                  >
                    {item.finalTermLevel}
                  </Box>
                )}
              </Box>
            ))}

            {/* NĂNG LỰC ĐẶC THÙ */}
            <Box component="tr" className="font-bold bg-slate-50">
              <Box
                component="td"
                colSpan={isFinalLayout ? 3 : 2}
                className="py-0.5 pl-1"
                sx={{ fontWeight: "bold" }}
              >
                Năng lực đặc thù
              </Box>
              <Box
                component="td"
                rowSpan={8}
                className="align-top p-1"
                sx={{ verticalAlign: "top" }}
              >
                {formData.competenciesSpecificNote}
              </Box>
            </Box>

            {(formData.competenciesSpecific || []).map((item, idx) => (
              <Box
                component="tr"
                key={`specific-${idx}`}
                className="h-[15px]"
              >
                <Box component="td" className="pl-1">
                  {item.name}
                </Box>
                <Box
                  component="td"
                  sx={{ textAlign: "center", fontWeight: "500" }}
                >
                  {item.midTermLevel}
                </Box>
                {isFinalLayout && (
                  <Box
                    component="td"
                    sx={{ textAlign: "center", fontWeight: "500" }}
                  >
                    {item.finalTermLevel}
                  </Box>
                )}
              </Box>
            ))}

            {/* PHẨM CHẤT */}
            <Box component="tr" className="font-bold bg-slate-50">
              <Box
                component="td"
                colSpan={isFinalLayout ? 3 : 2}
                className="py-0.5 pl-1"
                sx={{ fontWeight: "bold" }}
              >
                Phẩm chất chủ yếu
              </Box>
              <Box
                component="td"
                rowSpan={6}
                className="align-top p-1"
                sx={{ verticalAlign: "top" }}
              >
                {formData.qualitiesNote}
              </Box>
            </Box>

            {(formData.qualities || []).map((item, idx) => (
              <Box
                component="tr"
                key={`qual-${idx}`}
                className="h-[15px]"
              >
                <Box component="td" className="pl-1">
                  {item.name}
                </Box>
                <Box
                  component="td"
                  sx={{ textAlign: "center", fontWeight: "500" }}
                >
                  {item.midTermLevel}
                </Box>
                {isFinalLayout && (
                  <Box
                    component="td"
                    sx={{ textAlign: "center", fontWeight: "500" }}
                  >
                    {item.finalTermLevel}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* ================= KHEN THƯỞNG ================= */}
        <Box
          component="div"
          className="signature-area mt-1 text-[9pt]"
        >
          <Box
            component="div"
            className="signature-reward mt-1 flex items-end"
            sx={{
              display: "flex",
              alignItems: "flex-end",
              mt: "4px"
            }}
          >
            <Typography
              component="span"
              sx={{
                fontWeight: "bold",
                fontSize: "11pt",
                mb: "10px",
                mt: "10pt"
              }}
            >
              Khen thưởng:
            </Typography>

            <Typography
              component="span"
              className="signature-reward-line"
              sx={{
                flex: 1,
                ml: "8px",
                fontWeight: "bold"
              }}
            >
              {formData.rewards || " "}
            </Typography>
          </Box>

          {/* CHỮ KÝ */}
          <Box
            component="div"
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                width: "100%",
                marginTop: "8px"
            }}
            >
            {/* CỘT HIỆU TRƯỞNG: luôn giữ chỗ, chỉ đổi màu chữ */}
            <Box
                component="div"
                style={{
                    textAlign: "center",
                    color: showPrincipalSignature ? "#000" : "#fff",
                    marginTop: "7mm"
                }}
                >
                <Box component="div" style={{ fontWeight: 700 }}>
                    Xác nhận của Hiệu trưởng
                </Box>

                <Box
                    component="div"
                    style={{
                    fontStyle: "italic",
                    marginBottom: "20mm"
                    }}
                >
                    (ký, đóng dấu và ghi rõ họ tên)
                </Box>

                <Box component="div" style={{ fontWeight: 700 }}>
                    {formData.principalName}
                </Box>
                </Box>

            {/* CỘT GIÁO VIÊN: giữ nguyên vị trí bên phải */}
            <Box component="div" style={{ textAlign: "center" }}>
                {/* Ngày tháng */}
                <Box
                    component="div"
                    style={{
                    fontStyle: "italic",
                    marginBottom: "2px"
                    }}
                >
                    {formData.locationDate}
                </Box>

                {/* Chức danh */}
                <Box
                    component="div"
                    style={{
                    fontWeight: 700
                    }}
                >
                    Giáo viên chủ nhiệm
                </Box>

                {/* Hướng dẫn ký */}
                <Box
                    component="div"
                    style={{
                    fontStyle: "italic",
                    marginBottom: "20mm"
                    }}
                >
                    (ký và ghi rõ họ tên)
                </Box>

                {/* Họ tên giáo viên */}
                <Box component="div" style={{ fontWeight: 700 }}>
                    {formData.teacherName}
                </Box>
                </Box>
            </Box>
        </Box>
      </Box>
    </Box>
  );
}