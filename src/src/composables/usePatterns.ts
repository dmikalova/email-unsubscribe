import { ref } from "vue";
import { fetchWithCsrf } from "./useApi";
import { useToast } from "./useToast";
import type { Pattern } from "../types";

const patterns = ref<Pattern[]>([]);

export function usePatterns() {
  const { showToast } = useToast();

  const fetchPatterns = async () => {
    try {
      const res = await fetch("/api/patterns");
      patterns.value = await res.json();
    } catch (e) {
      console.error("Failed to fetch patterns:", e);
    }
  };

  const exportPatterns = () => {
    globalThis.location.href = "/api/patterns/export";
  };

  const importPatterns = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const res = await fetchWithCsrf("/api/patterns/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        showToast(`Imported ${result.imported} patterns`);
        await fetchPatterns();
      } catch {
        showToast("Failed to import patterns", "error");
      }
    };
    reader.readAsText(file);
  };

  return {
    patterns,
    fetchPatterns,
    exportPatterns,
    importPatterns,
  };
}
