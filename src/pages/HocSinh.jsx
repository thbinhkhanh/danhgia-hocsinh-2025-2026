import React, { useState, useEffect, useContext, useRef } from "react";

// ================= MUI COMPONENTS =================
import {
  Box,
  Typography,
  MenuItem,
  Select,
  Grid,
  Paper,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Tooltip
} from "@mui/material";

// ================= FIREBASE =================
import {
  db
} from "../firebase";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

// ================= CONTEXT =================
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { useSelectedClass } from "../context/SelectedClassContext";

// ================= ROUTER =================
import { useNavigate } from "react-router-dom";

// ================= UI LIBS =================
import Draggable from "react-draggable";

// ================= ICONS =================
import CloseIcon from "@mui/icons-material/Close";
import GroupIcon from "@mui/icons-material/Group";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import SchoolIcon from "@mui/icons-material/School";
import QuizIcon from "@mui/icons-material/Quiz";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

// ================= THEME =================
import { useTheme, useMediaQuery } from "@mui/material";

// ================= DIALOGS =================
import DoneDialog from "../dialog/StatusResultDialogHS";
import StudentStatusDialog from "../dialog/StudentStatusDialog";
import SystemLockedDialog from "../dialog/SystemLockedDialog";

export default function HocSinh() {
  // 🔹 Lấy context
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const navigate = useNavigate();

  // ================= CONTEXT CONFIG =================
  const { config, setConfig } = useContext(ConfigContext);
  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");
  const hocKiDisplay = config?.hocKy || "Cuối kỳ I";

  // ================= CLASS STATE =================
  const { selectedClass, setSelectedClass } = useSelectedClass();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  // ================= STUDENT STATE =================
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentStatus, setStudentStatus] = useState({});
  const [recentStudents, setRecentStudents] = useState([]);

  // ================= WEEK / PROGRESS =================
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [weekData, setWeekData] = useState({});

  // ================= SYSTEM STATE =================
  const [systemLocked, setSystemLocked] = useState(false);
  const [openSystemLocked, setOpenSystemLocked] = useState(false);
  const choXemDiem = config?.choXemDiem;

  // ================= UI STATE =================
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // ================= DONE DIALOG =================
  const [openDoneDialog, setOpenDoneDialog] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [doneStudent, setDoneStudent] = useState(null);
  
  // Khi tải trang
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return;

        const data = docSnap.data();
        const tuan = data.tuan || 1;
        const mon = data.mon || "Tin học";
        const lopFromFirestore = data.lop || "";
        const deTracNghiem = data.deTracNghiem || "";
        const onTap = data.onTap || false;

        // Cập nhật config (không ghi lớp)
        setConfig(prev => ({
          ...prev,
          tuan,
          mon,
          deTracNghiem,
          onTap
        }));

        // Nếu context lớp chưa có, dùng lớp từ Firestore
        setSelectedClass(prev => prev || lopFromFirestore);

        // Cập nhật tuần
        setSelectedWeek(tuan);

      } catch (err) {
        console.error("❌ Lỗi khi lấy CONFIG/config:", err);
      }
    };

    fetchConfig();
  }, [setConfig, setSelectedClass]);

  // Khi thay đổi lớp
  const handleClassChange = (e) => {
    const newClass = e.target.value;
    //console.log("🎯 Chọn lớp:", newClass);

    // Chỉ cập nhật context lớp và state local
    setSelectedClass(newClass);
  };

  useEffect(() => {
    if (!selectedClass) return;

    const key = `recent_${selectedClass}`;
    const stored = JSON.parse(localStorage.getItem(key) || "[]");

    setRecentStudents(stored);
  }, [selectedClass, students]);

  // 🔹 Lấy danh sách lớp (ưu tiên cache từ context)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        //const snapshot = await getDocs(collection(db, `DANHSACH_${getNamHocKey(config)}`));
        const snapshot = await getDocs(
  collection(db, `DANHSACH_${namHocKey}`)
);
        const classList = snapshot.docs.map((doc) => doc.id);

        setClassData(classList);
        setClasses(classList);

        // ✅ Chọn lớp từ config trước, nếu không có mới dùng lớp đầu tiên
        if (classList.length > 0) {
          setSelectedClass((prev) => prev || config.lop || classList[0]);
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách lớp:", err);
        setClasses([]);
        setClassData([]);
      }
    };

    fetchClasses();
  }, [config.lop]); // ✅ phụ thuộc config.lop để set lớp đúng

    // 🔹 Lấy học sinh (ưu tiên dữ liệu từ context)
  useEffect(() => {
    if (!selectedClass) return;

    const cached = studentData[selectedClass];
    if (cached && cached.length > 0) {
      // 🟢 Dùng cache nếu có
      setStudents(cached);
      return;
    }

    // 🔵 Nếu chưa có trong context thì tải từ Firestore
    const fetchStudents = async () => {
      try {
        //console.log(`🌐 Đang tải học sinh lớp "${selectedClass}" từ Firestore...`);
        const classDocRef = doc(db, `DANHSACH_${namHocKey}`, selectedClass);
        const classSnap = await getDoc(classDocRef);
        if (classSnap.exists()) {
          const data = classSnap.data();
          let studentList = Object.entries(data).map(([maDinhDanh, info]) => ({
            maDinhDanh,
            hoVaTen: info.hoVaTen,
          }));

          // Sắp xếp theo tên
          studentList.sort((a, b) => {
            const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
            const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
            return nameA.localeCompare(nameB);
          });

          studentList = studentList.map((s, idx) => ({ ...s, stt: idx + 1 }));

          //console.log(`✅ Đã tải học sinh lớp "${selectedClass}" từ Firestore:`, studentList);

          // ⬇️ Lưu vào context và state
          setStudentData((prev) => ({ ...prev, [selectedClass]: studentList }));
          setStudents(studentList);
        } else {
          console.warn(`⚠️ Không tìm thấy dữ liệu lớp "${selectedClass}" trong Firestore.`);
          setStudents([]);
          setStudentData((prev) => ({ ...prev, [selectedClass]: [] }));
        }
      } catch (err) {
        console.error(`❌ Lỗi khi lấy học sinh lớp "${selectedClass}":`, err);
        setStudents([]);
      }
    };

    fetchStudents();
  }, [selectedClass, studentData, setStudentData]);

  //tải dữ liệu tuần
  useEffect(() => {
    if (!selectedClass || !selectedWeek || students.length === 0) return;

    const fetchWeekStatus = async () => {
      try {
        const classKey = selectedClass.replace(".", "_");
        const subjectKey = config?.mon === "Công nghệ" ? "CongNghe" : "TinHoc";

        const statusMap = {};

        for (const student of students) {
          const hsRef = doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", student.maDinhDanh);
          const hsSnap = await getDoc(hsRef);

          if (hsSnap.exists()) {
            const data = hsSnap.data();
            const dgtxData = data?.[subjectKey]?.dgtx || {};
            const weekData = dgtxData?.[`tuan_${selectedWeek}`] || {};

            // Chỉ lấy status
            statusMap[student.maDinhDanh] = weekData.status || "";
          } else {
            statusMap[student.maDinhDanh] = "";
          }
        }

        //console.log("[INIT] studentStatus từ DATA:", statusMap);
        setStudentStatus(statusMap);
      } catch (err) {
        console.error("❌ Lỗi khi lấy status từ DATA:", err);
        setStudentStatus({});
      }
    };

    fetchWeekStatus();
  }, [selectedClass, selectedWeek, config?.mon, students]);

  // 🔹 Cột hiển thị
  const getColumns = () => {
    const cols = [[], [], [], [], []];
    students.forEach((student, idx) => {
      const colIndex = Math.floor(idx / 7) % 5;
      cols[colIndex].push(student);
    });
    return cols;
  };

  const columns = getColumns();

  const toggleExpand = (maDinhDanh) => {
    setExpandedStudent(expandedStudent === maDinhDanh ? null : maDinhDanh);
  };

  const saveStudentStatus = async (studentId, hoVaTen, status) => {
    if (!selectedWeek || !selectedClass) return;

    try {
      setSaving(true); // 🔒 Bắt đầu lưu

      // Chuẩn hóa tên class
      const classKey = selectedClass.replace(".", "_");
      const subjectKey = config?.mon === "Công nghệ" ? "CongNghe" : "TinHoc";

      // Document học sinh trong DATA
      const hsRef = doc(
        db,
        `DATA_${namHocKey}`,
        classKey,
        "HOCSINH",
        studentId
      );

      // Cập nhật status tuần trong dgtx
      const tuanField = `${subjectKey}.dgtx.tuan_${selectedWeek}.status`;

      await updateDoc(hsRef, {
        [tuanField]: status,
      }).catch(async (err) => {
        if (err.code === "not-found") {
          // Nếu chưa có document học sinh thì tạo mới
          await setDoc(
            hsRef,
            {
              [subjectKey]: {
                dgtx: {
                  [`tuan_${selectedWeek}`]: {
                    status,
                  },
                },
              },
            },
            { merge: true }
          );
        } else {
          throw err;
        }
      });

    } catch (err) {
      console.error("❌ Lỗi khi lưu trạng thái học sinh vào DATA:", err);
    } finally {
      setSaving(false); // ✅ Ghi xong, mở lại UI
    }
  };


  const handleStatusChange = (maDinhDanh, hoVaTen, status) => {
    setStudentStatus(prev => {
      const currentStatus = prev[maDinhDanh] || "";
      const newStatus = currentStatus === status ? "" : status;

      if (currentStatus === newStatus) return prev;

      const updated = { ...prev, [maDinhDanh]: newStatus };

      // 🔹 Ghi Firestore bất đồng bộ
      saveStudentStatus(maDinhDanh, hoVaTen, newStatus);

      return updated;
    });

    // 🔹 Đồng bộ lại dialog nếu đang mở đúng học sinh
    setExpandedStudent(prev =>
      prev?.maDinhDanh === maDinhDanh ? { ...prev, status } : prev
    );
  };

  const statusColors = {
    "Hoàn thành tốt": { bg: "#1976d2", text: "#ffffff", label: "T", color: "primary" },
    "Hoàn thành": { bg: "#9C27B0", text: "#ffffff", label: "H", color: "secondary" },
    "Chưa hoàn thành": { bg: "#FF9800", text: "#ffffff", label: "C", color: "warning" },
    "": { bg: "#ffffff", text: "#000000" },
  };

  // ref cho node (an toàn cho React StrictMode)
  const dialogNodeRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  function PaperComponent(props) {
    // 🔹 KHẮC PHỤC LỖI TRÊN MOBILE:
    // Trên điện thoại, không bọc trong <Draggable> để tránh chặn sự kiện chạm (tap)
    if (isMobile) {
      return <Paper {...props} />;
    }

    // 🔹 Chỉ desktop mới dùng draggable
    return (
      <Draggable
        nodeRef={dialogNodeRef}
        handle="#draggable-dialog-title"
        cancel={'[class*="MuiDialogContent-root"]'}
      >
        <Paper ref={dialogNodeRef} {...props} />
      </Draggable>
    );
  }

  const convertPercentToScore = (percent) => {
    if (percent === undefined || percent === null) return "?";

    const raw = percent / 10; // % → thang 10
    const decimal = raw % 1;

    let rounded;
    if (decimal < 0.25) rounded = Math.floor(raw);
    else if (decimal < 0.75) rounded = Math.floor(raw) + 0.5;
    else rounded = Math.ceil(raw);

    return rounded;
  };

  const getMode = (config) => {
  if (config.kiemTraDinhKi) return "ktdk";
  if (config.baiTapTuan) return "btt";
  if (config.danhGiaTuan) return "dgt";
  if (config.onTap) return "ontap";  // 🔹 Nhánh mới
  return "normal";
};

