import {
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase";

// 🟢 Bổ sung 2 hàm phụ trợ ở đây để tránh lỗi "is not defined"
const getSubjectKey = (subject) => {
  if (subject === "Công nghệ") return "CongNghe";
  if (subject === "Tin học") return "TinHoc";
  return null;
};

const getSemesterKey = (semester) => {
  const map = {
    "Giữa kỳ I": "GKI",
    "Cuối kỳ I": "CKI",
    "Giữa kỳ II": "GKII",
    "Cuối năm": "CN",
  };
  return map[semester] || null;
};

// Tính điểm trung bình từ dữ liệu ĐGTX (loại bỏ tuần thấp nhất nếu > 2 tuần)
const tinhDiemTrungBinh = (
  dgtx,
  weekFrom,
  weekTo,
  selectedSubject
) => {
  const scores = [];

  for (let i = weekFrom; i <= weekTo; i++) {
    const rawScore = dgtx?.[`tuan_${i}`]?.TN_diem;

    if (
      rawScore === undefined ||
      rawScore === null ||
      rawScore === ""
    ) {
      continue;
    }

    const diem = Number(rawScore);

    if (Number.isFinite(diem) && diem >= 0 && diem <= 100) {
      scores.push(diem);
    }
  }

  if (scores.length === 0) return null; 

  let scoresToAverage = [...scores];
  if (scoresToAverage.length > 2) {
    const minVal = Math.min(...scoresToAverage);
    const minIndex = scoresToAverage.indexOf(minVal);
    if (minIndex > -1) {
      scoresToAverage.splice(minIndex, 1);
    }
  }

  const tongDiem = scoresToAverage.reduce((acc, curr) => acc + curr, 0);
  const diemTB100 = tongDiem / scoresToAverage.length;

  const diemTB =
    selectedSubject === "Công nghệ"
      ? diemTB100 / 10
      : diemTB100 / 20;

  return Math.round(diemTB * 2) / 2;
};

/**
 * Tính điểm ĐGTX và lưu vào Firestore bằng writeBatch (Chỉ áp dụng cho các học kỳ giữa kỳ).
 */
export const tinhVaLuuDiemDGTX = async ({
  namHocKey,
  selectedClass,
  selectedSubject,
  selectedSemester,
  weekFrom,
  weekTo,
}) => {
  // ⚡ CHỈ THỰC HIỆN ĐỐI VỚI GIỮA KỲ (Bỏ qua CKI và Cuối năm)
  if (!selectedSemester || !selectedSemester.toLowerCase().includes("giữa")) {
    console.log(`Học kỳ "${selectedSemester}" không phải là giữa kỳ. Bỏ qua tổng hợp ĐGTX.`);
    return {
      totalStudents: 0,
      successCount: 0,
      noScoreCount: 0,
      errorCount: 0,
      errors: [],
      skipped: true,
    };
  }

  const subjectKey = getSubjectKey(selectedSubject);
  const semesterKey = getSemesterKey(selectedSemester);

  if (!subjectKey) {
    throw new Error("Môn học không hợp lệ.");
  }

  if (!semesterKey) {
    throw new Error("Học kỳ không hợp lệ.");
  }

  if (!namHocKey || !selectedClass) {
    throw new Error("Thiếu thông tin năm học hoặc lớp.");
  }

  const from = Number(weekFrom);
  const to = Number(weekTo);

  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 1 ||
    to < from
  ) {
    throw new Error("Khoảng tuần không hợp lệ.");
  }

  const namHoc = String(namHocKey).replace(/-/g, "_");
  const classKey = String(selectedClass).replace(/\./g, "_");

  const studentCollection = collection(
    db,
    `DATA_${namHoc}`,
    classKey,
    "HOCSINH"
  );

  const snapshot = await getDocs(studentCollection);

  console.log("SỐ HỌC SINH:", snapshot.size);

  const fieldPath = `${subjectKey}.ktdk.${semesterKey}.lyThuyet`;

  const BATCH_LIMIT = 400;

  let batch = writeBatch(db);
  let batchCount = 0;

  let successCount = 0;
  let noScoreCount = 0;

  const errors = [];

  for (const studentDoc of snapshot.docs) {
    const studentData = studentDoc.data();
    const dgtx = studentData?.[subjectKey]?.dgtx;

    if (!dgtx) {
      noScoreCount++;
      continue;
    }

    const diemTB = tinhDiemTrungBinh(
      dgtx,
      from,
      to,
      selectedSubject
    );

    if (diemTB === null) {
      noScoreCount++;
      continue;
    }

    batch.update(studentDoc.ref, {
      [fieldPath]: diemTB,
    });

    batchCount++;

    if (batchCount >= BATCH_LIMIT) {
      try {
        await batch.commit();
        successCount += batchCount;

        console.log("ĐÃ GHI:", successCount);

        batch = writeBatch(db);
        batchCount = 0;
      } catch (error) {
        errors.push({
          batchSize: batchCount,
          code: error.code,
          message: error.message,
        });

        console.error("LỖI GHI BATCH:", error);

        throw error;
      }
    }
  }

  if (batchCount > 0) {
    try {
      await batch.commit();
      successCount += batchCount;
    } catch (error) {
      errors.push({
        batchSize: batchCount,
        code: error.code,
        message: error.message,
      });

      console.error("LỖI GHI BATCH CUỐI:", error);
      throw error;
    }
  }

  console.log("HOÀN TẤT TỔNG HỢP ĐGTX:", {
    subject: selectedSubject,
    scale: selectedSubject === "Công nghệ" ? 10 : 5,
    totalStudents: snapshot.size,
    successCount,
    noScoreCount,
  });

  return {
    totalStudents: snapshot.size,
    successCount,
    noScoreCount,
    errorCount: errors.length,
    errors,
  };
};