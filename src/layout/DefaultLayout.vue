<template>
  <div class="default-layout">
    <!-- 顶部导航 -->
    <nav class="dashboard-nav">
      <div class="nav-container">
        <div class="nav-brand">
          <img src="/icons/xiaoyugan.png" alt="XYZW" class="brand-logo" />
          <div class="brand-toggle" @click="isMobileMenuOpen = true">
            <n-icon>
              <Menu />
            </n-icon>
            <span class="brand-text">XYZW 控制台</span>
          </div>
        </div>

        <div class="nav-menu">
          <router-link
            to="/admin/dashboard"
            class="nav-item"
            active-class="active"
          >
            <n-icon>
              <Home />
            </n-icon>
            <span>首页</span>
          </router-link>
          
          <!-- 游戏功能 - 带分组下拉菜单 -->
          <n-dropdown
            :options="gameFeaturesMenuOptions"
            @select="handleTokenSelect"
            trigger="click"
            placement="bottom-start"
          >
            <router-link
              to="/admin/game-features"
              class="nav-item"
              :class="{ active: isGameFeaturesPage }"
              @click.prevent
            >
              <n-icon>
                <Cube />
              </n-icon>
              <span>游戏功能</span>
              <n-icon size="small">
                <ChevronDown />
              </n-icon>
            </router-link>
          </n-dropdown>
          
          <router-link to="/tokens" class="nav-item" active-class="active">
            <n-icon>
              <PersonCircle />
            </n-icon>
            <span>Token管理</span>
          </router-link>
          <router-link
            to="/admin/batch-daily-tasks"
            class="nav-item"
            active-class="active"
          >
            <n-icon>
              <Layers />
            </n-icon>
            <span>批量日常</span>
          </router-link>
          <router-link
            to="/admin/task-monitor"
            class="nav-item"
            active-class="active"
          >
            <n-icon>
              <TimeOutline />
            </n-icon>
            <span>任务监控</span>
          </router-link>
          <router-link
            to="/admin/message-test"
            class="nav-item"
            active-class="active"
          >
            <n-icon>
              <ChatbubbleEllipsesSharp />
            </n-icon>
            <span>消息测试</span>
          </router-link>
          <router-link to="/admin/legion-war" class="nav-item" active-class="active"  v-if="isNowInLegionWarTime()" >
            <n-icon>
              <LockOpen />
            </n-icon>
            <span>实时盐场</span>
          </router-link>
        </div>

        <div class="nav-user">
          <!-- 主题切换按钮 -->
          <ThemeToggle />

          <!-- 游戏功能页面显示token选择器 -->
          <n-dropdown v-if="isGameFeaturesPage" :options="userMenuOptions" @select="handleUserAction">
            <div class="user-info">
              <n-avatar
                :src="selectedToken?.avatar || '/icons/xiaoyugan.png'"
                size="medium"
                fallback-src="/icons/xiaoyugan.png"
              />
              <span class="username">{{
                selectedToken?.name || "未选择Token"
              }}</span>
              <n-icon>
                <ChevronDown />
              </n-icon>
            </div>
          </n-dropdown>
        </div>
      </div>
    </nav>
    <n-drawer
      v-model:show="isMobileMenuOpen"
      placement="left"
      style="width: 260px"
    >
      <div class="drawer-menu">
        <router-link
          to="/admin/dashboard"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Home />
          </n-icon>
          <span>首页</span>
        </router-link>
        <router-link
          to="/admin/game-features"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Cube />
          </n-icon>
          <span>游戏功能</span>
        </router-link>
        <router-link
          to="/tokens"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <PersonCircle />
          </n-icon>
          <span>Token管理</span>
        </router-link>
        <router-link
          to="/admin/daily-tasks"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Settings />
          </n-icon>
          <span>任务管理</span>
        </router-link>
        <router-link
          to="/admin/batch-daily-tasks"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Layers />
          </n-icon>
          <span>批量日常</span>
        </router-link>
        <router-link
          to="/admin/task-monitor"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <TimeOutline />
          </n-icon>
          <span>任务监控</span>
        </router-link>
        <router-link
          to="/admin/message-test"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <ChatbubbleEllipsesSharp />
          </n-icon>
          <span>消息测试</span>
        </router-link>
          <router-link to="/admin/legion-war" class="nav-item" active-class="active"  v-if="isNowInLegionWarTime()" >
            <n-icon>
              <LockOpen />
            </n-icon>
            <span>实时盐场</span>
          </router-link>
        <router-link
          to="/admin/profile"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Settings />
          </n-icon>
          <span>个人设置</span>
        </router-link>
      </div>
    </n-drawer>
    <div class="main">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import {
  useTokenStore,
  selectedToken,
  selectedTokenId,
  tokenGroups,
  gameTokens,
} from "@/stores/tokenStore";
import ThemeToggle from "@/components/Common/ThemeToggle.vue";
import {
  Home,
  PersonCircle,
  Cube,
  Settings,
  ChevronDown,
  ChatbubbleEllipsesSharp,
  LockClosedSharp,LockOpen,
  Menu,
  Layers,
  TimeOutline,
} from "@vicons/ionicons5";