// 🔹 Hàm cập nhật config + Firestore (giống GiaoVien)
const updateConfig = async (field, value) => {
  const newConfig = { ...config, [field]: value };
  setConfig(newConfig);

  try {
    await setDoc(
      doc(db, "CONFIG", "config"),
      { [field]: value },
      { merge: true }
    );
  } catch (err) {
    console.error(`❌ Lỗi cập nhật ${field}:`, err);
  }
};


return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
        pt: 3,
        px: 3,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          width: "100%",
          maxWidth: 1420,
          bgcolor: "white",
          minHeight: 650, // 🔹 Chiều cao cố định
        }}
      >
        {/* 🔹 Tiêu đề */}
        <Box sx={{ textAlign: "center", mb: -1 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              color: "#1976d2",
              display: "inline-block",
              pb: 1,
            }}
          >
            {config?.examType === "ontap" && !config?.baiTapTuan && !config?.kiemTraDinhKi && !config?.danhGiaTuan
              ? `ÔN TẬP - ${(hocKiDisplay || "HỌC KỲ").toUpperCase()}`

              : config?.baiTapTuan
              ? `BÀI TẬP - TUẦN ${config?.tuan || ""}`

              : config?.danhGiaTuan
              ? `TỰ ĐÁNH GIÁ - TUẦN ${config?.tuan || ""}`

              : config?.kiemTraDinhKi
                ? `KTĐK - ${(hocKiDisplay || "HỌC KỲ").toUpperCase()}`
                : `KTĐK - ${(hocKiDisplay || "HỌC KỲ").toUpperCase()}`
            }
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            mt: 2,
            mb: 4,
          }}
        >
          {/* 🔹 Ô CHỌN LỚP */}
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Lớp</InputLabel>
            <Select
              value={selectedClass || ""}
              onChange={handleClassChange}
              label="Lớp"
            >
              {classes.map((cls) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>          
          
          {/*}
          <TextField
            label="Môn"
            value={config.mon || "Tin học"}
            InputProps={{ readOnly: true }}
            size="small"
            sx={{ width: 120 }}
          />
          
          <TextField
            label="Tuần"
            value={`Tuần ${config.tuan || 1}`}
            InputProps={{ readOnly: true }}
            size="small"
            sx={{ width: 120 }}
          />*/}
          
        </Box>

        {/* 🔹 Học sinh gần đây — Modern Exam UI */}
        {config.hienThiTenGanDay && recentStudents.length > 0 && !showAll && (
          <Box sx={{width:"100%",maxWidth:1200,mx:"auto",mb:4,fontFamily:'"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',textRendering:"optimizeLegibility",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale",fontFeatureSettings:'"kern" 1, "liga" 1'}}>
            
            {/* HEADER */}
            <Box sx={{display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"center",textAlign:"left",mb:2.5}}>
              <Box>
                <Typography sx={{fontSize:{xs:22,sm:24},fontWeight:500,color:"#0f172a",letterSpacing:"-0.5px",fontFamily:"inherit"}}>
                  Học sinh gần đây
                </Typography>
                <Typography sx={{fontSize:14,color:"#64748b",mt:0.5,fontWeight:500,fontFamily:"inherit"}}>
                  Truy cập nhanh học sinh vừa thao tác
                </Typography>
              </Box>
            </Box>

            {/* LIST */}
            <Box sx={{display:"flex",flexDirection:{xs:"column",sm:"row"},gap:2.5,overflowX:{xs:"visible",sm:"auto"},pb:1,"&::-webkit-scrollbar":{height:8},"&::-webkit-scrollbar-thumb":{background:"#cbd5e1",borderRadius:999}}}>
              
              {recentStudents.slice(0,4).map((student,index)=>{
                const status=studentStatus[student.maDinhDanh];

                const getCardIcon=()=>{
                  const mode=getMode(config);
                  if(mode==="btt")return <QuizIcon sx={{fontSize:34,color:"#fff"}}/>;
                  if(mode==="ontap")return <AutoStoriesIcon sx={{fontSize:34,color:"#fff"}}/>;
                  if(mode==="dgt")return <AssignmentTurnedInIcon sx={{fontSize:34,color:"#fff"}}/>;
                  return <SchoolIcon sx={{fontSize:34,color:"#fff"}}/>;
                };

                const mode = getMode(config);
                
                return (
                  <Paper key={student.maDinhDanh} elevation={0}
                    sx={{
                      width:{xs:"100%",sm:260},minWidth:{xs:"100%",sm:260},maxWidth:{xs:"100%",sm:260},
                      borderRadius:"30px",position:"relative",overflow:"hidden",cursor:"pointer",
                      background:"linear-gradient(180deg,#ffffff,#f8fbff)",
                      border:"1px solid rgba(226,232,240,.9)",
                      boxShadow:"0 8px 28px rgba(15,23,42,.06)",
                      transition:".28s ease",flexShrink:0,
                      fontFamily:'"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',
                      "&:hover":{transform:"translateY(-4px) scale(1.015)",boxShadow:"0 18px 40px rgba(37,99,235,.14)",borderColor:"#93c5fd"},
                      "&::before":{content:'""',position:"absolute",top:0,left:0,right:0,height:6,background:index%2===0?"linear-gradient(90deg,#2563eb,#60a5fa)":"linear-gradient(90deg,#7c3aed,#a78bfa)"}
                    }}
                    onClick={async()=>{
                      if(config?.khoaHeThong){setOpenSystemLocked(true);return;}
                      if(!selectedClass||!student.maDinhDanh)return;

                      const subjectKey=config.mon==="Công nghệ"?"CongNghe":"TinHoc";
                      const classKey=selectedClass.replace(".","_");

                      try{
                        const hsRef=doc(db,`DATA_${namHocKey}`,classKey,"HOCSINH",student.maDinhDanh);
                        const hsSnap=await getDoc(hsRef);
                        const data=hsSnap.exists()?hsSnap.data():{};
                        const dgtxData=data?.[subjectKey]?.dgtx||{};
                        const ktdkData=data?.[subjectKey]?.ktdk||{};
                        const mode=getMode(config);

                        if(mode==="btt"){
                          if(!selectedWeek){setDoneMessage("⚠️ Chưa chọn tuần.");setOpenDoneDialog(true);return;}
                          const weekData=dgtxData[`tuan_${selectedWeek}`]||{};
                          if(weekData.TN_diem!=null){setDoneStudent({hoVaTen:student.hoVaTen,diemTN:weekData.TN_diem,status:weekData.status||""});setOpenDoneDialog(true);return;}
                          navigate("/tracnghiem",{state:{studentId:student.maDinhDanh,fullname:student.hoVaTen,lop:selectedClass,selectedWeek,mon:config.mon}});
                          return;
                        }

                        if(mode==="ktdk"){
                          const hocKyMap={"Giữa kỳ I":"GKI","Cuối kỳ I":"CKI","Giữa kỳ II":"GKII","Cuối năm":"CN"};
                          const hocKyCode=hocKyMap[config.hocKy];
                          const hocKyData=ktdkData?.[hocKyCode]||{};
                          const lyThuyet=hocKyData?.lyThuyet??null;
                          if(lyThuyet!=null){setDoneStudent({hoVaTen:hocKyData?.hoVaTen??student.hoVaTen,diemTN:lyThuyet,nhanXet:hocKyData?.nhanXet||""});setOpenDoneDialog(true);return;}
                          navigate("/tracnghiem",{state:{studentId:student.maDinhDanh,fullname:student.hoVaTen,lop:selectedClass,selectedWeek,mon:config.mon}});
                          return;
                        }

                        if(mode==="ontap"){navigate("/tracnghiem-ontap",{state:{fullname:student.hoVaTen,lop:selectedClass}});return;}

                        if(mode==="dgt"){const weekData=dgtxData[`tuan_${selectedWeek}`]||{};setExpandedStudent({...student,status:weekData.status||""});return;}

                        navigate("/tracnghiem",{state:{studentId:student.maDinhDanh,fullname:student.hoVaTen,lop:selectedClass,selectedWeek,mon:config.mon}});
                      }catch(err){
                        console.error(err);
                        setDoneMessage("⚠️ Có lỗi khi kiểm tra trạng thái bài.");
                        setOpenDoneDialog(true);
                      }

                      if(config.hienThiTenGanDay){
                        const key=`recent_${selectedClass}`;
                        const updated=[student,...recentStudents.filter(s=>s.maDinhDanh!==student.maDinhDanh)];
                        if(updated.length>10)updated.pop();
                        localStorage.setItem(key,JSON.stringify(updated));
                        setRecentStudents(updated);
                      }
                    }}
                  >
                    <Box sx={{p:2.5,display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
                      <Box sx={{width:72,height:72,borderRadius:"24px",display:"flex",alignItems:"center",justifyContent:"center",mb:2,background:index%2===0?"linear-gradient(135deg,#2563eb,#60a5fa)":"linear-gradient(135deg,#7c3aed,#a78bfa)",boxShadow:"0 14px 30px rgba(37,99,235,.24)"}}>
                        {getCardIcon()}
                      </Box>

                      <Typography sx={{fontSize:18,fontWeight:700,color:"#0f172a",lineHeight:1.35,minHeight:50,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                        {student.hoVaTen}
                      </Typography>

                      <Typography sx={{mt:1,fontSize:13,color:"#64748b",fontWeight:600}}>
                        Học sinh lớp {selectedClass}
                      </Typography>

                      <Box sx={{display:"flex",alignItems:"center",gap:1,mt:2,flexWrap:"wrap",justifyContent:"center"}}>
                        <Chip label={`STT: ${student.stt}`} size="small" sx={{bgcolor:"#eff6ff",color:"#2563eb",fontWeight:700,borderRadius:"10px"}}/>
                        {/*{mode === "dgt" && status && (
                          <Chip
                            label={statusColors[status]?.label || ""}
                            size="small"
                            sx={{
                              bgcolor: statusColors[status]?.bg || "#e2e8f0",
                              color: "#fff",
                              fontWeight: 800,
                              borderRadius: "10px",
                            }}
                          />
                        )}*/}
                      </Box>

                      <Box sx={{mt:2.5,width:"100%",py:1.2,borderRadius:"16px",fontWeight:700,fontSize:14,color:"#2563eb",background:"#eff6ff","&:hover":{background:"#dbeafe"}}}>
                        {mode === "dgt" ? "Vào đánh giá" : "Bắt đầu làm bài"}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            {/* NÚT XEM TOÀN BỘ */}
            {!showAll && (
              <Box sx={{display:"flex",justifyContent:"flex-start",mt:3}}>
                <Box
                  onClick={() => setShowAll(true)}
                  sx={{
                    display:"flex",
                    alignItems:"center",
                    gap:1.5,
                    px:3,
                    py:1.6,
                    borderRadius:"18px",
                    cursor:"pointer",
                    background:"linear-gradient(135deg,#eff6ff,#f8fbff)",
                    border:"1px solid #dbeafe",
                    boxShadow:"0 8px 22px rgba(37,99,235,.12)",
                    transition:".25s",
                    width:"fit-content",
                    "&:hover":{
                      transform:"translateY(-2px)",
                      boxShadow:"0 14px 32px rgba(37,99,235,.2)",
                      borderColor:"#93c5fd"
                    }
                  }}
                >
                  <GroupIcon sx={{color:"#2563eb",fontSize:28}}/>
                  <Typography sx={{fontSize:16,fontWeight:700,color:"#2563eb"}}>
                    Xem toàn bộ lớp
                  </Typography>
                </Box>
              </Box>
            )}

          </Box>
        )}

        {/* 🔹 Danh sách học sinh */}
        {(!config.hienThiTenGanDay || recentStudents.length === 0 || showAll) && (
          <Grid container spacing={2} justifyContent="center">
            {columns.map((col, colIdx) => (
              <Grid item key={colIdx}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {col.map((student) => {
                    const status = studentStatus[student.maDinhDanh];
                    return (
                      <Paper
                        key={student.maDinhDanh}
                        elevation={3}
                        sx={{
                          minWidth: 120,
                          width: { xs: "75vw", sm: "auto" },
                          p: 2,
                          borderRadius: 2,
                          cursor: "pointer",
                          textAlign: "left",
                          bgcolor: "#ffffff",
                          transition: "0.2s",
                          "&:hover": { transform: "scale(1.03)", boxShadow: 4, bgcolor: "#f5f5f5" },
                        }}
                          onClick={async () => {      
                            if (config?.khoaHeThong) {
                              setOpenSystemLocked(true);
                              return;
                            }                    
                            try {
                              const mode = getMode(config);
                              if (!selectedClass || !student.maDinhDanh) return;

                              const classKey = selectedClass.replace(".", "_");
                              const subjectKey = config.mon === "Công nghệ" ? "CongNghe" : "TinHoc";

                              // 🔹 BÀI TẬP TUẦN
                              if (mode === "btt") {
                                if (!selectedWeek) {
                                  setDoneMessage("⚠️ Chưa chọn tuần.");
                                  setOpenDoneDialog(true);
                                  return;
                                }
                                const hsRef = doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", student.maDinhDanh);
                                const hsSnap = await getDoc(hsRef);
                                const data = hsSnap.exists() ? hsSnap.data() : {};
                                const dgtxData = data?.[subjectKey]?.dgtx || {};
                                const weekInfo = dgtxData[`tuan_${selectedWeek}`] || {};
                                const daLamBai = weekInfo?.TN_diem !== undefined && weekInfo?.TN_diem !== null;

                                if (daLamBai) {
                                  setDoneStudent({
                                    hoVaTen: student.hoVaTen,
                                    diemTN: weekInfo?.TN_diem ?? weekInfo?.TN_status,
                                  });
                                  setOpenDoneDialog(true);
                                } else {
                                  navigate("/tracnghiem", {
                                    state: { studentId: student.maDinhDanh, fullname: student.hoVaTen, lop: selectedClass, selectedWeek, mon: config.mon },
                                  });
                                }

                                // Lưu gần đây
                                if (config.hienThiTenGanDay) {
                                  const key = `recent_${selectedClass}`;
                                  const updated = [
                                    student,
                                    ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                                  ];
                                  if (updated.length > 10) updated.pop();
                                  localStorage.setItem(key, JSON.stringify(updated));
                                  setRecentStudents(updated);
                                }
                                return;
                              }

                              // 🔹 KIỂM TRA ĐỊNH KỲ
                              if (mode === "ktdk") {
                                const hocKyMap = { "Giữa kỳ I": "GKI", "Cuối kỳ I": "CKI", "Giữa kỳ II": "GKII", "Cuối năm": "CN" };
                                const hocKyCode = hocKyMap[config.hocKy];
                                if (!hocKyCode) {
                                  setDoneMessage("⚠️ Cấu hình học kỳ không hợp lệ.");
                                  setOpenDoneDialog(true);
                                  return;
                                }

                                const hsRef = doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", student.maDinhDanh);
                                const hsSnap = await getDoc(hsRef);
                                const data = hsSnap.exists() ? hsSnap.data() : {};
                                const ktdkData = data?.[subjectKey]?.ktdk?.[hocKyCode] || {};
                                const lyThuyet = ktdkData?.lyThuyet ?? ktdkData?.LyThuyet ?? null;

                                if (lyThuyet != null) {
                                  setDoneStudent({
                                    hoVaTen: ktdkData?.hoVaTen ?? student.hoVaTen,
                                    diemTN: lyThuyet,
                                    nhanXet: ktdkData?.nhanXet || "",
                                  });
                                  setOpenDoneDialog(true);
                                } else {
                                  navigate("/tracnghiem", {
                                    state: { studentId: student.maDinhDanh, fullname: student.hoVaTen, lop: selectedClass, selectedWeek, mon: config.mon },
                                  });
                                }

                                // Lưu gần đây
                                if (config.hienThiTenGanDay) {
                                  const key = `recent_${selectedClass}`;
                                  const updated = [
                                    student,
                                    ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                                  ];
                                  if (updated.length > 10) updated.pop();
                                  localStorage.setItem(key, JSON.stringify(updated));
                                  setRecentStudents(updated);
                                }
                                return;
                              }

                              // 🔹 ÔN TẬP
                              if (mode === "ontap") {
                                navigate("/tracnghiem-ontap", {
                                  state: {
                                    fullname: student.hoVaTen,
                                    lop: selectedClass,
                                    mon: config.mon,
                                    hocKy: config.hocKy,
                                    namHoc: config.namHoc,
                                    autoStart: true, // ⭐ thêm flag
                                  },
                                });

                                if (config.hienThiTenGanDay) {
                                  const key = `recent_${selectedClass}`;
                                  const updated = [
                                    student,
                                    ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                                  ];
                                  if (updated.length > 10) updated.pop();
                                  localStorage.setItem(key, JSON.stringify(updated));
                                  setRecentStudents(updated);
                                }
                                return;
                              }

                              // 🔹 ĐÁNH GIÁ TUẦN — CẬP NHẬT TRỰC TIẾP VÀ ĐỒNG BỘ studentStatus
                              if (mode === "dgt") {
                                if (!selectedWeek) {
                                  setDoneMessage("⚠️ Chưa chọn tuần.");
                                  setOpenDoneDialog(true);
                                  return;
                                }

                                const hsRef = doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", student.maDinhDanh);
                                const hsSnap = await getDoc(hsRef);
                                const data = hsSnap.exists() ? hsSnap.data() : {};
                                const dgtxData = data?.[subjectKey]?.dgtx || {};
                                const weekInfo = dgtxData[`tuan_${selectedWeek}`] || {};
                                const currentStatus = weekInfo?.status ?? weekInfo?.TN_status ?? "";

                                // Cập nhật UI: dialog và list map
                                setExpandedStudent({ ...student, status: currentStatus });
                                setStudentStatus(prev => ({ ...prev, [student.maDinhDanh]: currentStatus }));

                                // Lưu gần đây
                                if (config.hienThiTenGanDay) {
                                  const key = `recent_${selectedClass}`;
                                  const updated = [
                                    student,
                                    ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                                  ];
                                  if (updated.length > 10) updated.pop();
                                  localStorage.setItem(key, JSON.stringify(updated));
                                  setRecentStudents(updated);
                                }
                                return;
                              }

                              // 🔹 FALLBACK
                              navigate("/tracnghiem", {
                                state: { studentId: student.maDinhDanh, fullname: student.hoVaTen, lop: selectedClass, selectedWeek, mon: config.mon },
                              });

                              if (config.hienThiTenGanDay) {
                                const key = `recent_${selectedClass}`;
                                const updated = [
                                  student,
                                  ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                                ];
                                if (updated.length > 10) updated.pop();
                                localStorage.setItem(key, JSON.stringify(updated));
                                setRecentStudents(updated);
                              }
                              return;

                            } catch (err) {
                              console.error("❌ Lỗi khi click học sinh:", err);
                              setDoneMessage("⚠️ Có lỗi khi kiểm tra trạng thái bài.");
                              setOpenDoneDialog(true);
                            }
                          }}

                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {student.stt}. {student.hoVaTen}
                          </Typography>                          
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 🔹 Nút quay lại danh sách gần đây nếu đang xem toàn lớp */}
        {showAll && config.hienThiTenGanDay && recentStudents.length > 0 && (
          <Grid container spacing={2} justifyContent="left" sx={{ mt: 6, mb: 3 }}>
            
            {/* Đặt icon vào đúng vị trí của CỘT ĐẦU TIÊN */}
            <Grid item>
              <Box sx={{ ml: { xs: 0, sm: 1 } }}>
                <Tooltip title="Chế độ xem: Gần đây">
                  <IconButton
                    onClick={() => setShowAll(false)}
                    sx={{
                      fontSize: '1.2rem',
                      padding: '6px 16px',
                      minHeight: '36px',
                      border: '1px solid',
                      borderColor: 'primary.main',
                      borderRadius: '4px',
                      color: 'primary.main',
                      '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
                    }}
                  >
                    <AccessTimeIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        )}


      </Paper>

      {/* 🔹 Dialog hiển thị đánh giá học sinh */}
      <StudentStatusDialog
        expandedStudent={expandedStudent}
        setExpandedStudent={setExpandedStudent}
        studentStatus={studentStatus}
        handleStatusChange={handleStatusChange}
        saving={saving}
        PaperComponent={PaperComponent}
      />

      {/* Dialog thông báo học sinh đã làm bài */}
      <DoneDialog
        open={openDoneDialog}
        onClose={() => setOpenDoneDialog(false)}
        doneStudent={doneStudent}
        config={config}
        choXemDiem={choXemDiem}
        convertPercentToScore={convertPercentToScore}
      />

      <SystemLockedDialog
        open={openSystemLocked}
        onClose={() => setOpenSystemLocked(false)}
      />
    </Box>
  );
}
