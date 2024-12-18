import { jsx } from "react/jsx-runtime";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Server } from "mock-socket";
import { MonacoEditorLanguageClientWrapper, didModelContentChange } from "monaco-editor-wrapper";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import "@codingame/monaco-vscode-sql-default-extension";
import { LogLevel } from "vscode/services";
import "clsx";
import { useWorkerFactory } from "monaco-editor-wrapper/workerFactory";
const MonacoEditorReactComp = (props) => {
  const { style, className, wrapperConfig, onTextChanged, onLoad, onError } = props;
  const wrapperRef = useRef(
    new MonacoEditorLanguageClientWrapper()
  );
  const containerRef = useRef(null);
  const [onTextChangedSubscriptions, setOnTextChangedSubscriptions] = useState([]);
  useEffect(() => {
    return () => {
      destroyMonaco();
    };
  }, []);
  useEffect(() => {
    handleReInit();
  }, [wrapperConfig]);
  useEffect(() => {
    handleOnTextChanged();
  }, [onTextChanged]);
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.className = className ?? "";
    }
  }, [className]);
  const handleReInit = useCallback(async () => {
    if (wrapperRef.current.isStopping() === void 0) {
      await destroyMonaco();
    } else {
      await wrapperRef.current.isStopping();
    }
    if (wrapperRef.current.isStarting() === void 0) {
      await initMonaco();
      await startMonaco();
    } else {
      await wrapperRef.current.isStarting();
    }
  }, [wrapperConfig]);
  const initMonaco = useCallback(async () => {
    await wrapperRef.current.init(wrapperConfig);
  }, [wrapperConfig]);
  const startMonaco = useCallback(async () => {
    if (containerRef.current) {
      containerRef.current.className = className ?? "";
      try {
        wrapperRef.current.registerModelUpdate((textModels) => {
          var _a;
          if (textModels.modified !== void 0 || textModels.original !== void 0) {
            const newSubscriptions = [];
            if (textModels.modified !== void 0) {
              newSubscriptions.push(
                textModels.modified.onDidChangeContent(() => {
                  var _a2;
                  didModelContentChange(
                    textModels,
                    (_a2 = wrapperConfig.editorAppConfig) == null ? void 0 : _a2.codeResources,
                    onTextChanged
                  );
                })
              );
            }
            if (textModels.original !== void 0) {
              newSubscriptions.push(
                textModels.original.onDidChangeContent(() => {
                  var _a2;
                  didModelContentChange(
                    textModels,
                    (_a2 = wrapperConfig.editorAppConfig) == null ? void 0 : _a2.codeResources,
                    onTextChanged
                  );
                })
              );
            }
            setOnTextChangedSubscriptions(newSubscriptions);
            didModelContentChange(
              textModels,
              (_a = wrapperConfig.editorAppConfig) == null ? void 0 : _a.codeResources,
              onTextChanged
            );
          }
        });
        await wrapperRef.current.start(containerRef.current);
        onLoad == null ? void 0 : onLoad(wrapperRef.current);
        handleOnTextChanged();
      } catch (e) {
        if (onError) {
          onError(e);
        } else {
          throw e;
        }
      }
    } else {
      throw new Error("No htmlContainer found");
    }
  }, [className, onError, onLoad, onTextChanged]);
  const handleOnTextChanged = useCallback(() => {
    disposeOnTextChanged();
    if (!onTextChanged) return;
  }, [onTextChanged, wrapperConfig]);
  const destroyMonaco = useCallback(async () => {
    try {
      await wrapperRef.current.dispose();
    } catch {
    }
    disposeOnTextChanged();
  }, []);
  const disposeOnTextChanged = useCallback(() => {
    for (const subscription of onTextChangedSubscriptions) {
      subscription.dispose();
    }
    setOnTextChangedSubscriptions([]);
  }, []);
  return /* @__PURE__ */ jsx("div", { ref: containerRef, style, className });
};
const configureMonacoWorkers = (logger) => {
  useWorkerFactory({
    workerOverrides: {
      ignoreMapping: true,
      workerLoaders: {
        TextEditorWorker: () => new Worker(
          new URL(
            "monaco-editor/esm/vs/editor/editor.worker.js",
            import.meta.url
          ),
          { type: "module" }
        ),
        TextMateWorker: () => new Worker(
          new URL(
            "@codingame/monaco-vscode-textmate-service-override/worker",
            import.meta.url
          ),
          { type: "module" }
        )
      }
    },
    logger
  });
};
const cubeSchemas = [
  {
    cubeName: "line_items",
    dimensions: {
      id: { sql: "id", type: "number", primaryKey: true },
      quantity: { sql: "quantity", type: "number" },
      price: { sql: "price", type: "number", format: "currency" },
      createdAt: { sql: "created_at", type: "time" }
    },
    measures: {
      count: { sql: "id", type: "count" },
      totalAmount: { sql: "price", type: "runningTotal", format: "currency" },
      cumulativeTotalRevenue: {
        sql: "price",
        type: "runningTotal",
        format: "currency"
      }
    },
    joins: {
      orders: {
        relationship: "belongsTo",
        sql: "${orders}.id = ${line_items}.order_id"
      }
    }
  },
  {
    cubeName: "orders",
    dimensions: {
      id: { sql: "id", type: "number", primaryKey: true },
      status: { sql: "status", type: "string", description: "Status of order" },
      userId: { sql: "user_id", type: "number", shown: false },
      completedAt: { sql: "completed_at", type: "time" },
      createdAt: { sql: "created_at", type: "time" },
      amount: {
        sql: "${line_items.totalAmount}",
        type: "number",
        format: "currency",
        subQuery: true,
        shown: false
      },
      amountTier: {
        type: "string",
        case: {
          when: [
            { sql: "${amount} < 100 OR ${amount} is NULL", label: "$0 - $100" },
            {
              sql: "${amount} >= 100 AND ${amount} < 200",
              label: "$100 - $200"
            },
            { sql: "${amount} >= 200", label: "$200 +" }
          ],
          else: { label: "Unknown" }
        }
      }
    },
    measures: {
      count: { type: "count" },
      totalAmount: { sql: "${amount}", type: "sum", format: "currency" }
    },
    joins: {
      products: {
        relationship: "belongsTo",
        sql: "${orders}.product_id = ${products}.id"
      },
      lineItems: {
        relationship: "hasMany",
        sql: "${orders}.id = ${lineItems}.order_id"
      }
    },
    segments: {
      completed: { sql: "status = 'completed'" },
      processing: { sql: "status = 'processing'" },
      shipped: { sql: "status = 'shipped'" }
    }
  },
  {
    cubeName: "product_categories",
    dimensions: {
      id: { sql: "id", type: "number", primaryKey: true },
      name: { sql: "${TABLE}.name", type: "string" }
    },
    measures: {},
    joins: {
      products: {
        relationship: "hasMany",
        sql: "${products}.product_category_id = ${product_categories}.id"
      }
    }
  },
  {
    cubeName: "products",
    dimensions: {
      id: { sql: "id", type: "number", primaryKey: true },
      name: { sql: "name", type: "string" }
    },
    measures: {
      count: { sql: "count(*)", type: "number" }
    },
    joins: {
      product_categories: {
        relationship: "belongsTo",
        sql: "${products}.product_category_id = ${product_categories}.id"
      }
    }
  }
];
const cubeMetadata = parseCubeSchemas(cubeSchemas);
const handleMessage = (message, fileContents) => {
  var _a;
  const request = JSON.parse(message);
  console.log("Server received:", request);
  if (request.method === "textDocument/didOpen") {
    const { textDocument } = request.params;
    fileContents[textDocument.uri] = textDocument.text;
    console.log(`File opened: ${textDocument.uri}`);
    const diagnostics = analyzeCubeSql(textDocument.text, cubeMetadata);
    const response = JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/publishDiagnostics",
      params: {
        uri: textDocument.uri,
        diagnostics
      }
    });
    return response;
  }
  if (request.method === "textDocument/didChange") {
    const { textDocument, contentChanges } = request.params;
    const newText = (_a = contentChanges[0]) == null ? void 0 : _a.text;
    if (newText) {
      fileContents[textDocument.uri] = newText;
      const diagnostics = analyzeCubeSql(newText, cubeMetadata);
      const response = JSON.stringify({
        jsonrpc: "2.0",
        method: "textDocument/publishDiagnostics",
        params: {
          uri: textDocument.uri,
          diagnostics
        }
      });
      return response;
    }
  }
  if (request.method === "textDocument/completion") {
    const completions = generateCubeCompletions(cubeMetadata);
    const response = JSON.stringify({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        items: completions,
        isIncomplete: false
      }
    });
    return response;
  }
  if (request.method === "textDocument/hover") {
    const { position, textDocument } = request.params;
    const content = fileContents[textDocument.uri] || "";
    const lines = content.split("\n");
    const hoveredLine = lines[position.line] || "";
    const hoveredWord = getWordAtPosition(hoveredLine, position.character);
    console.log(`Hovered word: ${hoveredWord}`);
    const hoverContent = generateCubeHoverContent(hoveredWord, cubeMetadata);
    const response = JSON.stringify({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        contents: hoverContent
      }
    });
    return response;
  }
  if (request.method === "initialize") {
    const response = JSON.stringify({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        capabilities: {
          textDocumentSync: 1,
          completionProvider: { resolveProvider: true },
          hoverProvider: true
        }
      }
    });
    return response;
  }
  throw new Error(`unhandled method ${request.method}`);
};
function parseCubeSchemas(cubeSchemas2) {
  const metadata = {};
  cubeSchemas2.forEach((cube) => {
    metadata[cube.cubeName] = {
      dimensions: cube.dimensions,
      measures: cube.measures,
      joins: cube.joins,
      segments: cube.segments
    };
  });
  return metadata;
}
function generateCubeCompletions(metadata) {
  const completions = [];
  Object.entries(metadata).forEach(([cubeName, details]) => {
    completions.push({
      label: cubeName,
      kind: 6,
      // CompletionItemKind.Function (cube name)
      detail: "Cube"
    });
    Object.keys(details.dimensions).forEach((dim) => {
      completions.push({
        label: dim,
        kind: 5,
        // CompletionItemKind.Field
        detail: `Dimension of ${cubeName}`
      });
    });
    Object.keys(details.measures).forEach((measure) => {
      completions.push({
        label: measure,
        kind: 6,
        // CompletionItemKind.Function
        detail: `Measure of ${cubeName}`
      });
    });
    Object.keys(details.joins).forEach((join) => {
      completions.push({
        label: join,
        kind: 9,
        // CompletionItemKind.Module
        detail: `Join for ${cubeName}`
      });
    });
    Object.keys(details.segments || {}).forEach((segment) => {
      completions.push({
        label: segment,
        kind: 14,
        // CompletionItemKind.Property
        detail: `Segment of ${cubeName}`
      });
    });
  });
  return completions;
}
function generateCubeHoverContent(word, metadata) {
  for (const [cubeName, details] of Object.entries(metadata)) {
    if (word === cubeName) {
      return `**Cube: ${cubeName}**

` + Object.entries(details.dimensions).map(([key, value]) => `- Dimension: ${key} (${value.type})`).join("\n") + "\n" + Object.entries(details.measures).map(([key, value]) => `- Measure: ${key} (${value.type})`).join("\n");
    }
    if (details.dimensions[word]) {
      return `**Dimension: ${word}**

Type: ${details.dimensions[word].type}`;
    }
    if (details.measures[word]) {
      return `**Measure: ${word}**

Type: ${details.measures[word].type}`;
    }
  }
  return "No information available";
}
function analyzeCubeSql(sql, metadata) {
  const diagnostics = [];
  const lines = sql.split("\n");
  const knownTables = Object.keys(metadata);
  const joinRegex = /\bJOIN\b\s+([a-zA-Z_][a-zA-Z0-9_]+)/i;
  const fromRegex = /\bFROM\b\s+([a-zA-Z_][a-zA-Z0-9_]+)/i;
  const joinConditionRegex = /ON\s+(.*)/i;
  lines.forEach((line, lineIndex) => {
    const fromMatch = fromRegex.exec(line);
    if (fromMatch) {
      const tableName = fromMatch[1];
      if (!knownTables.includes(tableName)) {
        diagnostics.push({
          range: {
            start: { line: lineIndex, character: fromMatch.index },
            end: {
              line: lineIndex,
              character: fromMatch.index + tableName.length
            }
          },
          severity: 1,
          // 1 = Error
          message: `Unknown table: '${tableName}'`,
          source: "mock-sql-lsp"
        });
      }
    }
    const joinMatch = joinRegex.exec(line);
    if (joinMatch) {
      const tableName = joinMatch[1];
      if (!knownTables.includes(tableName)) {
        diagnostics.push({
          range: {
            start: { line: lineIndex, character: joinMatch.index },
            end: {
              line: lineIndex,
              character: joinMatch.index + tableName.length
            }
          },
          severity: 1,
          // 1 = Error
          message: `Unknown table: '${tableName}'`,
          source: "mock-sql-lsp"
        });
      }
    }
    if (joinMatch) {
      const tableName = joinMatch[1];
      const conditionMatch = joinConditionRegex.exec(line);
      if (conditionMatch && metadata[tableName]) {
        const condition = conditionMatch[1];
        const expectedJoins = Object.entries(metadata).flatMap(
          ([cubeName, details]) => Object.entries(details.joins || {}).filter(([joinName]) => joinName === tableName).map(([joinName, joinDetails]) => ({
            table: cubeName,
            condition: joinDetails.sql
          }))
        );
        if (!expectedJoins.some((join) => condition.includes(join.condition))) {
          diagnostics.push({
            range: {
              start: { line: lineIndex, character: conditionMatch.index },
              end: {
                line: lineIndex,
                character: conditionMatch.index + condition.length
              }
            },
            severity: 2,
            // 2 = Warning
            message: `Join condition does not match the specified relationship for '${tableName}'.`,
            source: "mock-sql-lsp"
          });
        }
      }
    }
  });
  return diagnostics;
}
function getWordAtPosition(line, character) {
  const wordRegex = /[a-zA-Z0-9._]+/g;
  let match;
  while ((match = wordRegex.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (character >= start && character <= end) {
      return match[0];
    }
  }
  return "";
}
const text = `-- Demo of a Semanticaly aware SQL LSP

-- Do a bad join get a warning
select *
from products
join product_categories on products._id = product_categories.product_id;

-- Do a correct join
select *
from products
join product_categories on products.product_category_id = product_categories.id`;
let mockServerInstance = null;
const mockServerUrl = "ws://localhost:30000";
const buildSQLClientUserConfig = () => {
  return {
    $type: "extended",
    logLevel: LogLevel.Debug,
    vscodeApiConfig: {
      serviceOverrides: {
        ...getKeybindingsServiceOverride()
      },
      userConfiguration: {
        json: JSON.stringify({
          // "workbench.colorTheme": "Default Dark Modern",
          "workbench.colorTheme": "GitHub Dark High Contrast",
          "editor.guides.bracketPairsHorizontal": "active",
          "editor.lightbulb.enabled": "On",
          "editor.wordBasedSuggestions": "off",
          "editor.experimental.asyncTokenization": true,
          "editor.fontSize": 16,
          "editor.minimap.enabled": false,
          "editor.lineNumbersMinChars": 0,
          "editor.scrollBeyondLastLine": false,
          "editor.acceptSuggestionOnCommitCharacter": false,
          "editor.formatOnType": true,
          "editor.automaticLayout": true,
          "editor.theme": "vs-dark"
        })
      }
    },
    editorAppConfig: {
      codeResources: {
        modified: {
          text,
          fileExt: "sql"
        }
      },
      monacoWorkerFactory: configureMonacoWorkers
    },
    languageClientConfigs: {
      sql: {
        clientOptions: {
          documentSelector: ["sql"]
        },
        connection: {
          options: {
            $type: "WebSocketUrl",
            url: mockServerUrl,
            startOptions: {
              onCall: () => {
                console.log("Connected to socket.");
              },
              reportStatus: true
            },
            stopOptions: {
              onCall: () => {
                console.log("Disconnected from socket.");
              },
              reportStatus: true
            }
          }
        }
      }
    }
  };
};
const MonacoEditor = () => {
  React.useEffect(() => {
    if (!mockServerInstance) {
      createMockServer(mockServerUrl);
    }
  }, []);
  return /* @__PURE__ */ jsx(
    MonacoEditorReactComp,
    {
      wrapperConfig: buildSQLClientUserConfig(),
      className: "w-[50vw] h-[calc(100vh-64px)]"
    }
  );
};
function createMockServer(url) {
  if (!mockServerInstance) {
    mockServerInstance = new Server(url);
    const fileContents = {};
    mockServerInstance.on("connection", (socket) => {
      console.log("Mock WebSocket server: connection established");
      socket.on("message", (message) => {
        const response = handleMessage(message, fileContents);
        if (response) {
          socket.send(response);
        }
      });
    });
    console.log("Mock WebSocket server running:", url);
  } else {
    console.log("Mock server already running.");
  }
}
export {
  buildSQLClientUserConfig,
  MonacoEditor as default
};
