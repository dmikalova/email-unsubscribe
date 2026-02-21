import { ref } from "vue";
import type { DomainStats } from "../types";

const domainStats = ref<DomainStats[]>([]);

export function useDomains() {
  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/unsubscribe-logs");
      domainStats.value = await res.json();
    } catch (e) {
      console.error("Failed to fetch domains:", e);
    }
  };

  return {
    domainStats,
    fetchDomains,
  };
}
