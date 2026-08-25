<template>
  <div class="location-selector">
    <div class="form-group">
      <label class="form-label">房屋</label>
      <select class="form-select" v-model="selectedHouseId" @change="onHouseChange">
        <option value="">请选择房屋</option>
        <option v-for="house in houses" :key="house.id" :value="house.id">{{ house.name }}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">房间</label>
      <select class="form-select" v-model="selectedRoomId" @change="onRoomChange" :disabled="!selectedHouseId">
        <option value="">请选择房间</option>
        <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">收纳位置</label>
      <template v-if="isCustomStorage">
        <div class="custom-storage-wrapper">
          <input class="form-input" v-model="customStorageName" placeholder="输入新的收纳位置名称" />
          <button type="button" class="custom-storage-back" @click="cancelCustomStorage" title="返回选择">✕</button>
        </div>
      </template>
      <template v-else>
        <select class="form-select" v-model="selectedStorageId" :disabled="!selectedRoomId" @change="onStorageChange">
          <option value="">请选择收纳位置</option>
          <option v-for="storage in storages" :key="storage.id" :value="storage.id">{{ storage.name }}</option>
          <option v-if="selectedRoomId" value="__custom__">+ 自定义输入</option>
        </select>
      </template>
    </div>

    <!-- 引导提示：缺少层级数据时告知用户先创建 -->
    <div v-if="houses.length === 0" class="location-hint">
      <i class="fa-solid fa-circle-info"></i>
      还没有住所，请先到
      <router-link to="/houses">「住所」</router-link>
      页面创建住所，再添加房间和收纳位
    </div>
    <div v-else-if="selectedHouseId && rooms.length === 0" class="location-hint">
      <i class="fa-solid fa-circle-info"></i>
      该住所还没有房间，请先到
      <router-link to="/houses">「住所」</router-link>
      页面添加房间
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '@/api'

const props = defineProps({
  familyId: { type: Number, required: true },
  defaultHouseId: { type: Number, default: null },
  defaultRoomId: { type: Number, default: null },
  defaultStorageId: { type: Number, default: null }
})

const emit = defineEmits(['update:houseId', 'update:roomId', 'update:storageId', 'change'])

const houses = ref([])
const rooms = ref([])
const storages = ref([])
const selectedHouseId = ref('')
const selectedRoomId = ref('')
const selectedStorageId = ref('')
const isCustomStorage = ref(false)
const customStorageName = ref('')

async function fetchHouses() {
  try {
    const res = await api.get(`/houses?family=${props.familyId}`)
    houses.value = res.data || []
    if (props.defaultHouseId) {
      selectedHouseId.value = props.defaultHouseId
      await fetchRooms()
    }
    emitChange()
  } catch {
    houses.value = []
  }
}

async function fetchRooms() {
  if (!selectedHouseId.value) {
    rooms.value = []
    return
  }
  try {
    const res = await api.get(`/rooms?house=${selectedHouseId.value}`)
    rooms.value = res.data || []
    if (props.defaultRoomId) {
      selectedRoomId.value = props.defaultRoomId
      await fetchStorages()
    }
    emitChange()
  } catch {
    rooms.value = []
  }
}

async function fetchStorages() {
  if (!selectedRoomId.value) {
    storages.value = []
    return
  }
  try {
    const res = await api.get(`/storage?room=${selectedRoomId.value}`)
    storages.value = res.data || []
    if (props.defaultStorageId) {
      selectedStorageId.value = props.defaultStorageId
    }
    emitChange()
  } catch {
    storages.value = []
  }
}

function onHouseChange() {
  selectedRoomId.value = ''
  selectedStorageId.value = ''
  isCustomStorage.value = false
  customStorageName.value = ''
  rooms.value = []
  storages.value = []
  fetchRooms()
  emitChange()
}

function onRoomChange() {
  selectedStorageId.value = ''
  isCustomStorage.value = false
  customStorageName.value = ''
  storages.value = []
  fetchStorages()
  emitChange()
}

function onStorageChange() {
  if (selectedStorageId.value === '__custom__') {
    isCustomStorage.value = true
    selectedStorageId.value = ''
    customStorageName.value = ''
  }
  emitChange()
}

function cancelCustomStorage() {
  isCustomStorage.value = false
  customStorageName.value = ''
  emitChange()
}

function emitChange() {
  const storageId = isCustomStorage.value ? null : (selectedStorageId.value || null)
  const customName = isCustomStorage.value ? (customStorageName.value?.trim() || null) : null
  emit('update:houseId', selectedHouseId.value || null)
  emit('update:roomId', selectedRoomId.value || null)
  emit('update:storageId', storageId)
  emit('change', {
    houseId: selectedHouseId.value || null,
    roomId: selectedRoomId.value || null,
    storageId,
    customStorageName: customName
  })
}

watch(customStorageName, () => {
  emitChange()
})

onMounted(() => {
  fetchHouses()
})
</script>

<style scoped>
.location-hint {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-info-light, #eff6ff);
  color: var(--color-info, #2563eb);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  line-height: 1.6;
  flex-wrap: wrap;
}

.location-hint a {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  text-decoration: underline;
}

.custom-storage-wrapper {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.custom-storage-wrapper .form-input {
  flex: 1;
}

.custom-storage-back {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-neutral-300, #d1d5db);
  border-radius: 6px;
  background: var(--color-neutral-50, #f9fafb);
  color: var(--color-neutral-500, #6b7280);
  cursor: pointer;
  font-size: var(--text-sm, 14px);
  line-height: 1;
  padding: 0;
}

.custom-storage-back:hover {
  background: var(--color-neutral-100, #f3f4f6);
  color: var(--color-neutral-700, #374151);
}
</style>
