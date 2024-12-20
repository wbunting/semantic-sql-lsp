import _ from "lodash";

type CubeMetadata = {
  [cubeName: string]: {
    dimensions: {
      [dimensionName: string]: {
        type: string;
      };
    };
    measures: {
      [measureName: string]: {
        type: string;
      };
    };
    joins: {
      [joinName: string]: {
        sql: string;
      };
    };
    segments?: {
      [segmentName: string]: any;
    };
  };
};

type LspRequest = {
  jsonrpc: string;
  id?: number | string; // Notifications don't have an ID
  method: string;
  params?: any; // Adjust this to stricter types if needed
};

export const handleMessage = (
  message: string,
  fileContents: Record<string, string>,
  cubeMetadata: CubeMetadata
): string | null => {
  const request: LspRequest = JSON.parse(message);
  console.log("Server received:", request);

  if (request.method === "initialize") {
    const response = JSON.stringify({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        capabilities: {
          textDocumentSync: 1,
          completionProvider: { resolveProvider: true },
          hoverProvider: true,
          codeActionProvider: true, // Advertise codeAction capability here
        },
      },
    });
    return response;
  }

  if (request.method === "initialized") {
    console.log("LSP initialized.");
    return null; // Notifications don't expect a response
  }

  if (request.method === "$/cancelRequest") {
    const { id } = request.params;
    console.log(`Request cancellation received for id: ${id}`);
    // Optionally: Implement cancellation logic here if you support request cancellation
    return null; // No response is needed for notifications
  }

  if (request.method === "$/setTrace") {
    const { value } = request.params;
    console.log(`Set trace level to: ${value}`);
    // Optionally: Implement trace level adjustments here
    return null; // No response is needed for notifications
  }

  if (request.method === "textDocument/didOpen") {
    const { textDocument } = request.params;
    fileContents[textDocument.uri] = textDocument.text;
    console.log(`File opened: ${textDocument.uri}`);

    // Analyze content for errors
    const diagnostics = analyzeCubeSql(textDocument.text, cubeMetadata);

    // Send diagnostics
    const response = JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/publishDiagnostics",
      params: {
        uri: textDocument.uri,
        diagnostics: diagnostics,
      },
    });
    return response;
  }

  if (request.method === "textDocument/didChange") {
    const { textDocument, contentChanges } = request.params;
    const newText = contentChanges[0]?.text;

    if (newText) {
      fileContents[textDocument.uri] = newText;

      // Analyze content for errors
      const diagnostics = analyzeCubeSql(newText, cubeMetadata);

      // Send diagnostics
      const response = JSON.stringify({
        jsonrpc: "2.0",
        method: "textDocument/publishDiagnostics",
        params: {
          uri: textDocument.uri,
          diagnostics: diagnostics,
        },
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
        isIncomplete: false,
      },
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
        contents: hoverContent,
      },
    });
    return response;
  }

  if (request.method === "textDocument/codeAction") {
    const { range, context } = request.params;

    // Find the diagnostic in the context
    const diagnostic = context.diagnostics.find((diag: any) =>
      _.isEqual(diag.range, range)
    );
    if (
      diagnostic &&
      diagnostic.data &&
      diagnostic.data.actionType === "triggerReactUI"
    ) {
      const response = JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        result: [
          {
            title: `Edit Semantics for ${diagnostic.data.tableName}`,
            kind: "quickfix",
            command: {
              title: "Trigger React UI",
              command: "mock-sql-lsp.triggerReactUI",
              arguments: [diagnostic.data.tableName],
            },
          },
        ],
      });
      return response;
    }
    return null;
  }

  if (request.method === "initialize") {
    const response = JSON.stringify({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        capabilities: {
          textDocumentSync: 1,
          completionProvider: { resolveProvider: true },
          hoverProvider: true,
        },
      },
    });
    return response;
  }

  throw new Error(`unhandled method ${request.method}`);
};

function generateCubeCompletions(metadata: CubeMetadata): any[] {
  const completions: any[] = [];

  Object.entries(metadata).forEach(([cubeName, details]) => {
    completions.push({
      label: cubeName,
      kind: 6, // CompletionItemKind.Function (cube name)
      detail: "Cube",
    });

    Object.keys(details.dimensions).forEach((dim) => {
      completions.push({
        label: dim,
        kind: 5, // CompletionItemKind.Field
        detail: `Dimension of ${cubeName}`,
      });
    });

    Object.keys(details.measures).forEach((measure) => {
      completions.push({
        label: measure,
        kind: 6, // CompletionItemKind.Function
        detail: `Measure of ${cubeName}`,
      });
    });

    Object.keys(details.joins).forEach((join) => {
      completions.push({
        label: join,
        kind: 9, // CompletionItemKind.Module
        detail: `Join for ${cubeName}`,
      });
    });

    Object.keys(details.segments || {}).forEach((segment) => {
      completions.push({
        label: segment,
        kind: 14, // CompletionItemKind.Property
        detail: `Segment of ${cubeName}`,
      });
    });
  });

  return completions;
}

