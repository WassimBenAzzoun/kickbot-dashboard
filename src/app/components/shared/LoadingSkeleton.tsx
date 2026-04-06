import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";

interface LoadingSkeletonProps {
  variant?: "overview" | "detail" | "table";
}

export function LoadingSkeleton({ variant = "overview" }: LoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton className="h-14 w-full rounded-xl" key={index} />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className={`grid gap-6 ${variant === "detail" ? "xl:grid-cols-[1.2fr_0.8fr]" : "xl:grid-cols-[1.15fr_0.85fr]"}`}>
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="gap-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <Skeleton className="h-12 w-full rounded-xl" key={rowIndex} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
