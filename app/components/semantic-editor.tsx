import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import theme from "~/lib/codemirror-theme";

const SemanticEditor = ({ schemas, setSchemas, activeTable }) => {
  // Find the active schema
  const activeSchema = schemas.find((s) => s.cubeName === activeTable);

  // Pretty format the JSON
  const formattedCode = JSON.stringify(activeSchema, null, 2);

  const onChange = (value) => {
    try {
      const updatedSchema = JSON.parse(value);
      setSchemas((prevSchemas) =>
        prevSchemas.map((s) => (s.cubeName === activeTable ? updatedSchema : s))
      );
    } catch (err) {
      console.error("Invalid JSON syntax. Please fix the errors.");
    }
  };

  return (
    <CodeMirror
      value={formattedCode}
      height="100%"
      extensions={[javascript()]}
      theme={theme}
      onChange={(value) => onChange(value)}
    />
  );
};

export default SemanticEditor;
