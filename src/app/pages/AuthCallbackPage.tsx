import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { LoadingScreen } from "../components/LoadingScreen";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function run(): Promise<void> {
      try {
        const authenticated = await refreshSession();

        if (!mounted) {
          return;
        }

        if (!authenticated) throw new Error("Session was not established");

        toast.success("Signed in successfully");
        navigate("/dashboard/overview", { replace: true });
      } catch {
        if (!mounted) {
          return;
        }

        toast.error("Authentication failed. Please try again.");
        navigate("/login", { replace: true });
      }
    }

    void run();

    return () => {
      mounted = false;
    };
  }, [navigate, refreshSession]);

  return <LoadingScreen message="Finishing sign in..." />;
}
