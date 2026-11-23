
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Fade,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import TreasureMapIllustration from "../components/TreasureMapIllustration";

export default function ThemePreviewDialog({
  open,
  themeId,
  theme,
  onClose,
  onSelect,
}) {
  if (!theme) return null;

  const previewStages = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    landmark:
      theme.landmarks?.[index] || `Địa danh ${index + 1}`,
    activityTitle: `Hoạt động ${index + 1}`,
    reward:
      theme.rewards?.[index] || `Phần thưởng ${index + 1}`,
  }));

  return (
    <Dialog
      open={Boolean(open)}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 800,
          color: theme.color,
          backgroundColor: theme.light,
          py: 1.5,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography fontSize={28}>
            {theme.emoji}
          </Typography>

          <Typography fontWeight={800}>
            {theme.name}
          </Typography>
        </Box>

        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          p: { xs: 1, sm: 2.5 },
          backgroundColor: "#f8fafc",
        }}
      >
        <TreasureMapIllustration
          themeId={themeId}
          stages={previewStages}
          stepIndex={0}
          completed={false}
          inspectedStage={null}
          onInspect={() => {}}
          explorerEmoji={theme.explorerEmoji}
          goalEmoji={theme.goalEmoji}
        />

        <Button
          fullWidth
          variant="contained"
          sx={{
            mt: 2,
            py: 1.2,
            borderRadius: 2,
            fontWeight: 800,
            background: theme.headerGradient,
            "&:hover": {
              opacity: 0.9,
            },
          }}
          onClick={onSelect}
        >
          Chọn bản đồ này
        </Button>
      </DialogContent>
    </Dialog>
  );
}
