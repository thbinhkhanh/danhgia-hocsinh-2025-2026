// Utils/updateDATAForStudent.js
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Cập nhật DATA cho một học sinh
 * @param {string} selectedClass - Tên lớp hiện tại
 * @param {object} student - { maDinhDanh, hoVaTen }
 * @param {Array} students - danh sách học sinh hiện tại (UI)
 */
const updateDATAForStudent = async (selectedClass, student, students) => {
  const ma = student.maDinhDanh;
  const ten = student.hoVaTen.toUpperCase(); // 🔹 tên in hoa
  const lopKey = selectedClass.replace(".", "_");
  const hsRef = doc(db, "DATA", lopKey, "HOCSINH", ma);

  const existingDoc = await getDoc(hsRef);

  if (existingDoc.exists()) {
    const existingData = existingDoc.data();
    // Cập nhật chỉ hoVaTen, giữ nguyên TinHoc & CongNghe, không thay đổi stt
    await setDoc(
      hsRef,
      {
        hoVaTen: ten,
      },
      { merge: true }
    );
  } else {
    // Thêm mới DATA
    await setDoc(hsRef, {
      hoVaTen: ten,
      stt: students.findIndex((s) => s.maDinhDanh === ma) + 1,
      TinHoc: { dgtx: {}, ktdk: {} },
      CongNghe: { dgtx: {}, ktdk: {} },
    });
  }
};

export default updateDATAForStudent;
