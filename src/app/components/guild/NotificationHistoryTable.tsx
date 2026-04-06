import { ReactNode } from "react";
import { BellRing } from "lucide-react";
import { NotificationItem } from "@/app/lib/api";
import { formatDateTime, formatRelativeTime } from "@/app/lib/format";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

interface NotificationHistoryTableProps {
  notifications: NotificationItem[];
  emptyState?: ReactNode;
  page?: number;
  totalPages?: number;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  variant?: "full" | "compact";
}

function statusVariant(status: string): "default" | "secondary" | "success" {
  if (status.toUpperCase() === "LIVE") {
    return "success";
  }

  return status ? "default" : "secondary";
}

export function NotificationHistoryTable({
  notifications,
  emptyState,
  page,
  totalPages,
  onPreviousPage,
  onNextPage,
  variant = "full"
}: NotificationHistoryTableProps) {
  if (notifications.length === 0) {
    return emptyState ?? null;
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sent</TableHead>
              <TableHead>Streamer</TableHead>
              {variant === "full" ? <TableHead>Platform</TableHead> : null}
              <TableHead>Status</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{formatRelativeTime(notification.sentAt)}</div>
                    <div className="text-sm text-muted-foreground">{formatDateTime(notification.sentAt)}</div>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-foreground">{notification.streamerUsername}</TableCell>
                {variant === "full" ? <TableCell>{notification.platform}</TableCell> : null}
                <TableCell>
                  <Badge variant={statusVariant(notification.status)}>{notification.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {notification.messageId ?? "No message ID"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 md:hidden">
        {notifications.map((notification) => (
          <Card key={notification.id}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                  <BellRing />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{notification.streamerUsername}</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(notification.sentAt)}</p>
                </div>
                <Badge variant={statusVariant(notification.status)}>{notification.status}</Badge>
              </div>
              <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">When</p>
                  <p className="text-sm text-muted-foreground">{formatRelativeTime(notification.sentAt)}</p>
                </div>
                {variant === "full" ? (
                  <div>
                    <p className="text-sm font-medium text-foreground">Platform</p>
                    <p className="text-sm text-muted-foreground">{notification.platform}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-sm font-medium text-foreground">Discord message</p>
                  <p className="text-sm text-muted-foreground">{notification.messageId ?? "No message ID"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {variant === "full" && typeof page === "number" && typeof totalPages === "number" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/90 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onPreviousPage} disabled={!onPreviousPage || page <= 1}>
              Previous
            </Button>
            <Button variant="outline" onClick={onNextPage} disabled={!onNextPage || page >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