function generateCubeHoverContent(word: string, metadata: any): string {
  for (const [cubeName, details] of Object.entries(metadata)) {
    const cubeDetails = details as CubeMetadata[string];
    if (word === cubeName) {
      return (
        `**Cube: ${cubeName}**\n\n` +
        Object.entries(cubeDetails.dimensions)
          .map(([key, value]) => `- Dimension: ${key} (${value.type})`)
          .join("\n") +
        "\n" +
        Object.entries(cubeDetails.measures)
          .map(([key, value]) => `- Measure: ${key} (${value.type})`)
          .join("\n")
      );
    }
    if (cubeDetails.dimensions[word]) {
      return `**Dimension: ${word}**\n\nType: ${cubeDetails.dimensions[word].type}`;
    }
    if (cubeDetails.measures[word]) {
      return `**Measure: ${word}**\n\nType: ${cubeDetails.measures[word].type}`;
    }
  }
  return "No information available";
}

function analyzeCubeSql(sql: string, metadata: any): any[] {
  const diagnostics: any[] = [];
  const lines = sql.split("\n");

  const knownTables = Object.keys(metadata);
  const joinRegex = /\bJOIN\b\s+([a-zA-Z_][a-zA-Z0-9_]+)/i;
  const fromRegex = /\bFROM\b\s+([a-zA-Z_][a-zA-Z0-9_]+)/i;
  const joinConditionRegex = /ON\s+(.*)/i;

  const normalizeSql = (sql: string): string =>
    sql.replace(/\s+/g, " ").trim().replace(/;$/, "");
  const resolveSqlTemplate = (template: string): string =>
    template.replace(
      /\$\{([a-zA-Z_][a-zA-Z0-9_]+)\}/g,
      (match, group) => group
    );

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // Skip comments
    if (
      trimmedLine.startsWith("--") ||
      trimmedLine.startsWith("#") ||
      trimmedLine.startsWith("/*")
    ) {
      return;
    }

    // Check for unknown tables in FROM clauses
    const fromMatch = fromRegex.exec(trimmedLine);
    if (fromMatch) {
      const tableName = fromMatch[1];
      if (!knownTables.includes(tableName)) {
        diagnostics.push({
          range: {
            start: { line: lineIndex, character: fromMatch.index },
            end: {
              line: lineIndex,
              character: fromMatch.index + tableName.length,
            },
          },
          severity: 1,
          message: `Unknown table: '${tableName}'`,
          source: "mock-sql-lsp",
        });
      }
    }

    // Check for unknown tables in JOIN clauses
    const joinMatch = joinRegex.exec(trimmedLine);
    if (joinMatch) {
      const tableName = joinMatch[1];
      if (!knownTables.includes(tableName)) {
        diagnostics.push({
          range: {
            start: { line: lineIndex, character: joinMatch.index },
            end: {
              line: lineIndex,
              character: joinMatch.index + tableName.length,
            },
          },
          severity: 1,
          message: `Unknown table: '${tableName}'`,
          source: "mock-sql-lsp",
        });
      }
    }

    // Validate join conditions
    if (joinMatch && knownTables.includes(joinMatch[1])) {
      const tableName = joinMatch[1];
      const conditionMatch = joinConditionRegex.exec(trimmedLine);

      if (conditionMatch && metadata[tableName]) {
        const condition = normalizeSql(conditionMatch[1]);
        const expectedJoins = Object.entries(metadata).flatMap(
          ([cubeName, details]) =>
            Object.entries(
              (details as CubeMetadata[string]).joins || {}
            ).flatMap(([joinName, joinDetails]) =>
              joinName === tableName ? resolveSqlTemplate(joinDetails.sql) : []
            )
        );

        if (!expectedJoins.includes(condition)) {
          diagnostics.push({
            range: {
              start: { line: lineIndex, character: conditionMatch.index + 3 },
              end: {
                line: lineIndex,
                character: conditionMatch.index + condition.length + 3,
              },
            },
            severity: 2,
            message: `Join condition does not match the specified relationship for '${tableName}'.`,
            source: "mock-sql-lsp",
            data: {
              actionType: "triggerReactUI",
              tableName: tableName,
            },
          });
        }
      }
    }
  });

  return diagnostics;
}

function getWordAtPosition(line: string, character: number): string {
  const wordRegex = /[a-zA-Z0-9._]+/g;
  let match;

  while ((match = wordRegex.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (character >= start && character <= end) {
      return match[0];
    }
  }

  return ""; // Return empty string if no match
}
