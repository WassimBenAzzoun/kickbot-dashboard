import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AppRoutes } from "./routes";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          closeButton
          richColors
          toastOptions={{
            classNames: {
              toast: "border-border bg-card text-card-foreground shadow-lg",
              description: "text-muted-foreground",
              actionButton: "bg-primary text-primary-foreground",
              cancelButton: "bg-muted text-muted-foreground"
            }
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
