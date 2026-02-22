// Utility functions shared across components

export function statusClass(
  status: string,
): string {
  const classes: Record<string, string> = {
    success: "px-2 py-1 text-xs rounded-full bg-green-100 text-green-800",
    failed: "px-2 py-1 text-xs rounded-full bg-red-100 text-red-800",
    uncertain: "px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800",
    pending: "px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800",
  };
  return classes[status] || classes.pending;
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}
