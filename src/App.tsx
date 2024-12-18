import { Suspense, lazy } from "react";
const EditorWrapper = lazy(() => import("~/components/monaco-editor-wrapped"));

export function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`antialiased dark dark:bg-black`}>
        <div className="font-sans">
          <div className="">
            <section className="overflow-hidden border bg-background shadow">
              <div className="h-full flex flex-col items-start min-h-screen">
                <div className="container flex flex-col items-start justify-between space-y-2 py-4 h-16 w-full px-10">
                  <h2 className="text-lg font-semibold">
                    Semantic SQL LSP Playground
                  </h2>
                  <div className="ml-auto flex w-full space-x-2 sm:justify-end">
                    <div className="hidden space-x-2 md:flex"></div>
                  </div>
                </div>
                <main className="flex w-full">
                  <Suspense fallback={<div>Loading Editor...</div>}>
                    <EditorWrapper />
                  </Suspense>
                </main>
              </div>
            </section>
          </div>
        </div>
      </body>
    </html>
  );
}

export default App;
