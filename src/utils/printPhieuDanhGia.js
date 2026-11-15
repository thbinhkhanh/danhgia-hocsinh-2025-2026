export const printPhieuDanhGia = (
  students,
  selectedClass,
  selectedTermLabel,
  printOptions = {}
) => {
  const {
    confirmationType = "principal",
    printDate = ""
  } = printOptions || {};

  if (!students || students.length === 0) {
    alert("❌ Không có dữ liệu học sinh để in!");
    return;
  }

  // Chuyển ngày YYYY-MM-DD thành ngày hiển thị trên phiếu
  const formattedPrintDate = printDate
    ? (() => {
        const [year, month, day] = printDate.split("-");
        return `Bình Khánh, ngày ${Number(day)} tháng ${Number(month)} năm ${year}`;
      })()
    : "";

  // Các xử lý hiện tại tiếp tục ở đây...

  // ==============================
  // XỬ LÝ HỌC KỲ
  // ==============================
  const normalizedTerm = (selectedTermLabel || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const isYearEnd = normalizedTerm.includes("cuoi nam hoc");

  const isSemesterII = normalizedTerm.includes("hoc ky ii");

  const isFinalLayout =
    normalizedTerm.includes("cuoi hoc ky") || isYearEnd;

  const midTermTitle = isSemesterII || isYearEnd
    ? "GKII"
    : "GKI";

  const finalTermTitle = isYearEnd
    ? "CUỐI NĂM"
    : isSemesterII
      ? "CKII"
      : "CKI";

  const printTitle = isYearEnd
    ? "PHIẾU ĐÁNH GIÁ HỌC TẬP CUỐI NĂM HỌC"
    : isFinalLayout
      ? `PHIẾU ĐÁNH GIÁ HỌC TẬP CUỐI HỌC KỲ ${isSemesterII ? "II" : "I"}`
      : `PHIẾU ĐÁNH GIÁ HỌC TẬP GIỮA HỌC KỲ ${isSemesterII ? "II" : "I"}`;

  // ==============================
  // HÀM HỖ TRỢ
  // ==============================
  const escapeHtml = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const formatMeasure = (value, unit, fallback) => {
    const text = String(value ?? "").trim();

    if (!text) return fallback;

    const unitRegex = new RegExp(`\\s*${unit}\\s*$`, "i");

    return unitRegex.test(text)
      ? text
      : `${text} ${unit}`;
  };

  const formatText = (value, fallback = "") => {
    return escapeHtml(value || fallback);
  };

  // ==============================
  // SẮP XẾP HỌC SINH THEO TÊN
  // ==============================
  const sortedStudents = [...students].sort((a, b) => {
    const partsA = (a.hoTen || "").trim().split(/\s+/);
    const partsB = (b.hoTen || "").trim().split(/\s+/);

    const nameA = partsA[partsA.length - 1] || "";
    const nameB = partsB[partsB.length - 1] || "";

    return nameA.localeCompare(nameB, "vi", {
      sensitivity: "base"
    });
  });

  // ==============================
  // TẠO HTML IN
  // ==============================
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />

      <title>Phiếu đánh giá học tập</title>

      <style>
        @page {
          size: A4 landscape;
          margin: 4mm 4mm 2mm 4mm;
        }

        html,
        body {
          width: 297mm;
          height: 210mm;
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: "Times New Roman", Times, serif;
          color: #000;
          font-size: 11pt;
          line-height: 1.15;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .page {
          width: 289mm;
          height: 204mm;
          box-sizing: border-box;
          padding: 0;
          margin: 0 auto;
          page-break-after: always;
          break-after: page;
          position: relative;
          background: white;
          display: flex;
          flex-direction: column;
        }

        .page:last-child {
          page-break-after: avoid;
          break-after: avoid;
        }
          

        /* ==============================
          BẢNG CHUNG
        ============================== */
        .excel-tb {
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }

        .excel-tb th,
        .excel-tb td {
          border: 1px solid #000;
          padding: 3px 10px;
          vertical-align: middle;
          font-size: 11pt;
          overflow-wrap: break-word;
        }

        .excel-tb th {
          text-align: center;
          font-weight: bold;
        }

        /* Tăng chiều cao các dòng Phần II */
        .evaluation-table tbody td {
          padding-top: 3.5px;
          padding-bottom: 3.5px;
        }
        
        /* ==============================
          BẢNG MÔN HỌC
        ============================== */
        .subject-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }

        /* Tiêu đề bảng */
        .subject-table thead th {
          font-size: 9pt !important;
          padding: 3px 4px;
          line-height: 1.1;
          vertical-align: middle;
        }

        /* Cố định chiều cao các dòng môn học */
        .subject-table tbody tr {
          height: 11mm;
        }

        .subject-table tbody td {
          height: 11mm;
          padding: 2px 4px;
          font-size: 10pt !important;
          line-height: 1.1;
          vertical-align: middle;
          overflow: hidden;
        }

        /* Nhận xét môn học tối đa 2 dòng */
        .subject-table .auto-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 10pt !important;
          line-height: 1.1;
          max-height: 2.2em;
        }

        /* ==============================
          GIỚI HẠN NỘI DUNG
        ============================== */
        .auto-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 11pt;
          max-height: 2.3em;
          line-height: 1.15;
        }

        .auto-clamp-5 {
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 10.5pt;
          line-height: 1.2;
          max-height: 6em;
        }

        /* ==============================
          BỐ CỤC 2 CỘT
        ============================== */
        .print-two-columns {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          column-gap: 6mm;
          align-items: start;
          width: 100%;
        }

        /* ==============================
          THÔNG TIN HỌC SINH
        ============================== */
        .student-info td {
          padding: 3px 5px;
          font-size: 10.5pt;
        }

        /* ==============================
          TIÊU ĐỀ PHẦN
        ============================== */
        .section-title {
          font-weight: bold;
          font-size: 11pt;
          margin-bottom: 3px;
        }

        /* ==============================
          KHEN THƯỞNG
        ============================== */
        .signature-reward-line {
          display: inline-block;
          border-bottom: 1px dotted #000;
          width: 78%;
          min-height: 14px;
        }

        /* ==============================
          CHỮ KÝ
        ============================== */
        .signature-table {
          width: 100%;
          margin-top: 6px;
          font-size: 11pt;
          border-collapse: collapse;
        }

        .signature-table td {
          width: 50%;
          text-align: center;
          vertical-align: top;
          border: none;
        }

        /* ==============================
          IN ẤN
        ============================== */
        @media print {         
          .subject-table tbody tr {
            height: 11mm !important;
          }

          .subject-table tbody td {
            height: 11mm !important;
            max-height: 11mm;
            overflow: hidden;
          }
        }
      </style>
    </head>

    <body>

      ${sortedStudents.map((stu) => {
        const locationDate = formattedPrintDate || stu.locationDate || "";

        // ==============================
        // THÔNG TIN LỚP VÀ KHỐI
        // ==============================
        const className = stu.className || selectedClass || "";

        const gradeMatch = String(className).match(/^\s*([1-5])/);

        const grade = gradeMatch ? Number(gradeMatch[1]) : 0;

        const isGrade123 = [1, 2, 3].includes(grade);

        // ==============================
        // DỮ LIỆU MÔN HỌC
        // ==============================
        const studentSubjects = Array.isArray(stu.subjects)
          ? stu.subjects
          : [];

        // ==============================
        // DỮ LIỆU NĂNG LỰC, PHẨM CHẤT
        // Mỗi phần tử: { name, level }
        // ==============================
        const competenciesCore = Array.isArray(stu.competenciesCore)
          ? stu.competenciesCore
          : [];

        const competenciesSpecific = Array.isArray(stu.competenciesSpecific)
          ? stu.competenciesSpecific
          : [];

        const qualities = Array.isArray(stu.qualities)
          ? stu.qualities
          : [];

        // ==============================
        // HÀM TẠO DÒNG NĂNG LỰC / PHẨM CHẤT
        // ==============================
        const renderEvaluationRows = (items) => {
          return items.map((item) => `
            <tr>
              <td>
                ${formatText(item.name)}
              </td>

              <td style="text-align:center;">
                ${formatText(item.midTermLevel)}
              </td>

              ${
                isFinalLayout
                  ? `
                    <td style="text-align:center;">
                      ${formatText(item.finalTermLevel)}
                    </td>
                  `
                  : ""
              }
            </tr>
          `).join("");
        };

        // ==============================
        // TẠO DÒNG MÔN HỌC
        // ==============================
        const subjectRows = studentSubjects.map((sub) => {
          const noteText = sub.note || "";

          return `
            <tr>
              <td style="text-align:center;">
                ${formatText(sub.stt)}
              </td>

              <td>
                ${formatText(sub.name)}
              </td>

              <td style="text-align:center;">
                ${formatText(sub.midTermLevel)}
              </td>

              <td style="text-align:center;">
                ${isGrade123 ? "" : formatText(sub.midTermPoint)}
              </td>

              ${
                isFinalLayout
                  ? `
                    <td style="text-align:center;">
                      ${formatText(sub.finalTermLevel)}
                    </td>

                    <td style="text-align:center;">
                      ${formatText(sub.finalTermPoint)}
                    </td>
                  `
                  : ""
              }

              <td>
                <div class="auto-clamp-2">
                  ${formatText(noteText)}
                </div>
              </td>
            </tr>
          `;
        }).join("");

        // ==============================
        // BẢNG MÔN HỌC
        // ==============================
        const subjectColGroup = isFinalLayout
          ? `
              <col style="width:6%" />
              <col style="width:16%" />
              <col style="width:9%" />
              <col style="width:9%" />
              <col style="width:9%" />
              <col style="width:9%" />
              <col style="width:42%" />
            `
          : `
              <col style="width:7%" />
              <col style="width:16%" />
              <col style="width:12%" />
              <col style="width:12%" />
              <col style="width:53%" />
            `;

        const subjectHeader = isFinalLayout
          ? `
              <tr>
                <th rowspan="2">STT</th>
                <th rowspan="2">Môn học và hoạt động giáo dục</th>
                <th colspan="2">${midTermTitle}</th>
                <th colspan="2">${finalTermTitle}</th>
                <th rowspan="2">Điểm mạnh và các mặt cần rèn luyện</th>
              </tr>

              <tr>
                <th>Mức đạt</th>
                <th>Điểm KTĐK</th>
                <th>Mức đạt</th>
                <th>Điểm KTĐK</th>
              </tr>
            `
          : `
              <tr>
                <th rowspan="2">STT</th>
                <th rowspan="2">Môn học và hoạt động giáo dục</th>
                <th colspan="2">${midTermTitle}</th>
                <th rowspan="2">Điểm mạnh và các mặt cần rèn luyện</th>
              </tr>

              <tr>
                <th>Mức đạt</th>
                <th>Điểm KTĐK</th>
              </tr>
            `;

        // ==============================
        // BẢNG NĂNG LỰC - PHẨM CHẤT
        // ==============================
        const evaluationColGroup = isFinalLayout
          ? `
              <col style="width:30%" />
              <col style="width:10%" />
              <col style="width:10%" />
              <col style="width:50%" />
            `
          : `
              <col style="width:42%" />
              <col style="width:14%" />
              <col style="width:44%" />
            `;

        const evaluationHeader = isFinalLayout
          ? `
              <tr>
                <th rowspan="2">
                  Các năng lực cốt lõi, phẩm chất chủ yếu
                </th>

                <th>${midTermTitle}</th>

                <th>${isYearEnd ? "CN" : finalTermTitle}</th>

                <th rowspan="2">
                  Điểm mạnh và các mặt cần rèn luyện
                </th>
              </tr>

              <tr>
                <th>Mức đạt</th>
                <th>Mức đạt</th>
              </tr>
            `
          : `
              <tr>
                <th>Các năng lực cốt lõi, phẩm chất chủ yếu</th>

                <th>
                  ${midTermTitle}<br />
                  Mức đạt
                </th>

                <th>Điểm mạnh và các mặt cần rèn luyện</th>
              </tr>
            `;

        // ==============================
        // NHẬN XÉT VÀ THÔNG TIN
        // ==============================
        const heightText = formatMeasure(
          stu.chieuCao,
          "cm",
          "........ cm"
        );

        const weightText = formatMeasure(
          stu.canNang ?? stu.weight,
          "kg",
          "........ kg"
        );

        const schoolName = stu.schoolName || "TH BÌNH KHÁNH";

        // ==============================
        // HTML TỪNG HỌC SINH
        // ==============================
        return `
          <div class="page">

            <!-- TIÊU ĐỀ -->
            <div style="text-align:center; margin-bottom:4px;">
              <div style="font-weight:bold; font-size:14pt;">
                ${printTitle}
              </div>

              <div style="font-size:11pt; font-style:italic;">
                (Dành cho học sinh tiểu học)
              </div>
            </div>

            <!-- BỐ CỤC 2 CỘT -->
            <div class="print-two-columns">

              <!-- CỘT TRÁI -->
              <div>

                <div style="font-size: 10pt; color: white; margin-bottom: 2px; user-select: none;">
                  temp
                </div>

                <!-- THÔNG TIN HỌC SINH -->
                <table class="excel-tb student-info" style="margin-bottom:5px;">
                  <colgroup>
                    <col style="width:46%" />
                    <col style="width:38%" />
                    <col style="width:16%" />
                  </colgroup>

                  <tbody>
                    <tr>
                      <td>
                        Tên HS:
                        <b>${formatText(stu.hoTen, "...")}</b>
                      </td>

                      <td>
                        Trường: ${formatText(schoolName)}
                      </td>

                      <td style="font-size:9pt;">
                        Lớp: ${formatText(className)}
                      </td>
                    </tr>

                    <tr>
                      <td>
                        Mã định danh Bộ GD&ĐT:
                        ${formatText(stu.maDinhDanh)}
                      </td>

                      <td>
                        GVCN: ${formatText(stu.teacherName)}
                      </td>

                      <td style="font-size:9pt; white-space:nowrap;">
                        ĐT: ${formatText(stu.phone)}
                      </td>
                    </tr>

                    <tr>
                      <td>
                        Số ngày nghỉ:
                        ${formatText(stu.nghiPhep)}
                      </td>

                      <td colspan="2">
                        Hiệu trưởng:
                        ${formatText(stu.hieuTruong, "Đặng Thái Bình")}
                      </td>
                    </tr>

                    <tr>
                      <td>
                        Chiều cao: ${escapeHtml(heightText)}
                      </td>

                      <td colspan="2">
                        Cân nặng: ${escapeHtml(weightText)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- MÔN HỌC -->
                <div class="section-title">
                  I. Các môn học và hoạt động giáo dục ${
                    isYearEnd
                      ? "cuối năm học"
                      : isFinalLayout
                        ? `cuối học kỳ ${isSemesterII ? "II" : "I"}`
                        : `giữa học kỳ ${isSemesterII ? "II" : "I"}`
                  }
                </div>

                <table class="excel-tb subject-table">
                  <colgroup>
                    ${subjectColGroup}
                  </colgroup>

                  <thead>
                    ${subjectHeader}
                  </thead>

                  <tbody>
                    ${subjectRows}
                  </tbody>
                </table>

                <!-- CHÚ THÍCH -->
                <div style="font-size:11pt; margin-top:10px;">
                  <b>Chú thích:</b>
                  <i>
                    T: Hoàn thành tốt, H: Hoàn thành,
                    C: Chưa hoàn thành
                  </i>
                </div>

              </div>

              <!-- CỘT PHẢI -->
              <div>

                <!-- NĂNG LỰC VÀ PHẨM CHẤT -->
                <div class="section-title">
                  II. Các năng lực cốt lõi, phẩm chất chủ yếu ${
                    isYearEnd
                      ? "cuối năm"
                      : isFinalLayout
                        ? `cuối học kỳ ${isSemesterII ? "II" : "I"}`
                        : `giữa học kỳ ${isSemesterII ? "II" : "I"}`
                  }
                </div>

                <table class="excel-tb evaluation-table">
                  <colgroup>
                    ${evaluationColGroup}
                  </colgroup>

                  <thead>
                    ${evaluationHeader}
                  </thead>

                  <tbody>

                    <!-- NĂNG LỰC CỐT LÕI -->
                    <tr>
                      <td
                        colspan="${isFinalLayout ? 3 : 2}"
                        style="font-weight:bold;"
                      >
                        Năng lực cốt lõi
                      </td>

                      <td rowspan="${competenciesCore.length + 1}" style="vertical-align:middle;">
                        <div class="auto-clamp-5">
                          ${formatText(stu.competenciesCoreNote)}
                        </div>
                      </td>
                    </tr>

                    ${renderEvaluationRows(competenciesCore)}

                    <!-- NĂNG LỰC ĐẶC THÙ -->
                    <tr>
                      <td
                        colspan="${isFinalLayout ? 3 : 2}"
                        style="font-weight:bold;"
                      >
                        Năng lực đặc thù
                      </td>

                      <td rowspan="${competenciesSpecific.length + 1}" style="vertical-align:middle;">
                        <div class="auto-clamp-5">
                          ${formatText(stu.competenciesSpecificNote)}
                        </div>
                      </td>
                    </tr>

                    ${renderEvaluationRows(competenciesSpecific)}

                    <!-- PHẨM CHẤT CHỦ YẾU -->
                    <tr>
                      <td
                        colspan="${isFinalLayout ? 3 : 2}"
                        style="font-weight:bold;"
                      >
                        Phẩm chất chủ yếu
                      </td>

                      <td rowspan="${qualities.length + 1}" style="vertical-align:middle;">
                        <div class="auto-clamp-5">
                          ${formatText(stu.qualitiesNote)}
                        </div>
                      </td>
                    </tr>

                    ${renderEvaluationRows(qualities)}

                  </tbody>
                </table>

                <!-- CHÚ THÍCH -->
                <div style="font-size:11pt; margin-bottom:3px;">
                  <b>Chú thích:</b>
                  <i>T: Tốt, Đ: Đạt, C: Cần cố gắng</i>
                </div>

                <!-- KHEN THƯỞNG -->
                <div style="font-size:11pt; margin-bottom:6px;">
                  <b>Khen thưởng:</b>

                  <span class="signature-reward-line">
                    ${formatText(stu.khenThuong ?? stu.rewards)}
                  </span>
                </div>

                <!-- CHỮ KÝ -->
                <table class="signature-table">
                  <tbody>
                    <tr>
                      <td>
                        ${
                          confirmationType !== "none"
                            ? `
                              <div
                                style="
                                  font-weight:bold;
                                  margin-top:6mm;
                                "
                              >
                                ${
                                  confirmationType === "parent"
                                    ? "Xác nhận của Phụ huynh"
                                    : "Xác nhận của Hiệu trưởng"
                                }
                              </div>

                              <div
                                style="
                                  font-style:italic;
                                  font-size:11pt;
                                  margin-bottom:25mm;
                                "
                              >
                                ${
                                  confirmationType === "parent"
                                    ? "(ký và ghi rõ họ tên)"
                                    : "(ký, đóng dấu và ghi rõ họ tên)"
                                }
                              </div>

                              ${
                                confirmationType === "principal"
                                  ? `
                                    <div style="font-weight:bold;">
                                      ${formatText(stu.hieuTruong, "Đặng Thái Bình")}
                                    </div>
                                  `
                                  : ""
                              }
                            `
                            : ""
                        }
                      </td>

                      <td>
                        <div
                          style="
                            font-style:italic;
                            font-size:11pt;
                            margin-bottom:2px;
                          "
                        >
                          ${formatText(locationDate || stu.locationDate)}
                        </div>

                        <div style="font-weight:bold;">
                          Giáo viên chủ nhiệm
                        </div>

                        <div
                          style="
                            font-style:italic;
                            font-size:11pt;
                            margin-bottom:25mm;
                          "
                        >
                          (ký và ghi rõ họ tên)
                        </div>

                        <div style="font-weight:bold;">
                          ${formatText(stu.teacherName)}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

              </div>
            </div>
          </div>
        `;
      }).join("")}

    </body>
    </html>
  `;

  // ==============================
  // MỞ CỬA SỔ IN
  // ==============================
    // =========================================
  // IN TRỰC TIẾP TRÊN TRANG HIỆN TẠI
  // =========================================

  // Xóa nội dung in cũ nếu có
  document.getElementById("print-phieu-danh-gia-content")?.remove();

  // Tạo vùng nội dung in
  const printContainer = document.createElement("div");
  printContainer.id = "print-phieu-danh-gia-content";
  printContainer.innerHTML = htmlContent;

  // Chỉ lấy nội dung body của HTML được tạo
  const tempDoc = new DOMParser().parseFromString(
    htmlContent,
    "text/html"
  );

  printContainer.innerHTML = tempDoc.body.innerHTML;

  // Lấy CSS của tài liệu in
  const printStyle = document.createElement("style");
  printStyle.id = "print-phieu-danh-gia-style";
  printStyle.textContent = `
    @media screen {
      #print-phieu-danh-gia-content {
        display: none !important;
      }
    }

    @media print {
      body * {
        visibility: hidden !important;
      }

      #print-phieu-danh-gia-content,
      #print-phieu-danh-gia-content * {
        visibility: visible !important;
      }

      #print-phieu-danh-gia-content {
        display: block !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
      }
    }
  `;

  
  // =========================================
  // IN TRỰC TIẾP TRÊN CỬA SỔ CHÍNH
  // =========================================

  // Xóa CSS in cũ nếu còn tồn tại
  document
    .getElementById("print-phieu-danh-gia-style")
    ?.remove();

  // Gắn CSS in
  printStyle.id = "print-phieu-danh-gia-style";

  // Sao chép CSS trong HTML gốc
  tempDoc.querySelectorAll("style").forEach((item) => {
    printStyle.textContent += "\n" + item.textContent;
  });

  document.head.appendChild(printStyle);

  // Đưa nội dung phiếu vào trang chính
  document.body.appendChild(printContainer);

  // =========================================
  // DỌN NỘI DUNG SAU KHI ĐÓNG PRINT PREVIEW
  // =========================================

  let isCleaned = false;

  const cleanup = () => {
    if (isCleaned) return;

    isCleaned = true;

    printContainer.remove();
    printStyle.remove();

    window.removeEventListener(
      "afterprint",
      cleanup
    );
  };

  // Đăng ký sự kiện trước khi gọi print()
  window.addEventListener(
    "afterprint",
    cleanup
  );

  // Gọi Print Preview
  window.print();

  // Dự phòng nếu trình duyệt không phát afterprint
  setTimeout(cleanup, 300000);
};

