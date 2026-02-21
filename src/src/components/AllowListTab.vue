<script setup lang="ts">
import { onMounted } from "vue";
import { useAllowList } from "../composables";

const {
  allowList,
  showAddModal,
  newEntry,
  fetchAllowList,
  addToAllowList,
  removeFromAllowList,
} = useAllowList();

onMounted(() => {
  fetchAllowList();
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-material p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">Allow List</h2>
      <button
        @click="showAddModal = true"
        class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
      >
        Add Entry
      </button>
    </div>
    <div v-if="allowList.length === 0" class="text-center py-12">
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
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
      <p class="text-gray-500">No allowed senders yet</p>
      <p class="text-gray-400 text-sm mt-1">
        Add emails or domains you want to keep receiving
      </p>
    </div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Type
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Value
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Notes
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="item in allowList"
            :key="item.id"
            class="hover:bg-gray-50"
          >
            <td class="px-4 py-3 text-sm text-gray-900">{{ item.type }}</td>
            <td class="px-4 py-3 text-sm text-gray-900 font-mono">
              {{ item.value }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ item.notes || "-" }}
            </td>
            <td class="px-4 py-3 text-sm">
              <button
                @click="removeFromAllowList(item.id)"
                class="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Add Allow List Modal -->
  <div
    v-if="showAddModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
  >
    <div class="bg-white rounded-lg shadow-material-xl p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold mb-4">Add to Allow List</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Type</label
          >
          <select
            v-model="newEntry.type"
            class="w-full border rounded-md px-3 py-2"
          >
            <option value="email">Email</option>
            <option value="domain">Domain</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Value</label
          >
          <input
            v-model="newEntry.value"
            type="text"
            class="w-full border rounded-md px-3 py-2"
            :placeholder="
              newEntry.type === 'email' ? 'user@example.com' : 'example.com'
            "
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Notes (optional)</label
          >
          <input
            v-model="newEntry.notes"
            type="text"
            class="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div class="flex justify-end space-x-2">
          <button
            @click="showAddModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            @click="addToAllowList"
            class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
