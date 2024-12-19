import { describe, it, expect } from "vitest";
import { handleMessage } from "./semantic-sql-lsp";
import { cubeSchemas } from "./test-schemas";
import { parseCubeSchemas } from "./utils";

describe("SQL LSP Tests", () => {
  const cubeMetadata = parseCubeSchemas(cubeSchemas);

  it("should initialize with the correct capabilities", () => {
    const message = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });

    const response = handleMessage(message, {}, cubeMetadata);
    if (response) {
      const parsedResponse = JSON.parse(response);

      expect(parsedResponse.result.capabilities).toMatchObject({
        textDocumentSync: 1,
        completionProvider: { resolveProvider: true },
        hoverProvider: true,
        codeActionProvider: true,
      });
    } else {
      throw new Error("Response is null");
    }
  });

  it("should generate diagnostics for bad joins", () => {
    const fileContents = {};
    const sql = `
    select *
    from products
    join product_categories on products._id = product_categories.product_id;
  `;

    const message = JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: { uri: "test.sql", text: sql },
      },
    });

    const response = handleMessage(message, fileContents, cubeMetadata);
    if (response) {
      const parsedResponse = JSON.parse(response);

      expect(parsedResponse.method).toBe("textDocument/publishDiagnostics");
      expect(parsedResponse.params.diagnostics).toHaveLength(1);
      expect(parsedResponse.params.diagnostics[0].message).toContain(
        "Join condition does not match the specified relationship"
      );
    } else {
      throw new Error("Response is null");
    }
  });

  it("should not generate diagnostics for correct joins", () => {
    const fileContents = {};
    const sql = `
      select *
      from products
      join product_categories on products.product_category_id = product_categories.id;
    `;

    const message = JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: { uri: "test.sql", text: sql },
      },
    });

    const response = handleMessage(message, fileContents, cubeMetadata);
    if (response) {
      const parsedResponse = JSON.parse(response);

      expect(parsedResponse.method).toBe("textDocument/publishDiagnostics");
      expect(parsedResponse.params.diagnostics).toHaveLength(0);
    } else {
      throw new Error("Response is null");
    }
  });

  it("should provide hover content for known tables", () => {
    const fileContents = {
      "test.sql": "select * from products;",
    };

    const message = JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "textDocument/hover",
      params: {
        textDocument: { uri: "test.sql" },
        position: { line: 0, character: 14 },
      },
    });

    const response = handleMessage(message, fileContents, cubeMetadata);
    if (response) {
      const parsedResponse = JSON.parse(response);

      expect(parsedResponse.result.contents).toContain("**Cube: products**");
    } else {
      throw new Error("Response is null");
    }
  });

  it("should provide completions for cube metadata", () => {
    const message = JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "textDocument/completion",
      params: {},
    });

    const response = handleMessage(message, {}, cubeMetadata);
    if (response) {
      const parsedResponse = JSON.parse(response);

      expect(parsedResponse.result.items).toContainEqual(
        expect.objectContaining({ label: "products", detail: "Cube" })
      );
    } else {
      throw new Error("Response is null");
    }
  });
});
