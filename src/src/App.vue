<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useGmail, useStats } from "./composables";
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
const mobileMenuOpen = ref(false);

const currentTabLabel = computed(() => {
  return tabs.find((t) => t.id === currentTab.value)?.label || "Dashboard";
});

const selectTab = (tabId: TabId) => {
  currentTab.value = tabId;
  mobileMenuOpen.value = false;
};

watch(currentTab, (newTab) => {
  window.location.hash = newTab;
});

window.addEventListener("hashchange", () => {
  currentTab.value = getTabFromHash();
});

const { gmailStatus, gmailLoading, fetchGmailStatus, connectGmail, disconnectGmail } =
  useGmail();
const { scanInProgress, triggerScan } = useStats();

onMounted(() => {
  fetchGmailStatus();
});
</script>

<template>
  <!-- Navigation -->
  <nav class="bg-primary-600 text-white shadow-material">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 gap-4">
        <div class="flex items-center gap-4 flex-shrink-0">
          <span class="text-xl font-semibold whitespace-nowrap">Email Unsubscribe</span>
          <!-- Mobile Tab Dropdown -->
          <div class="relative md:hidden">
            <button
              @click="mobileMenuOpen = !mobileMenuOpen"
              class="px-3 py-2 rounded-md text-sm font-medium bg-primary-700 flex items-center gap-2"
            >
              {{ currentTabLabel }}
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-180': mobileMenuOpen }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              v-if="mobileMenuOpen"
              class="absolute left-0 mt-1 w-40 rounded-md shadow-lg bg-primary-700 z-50"
            >
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="selectTab(tab.id)"
                :class="[
                  'block w-full text-left px-4 py-2 text-sm font-medium transition-colors',
                  currentTab === tab.id
                    ? 'bg-primary-800'
                    : 'hover:bg-primary-600',
                ]"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-4 flex-shrink-0">
          <!-- Desktop Tabs -->
          <div class="hidden md:flex space-x-4">
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
        </div>
      </div>
    </div>
  </nav>

  <!-- Gmail Status Banner -->
  <div class="bg-gray-100 border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div class="flex items-center justify-between">
        <template v-if="gmailLoading">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm text-gray-700">Checking Gmail connection...</span>
          </div>
          <div></div>
        </template>
        <template v-else-if="gmailStatus.authorized">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm text-gray-700">
              Connected: <span class="font-medium">{{ gmailStatus.connectedEmail }}</span>
            </span>
            <button
              @click="disconnectGmail"
              class="ml-2 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            >
              Disconnect
            </button>
          </div>
          <button
            @click="triggerScan"
            :disabled="scanInProgress"
            :class="[
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              scanInProgress
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700',
            ]"
          >
            {{ scanInProgress ? 'Scanning...' : 'Scan Now' }}
          </button>
        </template>
        <template v-else>
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm text-gray-700">Gmail not connected</span>
          </div>
          <button
            @click="connectGmail"
            class="px-4 py-1.5 rounded-md text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            Connect Gmail
          </button>
        </template>
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
