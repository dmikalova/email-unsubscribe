<script setup lang="ts">
import { onMounted } from "vue";
import { useFailed, useStats } from "../composables";
import { statusClass } from "../utils";

const {
  failedAttempts,
  selectedItem,
  fetchFailed,
  viewDetails,
  closeDetails,
  retryUnsubscribe,
  markResolved,
} = useFailed();
const { fetchStats } = useStats();

const handleMarkResolved = async (id: string) => {
  await markResolved(id);
  await fetchStats();
};

onMounted(() => {
  fetchFailed();
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-material p-6">
    <h2 class="text-lg font-semibold mb-4">Failed Unsubscribes</h2>
    <div v-if="failedAttempts.length === 0" class="text-center py-12">
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
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-gray-500">No failed unsubscribes</p>
      <p class="text-gray-400 text-sm mt-1">
        Failed attempts will appear here for review
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
              Reason
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Retries
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="item in failedAttempts"
            :key="item.id"
            class="hover:bg-gray-50"
          >
            <td class="px-4 py-3 text-sm text-gray-900">{{ item.sender }}</td>
            <td class="px-4 py-3 text-sm text-gray-700">
              {{ item.failureReason || "Unknown" }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-700">
              {{ item.retryCount }}
            </td>
            <td class="px-4 py-3 text-sm">
              <div class="flex space-x-2">
                <button
                  @click="viewDetails(item)"
                  class="tooltip bg-primary-50 text-primary-700 p-2 rounded hover:bg-primary-100"
                  data-tooltip="View details"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  @click="retryUnsubscribe(item.id)"
                  class="tooltip bg-primary-50 text-primary-700 p-2 rounded hover:bg-primary-100"
                  data-tooltip="Retry"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  @click="handleMarkResolved(item.id)"
                  class="tooltip bg-primary-50 text-primary-700 p-2 rounded hover:bg-primary-100"
                  data-tooltip="Resolve"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Detail Modal -->
  <div
    v-if="selectedItem"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    @click.self="closeDetails"
  >
    <div
      class="bg-white rounded-lg shadow-material-xl w-full max-w-lg max-h-[80vh] overflow-y-auto relative"
    >
      <!-- Close button -->
      <button
        @click="closeDetails"
        class="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between pr-8">
          <h3 class="text-lg font-semibold text-gray-900">Unsubscribe Details</h3>
          <span :class="statusClass(selectedItem.status)">{{ selectedItem.status }}</span>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 space-y-4">
        <!-- Sender Info -->
        <div>
          <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sender</div>
          <div class="text-sm text-gray-900">{{ selectedItem.sender }}</div>
          <div class="text-xs text-gray-500">{{ selectedItem.senderDomain }}</div>
        </div>

        <!-- Method & Retries -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Method</div>
            <div class="text-sm text-gray-900">{{ selectedItem.method || 'N/A' }}</div>
          </div>
          <div>
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Retries</div>
            <div class="text-sm text-gray-900">{{ selectedItem.retryCount }}</div>
          </div>
        </div>

        <!-- Failure Reason -->
        <div>
          <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Failure Reason</div>
          <div class="text-sm text-gray-900">{{ selectedItem.failureReason || 'Unknown' }}</div>
        </div>

        <!-- Details -->
        <div v-if="selectedItem.failureDetails">
          <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Details</div>
          <pre class="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-700 whitespace-pre-wrap break-words overflow-x-auto">{{ selectedItem.failureDetails }}</pre>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="selectedItem.tracePath" class="px-6 py-4 border-t border-gray-200 flex justify-end">
        <a
          :href="'/api/failed/' + selectedItem.id + '/trace'"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Download Trace
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tooltip {
  position: relative;
}

.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: #374151;
  color: white;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s, visibility 0.15s;
  transition-delay: 0s;
  pointer-events: none;
  margin-bottom: 4px;
  z-index: 10;
}

.tooltip:hover::after {
  opacity: 1;
  visibility: visible;
  transition-delay: 0.5s;
}
</style>
