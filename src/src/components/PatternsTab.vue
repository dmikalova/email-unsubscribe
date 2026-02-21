<script setup lang="ts">
import { onMounted } from "vue";
import { usePatterns } from "../composables";

const { patterns, fetchPatterns, exportPatterns, importPatterns } =
  usePatterns();

onMounted(() => {
  fetchPatterns();
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-material p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">Patterns</h2>
      <div class="space-x-2">
        <button
          @click="exportPatterns"
          class="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 inline-flex items-center h-10"
        >
          Export
        </button>
        <label
          class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 cursor-pointer inline-flex items-center h-10"
        >
          Import
          <input
            type="file"
            @change="importPatterns"
            accept=".json"
            class="hidden"
          />
        </label>
      </div>
    </div>
    <div v-if="patterns.length === 0" class="text-center py-12">
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
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
        />
      </svg>
      <p class="text-gray-500">No patterns configured</p>
      <p class="text-gray-400 text-sm mt-1">
        Import patterns to help identify unsubscribe buttons
      </p>
    </div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Name
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Type
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Selector
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Match Count
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="item in patterns"
            :key="item.id"
            class="hover:bg-gray-50"
          >
            <td class="px-4 py-3 text-sm text-gray-900">{{ item.name }}</td>
            <td class="px-4 py-3 text-sm text-gray-500">{{ item.type }}</td>
            <td
              class="px-4 py-3 text-sm text-gray-500 font-mono truncate max-w-xs"
            >
              {{ item.selector }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ item.matchCount }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
