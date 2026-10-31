export const handleCellChange = ({
  maDinhDanh,
  field,
  value,
  selectedSubject,
  setStudents,
  generateNhanXet,
}) => {
  setStudents((prev) =>
    prev.map((s) => {
      if (s.maDinhDanh !== maDinhDanh) return s;

      let updated = { ...s, [field]: value };

      // =========================
      // 💬 NHẬN XÉT THỦ CÔNG
      // =========================
      if (field === "nhanXet") {
        updated.nhanXet = value;
        return updated;
      }

      // =========================
      // 🧠 TIN HỌC
      // =========================
      if (selectedSubject === "Tin học") {
        if (field === "lyThuyet" || field === "thucHanh") {
          if (value === "" || value === "." || value === "-") {
            updated[field] = value;
          } else {
            let num;

            if (/^\d{2}$/.test(value)) {
              const first = parseInt(value[0]);
              const second = parseInt(value[1]);
              num = second === 5 ? first + 0.5 : first;
            } else {
              const raw = parseFloat(value);
              if (isNaN(raw)) return s;

              const integer = Math.floor(raw);
              const decimal = raw - integer;

              num = decimal === 0.5 ? integer + 0.5 : integer;
            }

            if (num < 0 || num > 5) return s;
            updated[field] = num;
          }
        }

        const lt =
          updated.lyThuyet === "" || updated.lyThuyet == null
            ? null
            : parseFloat(updated.lyThuyet);

        const th =
          updated.thucHanh === "" || updated.thucHanh == null
            ? null
            : parseFloat(updated.thucHanh);

        if (lt == null || th == null || isNaN(lt) || isNaN(th)) {
          updated.tongCong = null;
          updated.mucDat = "";
          updated.nhanXet = "";
          return updated;
        }

        updated.tongCong = Math.round(lt + th);
      }

      // =========================
      // 🧠 CÔNG NGHỆ
      // =========================
      if (selectedSubject === "Công nghệ") {
        if (field === "lyThuyet") {
          if (value === "" || value === "." || value === "-") {
            updated.lyThuyet = value;
            updated.tongCong = null;
            updated.mucDat = "";
            updated.nhanXet = "";
            return updated;
          }

          let num;

          if (value === "10") {
            num = 10;
          } else if (/^\d{2}$/.test(value)) {
            const first = parseInt(value[0]);
            const second = parseInt(value[1]);
            num = second === 5 ? first + 0.5 : first;
          } else {
            const raw = parseFloat(value);
            if (isNaN(raw)) return s;

            const integer = Math.floor(raw);
            const decimal = raw - integer;

            num = decimal >= 0.5 ? integer + 0.5 : integer;
          }

          if (num < 0 || num > 10) return s;

          updated.lyThuyet = num;
          updated.tongCong = Math.round(num);
        }
      }

      // =========================
      // 🧮 TÍNH MỨC ĐẠT
      // =========================
      if (updated.tongCong != null && !isNaN(updated.tongCong)) {
        if (field !== "mucDat") {
          updated.mucDat =
            updated.tongCong >= 9
              ? "T"
              : updated.tongCong >= 5
              ? "H"
              : "C";
        }

        // =========================
        // 💬 SINH NHẬN XÉT TỪ FIRESTORE
        // =========================
        updated.nhanXet = generateNhanXet(
          updated,
          selectedSubject,
          updated.tongCong,
          updated.mucDat
        );
      } else {
        updated.mucDat = "";
        updated.nhanXet = "";
      }

      return updated;
    })
  );
};