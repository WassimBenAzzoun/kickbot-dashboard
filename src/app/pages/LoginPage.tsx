import { Navigate } from "react-router-dom";
import { ArrowRight, BellRing, Server, Sparkles, Tv2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import { useAuth } from "@/app/lib/auth";
import { LoadingScreen } from "@/app/components/LoadingScreen";

export function LoginPage() {
  const { isLoading, isAuthenticated, startDiscordLogin } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Checking session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_32%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.08),transparent_28%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-16">
        <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col justify-between gap-8">
            <div className="space-y-6">
              <Badge variant="outline" className="w-fit">
                Discord + Kick notification dashboard
              </Badge>
              <div className="space-y-4">
                <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Control every live alert from one polished workspace.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground">
                  Sign in with Discord to configure alert channels, track Kick creators, and audit delivery history across every server you manage.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border/70 bg-card/80 shadow-none">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                    <Server />
                  </div>
                  <p className="font-medium text-foreground">Guild switching</p>
                  <p className="text-sm text-muted-foreground">Move between servers instantly with avatar-based navigation.</p>
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/80 shadow-none">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                    <Tv2 />
                  </div>
                  <p className="font-medium text-foreground">Streamer control</p>
                  <p className="text-sm text-muted-foreground">Enable, disable, and organize tracked Kick creators with clarity.</p>
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/80 shadow-none">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                    <BellRing />
                  </div>
                  <p className="font-medium text-foreground">Delivery history</p>
                  <p className="text-sm text-muted-foreground">Review timestamps, status, and Discord message IDs with ease.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex items-center">
            <Card className="w-full rounded-[32px] p-2">
              <CardContent className="space-y-6 p-8 sm:p-10">
                <div className="space-y-3">
                  <Badge variant="secondary" className="w-fit">
                    Secure Discord sign-in
                  </Badge>
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                    Continue with Discord
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    We only surface servers where your Discord account has the permissions required to manage bot setup and alert routing.
                  </p>
                </div>

                <div className="space-y-4 rounded-[28px] border border-border/70 bg-background/80 p-6">
                  <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <Sparkles />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Production-ready dashboard access</p>
                      <p className="text-sm text-muted-foreground">Connect once and manage your guilds immediately.</p>
                    </div>
                  </div>

                  <Button className="h-12 w-full text-base" onClick={startDiscordLogin}>
                    Continue with Discord
                    <ArrowRight data-icon="inline-end" />
                  </Button>

                  <p className="text-sm leading-6 text-muted-foreground">
                    By signing in, you will be redirected to Discord OAuth and returned to the dashboard after authentication.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
