// QuestionOption.jsx
import { Typography, Box } from "@mui/material";

const QuestionOption = ({ option }) => {
  if (!option) return null;

  const { text = "", image = null } =
    typeof option === "object" ? option : { text: option };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
      {image && (
        <Box
          component="img"
          src={image}
          alt=""
          sx={{
            maxHeight: 35,
            width: "auto",
            objectFit: "contain",
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
      )}

      <Typography
        className="choice-option-editor" // dùng class để đồng bộ CSS
        component="div"
        dangerouslySetInnerHTML={{ __html: text }}
        sx={{
          flex: 1,
          fontSize: "1.1rem",   // hoặc 16px nếu bạn muốn cố định
          lineHeight: 1.5,
          // ❌ KHÔNG set fontStyle/fontWeight/textDecoration ở đây
          whiteSpace: "pre-wrap",
          "& p": { margin: 0 },
        }}
      />
    </Box>
  );
};

export default QuestionOption;