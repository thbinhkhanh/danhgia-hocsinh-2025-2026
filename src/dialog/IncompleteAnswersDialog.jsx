import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const IncompleteAnswersDialog = ({ open, onClose, unansweredQuestions }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          bgcolor: "#e3f2fd",
        },
      }}
    >
      {/* HEADER */}
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255, 152, 0, 0.12)",
            }}
          >
            <WarningAmberRoundedIcon sx={{ color: "#ff9800" }} />
          </Box>

          <Typography fontWeight={600} color="#e65100">
            Chưa hoàn thành
          </Typography>
        </Stack>
      </DialogTitle>

      {/* CONTENT */}
      <DialogContent>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            lineHeight: 1.6,
            mt: 1,
          }}
        >
          Bạn chưa chọn đáp án cho câu:{" "}
          <Box component="span" sx={{ fontWeight: 600 }}>
            {unansweredQuestions.join(", ")}
          </Box>
          .
          <br />
          Vui lòng trả lời tất cả câu hỏi trước khi nộp.
        </Typography>
      </DialogContent>

      {/* ACTIONS */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Stack direction="row" spacing={1} width="100%">
          <Button
            onClick={onClose}
            variant="contained"
            color="warning"
            fullWidth
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "none",
            }}
          >
            Tiếp tục làm
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default IncompleteAnswersDialog;