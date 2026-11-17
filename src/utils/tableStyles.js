// src/utils/tableStyles.js

export const BANG_TONG_HOP_CSS = `
  /* =====================================================
     GIAO DIỆN CHUNG
  ===================================================== */

  @media screen {
    .bang-tong-hop-container {
      width: 100%;
    }

    .student-table-wrapper {
      max-width: 100%;
    }

    /* Chỉ đổi font trên giao diện, không ảnh hưởng trang in */
    .bang-tong-hop-title,
    .bang-tong-hop-title *,
    .bang-tong-hop-signatures,
    .bang-tong-hop-signatures *,
    .bang-tong-hop-container .signature-section,
    .bang-tong-hop-container .signature-section * {
      font-family: "Roboto", sans-serif !important;
    }
  }

  /* =====================================================
     TIÊU ĐỀ ĐƠN VỊ
  ===================================================== */

  .bang-tong-hop-title {
    display: grid;
    grid-template-columns: 1fr 1.5fr 1fr;
    align-items: center;
    gap: 0;
    width: 100%;
    box-sizing: border-box;
    padding: 18px 0 20px;
    margin-bottom: 12px;
    font-family: "Roboto", serif;
    color: #111;
    background: #fff;
  }

  .bang-tong-hop-title-unit {
    grid-column: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    padding-left: 0 !important;
    margin-left: -40px !important;
    text-align: center;
    line-height: 1.6;
  }

  .bang-tong-hop-title-main {
    grid-column: 2 / 4;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    line-height: 1.5;
    transform: translateX(-60px);
  }

  /* =====================================================
     KHUNG NGOÀI BẢNG
  ===================================================== */

  .student-table-wrapper {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    overflow-y: auto !important;
    background: #fff;
    box-sizing: border-box;
  }

  /* =====================================================
     BẢNG EXCEL
  ===================================================== */

  .student-excel-table {
    width: max-content !important;
    min-width: max-content !important;
    max-width: none !important;
    table-layout: auto !important;
    border-collapse: collapse !important;
    border-spacing: 0 !important;
    border: 1px solid #000 !important;
    font-family: "Roboto", serif;
    font-size: 13px;
    color: #111827;
    background: #fff;
    box-sizing: border-box;
    margin-top: 6px !important;
  }

  /* =====================================================
     ĐƯỜNG VIỀN CÁC Ô
  ===================================================== */

  .student-excel-table th,
  .student-excel-table td {
    border: 1px solid #000 !important;
    outline: none !important;
    box-shadow: none !important;
    padding: 2px 8px;
    text-align: center;
    vertical-align: middle;
    min-width: 0;
    max-width: none;
    white-space: normal;
    overflow-wrap: break-word;
    line-height: 1.4;
    box-sizing: border-box !important;
    background-clip: padding-box !important;
  }

  /* =====================================================
     TIÊU ĐỀ NHIỀU TẦNG
  ===================================================== */

  .student-excel-table thead th {
    position: sticky;
    top: 0;
    z-index: 3;
    background: #dbeafe;
    color: #1e3a8a;
    font-weight: 700;
    text-transform: none;
    text-align: center;
    vertical-align: middle;
    line-height: 1.35;
    min-height: 40px;
    padding: 7px 5px;
    white-space: normal;
    overflow-wrap: break-word;
  }

  .student-excel-table thead tr:nth-child(1) th {
    background: #dbeafe;
    font-weight: 800;
  }

  .student-excel-table thead tr:nth-child(n + 2) th {
    font-weight: 400 !important;
  }

  .student-excel-table thead tr:nth-child(2) th {
    background: #e8f1fc;
  }

  .student-excel-table thead tr:nth-child(3) th {
    background: #eff6ff;
  }

  .student-excel-table thead tr:nth-child(4) th {
    background: #f1f5f9;
  }

  .student-excel-table thead .col-stt,
  .student-excel-table thead .col-name {
    background: #dbeafe;
  }

  .student-excel-table thead .header-empty {
    background: #fff;
  }

  /* =====================================================
     TIÊU ĐỀ XOAY DỌC
  ===================================================== */

  .student-excel-table thead th.rotate-header {
    writing-mode: horizontal-tb !important;
    transform: none !important;
    width: 30px !important;
    min-width: 30px !important;
    max-width: 30px !important;
    height: 100px !important;
    min-height: 100px !important;
    padding: 4px 2px !important;
    text-align: center !important;
    vertical-align: middle !important;
    white-space: nowrap !important;
  }

  .student-excel-table thead th.rotate-header .rotated-header-text {
    display: inline-block;
    writing-mode: vertical-rl !important;
    text-orientation: mixed !important;
    transform: rotate(180deg) !important;
    white-space: nowrap !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
    text-align: center;
    vertical-align: middle;
    line-height: 1.2;
  }

  /* =====================================================
     CỘT STT
  ===================================================== */

  .student-excel-table .col-stt,
  .student-excel-table .cell-stt {
    width: 1% !important;
    min-width: 0 !important;
  }

  .student-excel-table .col-stt {
    background: #e2e8f0;
  }

  .student-excel-table .cell-stt {
    font-weight: 400;
  }

  /* =====================================================
     CỘT HỌ TÊN
  ===================================================== */

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
    text-align: center;
    background: #e2e8f0;
  }

  .student-excel-table .cell-name {
    text-align: left !important;
    font-weight: 400 !important;
    color: #1e293b;
  }

  /* =====================================================
     CỘT NGÀY SINH
  ===================================================== */

  .student-excel-table .col-date,
  .student-excel-table .cell-date {
    width: 90px !important;
    min-width: 90px !important;
    max-width: 90px !important;
    box-sizing: border-box !important;
  }

  .student-excel-table thead th.col-date {
    white-space: normal !important;
    word-break: normal !important;
    overflow-wrap: break-word !important;
    line-height: 1.2 !important;
    text-align: center !important;
  }

  .student-excel-table tbody td.cell-date {
    white-space: nowrap !important;
    overflow: hidden !important;
  }

  /* =====================================================
     TĂNG ĐỘ RỘNG CỘT DỮ LIỆU
  ===================================================== */

  .student-excel-table tbody td.cell-data {
    min-width: 35px !important;
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  .student-excel-table thead tr:first-child th:nth-child(n + 5) {
    min-width: 35px !important;
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  /* =====================================================
     NỘI DUNG BẢNG
  ===================================================== */

  .student-excel-table tbody th,
  .student-excel-table tbody td,
  .student-excel-table .cell-data,
  .student-excel-table .cell-stt,
  .student-excel-table .cell-name,
  .student-excel-table .cell-date {
    font-weight: 400 !important;
  }

  .student-excel-table .cell-empty {
    color: #94a3b8;
  }

  .student-excel-table tbody tr:nth-child(even) {
    background: #f8fafc;
  }

  .student-excel-table tbody tr:hover {
    background: #eff6ff;
  }

  .student-excel-table .cell-no-data {
    padding: 24px;
    color: #64748b;
    text-align: center;
  }

  /* =====================================================
     CHỮ KÝ
  ===================================================== */

  .bang-tong-hop-signatures {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    width: 100% !important;
    box-sizing: border-box !important;
    margin-top: 2mm !important;
    padding: 0 !important;
    align-items: start !important;
  }

  .bang-tong-hop-signatures > div {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    line-height: 1.5 !important;
  }

  .bang-tong-hop-signatures > div:first-child {
    grid-column: 1 !important;
  }

  .bang-tong-hop-signatures > div:last-child {
    grid-column: 2 !important;
  }
`;