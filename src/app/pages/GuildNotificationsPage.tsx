import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { BellRing } from "lucide-react";
import { getGuildNotifications } from "@/app/lib/api";
import { buildGuildRoute, dashboardKeys, useSelectedGuild } from "@/app/lib/dashboard";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { NotificationHistoryTable } from "@/app/components/guild/NotificationHistoryTable";
import { Button } from "@/app/components/ui/button";

export function GuildNotificationsPage() {
  const { guildId = "" } = useParams();
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const { selectedGuild, isLoading: guildLoading } = useSelectedGuild(guildId);

  const notificationsQuery = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.guildNotifications(guildId, page, pageSize),
    queryFn: () => getGuildNotifications(guildId, page, pageSize),
    placeholderData: keepPreviousData
  });

  if (guildLoading || notificationsQuery.isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  if (!selectedGuild) {
    return (
      <EmptyState
        icon={BellRing}
        title="Guild not found"
        description="Return to the overview, choose a guild from the switcher, and then reopen the notification history."
        action={
          <Button asChild>
            <Link to="/dashboard/overview">Back to overview</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Guild notifications"
        title={`Notification history for ${selectedGuild.name}`}
        description="Review delivery timestamps, status badges, and Discord message IDs for this server."
        actions={
          <Button asChild variant="outline">
            <Link to={buildGuildRoute(selectedGuild.id)}>Back to guild settings</Link>
          </Button>
        }
      />

      <NotificationHistoryTable
        notifications={notificationsQuery.data?.items ?? []}
        page={page}
        totalPages={notificationsQuery.data?.totalPages ?? 1}
        onPreviousPage={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
        onNextPage={() =>
          setPage((currentPage) =>
            Math.min(notificationsQuery.data?.totalPages ?? currentPage, currentPage + 1)
          )
        }
        emptyState={
          <EmptyState
            icon={BellRing}
            title="No notifications recorded"
            description="As soon as this guild delivers a live alert, the notification log will appear here with timestamps and status details."
            action={
              <Button asChild variant="outline">
                <Link to={buildGuildRoute(selectedGuild.id, "streamers")}>Review tracked streamers</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
