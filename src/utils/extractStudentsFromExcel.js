
export const extractStudentsFromExcelFiles = async ({
  files,
  XLSX,
  normalizeText,
  cleanValue,
  getValueByLabel,
  getLocationDate,
  getNLPCLevels,
  getNLPCNote,
  selectedClass = ""
}) => {
  // Chỉ nhận file Excel hợp lệ, bỏ file tạm
  const excelFiles = Array.from(files || []).filter(
    (file) =>
      /\.(xlsx|xls)$/i.test(file.name) &&
      !file.name.trim().startsWith("~$")
  );

  const allExtractedStudents = [];

  let selectedTermLabel = "";

  for (const file of excelFiles) {
    try {
      const data = await file.arrayBuffer();

      const workbook = XLSX.read(new Uint8Array(data), {
        type: "array"
      });

      // ================= SHEET MÔN HỌC =================
      const sheetMHName =
        workbook.SheetNames.find((name) => {
          const n = normalizeText(name);

          return (
            n.includes("mh") ||
            n.includes("hđgd") ||
            n.includes("hdgd")
          );
        }) || workbook.SheetNames[0];

      const worksheetMH = workbook.Sheets[sheetMHName];

      const jsonMH = worksheetMH
        ? XLSX.utils.sheet_to_json(worksheetMH, {
            header: 1,
            defval: "",
            raw: false
          })
        : [];

      // ================= SHEET NĂNG LỰC - PHẨM CHẤT =================
      const sheetNLName =
        workbook.SheetNames.find((name) => {
          const n = normalizeText(name);

          return n.includes("nl") || n.includes("pc");
        }) || workbook.SheetNames[1];

      const worksheetNL = sheetNLName
        ? workbook.Sheets[sheetNLName]
        : null;

      const jsonNL = worksheetNL
        ? XLSX.utils.sheet_to_json(worksheetNL, {
            header: 1,
            defval: "",
            raw: false
          })
        : [];

      if (!jsonMH.length) continue;

      // ================= XÁC ĐỊNH HỌC KỲ =================
      const titleText = jsonMH
        .flat()
        .map((cell) => cleanValue(cell))
        .join(" ");

      const normalizedTitle = normalizeText(titleText);

      const isFinalTerm =
        normalizedTitle.includes("cuoi hoc ky") ||
        normalizedTitle.includes("cuoi nam hoc");

      const currentTermLabel = normalizedTitle.includes(
        "cuoi nam hoc"
      )
        ? "CUỐI NĂM HỌC"
        : isFinalTerm
          ? "CUỐI HỌC KỲ I"
          : "GIỮA HỌC KỲ I";

      selectedTermLabel = currentTermLabel;

      // ================= THÔNG TIN HỌC SINH =================
      const rawStudentName = getValueByLabel(jsonMH, [
        "Tên học sinh",
        "Họ tên học sinh",
        "Họ và tên học sinh"
      ]);

      const classNameFromSheet = getValueByLabel(jsonMH, [
        "Lớp"
      ]);

      const gradeMatch = cleanValue(classNameFromSheet).match(
        /^([1-5])/
      );

      const grade = gradeMatch ? Number(gradeMatch[1]) : 0;
      const isGrade123 = [1, 2, 3].includes(grade);

      const schoolName = getValueByLabel(jsonMH, [
        "Trường",
        "Tên trường"
      ]);

      const idCode = getValueByLabel(jsonMH, [
        "Mã định danh",
        "Mã định danh Bộ GD&ĐT"
      ]);

      const teacherName = getValueByLabel(jsonMH, [
        "Giáo viên",
        "Giáo viên chủ nhiệm",
        "GVCN"
      ]);

      const phone = getValueByLabel(jsonMH, [
        "ĐT",
        "ĐTDV",
        "Điện thoại",
        "Số điện thoại"
      ]);

      const absentDays =
        getValueByLabel(jsonMH, ["Số ngày nghỉ"]) ||
        "0 (CP) - 0 (KP)";

      const height = getValueByLabel(jsonMH, [
        "Chiều cao"
      ]);

      const weight = getValueByLabel(jsonMH, [
        "Cân nặng"
      ]);

      const rewards = getValueByLabel(jsonMH, [
        "Khen thưởng"
      ]);

      const locationDate =
        getLocationDate(jsonMH) ||
        getLocationDate(jsonNL);

      // ================= LÀM SẠCH TÊN HỌC SINH =================
      const cleanStudentName = cleanValue(rawStudentName)
        .replace(
          /^(tên học sinh|họ tên|họ và tên)\s*[:：]?\s*/i,
          ""
        )
        .trim();

      // Không sử dụng tên file làm tên học sinh dự phòng
      if (
        !cleanStudentName ||
        cleanStudentName.startsWith("~$") ||
        cleanStudentName.startsWith("PHIEU_DANH_GIA") ||
        cleanStudentName.startsWith("PHIẾU ĐÁNH GIÁ")
      ) {
        continue;
      }

      // ================= ĐỌC 12 MÔN HỌC =================
      const subjectsList = [];

      const hasFinalTermLayout = jsonMH.some((row) =>
        row.some((cell) => {
          const value = normalizeText(cleanValue(cell));

          return (
            value.includes("cuoi hoc ky") ||
            value.includes("cuoi nam hoc")
          );
        })
      );

      let isReadingSubjects = false;

      jsonMH.forEach((row) => {
        const rowText = row
          .map((cell) => cleanValue(cell))
          .join(" ");

        if (normalizeText(rowText).includes("tieng viet")) {
          isReadingSubjects = true;
        }

        if (!isReadingSubjects) return;

        const stt = Number(cleanValue(row[0]));

        if (
          !Number.isInteger(stt) ||
          stt < 1 ||
          stt > 12
        ) {
          return;
        }

        const subjectName = cleanValue(row[1]);

        if (!subjectName) return;

        const subject = {
          stt,
          name: subjectName,

          // Mức đạt giữa kỳ
          midTermLevel: cleanValue(row[2]),

          // Lớp 1, 2, 3 không có cột Điểm KTĐK giữa kỳ
          midTermPoint: isGrade123
            ? ""
            : cleanValue(row[3]),

          // Mức đạt cuối kỳ
          finalTermLevel: hasFinalTermLayout
            ? cleanValue(row[isGrade123 ? 3 : 4])
            : "",

          // Điểm KTĐK cuối kỳ
          finalTermPoint: hasFinalTermLayout
            ? cleanValue(row[isGrade123 ? 4 : 5])
            : "",

          // Nhận xét
          note: hasFinalTermLayout
            ? cleanValue(row[isGrade123 ? 5 : 6])
            : cleanValue(row[isGrade123 ? 3 : 4])
        };

        // Dữ liệu hiển thị theo học kỳ
        subject.scoreLevel = isFinalTerm
          ? subject.finalTermLevel
          : subject.midTermLevel;

        subject.scorePoint = isFinalTerm
          ? subject.finalTermPoint
          : subject.midTermPoint;

        subjectsList.push(subject);
      });

      console.log("File:", file.name);
      console.log("Học kỳ:", currentTermLabel);
      console.log("Danh sách môn học:", subjectsList);

      // ================= NĂNG LỰC CHUNG =================
      const competenciesCoreList = [
        {
          name: "Tự chủ và tự học",
          ...getNLPCLevels(jsonNL, "Tự chủ và tự học")
        },
        {
          name: "Giao tiếp và hợp tác",
          ...getNLPCLevels(jsonNL, "Giao tiếp và hợp tác")
        },
        {
          name: "Giải quyết vấn đề và sáng tạo",
          ...getNLPCLevels(
            jsonNL,
            "Giải quyết vấn đề và sáng tạo"
          )
        }
      ];

      // ================= NĂNG LỰC ĐẶC THÙ =================
      const competenciesSpecificList = [
        {
          name: "Ngôn ngữ",
          ...getNLPCLevels(jsonNL, "Ngôn ngữ")
        },
        {
          name: "Tính toán",
          ...getNLPCLevels(jsonNL, "Tính toán")
        },
        {
          name: "Khoa học",
          ...getNLPCLevels(jsonNL, "Khoa học")
        },
        {
          name: "Công nghệ",
          ...getNLPCLevels(jsonNL, "Công nghệ")
        },
        {
          name: "Tin học",
          ...getNLPCLevels(jsonNL, "Tin học")
        },
        {
          name: "Thẩm mĩ",
          ...getNLPCLevels(jsonNL, "Thẩm mĩ")
        },
        {
          name: "Thể chất",
          ...getNLPCLevels(jsonNL, "Thể chất")
        }
      ];

      // ================= PHẨM CHẤT =================
      const qualitiesList = [
        {
          name: "Yêu nước",
          ...getNLPCLevels(jsonNL, "Yêu nước")
        },
        {
          name: "Nhân ái",
          ...getNLPCLevels(jsonNL, "Nhân ái")
        },
        {
          name: "Chăm chỉ",
          ...getNLPCLevels(jsonNL, "Chăm chỉ")
        },
        {
          name: "Trung thực",
          ...getNLPCLevels(jsonNL, "Trung thực")
        },
        {
          name: "Trách nhiệm",
          ...getNLPCLevels(jsonNL, "Trách nhiệm")
        }
      ];

      // ================= NHẬN XÉT TỪNG NHÓM =================
      const competenciesCoreNote = getNLPCNote(
        jsonNL,
        "Năng lực cốt lõi"
      );

      const competenciesSpecificNote = getNLPCNote(
        jsonNL,
        "Năng lực đặc thù"
      );

      const qualitiesNote = getNLPCNote(
        jsonNL,
        "Phẩm chất chủ yếu"
      );

      // ================= LƯU HỌC SINH =================
      allExtractedStudents.push({
        hoTen: cleanStudentName,
        maDinhDanh: idCode,
        nghiPhep: absentDays,
        chieuCao: height,
        canNang: weight,
        weight,

        khenThuong: rewards,
        rewards,

        className: classNameFromSheet || selectedClass || "",
        teacherName,
        phone,
        schoolName,
        locationDate,

        subjects: subjectsList,

        competenciesCore: competenciesCoreList,
        competenciesCoreNote,

        competenciesSpecific: competenciesSpecificList,
        competenciesSpecificNote,

        qualities: qualitiesList,
        qualitiesNote
      });

    } catch (err) {
      console.error(`Lỗi đọc file ${file.name}:`, err);
    }
  }

  // ================= SẮP XẾP HỌC SINH =================
  allExtractedStudents.sort((a, b) => {
    const partsA = a.hoTen.trim().split(/\s+/);
    const partsB = b.hoTen.trim().split(/\s+/);

    const nameA = partsA[partsA.length - 1] || "";
    const nameB = partsB[partsB.length - 1] || "";

    return nameA.localeCompare(nameB, "vi", {
      sensitivity: "base"
    });
  });

  return {
    students: allExtractedStudents,
    selectedTermLabel,
    totalFiles: excelFiles.length
  };
};
