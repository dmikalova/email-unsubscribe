import { ref } from "vue";
import { fetchWithCsrf } from "./useApi";
import { useToast } from "./useToast";
import type { ActivityItem, Stats } from "../types";

const stats = ref<Stats>({
  total: 0,
  success: 0,
  failed: 0,
  uncertain: 0,
  pending: 0,
  successRate: 0,
});

const recentActivity = ref<ActivityItem[]>([]);
const scanInProgress = ref(false);

export function useStats() {
  const { showToast } = useToast();

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      stats.value = await res.json();
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await fetch("/api/recent");
      recentActivity.value = await res.json();
    } catch (e) {
      console.error("Failed to fetch recent:", e);
    }
  };

  const fetchScanStatus = async () => {
    try {
      const res = await fetch("/api/scan/status");
      const data = await res.json();
      scanInProgress.value = data.inProgress;
    } catch (e) {
      console.error("Failed to fetch scan status:", e);
    }
  };

  const triggerScan = async () => {
    try {
      scanInProgress.value = true;
      const res = await fetchWithCsrf("/api/scan", { method: "POST" });
      if (res.ok) {
        showToast("Scan started");
        const pollInterval = setInterval(async () => {
          await fetchScanStatus();
          if (!scanInProgress.value) {
            clearInterval(pollInterval);
            showToast("Scan complete");
            await fetchStats();
            await fetchRecent();
          }
        }, 2000);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to start scan", "error");
        scanInProgress.value = false;
      }
    } catch {
      showToast("Failed to start scan", "error");
      scanInProgress.value = false;
    }
  };

  return {
    stats,
    recentActivity,
    scanInProgress,
    fetchStats,
    fetchRecent,
    fetchScanStatus,
    triggerScan,
  };
}
