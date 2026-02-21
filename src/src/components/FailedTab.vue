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
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ item.failureReason || "Unknown" }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ item.retryCount }}
            </td>
            <td class="px-4 py-3 text-sm">
              <div class="flex space-x-2">
                <button
                  @click="viewDetails(item)"
                  class="bg-primary-100 text-primary-700 px-3 py-1 rounded text-xs font-medium hover:bg-primary-200"
                >
                  View
                </button>
                <button
                  @click="retryUnsubscribe(item.id)"
                  class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded text-xs font-medium hover:bg-yellow-200"
                >
                  Retry
                </button>
                <button
                  @click="handleMarkResolved(item.id)"
                  class="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-medium hover:bg-green-200"
                >
                  Resolve
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
