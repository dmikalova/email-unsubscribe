<script setup lang="ts">
import { onMounted } from "vue";
import { useFailed, useStats } from "../composables";
import { statusClass } from "../utils";
import type { ActivityItem } from "../types";

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
                  class="bg-primary-50 text-primary-700 p-2 rounded hover:bg-primary-100"
                  title="View details"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  @click="retryUnsubscribe(item.id)"
                  class="bg-primary-50 text-primary-700 p-2 rounded hover:bg-primary-100"
                  title="Retry"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  @click="handleMarkResolved(item.id)"
                  class="bg-primary-50 text-primary-700 p-2 rounded hover:bg-primary-100"
                  title="Mark resolved"
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
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
  >
    <div
      class="bg-white rounded-lg shadow-material-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto"
    >
      <h3 class="text-lg font-semibold mb-4">Unsubscribe Details</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <span class="font-medium">Sender:</span> {{ selectedItem.sender }}
        </div>
        <div>
          <span class="font-medium">Domain:</span>
          {{ selectedItem.senderDomain }}
        </div>
        <div>
          <span class="font-medium">Method:</span> {{ selectedItem.method }}
        </div>
        <div>
          <span class="font-medium">Status:</span>
          <span :class="statusClass(selectedItem.status)">{{
            selectedItem.status
          }}</span>
        </div>
        <div>
          <span class="font-medium">Failure Reason:</span>
          {{ selectedItem.failureReason || "N/A" }}
        </div>
        <div>
          <span class="font-medium">Retries:</span>
          {{ selectedItem.retryCount }}
        </div>
      </div>
      <div v-if="selectedItem.failureDetails" class="mb-4">
        <span class="font-medium">Details:</span>
        <pre
          class="bg-gray-100 p-2 rounded mt-1 text-sm whitespace-pre-wrap break-words overflow-x-auto max-w-full"
          >{{ selectedItem.failureDetails }}</pre
        >
      </div>
      <div v-if="selectedItem.screenshotPath" class="mb-4">
        <span class="font-medium">Screenshot:</span>
        <div class="mt-2 border rounded">
          <img
            :src="'/screenshots/' + selectedItem.id + '.png'"
            alt="Screenshot"
            class="max-w-full"
          />
        </div>
      </div>
      <div class="flex justify-end space-x-2">
        <a
          v-if="selectedItem.tracePath"
          :href="'/api/failed/' + selectedItem.id + '/trace'"
          class="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
        >
          Download Trace
        </a>
        <button
          @click="closeDetails"
          class="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
