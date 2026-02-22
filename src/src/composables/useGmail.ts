import { ref } from "vue";
import { fetchWithCsrf } from "./useApi";
import { useToast } from "./useToast";
import type { GmailStatus } from "../types";

const gmailStatus = ref<GmailStatus>({
  authorized: false,
  connectedEmail: null,
});
const gmailLoading = ref(true);

export function useGmail() {
  const { showToast } = useToast();

  const fetchGmailStatus = async () => {
    try {
      const res = await fetch("/oauth/status");
      gmailStatus.value = await res.json();
    } catch (e) {
      console.error("Failed to fetch Gmail status:", e);
    } finally {
      gmailLoading.value = false;
    }
  };

  const connectGmail = () => {
    globalThis.location.href = "/oauth/authorize";
  };

  const disconnectGmail = async () => {
    try {
      await fetchWithCsrf("/oauth/revoke", { method: "POST" });
      showToast("Gmail disconnected");
      await fetchGmailStatus();
    } catch {
      showToast("Failed to disconnect Gmail", "error");
    }
  };

  return {
    gmailStatus,
    gmailLoading,
    fetchGmailStatus,
    connectGmail,
    disconnectGmail,
  };
}
