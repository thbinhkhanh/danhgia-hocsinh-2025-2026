import admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

async function migrateDataFull() {
  const bangDiemRef = db.collection("BANGDIEM");
  const danhGiaMoiRef = db.collection("DANHGIAMOI");

  const tuanDocs = await bangDiemRef.listDocuments();

  for (const tuanDoc of tuanDocs) {
    const tuanId = tuanDoc.id; // ví dụ: "tuan_1"
    const tuanSnap = await tuanDoc.get();
    const data = tuanSnap.data();
    if (!data) continue;

    const lopData = {}; // Gom dữ liệu theo lớp

    for (const [key, value] of Object.entries(data)) {
      // Ví dụ key: "4.2.7956673970"
      const parts = key.split(".");
      if (parts.length < 3) continue;

      const lop = parts[0] + "." + parts[1]; // -> "4.2"
      const hocSinhId = parts[2]; // -> "7956673970"

      if (!lopData[lop]) lopData[lop] = {};

      lopData[lop][hocSinhId] = {
        hoVaTen: value.hoVaTen || "",
        dgtx: value.dgtx || "",
        dgtx_gv: value.dgtx_gv || "",
        nhanXet: value.nhanXet || "",
        thucHanh: value.thucHanh ?? null,
        tongCong: value.tongCong ?? null,
        tracNghiem: value.tracNghiem ?? null,
        xepLoai: value.xepLoai || "",
      };
    }

    // Ghi sang cấu trúc mới
    for (const [lopId, hocSinhMap] of Object.entries(lopData)) {
      const tuanCollection = danhGiaMoiRef.doc(`lop-${lopId}`).collection("tuan");
      await tuanCollection.doc(tuanId).set(hocSinhMap, { merge: true });
    }

    console.log(`✅ Đã xử lý xong ${tuanId}`);
  }

  console.log("🎉 Hoàn tất chuyển dữ liệu đầy đủ (ID học sinh giữ nguyên)!");
}

migrateDataFull().catch(console.error);
