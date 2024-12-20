import React from "react";
import { MonacoEditorReactComp } from "~/components/wrapper-react";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import "@codingame/monaco-vscode-sql-default-extension";
import * as vscode from "vscode";
import { LogLevel } from "vscode/services";
import { WrapperConfig } from "monaco-editor-wrapper";
import { configureMonacoWorkers } from "~/lib/monaco-utils";

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

export const buildSQLClientUserConfig = (handleOpenQuickFix): WrapperConfig => {
  return {
    $type: "extended",
    logLevel: LogLevel.Debug,
    vscodeApiConfig: {
      serviceOverrides: {
        ...getKeybindingsServiceOverride(),
      },
      userConfiguration: {
        json: JSON.stringify({
          "workbench.colorTheme": "Default Dark Modern",
          "editor.guides.bracketPairsHorizontal": "active",
          "editor.lightbulb.enabled": "On",
          "editor.wordBasedSuggestions": "off",
          "editor.experimental.asyncTokenization": true,
          "editor.fontSize": 12,
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
            url: `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
              window.location.hostname
            }:${window.location.port}`,
            startOptions: {
              onCall: () => {
                console.log("Connected to socket.");
                setTimeout(() => {
                  vscode.commands.registerCommand(
                    "mock-sql-lsp.triggerReactUI",
                    (...args: unknown[]) => {
                      handleOpenQuickFix();
                    }
                  );
                }, 250);
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

const MonacoEditor = React.memo(({ handleOpenQuickFix }) => {
  return (
    <MonacoEditorReactComp
      wrapperConfig={buildSQLClientUserConfig(handleOpenQuickFix)}
      className="h-[calc(100vh-64px)] w-[700px]"
    />
  );
});

export default MonacoEditor;
