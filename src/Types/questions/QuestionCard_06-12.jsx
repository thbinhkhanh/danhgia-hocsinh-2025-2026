// src/DangCau/questions/QuestionCard.jsx
import React from "react";
import { Paper } from "@mui/material";
import QuestionHeader from "./QuestionHeader";        // QuestionHeader.jsx cũng trong cùng thư mục
import QuestionTypeSelector from "./QuestionTypeSelector";
import QuestionOptions from "./QuestionOptions";
import QuestionFooter from "./QuestionFooter";

const QuestionCard = ({ q, qi, updateQuestionAt, handleDeleteQuestion }) => {
  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <QuestionHeader q={q} qi={qi} update={updateQuestionAt} />
      <QuestionTypeSelector q={q} qi={qi} update={updateQuestionAt} />
      <QuestionOptions q={q} qi={qi} update={updateQuestionAt} />
      <QuestionFooter q={q} qi={qi} update={updateQuestionAt} handleDelete={handleDeleteQuestion} />
    </Paper>
  );
};
export default QuestionCard;



