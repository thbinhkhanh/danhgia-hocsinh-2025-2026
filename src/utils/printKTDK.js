
export const printKTDK = (
  students,
  className,
  selectedSemester = "Giữa kỳ I",
  subject = "Tin học",
  namHoc
) => {
  if (!students || students.length === 0) {
    alert("❌ Không có dữ liệu để in!");
    return;
  }

  const isCongNghe =
    subject?.trim().toLowerCase() === "công nghệ";

  const subjectLabel = isCongNghe ? "CÔNG NGHỆ" : "TIN HỌC";

  // Xác định học kỳ
  const termMap = {
    "Giữa kỳ I": "GKI",
    "Cuối kỳ I": "CKI",
    "Giữa kỳ II": "GKII",
    "Cuối năm": "CN"
  };

  const termDoc = termMap[selectedSemester] || "CN";

  const [currentYear, nextYear] = namHoc
    ? namHoc.split("-")
    : ["", ""];

  const hocKy = selectedSemester;

  // Sắp xếp theo tên cuối
  const sorted = [...students].sort((a, b) => {
    const nameA = (a.hoVaTen || "").trim().split(" ").pop();
    const nameB = (b.hoVaTen || "").trim().split(" ").pop();

    return nameA.localeCompare(nameB, "vi", {
      sensitivity: "base"
    });
  });

  const list = sorted.map((s, i) => ({ ...s, stt: i + 1 }));

  // Hàm lấy dữ liệu: ưu tiên đúng học kỳ trong ktdk
  const getValue = (s, field) => {
    const termData = s.ktdk?.[termDoc] || {};

    if (
      termData[field] !== undefined &&
      termData[field] !== null
    ) {
      return termData[field];
    }

    return s[field] ?? "";
  };

  const htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>KTĐK ${className}</title>

      <style>
        @page {
          size: A4 landscape;
          margin: 0.5in;
        }

        body {
          font-family: "Times New Roman", serif;
          font-size: 13px;
          color: #000;
        }

        .school-name {
          font-weight: bold;
          font-size: 14px;
        }

        .title {
          text-align: center;
          color: #0d47a1;
          font-weight: bold;
          font-size: 18px;
          margin-top: 5px;
        }

        .subtext {
          text-align: center;
          font-size: 16px;
          margin: 10px 0 15px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        th, td {
          border: 1px solid #000;
          padding: 3px 4px;
          line-height: 1.2;
          word-wrap: break-word;
          white-space: normal;
        }

        th {
          color: #0d47a1;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
        }

        td {
          text-align: center;
          vertical-align: middle;
        }

        td:nth-child(2),
        td:last-child {
          text-align: left;
          padding-left: 6px;
        }
      </style>
    </head>

    <body>
      <div class="school-name">
        TRƯỜNG TIỂU HỌC BÌNH KHÁNH
      </div>

      <div class="title">
        MÔN ${subjectLabel} - LỚP ${className}
      </div>

      <div class="subtext">
        ${hocKy} – NH: ${currentYear}-${nextYear}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:5%">STT</th>
            <th style="width:23%">Họ và tên</th>
            <th style="width:7%">ĐGTX</th>
            <th style="width:7%">Lí<br>thuyết</th>
            <th style="width:7%">Thực<br>hành</th>
            <th style="width:7%">Tổng<br>cộng</th>
            <th style="width:7%">Mức<br>đạt</th>
            <th style="width:38%">Nhận xét</th>
          </tr>
        </thead>

        <tbody>
          ${list.map(s => {
            const lyThuyet = getValue(s, "lyThuyet");
            let thucHanh = getValue(s, "thucHanh");
            let tongCong = getValue(s, "tongCong");

            const dgtx = getValue(s, "dgtx_mucdat");
            const dgtxNhanXet = getValue(s, "dgtx_nx");
            const mucDat = getValue(s, "mucDat");

            const nhanXet =
              getValue(s, "nhanXet") ||
              dgtxNhanXet ||
              "";

            // Không chuyển T/H/C thành số
            if (isCongNghe) {
              if (["NaN", "undefined", "null"].includes(String(thucHanh))) {
                thucHanh = "";
              }
            } else {
              if (["NaN", "undefined", "null"].includes(String(thucHanh))) {
                thucHanh = "";
              }
            }

            // Tổng cộng
            if (
              tongCong === "" ||
              tongCong === "NaN" ||
              tongCong === undefined ||
              tongCong === null
            ) {
              if (isCongNghe) {
                tongCong = lyThuyet;
              } else {
                const lt = Number(lyThuyet);
                const th = Number(thucHanh);

                tongCong =
                  (Number.isFinite(lt) ? lt : 0) +
                  (Number.isFinite(th) ? th : 0);
              }
            }

            const mucDatHienThi =
              termDoc === "GKI" || termDoc === "GKII"
                ? dgtx
                : mucDat;

            return `
              <tr>
                <td>${s.stt}</td>
                <td>${s.hoVaTen || ""}</td>
                <td>${dgtx}</td>
                <td>${lyThuyet}</td>
                <td>${thucHanh}</td>
                <td>${tongCong}</td>
                <td>${mucDatHienThi}</td>
                <td>${nhanXet}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("❌ Không thể mở cửa sổ in. Vui lòng cho phép cửa sổ bật lên!");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};
