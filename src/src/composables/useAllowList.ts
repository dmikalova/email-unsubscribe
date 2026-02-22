import { ref } from "vue";
import { fetchWithCsrf } from "./useApi";
import { useToast } from "./useToast";
import type { AllowListEntry } from "../types";

const allowList = ref<AllowListEntry[]>([]);
const showAddModal = ref(false);
const newEntry = ref({ type: "email" as const, value: "", notes: "" });

export function useAllowList() {
  const { showToast } = useToast();

  const fetchAllowList = async () => {
    try {
      const res = await fetch("/api/allowlist");
      allowList.value = await res.json();
    } catch (e) {
      console.error("Failed to fetch allow list:", e);
    }
  };

  const addToAllowList = async () => {
    try {
      await fetchWithCsrf("/api/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry.value),
      });
      showToast("Added to allow list");
      showAddModal.value = false;
      newEntry.value = { type: "email", value: "", notes: "" };
      await fetchAllowList();
    } catch {
      showToast("Failed to add entry", "error");
    }
  };

  const removeFromAllowList = async (id: string) => {
    try {
      await fetchWithCsrf(`/api/allowlist/${id}`, { method: "DELETE" });
      showToast("Removed from allow list");
      await fetchAllowList();
    } catch {
      showToast("Failed to remove entry", "error");
    }
  };

  return {
    allowList,
    showAddModal,
    newEntry,
    fetchAllowList,
    addToAllowList,
    removeFromAllowList,
  };
}
