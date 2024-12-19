import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";

const theme = createTheme({
  theme: "light",
  settings: {
    background: "hsl(var(--background))", // Editor background
    foreground: "rgb(var(--gray-900))", // Default text color
    caret: "rgb(var(--gray-700))", // Cursor color
    selection: "rgb(var(--gray-300))", // Selection background
    selectionMatch: "rgb(var(--gray-300))", // Matching selection background
    lineHighlight: "rgba(0, 0, 0, 0.05)", // Current line background
    gutterBackground: "hsl(var(--background))", // Gutter background
    gutterForeground: "rgb(var(--gray-400))", // Gutter text color
  },
  styles: [
    { tag: t.comment, color: "rgb(var(--gray-400))", fontStyle: "italic" },
    { tag: [t.keyword, t.operator], color: "rgb(var(--pink-700))" },
    { tag: t.variableName, color: "rgb(var(--amber-700))" },
    { tag: [t.string, t.special(t.brace)], color: "rgb(var(--green-700))" },
    { tag: t.number, color: "rgb(var(--blue-700))" },
    { tag: [t.bool, t.null], color: "rgb(var(--blue-700))" },
    { tag: t.function(t.variableName), color: "rgb(var(--purple-700))" },
    {
      tag: [t.className, t.definition(t.typeName)],
      color: "rgb(var(--blue-700))",
    },
    { tag: t.attributeName, color: "rgb(var(--purple-700))" },
    { tag: [t.tagName, t.typeName], color: "rgb(var(--green-700))" },
    { tag: t.url, color: "rgb(var(--green-700))" },
    { tag: t.propertyName, color: "rgb(var(--blue-700))" },
    // { tag: t.constant, color: "rgb(var(--blue-700))" },
    { tag: t.deleted, color: "rgb(var(--blue-700))" },
    { tag: t.inserted, color: "rgb(var(--green-700))" },
    // { tag: t.italic, fontStyle: "italic" },
    // { tag: t.bold, fontWeight: "bold" },
    { tag: t.meta, color: "rgb(var(--gray-900))" },
  ],
});

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
