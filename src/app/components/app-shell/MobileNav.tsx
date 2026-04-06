import { Menu } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/app/components/ui/sheet";
import { AppSidebar } from "@/app/components/app-shell/AppSidebar";

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-2xl lg:hidden">
          <Menu />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-[24rem] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Switch guilds and move across dashboard sections.</SheetDescription>
        </SheetHeader>
        <AppSidebar onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
