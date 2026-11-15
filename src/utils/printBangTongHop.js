
const PRINT_STYLE_ID = "print-bang-tong-hop-style";

export const printBangTongHop = (
  hidePrincipalName = false,
  printDate = ""
) => {

    console.log("TÙY CHỌN IN:", {
    hidePrincipalName,
    printDate
    });
  const printContent = document.querySelector(
    ".in-bang-tong-hop-page"
  );

  if (!printContent) {
    console.error("Không tìm thấy nội dung bảng tổng hợp.");
    return;
  }

  const table = printContent.querySelector(
    ".student-excel-table"
  );

  if (!table) {
    console.error("Không tìm thấy bảng dữ liệu học sinh.");
    return;
  }

  const wrapper = table.closest(".student-table-wrapper");

  if (!wrapper) {
    console.error("Không tìm thấy khung bao bảng.");
    return;
  }

  // Xóa CSS in cũ nếu còn tồn tại
  document.getElementById(PRINT_STYLE_ID)?.remove();

  // =========================================
  // TÍNH ZOOM TỰ ĐỘNG THEO CHIỀU NGANG
  // =========================================

  let printZoom = 1;

  // Lưu style ban đầu của bảng
  const oldTableStyle = {
    width: table.style.getPropertyValue("width"),
    widthPriority: table.style.getPropertyPriority("width"),

    minWidth: table.style.getPropertyValue("min-width"),
    minWidthPriority: table.style.getPropertyPriority("min-width"),

    maxWidth: table.style.getPropertyValue("max-width"),
    maxWidthPriority: table.style.getPropertyPriority("max-width"),

    tableLayout: table.style.getPropertyValue("table-layout"),
    tableLayoutPriority: table.style.getPropertyPriority("table-layout"),
  };

  // Lưu style ban đầu của wrapper
  const oldWrapperStyle = {
    width: wrapper.style.getPropertyValue("width"),
    widthPriority: wrapper.style.getPropertyPriority("width"),

    minWidth: wrapper.style.getPropertyValue("min-width"),
    minWidthPriority: wrapper.style.getPropertyPriority("min-width"),

    maxWidth: wrapper.style.getPropertyValue("max-width"),
    maxWidthPriority: wrapper.style.getPropertyPriority("max-width"),
  };

  try {
    // Tạm thời cho bảng hiển thị theo chiều rộng nội dung thực tế
    table.style.setProperty("width", "max-content", "important");
    table.style.setProperty("min-width", "max-content", "important");
    table.style.setProperty("max-width", "none", "important");
    table.style.setProperty("table-layout", "auto", "important");

    wrapper.style.setProperty("width", "max-content", "important");
    wrapper.style.setProperty("min-width", "0", "important");
    wrapper.style.setProperty("max-width", "none", "important");

    // Đọc lại layout sau khi trình duyệt tính toán
    const tableWidth = Math.max(
      table.scrollWidth,
      table.getBoundingClientRect().width
    );

    // A4 ngang: 297mm
    // Lề trái: 6mm
    // Lề phải: 6mm
    // Chiều rộng vùng in: 285mm
    const availableWidth =
      (297 - 6 - 10) * (96 / 25.4);

    if (tableWidth > 0) {
      printZoom = Math.min(
        1,
        availableWidth / tableWidth
      );
    }
  } catch (error) {
    console.error("Không thể tính tỷ lệ thu nhỏ bảng:", error);
    printZoom = 1;
  } finally {
    // Khôi phục style bảng
    const restoreStyle = (element, property, value, priority) => {
      if (value) {
        element.style.setProperty(property, value, priority);
      } else {
        element.style.removeProperty(property);
      }
    };

    restoreStyle(
      table,
      "width",
      oldTableStyle.width,
      oldTableStyle.widthPriority
    );

    restoreStyle(
      table,
      "min-width",
      oldTableStyle.minWidth,
      oldTableStyle.minWidthPriority
    );

    restoreStyle(
      table,
      "max-width",
      oldTableStyle.maxWidth,
      oldTableStyle.maxWidthPriority
    );

    restoreStyle(
      table,
      "table-layout",
      oldTableStyle.tableLayout,
      oldTableStyle.tableLayoutPriority
    );

    restoreStyle(
      wrapper,
      "width",
      oldWrapperStyle.width,
      oldWrapperStyle.widthPriority
    );

    restoreStyle(
      wrapper,
      "min-width",
      oldWrapperStyle.minWidth,
      oldWrapperStyle.minWidthPriority
    );

    restoreStyle(
      wrapper,
      "max-width",
      oldWrapperStyle.maxWidth,
      oldWrapperStyle.maxWidthPriority
    );
  }

  // =========================================
  // CSS IN
  // =========================================

  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;

  style.textContent = `
    @media print {

      /* ==============================
         KHỔ GIẤY VÀ LỀ IN
         GIỮ NGUYÊN MÃ GỐC
      ============================== */

      @page {
        size: A4 landscape;
        margin: 4mm 6mm 4mm 8mm;
      }

      html,
      body {
        margin: 0 !important;
        padding: 0 !important;

        width: 100% !important;
        min-width: 0 !important;
        height: auto !important;

        background: #fff !important;

        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* ẨN NỘI DUNG KHÔNG IN */

      body * {
        visibility: hidden !important;
      }

      .in-bang-tong-hop-page,
      .in-bang-tong-hop-page * {
        visibility: visible !important;
      }

      /* ==============================
         KHUNG TRANG IN
      ============================== */

      .in-bang-tong-hop-page {
        position: absolute !important;

        left: 0 !important;
        top: 0 !important;

        width: 100% !important;
        max-width: 100% !important;

        margin: 0 !important;
        padding: 0 !important;

        box-sizing: border-box !important;

        background: #fff !important;
      }

      .bang-tong-hop-container {
        width: 100% !important;
        max-width: 100% !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: visible !important;

        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;

        box-sizing: border-box !important;

        background: #fff !important;
      }

      .no-print {
        display: none !important;
        visibility: hidden !important;
      }

      .bang-tong-hop-content {
        width: 100% !important;
        max-width: 100% !important;

        margin: 0 !important;
        padding: 0 !important;

        box-sizing: border-box !important;
      }

      /* ==============================
         TIÊU ĐỀ
      ============================== */

      .bang-tong-hop-title {
        display: grid !important;

        grid-template-columns: 1fr 1.5fr !important;

        width: 100% !important;
        max-width: 100% !important;

        margin: 0 0 8mm 0 !important;
        padding: 0 !important;

        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;

        background: #fff !important;

        box-sizing: border-box !important;

        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* ==============================
        /* ==============================
        TIÊU ĐỀ ĐƠN VỊ VÀ TIÊU ĐỀ CHÍNH
        ============================== */

        /* UBND XÃ, TÊN TRƯỜNG, PHÂN HIỆU */
        .bang-tong-hop-title-unit,
        .bang-tong-hop-title-unit * {
            text-align: center !important;
            font-size: 9pt !important;
            line-height: 1.2 !important;
        }

        /* KHỐI TIÊU ĐỀ CHÍNH */
        .bang-tong-hop-title-main {
            text-align: center !important;
            border: none !important;
            box-shadow: none !important;
            background-image: none !important;
        }

        /* MẶC ĐỊNH CÁC DÒNG TRONG TIÊU ĐỀ CHÍNH: 9PT */
        .bang-tong-hop-title-main,
        .bang-tong-hop-title-main * {
            font-size: 9pt !important;
            line-height: 1.2 !important;
            border-top: none !important;
            border-bottom: none !important;
            text-decoration: none !important;
            box-shadow: none !important;
        }

        /* RIÊNG DÒNG BẢNG TỔNG HỢP: 11PT */
        .bang-tong-hop-title-main > :first-child,
        .bang-tong-hop-title-main > :first-child * {
            font-size: 12pt !important;
            line-height: 1.2 !important;
        }

        /* LOẠI BỎ ĐƯỜNG GẠCH TRÊN/DƯỚI DÒNG HỌC KỲ */
        .bang-tong-hop-title-main hr,
        .bang-tong-hop-title-main::before,
        .bang-tong-hop-title-main::after,
        .bang-tong-hop-title-main *::before,
        .bang-tong-hop-title-main *::after {
            display: none !important;
            content: none !important;
            border: none !important;
        }

      /* ==============================
         KHUNG BAO BẢNG
      ============================== */

      .student-table-wrapper {
        display: block !important;

        width: max-content !important;
        min-width: 0 !important;
        max-width: none !important;

        overflow: visible !important;

        margin: 0 !important;
        padding: 0 !important;

        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;

        box-sizing: border-box !important;

        /* Thu nhỏ đồng đều toàn bộ bảng */
        zoom: ${printZoom} !important;
      }

      /* ==============================
         BẢNG IN
      ============================== */

      .student-excel-table {
        display: table !important;

        width: max-content !important;
        min-width: max-content !important;
        max-width: none !important;

        table-layout: auto !important;

        border-collapse: separate !important;
        border-spacing: 0 !important;

        border: 0 !important;

        font-family: "Times New Roman", serif !important;
        font-size: 10pt !important;

        color: #000 !important;

        box-sizing: border-box !important;

        margin: 0 !important;
        }

      /* ==============================
         ĐƯỜNG VIỀN TẤT CẢ Ô
      ============================== */

      .student-excel-table th,
      .student-excel-table td {
        border: 0 !important;

        border-right: 1px solid #000 !important;
        border-bottom: 1px solid #000 !important;

        border-top: 0 !important;
        border-left: 0 !important;

        outline: none !important;
        box-shadow: none !important;

        padding: 3px 4px !important;

        color: #000 !important;
        background: #fff !important;

        text-align: center !important;
        vertical-align: middle !important;

        white-space: normal !important;
        overflow-wrap: break-word !important;
        word-break: normal !important;

        min-width: 0 !important;
        max-width: none !important;

        position: static !important;
        box-sizing: border-box !important;

        font-weight: 400 !important;
      }

      /* ==============================
         TIÊU ĐỀ NHIỀU TẦNG
      ============================== */

      .student-excel-table thead {
        display: table-header-group !important;
        }

        /* Kẻ lại đường viền trên cho tiêu đề ở mỗi trang */
        .student-excel-table thead tr:first-child th {
        border-top: 1px solid #000 !important;
        }

        /* Đảm bảo tiêu đề lặp lại không bị tách */
        .student-excel-table thead tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .student-excel-table thead th {
        font-weight: 700 !important;
        color: #000 !important;
        background: #fff !important;
      }

      .student-excel-table thead tr:nth-child(1) th {
        font-weight: 800 !important;
      }

      .student-excel-table thead tr:nth-child(n + 2) th {
        font-weight: 400 !important;
      }

      .student-excel-table tbody {
        display: table-row-group !important;
      }

      /* Cho phép bảng tiếp tục qua nhiều trang */
      .student-excel-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* ==============================
         TIÊU ĐỀ XOAY DỌC
      ============================== */

      .student-excel-table thead th.rotate-header {
        writing-mode: vertical-rl !important;
        text-orientation: mixed !important;
        transform: rotate(180deg) !important;

        white-space: nowrap !important;
        word-break: keep-all !important;
        overflow-wrap: normal !important;

        width: 7mm !important;
        min-width: 7mm !important;
        max-width: 7mm !important;

        height: 28mm !important;
        min-height: 28mm !important;

        padding: 2mm 1mm !important;

        text-align: center !important;
        vertical-align: middle !important;
        line-height: 1.1 !important;

        font-weight: 400 !important;
      }

      /* ==============================
         CỘT STT
      ============================== */

      .student-excel-table .col-stt,
      .student-excel-table .cell-stt {
        width: 1% !important;
        min-width: 0 !important;
      }

      /* ==============================
         CỘT HỌ TÊN
      ============================== */

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
        text-align: center !important;
      }

      .student-excel-table .cell-name {
        text-align: left !important;
        font-weight: 400 !important;
      }

      /* ==============================
         CỘT NGÀY
      ============================== */

      .student-excel-table .col-date,
      .student-excel-table .cell-date {
        width: 22mm !important;
        min-width: 22mm !important;
        max-width: 22mm !important;

        white-space: nowrap !important;
        word-break: keep-all !important;
        overflow-wrap: normal !important;
      }

      /* ==============================
         CHỮ KÝ
      ============================== */

      .bang-tong-hop-signatures {
        display: block !important;

        width: 100% !important;

        margin-top: 10mm !important;
        padding: 0 !important;

        border: none !important;
        box-shadow: none !important;

        box-sizing: border-box !important;

        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .bang-tong-hop-signatures * {
        color: #000 !important;
      }

      /* ==============================
         GIỮ MÀU KHI IN
      ============================== */

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;

  document.head.appendChild(style);

    // =========================================
    // XỬ LÝ TÙY CHỌN CHỮ KÝ VÀ NGÀY IN
    // =========================================

    const originalDateElements = [];
    const originalPrincipalStyle = [];

    // -----------------------------------------
    // THAY NGÀY IN
    // -----------------------------------------

    if (printDate) {
    const [year, month, day] = printDate.split("-");

    if (year && month && day) {
        const formattedDate =
        `ngày ${Number(day)} tháng ${Number(month)} năm ${year}`;

        const bghBox = printContent.querySelector(
        ".signature-bgh"
        );

        if (bghBox) {
        bghBox.querySelectorAll("p").forEach((element) => {
            const originalText = element.textContent || "";

            const dateRegex =
            /ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}/i;

            if (dateRegex.test(originalText)) {
            originalDateElements.push({
                element,
                originalText
            });

            element.textContent = originalText.replace(
                dateRegex,
                formattedDate
            );
            }
        });
        }
    }
    }

    // -----------------------------------------
    // ẨN TÊN HIỆU TRƯỞNG
    // -----------------------------------------

    if (hidePrincipalName) {
        const bghBox = printContent.querySelector(
            ".signature-bgh"
        );

        if (bghBox) {
            const walker = document.createTreeWalker(
            bghBox,
            NodeFilter.SHOW_TEXT
            );

            const textNodes = [];

            while (walker.nextNode()) {
            const node = walker.currentNode;

            if (node.textContent.trim()) {
                textNodes.push(node);
            }
            }

            // Lấy dòng chữ cuối cùng trong vùng chữ ký
            const lastTextNode = textNodes[textNodes.length - 1];

            if (lastTextNode) {
            const nameElement = lastTextNode.parentElement;

            console.log(
                "Tên người ký tìm được:",
                lastTextNode.textContent.trim()
            );

            originalPrincipalStyle.push({
                element: nameElement,
                color: nameElement.style.color
            });

            // Đặt màu trắng, giữ nguyên khoảng trống
            nameElement.style.setProperty(
                "color",
                "#ffffff",
                "important"
            );
            }
        }
        }

    // =========================================
    // IN VÀ DỌN CSS SAU KHI IN
    // =========================================

    const removePrintStyle = () => {
    document.getElementById(PRINT_STYLE_ID)?.remove();

    // Khôi phục ngày tháng ban đầu
    originalDateElements.forEach(({ element, originalText }) => {
        element.textContent = originalText;
    });

    // Khôi phục tên Hiệu trưởng
    originalPrincipalStyle.forEach(({ element, color }) => {
        if (color) {
            element.style.setProperty("color", color);
        } else {
            element.style.removeProperty("color");
        }
    });

    window.removeEventListener(
        "afterprint",
        removePrintStyle
    );
    };

    window.addEventListener(
    "afterprint",
    removePrintStyle
    );

    window.print();
};