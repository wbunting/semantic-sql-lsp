import React from "react";
import { Server } from "mock-socket";
import { MonacoEditorReactComp } from "~/components/wrapper-react";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import "@codingame/monaco-vscode-sql-default-extension";
import { LogLevel } from "vscode/services";
import { WrapperConfig } from "monaco-editor-wrapper";
import { configureMonacoWorkers } from "~/lib/utils";
import { handleMessage } from "~/lib/semantic-sql-lsp";

const text = `-- Demo of a Semanticaly aware SQL LSP

-- Do a bad join get a warning
select *
from products
join product_categories on products._id = product_categories.product_id;

-- Do a correct join
select *
from products
join product_categories on products.product_category_id = product_categories.id`;

let mockServerInstance: Server | null = null;
const mockServerUrl = "ws://localhost:30000";

export const buildSQLClientUserConfig = (): WrapperConfig => {
  return {
    $type: "extended",
    logLevel: LogLevel.Debug,
    vscodeApiConfig: {
      serviceOverrides: {
        ...getKeybindingsServiceOverride(),
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
          "editor.theme": "vs-dark",
        }),
      },
    },
    editorAppConfig: {
      codeResources: {
        modified: {
          text,
          fileExt: "sql",
        },
      },
      monacoWorkerFactory: configureMonacoWorkers,
    },
    languageClientConfigs: {
      sql: {
        clientOptions: {
          documentSelector: ["sql"],
        },
        connection: {
          options: {
            $type: "WebSocketUrl",
            url: mockServerUrl,
            startOptions: {
              onCall: () => {
                console.log("Connected to socket.");
              },
              reportStatus: true,
            },
            stopOptions: {
              onCall: () => {
                console.log("Disconnected from socket.");
              },
              reportStatus: true,
            },
          },
        },
      },
    },
  };
};

const MonacoEditor = () => {
  React.useEffect(() => {
    if (!mockServerInstance) {
      createMockServer(mockServerUrl);
    }
  }, []);

  return (
    <MonacoEditorReactComp
      wrapperConfig={buildSQLClientUserConfig()}
      className="w-[50vw] h-[calc(100vh-64px)]"
    />
  );
};

function createMockServer(url: string) {
  if (!mockServerInstance) {
    mockServerInstance = new Server(url);

    const fileContents: Record<string, string> = {};

    mockServerInstance.on("connection", (socket) => {
      console.log("Mock WebSocket server: connection established");

      socket.on("message", (message) => {
        const response = handleMessage(message as string, fileContents);
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

export default MonacoEditor;
