"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Link, usePage } from "@inertiajs/react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useBrand } from "@/contexts/brand-context"
import { allMenuItems } from "@/utils/menu"
import type { PageProps } from "@/types"

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { auth } = usePage<PageProps>().props;

  const {
    settings,
    getCompleteSidebarProps,
    getLogoSrc,
    getPreviewUrl,
  } = useBrand();

  const [searchQuery, setSearchQuery] =
    React.useState("");

  const [searchReady, setSearchReady] =
    React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const sidebarProps = getCompleteSidebarProps();

  const logoSrc = getLogoSrc();
  const displayLogo = logoSrc
    ? getPreviewUrl(logoSrc)
    : "";

  const displayFavicon = settings.favicon
    ? getPreviewUrl(settings.favicon)
    : "";

  // Restore the sidebar scroll position.
  React.useEffect(() => {
    const savedScroll =
      sessionStorage.getItem("sidebar-scroll");

    if (savedScroll && scrollRef.current) {
      scrollRef.current.scrollTop =
        Number.parseInt(savedScroll, 10);
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;

    sessionStorage.setItem(
      "sidebar-scroll",
      scrollRef.current.scrollTop.toString()
    );
  };

  return (
    <Sidebar
      variant={settings.sidebarVariant as any}
      side={
        settings.layoutDirection === "rtl"
          ? "right"
          : "left"
      }
      collapsible="icon"
      className={sidebarProps.className}
      style={sidebarProps.style}
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href={route("dashboard")}
                className="flex items-center justify-center"
              >
                {/* Expanded sidebar logo */}
                <div className="flex items-center group-data-[collapsible=icon]:hidden">
                  {displayLogo ? (
                    <img
                      src={displayLogo}
                      alt={
                        settings.titleText ||
                        "AutomasCRM"
                      }
                      className="w-auto max-w-32 transition-all duration-200"
                    />
                  ) : (
                    <div className="flex items-center text-lg font-semibold tracking-tight text-inherit">
                      {settings.titleText ||
                        "AutomasCRM"}
                    </div>
                  )}
                </div>

                {/* Collapsed sidebar icon */}
                <div className="hidden h-8 w-8 group-data-[collapsible=icon]:block">
                  {displayFavicon ? (
                    <img
                      src={displayFavicon}
                      alt="Icon"
                      className="h-8 w-8 object-contain transition-all duration-200"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary font-bold text-primary-foreground shadow-sm">
                      {(settings.titleText ||
                        "AutomasCRM")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="px-2 group-data-[collapsible=icon]:px-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 group-data-[collapsible=icon]:hidden rtl:left-auto rtl:right-2.5" style={{
              color: "black",
            }} />

            <SidebarInput
              type="search"
              name="sidebar_menu_filter"
              aria-label="Search menu"
              placeholder="Search menu..."
              value={searchQuery}
              readOnly={!searchReady}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              onPointerDown={() =>
                setSearchReady(true)
              }
              onFocus={() => setSearchReady(true)}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              className="rounded-lg border-sidebar-border pl-8 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary group-data-[collapsible=icon]:hidden rtl:pl-2 rtl:pr-8" style={{
                backgroundColor: "white",
                color: "black",
                borderColor: "var(--sidebar-input-border)",
              }}
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <NavMain
          items={allMenuItems()}
          searchQuery={searchQuery}
        />
      </SidebarContent>
    </Sidebar>
  );
}