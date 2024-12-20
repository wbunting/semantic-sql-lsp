import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import theme from "~/lib/codemirror-theme";
import {
  languageServer,
  LanguageServerClient,
} from "codemirror-languageserver";
import { WebSocket, Server } from "mock-socket";

const text = `-- Demo of a Semantically aware SQL LSP

-- Known bug: syntax highlighting is off until you edit the text

-- Tip: Try opening the "QuickFix" menu on non-semantic joins
-- it will prompt you to adjust the semantic layer via the UI

-- Do a non-semantic join get a warning
select *
from products
join product_categories on products._id = product_categories.product_id;

-- Do a correct join
select *
from products
join product_categories on products.product_category_id = product_categories.id`;

const mockServerUrl = "ws://localhost:3000";

var ls = languageServer({
  // WebSocket server uri and other client options.
  serverUri: mockServerUrl,
  rootUri: "file:///test.sql",
  documentUri: `file:///test.sql`,
  languageId: "sql",
  workspaceFolders: [],
});

const SQLEditor = () => {
  const [value, setValue] = React.useState(text);

  const onChange = React.useCallback((val, viewUpdate) => {
    console.log("val:", val);
    setValue(val);
  }, []);

  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={[sql(), ls]}
      theme={theme}
      onChange={onChange}
    />
  );
};

export default SQLEditor;
