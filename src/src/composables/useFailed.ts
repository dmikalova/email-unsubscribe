import { ref } from "vue";
import { fetchWithCsrf } from "./useApi";
import { useToast } from "./useToast";
import type { ActivityItem } from "../types";

const failedAttempts = ref<ActivityItem[]>([]);
const selectedItem = ref<ActivityItem | null>(null);

export function useFailed() {
  const { showToast } = useToast();

  const fetchFailed = async () => {
    try {
      const res = await fetch("/api/failed");
      failedAttempts.value = await res.json();
    } catch (e) {
      console.error("Failed to fetch failed:", e);
    }
  };

  const viewDetails = (item: ActivityItem) => {
    selectedItem.value = item;
  };

  const closeDetails = () => {
    selectedItem.value = null;
  };

  const retryUnsubscribe = async (id: string) => {
    try {
      await fetchWithCsrf(`/api/failed/${id}/retry`, { method: "POST" });
      showToast("Retry scheduled");
      await fetchFailed();
    } catch {
      showToast("Failed to schedule retry", "error");
    }
  };

  const markResolved = async (id: string) => {
    try {
      await fetchWithCsrf(`/api/failed/${id}/resolve`, { method: "POST" });
      showToast("Marked as resolved");
      await fetchFailed();
    } catch {
      showToast("Failed to mark resolved", "error");
    }
  };

  return {
    failedAttempts,
    selectedItem,
    fetchFailed,
    viewDetails,
    closeDetails,
    retryUnsubscribe,
    markResolved,
  };
}
