// src/DangCau/questions/QuestionOptions.jsx
import React from "react";
import ChoiceOptions from "./options/ChoiceOptions";
import TrueFalseOptions from "./options/TrueFalseOptions";
import MatchingOptions from "./options/MatchingOptions";
import ImageOptions from "./options/ImageOptions";
import FillBlankOptions from "./options/FillBlankOptions";



const QuestionOptions = ({ q, qi, update }) => {
switch (q.type) {
case "matching": return <MatchingOptions q={q} qi={qi} update={update} />;
case "single":
case "multiple":
case "sort": return <ChoiceOptions q={q} qi={qi} update={update} />;
case "truefalse": return <TrueFalseOptions q={q} qi={qi} update={update} />;
case "image": return <ImageOptions q={q} qi={qi} update={update} />;
case "fillblank": return <FillBlankOptions q={q} qi={qi} update={update} />;
default: return null;
}
};
export default QuestionOptions;