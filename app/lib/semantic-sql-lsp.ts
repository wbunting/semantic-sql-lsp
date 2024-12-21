import _ from "lodash";
import { execa } from "execa";

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

export const handleMessage = async (
  message: string,
  fileContents: Record<string, string>,
  cubeMetadata: CubeMetadata
): Promise<string | null> => {
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
    const diagnostics = await analyzeCubeSql(textDocument.text, cubeMetadata);

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
      const diagnostics = await analyzeCubeSql(newText, cubeMetadata);

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

async function parseSql(sql: string): Promise<any[]> {
  try {
    const { stdout } = await execa("./parse_sql.py", [], {
      input: sql,
    });
    const result = JSON.parse(stdout);
    return result;
  } catch (error: any) {
    console.error("Error calling parse_sql.py:", error.message);
    return [];
  }
}

async function analyzeCubeSql(sql: string, metadata: any): Promise<any[]> {
  const parseTrees = await parseSql(sql);
  console.log("parseTrees", JSON.stringify(parseTrees, null, 2));
  return analyzeCubeSqlFromParseTree(parseTrees, metadata, sql);
}

function analyzeCubeSqlFromParseTree(
  parseTrees: any[],
  metadata: CubeMetadata,
  sql: string
): any[] {
  const diagnostics: any[] = [];
  const knownTables = Object.keys(metadata);
  const assignedPositions = new Set<number>();

  for (const tree of parseTrees) {
    const { fromTables, joins } = findAllTablesAndJoins(tree);

    // Check FROM tables
    for (const from of fromTables) {
      if (!knownTables.includes(from.name)) {
        const range = findTextRangeForName(sql, from.name, assignedPositions);
        diagnostics.push({
          range,
          severity: 1,
          message: `Unknown table: '${from.name}'`,
          source: "mock-sql-lsp",
        });
      }
    }

    console.log("joins", JSON.stringify(joins, null, 2));
    for (const joinInfo of joins) {
      const { name: table, on } = joinInfo;

      if (!knownTables.includes(table)) {
        const range = findTextRangeForName(sql, table, assignedPositions);
        diagnostics.push({
          range,
          severity: 1,
          message: `Unknown table: '${table}'`,
          source: "mock-sql-lsp",
        });
      } else {
        if (on?.class === "EQ" && on?.args?.this && on?.args?.expression) {
          const leftColumn = `${on.args.this.args.table.args.this}.${on.args.this.args.this.args.this}`;
          const rightColumn = `${on.args.expression.args.table.args.this}.${on.args.expression.args.this.args.this}`;
          const joinCondition = `${leftColumn} = ${rightColumn}`;

          const expectedJoins = getExpectedJoinsForTable(table, metadata);
          console.log("expectedJoins", expectedJoins);

          if (
            expectedJoins.length > 0 &&
            !expectedJoins.includes(joinCondition)
          ) {
            const range = findTextRangeForName(sql, table, assignedPositions);
            diagnostics.push({
              range,
              severity: 2,
              message: `Join condition does not match the specified relationship for '${table}'.`,
              source: "mock-sql-lsp",
              data: {
                actionType: "triggerReactUI",
                tableName: table,
              },
            });
          }
        } else {
          const range = findTextRangeForName(sql, table, assignedPositions);
          diagnostics.push({
            range,
            severity: 2,
            message: `Invalid or missing join condition for '${table}'.`,
            source: "mock-sql-lsp",
          });
        }
      }
    }
  }

  return diagnostics;
}

function getExpectedJoinsForTable(
  tableName: string,
  metadata: CubeMetadata
): string[] {
  // This replicates the original logic: look for cube definitions that have a join on `tableName`
  const expectedJoins: string[] = [];
  for (const [cubeName, details] of Object.entries(metadata)) {
    for (const [joinName, joinDetails] of Object.entries(details.joins || {})) {
      if (joinName === tableName) {
        const resolved = resolveSqlTemplate(joinDetails.sql);
        expectedJoins.push(normalizeSql(resolved));
      }
    }
  }
  return expectedJoins;
}

function findAllTablesAndJoins(tree: any) {
  const fromTables: { name: string; node: any }[] = [];
  const joins: { name: string; node: any; on: any }[] = [];

  // Extract FROM table node
  const fromNode = tree?.args?.from?.args?.this;
  if (
    fromNode &&
    fromNode.class === "Table" &&
    fromNode.args?.this?.class === "Identifier"
  ) {
    const tableNode = fromNode.args.this; // Identifier node for the table name
    fromTables.push({
      name: tableNode.args.this,
      node: tableNode,
    });
  }

  // Extract JOIN tables
  if (Array.isArray(tree?.args?.joins)) {
    for (const join of tree.args.joins) {
      const joinTableNode = join?.args?.this;
      if (
        joinTableNode &&
        joinTableNode.class === "Table" &&
        joinTableNode.args?.this?.class === "Identifier"
      ) {
        const tableNode = joinTableNode.args.this;
        joins.push({
          name: tableNode.args.this,
          node: tableNode,
          on: join.args.on,
        });
      }
    }
  }

  return { fromTables, joins };
}

// Convert an expression node into a simple SQL string.
// This is a simplified approach focusing on EQ, Identifier, Column, Literal.
function expressionToSqlString(node: any): string {
  // Handle various node types
  switch (node.class) {
    case "EQ": {
      const left = expressionToSqlString(node.args.this);
      const right = expressionToSqlString(node.args.expression);
      return `${left} = ${right}`;
    }
    case "Column": {
      // Column nodes have node.args.this as an Identifier
      if (node.args.this?.class === "Identifier") {
        return node.args.this.args.this;
      }
      return "column";
    }
    case "Identifier":
      return node.args.this;
    case "Literal":
      return node.args.this;
    // Add cases for other node types as needed
    default:
      // If we don't recognize the node type, return a generic string.
      // You may want to expand this if you have more complex join conditions.
      return node.class;
  }
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().replace(/;$/, "");
}

function resolveSqlTemplate(template: string): string {
  return template.replace(
    /\$\{([a-zA-Z_][a-zA-Z0-9_]+)\}/g,
    (match, group) => group
  );
}

function findTextRangeForName(
  sql: string,
  name: string,
  assignedPositions: Set<number>
): {
  start: { line: number; character: number };
  end: { line: number; character: number };
} {
  let startPos = sql.indexOf(name);
  while (startPos !== -1 && assignedPositions.has(startPos)) {
    startPos = sql.indexOf(name, startPos + 1);
  }

  if (startPos === -1) {
    // If not found, fallback to dummy position
    return {
      start: { line: 0, character: 0 },
      end: { line: 0, character: name.length },
    };
  }

  assignedPositions.add(startPos);

  // Convert startPos to (line, column)
  const beforeText = sql.slice(0, startPos);
  const line = beforeText.split("\n").length - 1; // zero-based line index
  const lastLineIndex = beforeText.lastIndexOf("\n");
  const character = startPos - (lastLineIndex + 1);

  return {
    start: { line, character },
    end: { line, character: character + name.length },
  };
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
