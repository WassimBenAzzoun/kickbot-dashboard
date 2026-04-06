import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { LoadingScreen } from "../components/LoadingScreen";

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function run(): Promise<void> {
      try {
        await refreshSession();

        if (!mounted) {
          return;
        }

        if (searchParams.get("status") === "success") {
          toast.success("Signed in successfully");
        }

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
  }, [navigate, refreshSession, searchParams]);

  return <LoadingScreen message="Finishing sign in..." />;
}
