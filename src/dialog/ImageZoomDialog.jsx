import { Dialog, DialogContent } from "@mui/material";

export default function ImageZoomDialog({ open, imageSrc, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "transparent", // 👈 QUAN TRỌNG
          boxShadow: "none",
        },
      }}
    >
      <DialogContent
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "transparent", // 👈 QUAN TRỌNG
          p: 1,
        }}
      >
        {imageSrc && (
          <img
            src={imageSrc}
            alt="Zoom"
            style={{
              maxWidth: "100%",
              maxHeight: "90vh",
              objectFit: "contain",
              cursor: "zoom-out",
            }}
            onClick={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
