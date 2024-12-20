import type { Route } from "./+types/home";

import { GalleryVerticalEnd } from "lucide-react";
import React, { Suspense, lazy } from "react";
import { Server } from "mock-socket";
import { Badge } from "~/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  SidebarProvider,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "~/components/ui/sidebar";
import { handleMessage } from "~/lib/semantic-sql-lsp";
import { cubeSchemas } from "~/lib/test-schemas";
import { parseCubeSchemas } from "~/lib/lsp-utils";

const EditorWrapper = lazy(() => import("~/components/monaco-editor-wrapped"));
// const SQLEditor = lazy(() => import("~/components/codemirror-editor"));

const SemanticEditor = lazy(() => import("~/components/semantic-editor"));

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

const data = {
  navMain: [
    {
      title: "Tables",
      items: [
        {
          title: "line_items",
        },
        {
          title: "orders",
        },
        {
          title: "product_categories",
        },
        {
          title: "products",
        },
      ],
    },
  ],
};

function AppSidebar({ activeTable, setActiveTable, ...props }) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Semantic SQL Playground</span>
                  <div>
                    <Badge>Demo</Badge>
                  </div>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item, index) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton className="flex justify-between">
                  {item.title}
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton
                          isActive={item.title === activeTable}
                          onClick={() => setActiveTable(item.title)}
                        >
                          {item.title}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

let mockServerInstance: Server | null = null;
const mockServerUrl = "ws://localhost:30000";
let mockServerMeta: any;

function createMockServer(url: string, initSchema: any) {
  if (!mockServerInstance) {
    mockServerInstance = new Server(url);

    const fileContents: Record<string, string> = {};
    mockServerMeta = parseCubeSchemas(initSchema);

    mockServerInstance.on("connection", (socket) => {
      console.log("Mock WebSocket server: connection established");

      socket.on("message", (message) => {
        // special non LSP message to update the schemas (just for mocking)
        const request = JSON.parse(message);
        if (request.method === "update-schema") {
          const { schemas } = request.params;
          mockServerMeta = parseCubeSchemas(schemas);
          return;
        }

        const response = handleMessage(
          message as string,
          fileContents,
          mockServerMeta
        );
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

export function Home() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeTable, setActiveTable] = React.useState("products");
  const [schemas, setSchemas] = React.useState(cubeSchemas);
  React.useEffect(() => {
    if (!mockServerInstance) {
      createMockServer(mockServerUrl, cubeSchemas);
    }
  }, []);
  React.useEffect(() => {
    if (mockServerInstance) {
      const socket = new WebSocket(mockServerUrl);
      socket.onopen = () => {
        const message = JSON.stringify({
          method: "update-schema",
          params: { schemas },
        });
        socket.send(message);
      };
    }
  }, [schemas]);

  const handleOpenQuickFix = React.useCallback(() => {
    setDialogOpen(true);
  }, []);

  return (
    <>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar activeTable={activeTable} setActiveTable={setActiveTable} />
        <SidebarInset>
          <section className="overflow-hidden border bg-background shadow">
            <div className="h-full flex flex-col items-start min-h-screen">
              <div className="container flex flex-col items-start justify-between space-y-2 py-4 h-16 w-full px-10">
                <div className="flex">
                  <SidebarTrigger />
                </div>
                <div className="ml-auto flex w-full space-x-2 sm:justify-end">
                  <div className="hidden space-x-2 md:flex"></div>
                </div>
              </div>
              <main className="flex h-full w-full">
                <div className="flex-1 flex">
                  <div className="w-full h-full overflow-auto">
                    <SemanticEditor
                      schemas={schemas}
                      setSchemas={setSchemas}
                      activeTable={activeTable}
                    />
                  </div>
                </div>
                <Suspense fallback={<div>Loading Editor...</div>}>
                  <EditorWrapper handleOpenQuickFix={handleOpenQuickFix} />
                  {/* <SQLEditor /> */}
                </Suspense>
              </main>
            </div>
          </section>
        </SidebarInset>
      </SidebarProvider>
      <Sheet open={dialogOpen} onOpenChange={(next) => setDialogOpen(next)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add join to semantic definition?</SheetTitle>
            <SheetDescription>
              TODO: put some UX here for modifying the semantic layer based on
              the quickfix join.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default Home;
