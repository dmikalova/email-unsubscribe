<script setup lang="ts">
import { onMounted } from "vue";
import { useDomains } from "../composables";
import { formatDate } from "../utils";

const { domainStats, fetchDomains } = useDomains();

onMounted(() => {
  fetchDomains();
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-material p-6">
    <h2 class="text-lg font-semibold mb-4">Domain Statistics</h2>
    <div v-if="domainStats.length === 0" class="text-center py-12">
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
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
      <p class="text-gray-500">No domain statistics yet</p>
      <p class="text-gray-400 text-sm mt-1">
        Statistics will appear as emails are processed
      </p>
    </div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Domain
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Attempts
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Success
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Failed
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Last Attempt
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="item in domainStats"
            :key="item.domain"
            class="hover:bg-gray-50"
          >
            <td class="px-4 py-3 text-sm text-gray-900 font-mono">
              {{ item.domain }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ item.attemptCount }}
            </td>
            <td class="px-4 py-3 text-sm text-green-600">
              {{ item.successCount }}
            </td>
            <td class="px-4 py-3 text-sm text-red-600">
              {{ item.failedCount }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ item.lastAttemptAt ? formatDate(item.lastAttemptAt) : "-" }}
            </td>
            <td class="px-4 py-3 text-sm">
              <span
                v-if="item.flaggedIneffective"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"
                :title="
                  'Emails received after unsubscribe: ' +
                  item.emailsAfterUnsubscribe
                "
              >
                Ineffective
              </span>
              <span
                v-else-if="item.successCount > 0"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
              >
                Compliant
              </span>
              <span
                v-else
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
              >
                Pending
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
