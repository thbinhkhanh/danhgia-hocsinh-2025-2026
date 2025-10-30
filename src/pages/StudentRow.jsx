import React from "react";
import {
  TableRow, TableCell, Typography, TextField, Select, MenuItem, FormControl
} from "@mui/material";

const StudentRow = React.memo(({ student, idx, handleCellChange, handleKeyNavigation }) => {
  return (
    <TableRow key={student.maDinhDanh} hover>
      <TableCell align="center" sx={{ px: 1 }}>{student.stt}</TableCell>
      <TableCell align="left" sx={{ px: 1 }}>{student.hoVaTen}</TableCell>

      <TableCell align="center" sx={{ px: 1 }}>
        <Typography variant="body2" sx={{ textAlign: "center" }}>
          {student.dgtx || ""}
        </Typography>
      </TableCell>

      <TableCell align="center" sx={{ px: 1 }}>
        <FormControl variant="standard" fullWidth sx={{
          "& .MuiSelect-icon": { opacity: 0, transition: "opacity 0.2s ease" },
          "&:hover .MuiSelect-icon": { opacity: 1 },
        }}>
          <Select
            value={student.dgtx_gv || ""}
            onChange={(e) => handleCellChange(student.maDinhDanh, "dgtx_gv", e.target.value)}
            disableUnderline
            id={`teacher-dgtx-${idx}`}
            sx={{
              textAlign: "center",
              px: 1,
              "& .MuiSelect-select": { py: 0.5, fontSize: "14px" },
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const next = document.getElementById(`teacher-dgtx-${idx + 1}`);
                if (next) next.focus();
              }
            }}
          >
            <MenuItem value=""><em>-</em></MenuItem>
            <MenuItem value="T">T</MenuItem>
            <MenuItem value="H">H</MenuItem>
            <MenuItem value="C">C</MenuItem>
          </Select>
        </FormControl>
      </TableCell>

      <TableCell align="center" sx={{ px: 1 }}>
        <TextField
          variant="standard"
          value={student.lyThuyet || ""}
          onChange={(e) => handleCellChange(student.maDinhDanh, "lyThuyet", e.target.value)}
          inputProps={{ style: { textAlign: "center", paddingLeft: 2, paddingRight: 2 } }}
          id={`lyThuyet-${idx}`}
          onKeyDown={(e) => handleKeyNavigation(e, idx, "lyThuyet")}
          InputProps={{ disableUnderline: true }}
        />
      </TableCell>

      <TableCell align="center" sx={{ px: 1 }}>
        <TextField
          variant="standard"
          value={student.thucHanh}
          onChange={(e) => handleCellChange(student.maDinhDanh, "thucHanh", e.target.value)}
          inputProps={{ style: { textAlign: "center", paddingLeft: 2, paddingRight: 2 } }}
          id={`thucHanh-${idx}`}
          onKeyDown={(e) => handleKeyNavigation(e, idx, "thucHanh")}
          InputProps={{ disableUnderline: true }}
        />
      </TableCell>

      <TableCell align="center" sx={{ px: 1, fontWeight: "bold" }}>
        {student.tongCong || ""}
      </TableCell>

      <TableCell align="center" sx={{ px: 1 }}>
        <FormControl variant="standard" fullWidth sx={{
          "& .MuiSelect-icon": { opacity: 0, transition: "opacity 0.2s ease" },
          "&:hover .MuiSelect-icon": { opacity: 1 },
        }}>
          <Select
            value={student.mucDat || ""}
            onChange={(e) => handleCellChange(student.maDinhDanh, "mucDat", e.target.value)}
            disableUnderline
            id={`mucDat-${idx}`}
            sx={{
              textAlign: "center",
              px: 1,
              "& .MuiSelect-select": { py: 0.5, fontSize: "14px" },
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const next = document.getElementById(`mucDat-${idx + 1}`);
                if (next) next.focus();
              }
            }}
          >
            <MenuItem value=""><em>-</em></MenuItem>
            <MenuItem value="T">T</MenuItem>
            <MenuItem value="H">H</MenuItem>
            <MenuItem value="C">C</MenuItem>
          </Select>
        </FormControl>
      </TableCell>

      <TableCell align="left" sx={{ px: 1 }}>
        <TextField
          variant="standard"
          multiline
          maxRows={4}
          fullWidth
          value={student.nhanXet}
          onChange={(e) => handleCellChange(student.maDinhDanh, "nhanXet", e.target.value)}
          id={`nhanXet-${idx}`}
          onKeyDown={(e) => handleKeyNavigation(e, idx, "nhanXet")}
          InputProps={{
            sx: {
              paddingLeft: 1,
              paddingRight: 1,
              fontSize: "14px",
              lineHeight: 1.3,
            },
            disableUnderline: true,
          }}
        />
      </TableCell>
    </TableRow>
  );
});

export default StudentRow;