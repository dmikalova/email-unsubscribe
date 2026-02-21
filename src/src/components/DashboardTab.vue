<script setup lang="ts">
import { onMounted } from "vue";
import { useStats, useGmail } from "../composables";
import { statusClass, formatTime } from "../utils";

const { stats, recentActivity, scanInProgress, fetchStats, fetchRecent, fetchScanStatus, triggerScan } =
  useStats();
const { gmailStatus } = useGmail();

onMounted(() => {
  fetchStats();
  fetchRecent();
  fetchScanStatus();
});
</script>

<template>
  <!-- Scan Button -->
  <div class="mb-6 flex justify-end">
    <button
      @click="triggerScan"
      :disabled="scanInProgress || !gmailStatus.authorized"
      :class="[
        'px-4 py-2 rounded-md text-sm font-medium transition-colors',
        scanInProgress || !gmailStatus.authorized
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-primary-600 text-white hover:bg-primary-700',
      ]"
      :title="!gmailStatus.authorized ? 'Connect Gmail first' : ''"
    >
      <span v-if="scanInProgress">Scanning...</span>
      <span v-else>Scan Now</span>
    </button>
  </div>

  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-lg shadow-material p-6">
      <div class="text-sm font-medium text-gray-500">Total Processed</div>
      <div class="text-3xl font-bold text-gray-900">{{ stats.total }}</div>
    </div>
    <div class="bg-white rounded-lg shadow-material p-6">
      <div class="text-sm font-medium text-gray-500">Successful</div>
      <div class="text-3xl font-bold text-green-600">{{ stats.success }}</div>
    </div>
    <div class="bg-white rounded-lg shadow-material p-6">
      <div class="text-sm font-medium text-gray-500">Failed</div>
      <div class="text-3xl font-bold text-red-600">{{ stats.failed }}</div>
    </div>
    <div class="bg-white rounded-lg shadow-material p-6">
      <div class="text-sm font-medium text-gray-500">Success Rate</div>
      <div class="text-3xl font-bold text-primary-600">
        {{ stats.successRate.toFixed(1) }}%
      </div>
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="bg-white rounded-lg shadow-material p-6">
    <h2 class="text-lg font-semibold mb-4">Recent Activity</h2>
    <div v-if="recentActivity.length === 0" class="text-center py-12">
      <svg
        class="w-16 h-16 mx-auto mb-4 text-primary-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <p class="text-gray-500">No unsubscribe activity yet</p>
      <p class="text-gray-400 text-sm mt-1">
        Activity will appear here once emails are processed
      </p>
    </div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Sender
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Method
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Status
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Time
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="item in recentActivity"
            :key="item.id"
            class="hover:bg-gray-50"
          >
            <td class="px-4 py-3 text-sm text-gray-900">{{ item.sender }}</td>
            <td class="px-4 py-3 text-sm text-gray-500">{{ item.method }}</td>
            <td class="px-4 py-3">
              <span :class="statusClass(item.status)">{{ item.status }}</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ formatTime(item.attemptedAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
