import { LoaderCircle } from "lucide-react";

export function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-lg rounded-[28px] border border-border/70 bg-card/95 p-8 text-center shadow-[0_20px_56px_-32px_hsl(var(--foreground)/0.32)] backdrop-blur-sm">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LoaderCircle className="animate-spin" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Preparing your workspace
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
