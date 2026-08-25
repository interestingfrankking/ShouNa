<template>
  <div class="app-layout">
    <aside class="app-sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">
          <i class="fa-solid fa-box-open"></i>
        </div>
        <span class="sidebar-brand-text">家庭收纳备忘</span>
      </div>
      <nav class="sidebar-nav">
        <div class="sidebar-section-title">导航</div>
        <router-link to="/" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-house"></i>
          <span>仪表盘</span>
        </router-link>
        <router-link to="/items" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-boxes-stacked"></i>
          <span>物品列表</span>
        </router-link>
        <div class="sidebar-section-title">数据</div>
        <router-link to="/houses" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-building"></i>
          <span>住所</span>
        </router-link>
        <router-link to="/rooms" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-door-open"></i>
          <span>房间</span>
        </router-link>
        <router-link to="/storage" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-box-open"></i>
          <span>收纳位</span>
        </router-link>
        <router-link to="/families" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-people-group"></i>
          <span>家庭管理</span>
        </router-link>
        <router-link v-if="currentFamilyId" :to="`/families/${currentFamilyId}/members`" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-users"></i>
          <span>成员管理</span>
        </router-link>
        <div class="sidebar-section-title">系统</div>
        <router-link to="/trash" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-trash-can"></i>
          <span>回收站</span>
        </router-link>
        <router-link to="/settings" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-gear"></i>
          <span>设置</span>
        </router-link>
      </nav>
      <div class="sidebar-user" v-if="authStore.user">
        <div class="sidebar-avatar" :style="{ background: 'var(--color-primary)' }">
          {{ authStore.user.nickname?.[0] || authStore.user.email?.[0] || 'U' }}
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">{{ authStore.user.nickname || authStore.user.email }}</div>
          <div class="sidebar-user-email">{{ authStore.user.email }}</div>
        </div>
        <button class="sidebar-logout" @click="handleSidebarLogout" title="退出登录" aria-label="退出登录">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </aside>
    <div class="app-main">
      <header class="app-toolbar">
        <nav class="app-breadcrumb">
          <router-link to="/">首页</router-link>
          <span class="sep">/</span>
          <span class="current">{{ $route.meta.title || $route.name }}</span>
        </nav>
      </header>
      <main class="app-scroll">
        <slot />
      </main>
    </div>
    <ToastNotification />

    <!-- FAB 悬浮按钮（桌面端显示，移动端用底部工具栏 +） -->
    <button class="fab" @click="requestAddItem" aria-label="添加物品">
      <i class="fa-solid fa-plus"></i>
    </button>

    <!-- 直接添加物品 - ItemForm 底部弹窗 -->
    <Teleport to="body">
      <div v-if="showItemForm" class="bottom-sheet-overlay" @click.self="showItemForm = false"></div>
      <div v-if="showItemForm" class="bottom-sheet">
        <div class="sheet-handle"></div>
        <h3>添加物品</h3>
        <ItemForm
          :family-id="familyId"
          @save="onItemSave"
          @cancel="showItemForm = false"
        />
      </div>
    </Teleport>

    <nav class="app-tab-bar">
      <router-link to="/" class="tab-item" active-class="active">
        <i class="fa-solid fa-house"></i>
        <span>首页</span>
      </router-link>
      <router-link to="/items" class="tab-item" active-class="active">
        <i class="fa-solid fa-boxes-stacked"></i>
        <span>物品</span>
      </router-link>
      <button class="tab-item add-btn" @click="requestAddItem" aria-label="添加物品">
        <i class="fa-solid fa-circle-plus"></i>
        <span>添加</span>
      </button>
      <router-link to="/trash" class="tab-item" active-class="active">
        <i class="fa-solid fa-trash-can"></i>
        <span>回收站</span>
      </router-link>
      <router-link to="/settings" class="tab-item" active-class="active">
        <i class="fa-solid fa-gear"></i>
        <span>设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { useFab } from '@/composables/useFab'
import { useToast } from '@/composables/useToast'
import { syncItemPhotos } from '@/utils/photos'
import api from '@/api'
import ToastNotification from '@/components/ToastNotification.vue'
import ItemForm from '@/components/ItemForm.vue'

const authStore = useAuthStore()
const familyStore = useFamilyStore()
const route = useRoute()
const router = useRouter()
const { show: showToast } = useToast()
const currentFamilyId = computed(() => familyStore.currentFamilyId)

const { pendingAction, requestAddItem, clearAction } = useFab()

const showItemForm = ref(false)
const familyId = computed(() => Number(familyStore.currentFamilyId))

// 监听 FAB 动作：处理"直接添加物品"
watch(pendingAction, (action) => {
  if (action === 'add-item') {
    // 物品列表页（含收纳位物品页）由 ItemsView 自己的表单处理
    if (route.name === 'Items' || route.name === 'ItemsSearch') return
    showItemForm.value = true
    clearAction()
  }
  // 'add-current' 由各视图自行监听处理
})

async function onItemSave(itemData) {
  try {
    // If custom storage name provided, create the storage spot first
    let storageSpotId = itemData.storage_spot_id
    if (!storageSpotId && itemData.custom_storage_name && itemData.room_id) {
      const res = await api.post('/storage', { room_id: itemData.room_id, name: itemData.custom_storage_name })
      storageSpotId = res.data.id
    }

    const saveData = { ...itemData, storage_spot_id: storageSpotId }
    delete saveData.photos
    delete saveData.deletedPhotoIds
    delete saveData.custom_storage_name

    const res = await api.post('/items', saveData)
    showItemForm.value = false
    showToast('物品添加成功')
    // 上传本次选择的照片，再跳转到物品详情页
    if (res.data && res.data.id) {
      await syncItemPhotos(res.data.id, itemData.photos, itemData.deletedPhotoIds)
      router.push('/items/' + res.data.id)
    }
  } catch {
    showToast('添加物品失败', 'error')
  }
}

onMounted(async () => {
  if (!currentFamilyId.value) {
    await familyStore.fetchFamilies()
  }
})

async function handleSidebarLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
