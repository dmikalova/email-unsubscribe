<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useGmail } from "./composables";
import DashboardTab from "./components/DashboardTab.vue";
import FailedTab from "./components/FailedTab.vue";
import AllowListTab from "./components/AllowListTab.vue";
import DomainsTab from "./components/DomainsTab.vue";
import PatternsTab from "./components/PatternsTab.vue";
import ToastNotifications from "./components/ToastNotifications.vue";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "failed", label: "Failed" },
  { id: "allowlist", label: "Allow List" },
  { id: "domains", label: "Domains" },
  { id: "patterns", label: "Patterns" },
] as const;

type TabId = (typeof tabs)[number]["id"];
const validTabs = tabs.map((t) => t.id);

const getTabFromHash = (): TabId => {
  const hash = window.location.hash.slice(1);
  return validTabs.includes(hash as TabId) ? (hash as TabId) : "dashboard";
};

const currentTab = ref<TabId>(getTabFromHash());

watch(currentTab, (newTab) => {
  window.location.hash = newTab;
});

window.addEventListener("hashchange", () => {
  currentTab.value = getTabFromHash();
});

const { gmailStatus, fetchGmailStatus, connectGmail, disconnectGmail } =
  useGmail();

onMounted(() => {
  fetchGmailStatus();
});
</script>

<template>
  <!-- Navigation -->
  <nav class="bg-primary-600 text-white shadow-material overflow-x-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 min-w-max">
        <div class="flex items-center flex-shrink-0">
          <span class="text-xl font-semibold">Email Unsubscribe</span>
        </div>
        <div class="flex items-center space-x-4 flex-shrink-0">
          <div class="flex space-x-4">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="currentTab = tab.id"
              :class="[
                'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                currentTab === tab.id
                  ? 'bg-primary-700'
                  : 'hover:bg-primary-500',
              ]"
            >
              {{ tab.label }}
            </button>
          </div>
          <!-- Gmail Connection Status -->
          <div
            class="border-l border-primary-400 pl-4 flex items-center space-x-2"
          >
            <template v-if="gmailStatus.authorized">
              <span class="text-sm">{{
                gmailStatus.connectedEmail || "Gmail Connected"
              }}</span>
              <button
                @click="disconnectGmail"
                class="px-2 py-1 text-xs rounded bg-primary-700 hover:bg-primary-800 transition-colors"
              >
                Disconnect
              </button>
            </template>
            <template v-else>
              <button
                @click="connectGmail"
                class="px-3 py-1 text-sm rounded bg-white text-primary-600 hover:bg-gray-100 transition-colors font-medium"
              >
                Connect Gmail
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- Gmail Not Connected Banner -->
  <div
    v-if="!gmailStatus.authorized"
    class="bg-yellow-50 border-l-4 border-yellow-400 p-4"
  >
    <div class="max-w-7xl mx-auto flex items-center">
      <div class="flex-shrink-0">
        <svg
          class="h-5 w-5 text-yellow-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <div class="ml-3 flex-1">
        <p class="text-sm text-yellow-700">
          Connect your Gmail account to start scanning for unsubscribe
          opportunities.
        </p>
      </div>
      <div class="ml-4">
        <button
          @click="connectGmail"
          class="px-4 py-2 bg-yellow-400 text-yellow-900 rounded hover:bg-yellow-500 transition-colors font-medium text-sm"
        >
          Connect Gmail
        </button>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <DashboardTab v-if="currentTab === 'dashboard'" />
    <FailedTab v-if="currentTab === 'failed'" />
    <AllowListTab v-if="currentTab === 'allowlist'" />
    <DomainsTab v-if="currentTab === 'domains'" />
    <PatternsTab v-if="currentTab === 'patterns'" />
  </main>

  <ToastNotifications />
</template>
