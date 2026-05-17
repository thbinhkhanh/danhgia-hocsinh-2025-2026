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
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import { useNavigate } from "react-router-dom";

const ExitConfirmDialog = ({ open, onClose }) => {
  const navigate = useNavigate();

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
              bgcolor: "rgba(66, 165, 245, 0.12)",
            }}
          >
            <InfoRoundedIcon sx={{ color: "#42a5f5" }} />
          </Box>

          <Typography fontWeight={600} color="#1565c0">
            Thông báo
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
          Bạn có chắc chắn muốn thoát khỏi bài trắc nghiệm?
          <br />
          Mọi tiến trình chưa nộp sẽ{" "}
          <Box component="span" sx={{ fontWeight: 600 }}>
            bị mất
          </Box>
          .
        </Typography>
      </DialogContent>

      {/* ACTIONS */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Stack direction="row" spacing={1} width="100%">
          <Button
            onClick={onClose}
            variant="outlined"
            fullWidth
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Hủy
          </Button>

          <Button
            onClick={() => navigate(-1)}
            variant="contained"
            color="error"
            fullWidth
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "none",
            }}
          >
            Thoát
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default ExitConfirmDialog;