import type { Route } from "./+types/home";

import { GalleryVerticalEnd } from "lucide-react";
import React, { Suspense, lazy } from "react";
import { Server } from "mock-socket";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
import { cubeSchemas } from "~/lib/test-schemas";
import { Button } from "~/components/ui/button";

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

export function Home() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeTable, setActiveTable] = React.useState("products");
  const [schemas, setSchemas] = React.useState(cubeSchemas);
  React.useEffect(() => {
    const websocketPath = `${
      window.location.protocol === "https:" ? "wss:" : "ws:"
    }//${window.location.hostname}:${window.location.port}`;
    const socket = new WebSocket(websocketPath);
    socket.onopen = () => {
      const message = JSON.stringify({
        method: "update-schema",
        params: { schemas },
      });
      socket.send(message);
    };
  }, [schemas]);

  const handleOpenQuickFix = React.useCallback(() => {
    setDialogOpen(true);
  }, []);

  return (
    <>
      <section className="overflow-hidden border bg-background shadow">
        <div className="h-full flex flex-col items-start min-h-screen">
          <div className="container flex flex-col items-start justify-between space-y-2 py-4 h-16 w-full px-10">
            <div className="flex">
              <div className="flex items-center space-x-2 leading-none">
                <span className="font-semibold">Semantic SQL Playground</span>
                <div>
                  <Badge>Demo</Badge>
                </div>
              </div>
            </div>
            <div className="ml-auto flex w-full space-x-2 sm:justify-end">
              <div className="hidden space-x-2 md:flex"></div>
            </div>
          </div>
          <main className="flex h-full w-full">
            <div className="flex-1 flex">
              <Tabs
                value={activeTable}
                onValueChange={(n) => setActiveTable(n)}
              >
                <TabsList className="grid w-full grid-cols-4 my-2 mx-4">
                  {data.navMain[0].items.map((t) => (
                    <TabsTrigger value={t.title}>{t.title}</TabsTrigger>
                  ))}
                </TabsList>
                <div className="w-full h-full overflow-auto mt-4">
                  <SemanticEditor
                    schemas={schemas}
                    setSchemas={setSchemas}
                    activeTable={activeTable}
                  />
                </div>
              </Tabs>
            </div>
            <Suspense fallback={<div>Loading Editor...</div>}>
              <div>
                <div className="flex space-x-2 py-2">
                  <Button disabled>Fix With AI</Button>
                  <Button disabled>Run</Button>
                </div>
                <EditorWrapper handleOpenQuickFix={handleOpenQuickFix} />
              </div>
              {/* <SQLEditor /> */}
            </Suspense>
          </main>
        </div>
      </section>
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