import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ref, computed, h } from 'vue'
import { isNowInLegionWarTime } from '@/utils/clubBattleUtils'
import { NIcon, NAvatar, NText } from 'naive-ui'

const tokenStore = useTokenStore();
const router = useRouter();
const route = useRoute();
const message = useMessage();

const isMobileMenuOpen = ref(false);

const isGameFeaturesPage = computed(() => {
  return route.path === '/admin/game-features';
});

const userMenuOptions = [
  {
    label: "清除所有Token并退出",
    key: "logout",
  },
];

const gameFeaturesMenuOptions = computed(() => {
  const groups = tokenGroups.value || [];
  const tokens = gameTokens.value || [];
  
  if (groups.length === 0) {
    return tokens.map(token => ({
      label: () => h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
        h(NAvatar, { 
          src: token.avatar || '/icons/xiaoyugan.png', 
          size: 'small',
          fallbackSrc: '/icons/xiaoyugan.png'
        }),
        h('span', token.name),
        token.server ? h(NText, { depth: 3, style: { fontSize: '12px' } }, () => `[${token.server}]`) : null
      ]),
      key: token.id,
    }));
  }
  
  return groups.map(group => {
    const groupTokens = group.tokenIds
      .map(id => tokens.find(t => t.id === id))
      .filter(Boolean);
    
    if (groupTokens.length === 0) {
      return null;
    }
    
    return {
      label: group.name,
      key: `group_${group.id}`,
      children: groupTokens.map(token => ({
        label: () => h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
          h(NAvatar, { 
            src: token.avatar || '/icons/xiaoyugan.png', 
            size: 'small',
            fallbackSrc: '/icons/xiaoyugan.png'
          }),
          h('span', token.name),
          token.server ? h(NText, { depth: 3, style: { fontSize: '12px' } }, () => `[${token.server}]`) : null
        ]),
        key: `${group.id}_${token.id}`,
      }))
    };
  }).filter(Boolean);
});

const handleTokenSelect = (key) => {
  console.log('handleTokenSelect called with key:', key);
  
  if (key.startsWith('group_')) {
    console.log('Skipping group click');
    return;
  }
  
  // key 格式: groupId_tokenId 或 tokenId
  const lastUnderscoreIndex = key.lastIndexOf('_');
  const tokenId = lastUnderscoreIndex === -1 ? key : key.slice(lastUnderscoreIndex + 1);
  
  console.log('Parsed tokenId:', tokenId);
  
  const token = gameTokens.value.find(t => t.id === tokenId);
  console.log('Found token:', token);
  
  if (token) {
    tokenStore.selectToken(tokenId);
    message.success(`已切换到: ${token.name}`);
    router.push('/admin/game-features');
  } else {
    console.log('Token not found, available tokens:', gameTokens.value.map(t => t.id));
  }
};

// 方法
const handleUserAction = async (key) => {
  switch (key) {
    case "logout":
      await tokenStore.clearAllTokens();
      message.success("已清除所有Token");
      router.push("/tokens");
      break;
  }
};
</script>

<style scoped lang="scss">
// 导航栏
.dashboard-nav {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  padding: 0 var(--spacing-lg);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.nav-container {
  display: flex;
  align-items: center;
  height: 64px;
  max-width: 1400px;
  margin: 0 auto;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-right: var(--spacing-xl);
}

.brand-logo {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-small);
}

.brand-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.brand-toggle {
  display: none;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  font-size: var(--font-size-lg);
}

.brand-toggle .n-icon {
  font-size: inherit;
}

.nav-menu {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-medium);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.active {
    background: var(--primary-color-light);
    color: var(--primary-color);
  }
}

.nav-user {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: var(--bg-tertiary);
  }
}

.username {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .nav-item span {
    display: none;
  }

  .nav-menu {
    display: none;
  }

  .nav-item {
    padding: var(--spacing-sm);
    flex: 0 0 auto;
  }

  .nav-container {
    height: 56px;
  }

  .brand-logo {
    display: none;
  }

  .brand-toggle {
    display: inline-flex;
  }
}

.drawer-menu {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-medium);
  color: var(--text-secondary);
  text-decoration: none;
}

.drawer-item.router-link-active {
  background: var(--primary-color-light);
  color: var(--primary-color);
}

/* 禁用样式：灰化、鼠标禁止、无hover效果 */
.nav-item.disabled {
  background: #cccccc;
  color: #999999;
  cursor: not-allowed; /* 鼠标样式：禁止 */
  pointer-events: none; /* 可选：直接禁用所有鼠标事件（比阻止click更彻底） */
}
</style>
