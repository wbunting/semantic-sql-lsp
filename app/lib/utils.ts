import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Logger } from "monaco-languageclient/tools";
import { useWorkerFactory } from "monaco-editor-wrapper/workerFactory";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const disableButton = (id: string, disabled: boolean) => {
  const button = document.getElementById(id) as HTMLButtonElement | null;
  if (button !== null) {
    button.disabled = disabled;
  }
};

export const configureMonacoWorkers = (logger?: Logger) => {
  // eslint-disable-next-line
  useWorkerFactory({
    workerOverrides: {
      ignoreMapping: true,
      workerLoaders: {
        TextEditorWorker: () =>
          new Worker(
            new URL(
              "monaco-editor/esm/vs/editor/editor.worker.js",
              import.meta.url
            ),
            { type: "module" }
          ),
        TextMateWorker: () =>
          new Worker(
            new URL(
              "@codingame/monaco-vscode-textmate-service-override/worker",
              import.meta.url
            ),
            { type: "module" }
          ),
      },
    },
    logger,
  });
};
