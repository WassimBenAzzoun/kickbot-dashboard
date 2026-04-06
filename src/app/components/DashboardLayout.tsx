import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/app/components/app-shell/AppSidebar";
import { DashboardTopbar } from "@/app/components/app-shell/DashboardTopbar";

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-transparent">
      <aside className="hidden lg:block lg:w-[24rem] lg:shrink-0">
        <div className="sticky top-0 h-screen">
          <AppSidebar />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
