"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";

export default function DashboardShell({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function openSidebar() {
    setSidebarOpen(true);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  /*
   * Close the mobile sidebar whenever the route changes.
   */
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  /*
   * Prevent the page behind the mobile sidebar from scrolling.
   */
  useEffect(() => {
    if (!sidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  /*
   * Close the sidebar with the Escape key.
   */
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
        <DashboardSidebar
          open={sidebarOpen}
          onClose={closeSidebar}
        />

        <section className="min-w-0">
          <DashboardTopbar onMenuClick={openSidebar} />

          <div
            className="
              mx-auto
              w-full
              max-w-[1440px]
              px-3
              pb-8
              pt-4
              min-[375px]:px-4
              sm:px-6
              sm:pb-10
              sm:pt-6
              lg:px-8
              xl:px-10
            "
          >
            <div className="min-w-0">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}