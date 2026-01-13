/**
 * Format date to relative time (e.g., "3 days ago", "in 2 hours")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  const secondsInMinute = 60;
  const secondsInHour = 3600;
  const secondsInDay = 86400;
  const secondsInWeek = 604800;
  const secondsInMonth = 2592000;
  const secondsInYear = 31536000;

  if (Math.abs(diffInSeconds) < secondsInMinute) {
    return diffInSeconds < 0 ? "just now" : "just now";
  } else if (Math.abs(diffInSeconds) < secondsInHour) {
    const minutes = Math.floor(Math.abs(diffInSeconds) / secondsInMinute);
    return diffInSeconds < 0 ? `in ${minutes}m` : `${minutes}m ago`;
  } else if (Math.abs(diffInSeconds) < secondsInDay) {
    const hours = Math.floor(Math.abs(diffInSeconds) / secondsInHour);
    return diffInSeconds < 0 ? `in ${hours}h` : `${hours}h ago`;
  } else if (Math.abs(diffInSeconds) < secondsInWeek) {
    const days = Math.floor(Math.abs(diffInSeconds) / secondsInDay);
    return diffInSeconds < 0 ? `in ${days}d` : `${days}d ago`;
  } else if (Math.abs(diffInSeconds) < secondsInMonth) {
    const weeks = Math.floor(Math.abs(diffInSeconds) / secondsInWeek);
    return diffInSeconds < 0 ? `in ${weeks}w` : `${weeks}w ago`;
  } else if (Math.abs(diffInSeconds) < secondsInYear) {
    const months = Math.floor(Math.abs(diffInSeconds) / secondsInMonth);
    return diffInSeconds < 0 ? `in ${months}mo` : `${months}mo ago`;
  } else {
    const years = Math.floor(Math.abs(diffInSeconds) / secondsInYear);
    return diffInSeconds < 0 ? `in ${years}y` : `${years}y ago`;
  }
}

/**
 * Format date to readable string (e.g., "Jan 15, 2024")
 */
export function formatDate(
  date: Date | string | number,
  format: "short" | "long" = "short"
): string {
  const targetDate = new Date(date);

  if (format === "short") {
    return targetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } else {
    return targetDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

/**
 * Get event status based on deadline and resolution
 */
export function getEventStatus(
  deadline: Date | string | number,
  resolved?: boolean
): "active" | "upcoming" | "resolved" | "expired" {
  const now = new Date();
  const deadlineDate = new Date(deadline);

  if (resolved) {
    return "resolved";
  }

  if (now > deadlineDate) {
    return "expired";
  }

  // If deadline is within 24 hours, consider it active
  if (now.getTime() > deadlineDate.getTime() - 24 * 60 * 60 * 1000) {
    return "active";
  }

  return "upcoming";
}

/**
 * Get status badge color based on event status
 */
export function getStatusBadgeColor(status: ReturnType<typeof getEventStatus>): string {
  switch (status) {
    case "active":
      return "bg-green-500 text-white";
    case "upcoming":
      return "bg-blue-500 text-white";
    case "resolved":
      return "bg-gray-500 text-white";
    case "expired":
      return "bg-yellow-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

/**
 * Get status text based on event status
 */
export function getStatusText(
  status: ReturnType<typeof getEventStatus>,
  t: (key: string) => string
): string {
  switch (status) {
    case "active":
      return t("card.status.active") || "Active";
    case "upcoming":
      return t("card.status.upcoming") || "Upcoming";
    case "resolved":
      return t("card.status.resolved") || "Resolved";
    case "expired":
      return t("card.status.expired") || "Expired";
    default:
      return t("card.status.active") || "Active";
  }
}
