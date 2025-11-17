import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Hàm phục hồi toàn bộ dữ liệu từ file JSON, với progress callback
 * @param {File} file - file JSON backup
 * @param {function} onProgress - callback nhận giá trị 0-100 để cập nhật thanh tiến trình
 */
export const restoreAllFromJson = async (file, onProgress) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const collections = Object.keys(data);
    let progressCount = 0;

    for (let colIndex = 0; colIndex < collections.length; colIndex++) {
      const colName = collections[colIndex];

      // --------------------------------------------
      // ✅ 1. PHỤC HỒI TRACNGHIEM
      // --------------------------------------------
      if (colName === "TRACNGHIEM") {
        const quizDocs = data.TRACNGHIEM || {};
        const quizIds = Object.keys(quizDocs);
        const totalQuiz = quizIds.length;

        for (let i = 0; i < totalQuiz; i++) {
          const quizId = quizIds[i];
          const quizData = quizDocs[quizId];

          await setDoc(doc(db, "TRACNGHIEM", quizId), quizData, { merge: true });

          if (onProgress) {
            const tnProgress = ((i + 1) / totalQuiz) * 10; // TRACNGHIEM chiếm ~10%
            onProgress(Math.min(Math.round(progressCount + tnProgress), 99));
          }
        }

        progressCount += 10;
        continue;
      }

      // --------------------------------------------
      // ✅ 2. PHỤC HỒI DGTX (nhiều cấp)
      // --------------------------------------------
      if (colName === "DGTX") {
        const classes = Object.keys(data.DGTX || {});
        const totalClasses = classes.length;

        for (let i = 0; i < totalClasses; i++) {
          const lopId = classes[i];
          const tuanData = data.DGTX[lopId]?.tuan || {};

          const tuanKeys = Object.keys(tuanData);
          if (tuanKeys.length === 0) continue;

          await Promise.all(
            tuanKeys.map(async (tuanId) => {
              const weekContent = tuanData[tuanId];
              const tuanRef = doc(db, "DGTX", lopId, "tuan", tuanId);
              await setDoc(tuanRef, weekContent, { merge: true });
            })
          );

          if (onProgress) {
            const dgtxProgress = ((i + 1) / totalClasses) * 70; // DGTX chiếm 70%
            onProgress(Math.min(Math.round(progressCount + dgtxProgress), 99));
          }
        }

        progressCount += 70;
        continue;
      }

      // --------------------------------------------
      // ✅ 3. PHỤC HỒI các collection đơn giản: DANHSACH, CONFIG, KTDK
      // --------------------------------------------
      const docs = data[colName] || {};
      const docIds = Object.keys(docs);
      const totalDocs = docIds.length;

      for (let j = 0; j < totalDocs; j++) {
        const id = docIds[j];
        await setDoc(doc(db, colName, id), docs[id], { merge: true });

        if (onProgress && totalDocs > 0) {
          const otherProgress =
            ((j + 1) / totalDocs) * (20 / (collections.length - 2)); // chia cho phần còn lại
          onProgress(Math.min(Math.round(progressCount + otherProgress), 99));
        }
      }

      progressCount += 20 / (collections.length - 2);
    }

    if (onProgress) onProgress(100);
    console.log("✅ Đã phục hồi dữ liệu thành công!");
    return true;

  } catch (err) {
    console.error("❌ Lỗi khi phục hồi backup:", err);
    return false;
  }
};
