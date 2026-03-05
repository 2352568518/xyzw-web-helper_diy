<template>
  <n-config-provider :theme="naiveTheme">
    <n-message-provider>
      <n-loading-bar-provider>
        <n-notification-provider>
          <n-dialog-provider>
            <div id="app">
              <!-- 无论是否有API密钥，都先显示加载状态 -->
              <div v-if="!appReady" class="loading-container">
                <div class="loading-spinner"></div>
                <p>正在加载应用...</p>
              </div>
              <!-- 应用就绪后，根据API密钥状态显示内容 -->
              <template v-else>
                <!-- 如果API密钥未设置，显示设置界面 -->
                <ApiKeySetup v-if="!hasApiKey" />
                <!-- 否则显示正常应用 -->
                <router-view v-else />
              </template>
            </div>
          </n-dialog-provider>
        </n-notification-provider>
      </n-loading-bar-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { darkTheme } from "naive-ui";
import { useTheme } from "@/composables/useTheme";
import { useApiKey } from "@/composables/useApiKey";
import ApiKeySetup from "@/components/ApiKeySetup.vue";

const { isDark, initTheme, setupSystemThemeListener, updateReactiveState } =
  useTheme();
const { checkApiKey } = useApiKey();

const hasApiKey = ref(false);
const appReady = ref(false);
let tokenStore = null;

// Naive UI 主题
const naiveTheme = computed(() => {
  return isDark.value ? darkTheme : null;
});

// 监听主题变化事件
const handleThemeChange = () => {
  // 确保响应式状态同步
  updateReactiveState();
  // 强制重新渲染
  setTimeout(() => {
    updateReactiveState();
  }, 50);
};

onMounted(() => {
  initTheme();
  setupSystemThemeListener();

  // 检查API密钥是否已设置
  hasApiKey.value = checkApiKey();

  // 如果API密钥未设置，不初始化token store
  if (hasApiKey.value) {
    // 动态导入token store以避免初始化问题
    import("@/stores/tokenStore").then(({ useTokenStore }) => {
      tokenStore = useTokenStore();
      tokenStore.initTokenStore();
    });
  }

  // 监听自定义主题变化事件
  window.addEventListener("theme-change", handleThemeChange);

  // 初始化时更新状态
  updateReactiveState();
  
  // 标记应用就绪
  appReady.value = true;
});

onUnmounted(() => {
  window.removeEventListener("theme-change", handleThemeChange);
});
</script>

<style>
/* 主题变量 */
:root {
  --app-background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --text-color: #333;
  --text-secondary: #666;
  --text-tertiary: #999;
  --bg-color: #ffffff;
  --border-color: #e0e0e0;
}

/* 深色主题变量 */
.dark {
  --app-background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  --text-color: #ffffff !important;
  --text-secondary: #cbd5e0 !important;
  --text-tertiary: #a0aec0 !important;
  --bg-color: #1a202c !important;
  --border-color: #4a5568 !important;
}

/* 深色主题样式优化 - 针对Naive UI组件 */
html.dark,
html[data-theme="dark"] {
  color-scheme: dark;
}

/* 全局深色主题文字颜色 */
html.dark *,
html[data-theme="dark"] * {
  color: #ffffff;
}

/* Naive UI 表单组件 */
html.dark .n-form-item-label,
html.dark .n-form-item-label__text,
html[data-theme="dark"] .n-form-item-label,
html[data-theme="dark"] .n-form-item-label__text {
  color: #ffffff !important;
}

/* Naive UI 输入组件 */
html.dark .n-input,
html.dark .n-input__input,
html.dark .n-input__textarea,
html[data-theme="dark"] .n-input,
html[data-theme="dark"] .n-input__input,
html[data-theme="dark"] .n-input__textarea {
  color: #ffffff !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
}

/* Naive UI 弹框组件 */
html.dark .n-modal,
html.dark .n-drawer,
html.dark .n-popover,
html.dark .n-dropdown,
html.dark .n-tooltip,
html.dark .n-dialog,
html[data-theme="dark"] .n-modal,
html[data-theme="dark"] .n-drawer,
html[data-theme="dark"] .n-popover,
html[data-theme="dark"] .n-dropdown,
html[data-theme="dark"] .n-tooltip,
html[data-theme="dark"] .n-dialog {
  color: #ffffff !important;
}

/* Naive UI 弹框内容 */
html.dark .n-modal .n-card,
html.dark .n-drawer-content,
html.dark .n-popover-content,
html.dark .n-dropdown-option,
html.dark .n-dialog__content,
html[data-theme="dark"] .n-modal .n-card,
html[data-theme="dark"] .n-drawer-content,
html[data-theme="dark"] .n-popover-content,
html[data-theme="dark"] .n-dropdown-option,
html[data-theme="dark"] .n-dialog__content {
  color: #ffffff !important;
}

/* Naive UI 下拉选项 */
html.dark .n-dropdown-option__label,
html.dark .n-select-option,
html.dark .n-menu-item-content,
html[data-theme="dark"] .n-dropdown-option__label,
html[data-theme="dark"] .n-select-option,
html[data-theme="dark"] .n-menu-item-content {
  color: #ffffff !important;
}

/* 其他组件 */
html.dark .n-collapse-item__header,
html.dark .n-radio-button,
html.dark .n-card,
html.dark .n-card__content,
html.dark .n-button,
html.dark .n-tag,
html[data-theme="dark"] .n-collapse-item__header,
html[data-theme="dark"] .n-radio-button,
html[data-theme="dark"] .n-card,
html[data-theme="dark"] .n-card__content,
html[data-theme="dark"] .n-button,
html[data-theme="dark"] .n-tag {
  color: #ffffff !important;
}

/* 标题和文本 */
html.dark h1,
html.dark h2,
html.dark h3,
html.dark h4,
html.dark h5,
html.dark h6,
html.dark p,
html.dark span,
html.dark div,
html.dark label,
html[data-theme="dark"] h1,
html[data-theme="dark"] h2,
html[data-theme="dark"] h3,
html[data-theme="dark"] h4,
html[data-theme="dark"] h5,
html[data-theme="dark"] h6,
html[data-theme="dark"] p,
html[data-theme="dark"] span,
html[data-theme="dark"] div,
html[data-theme="dark"] label {
  color: #ffffff !important;
}

/* 占位符文本 */
html.dark .n-input__placeholder,
html.dark ::placeholder,
html[data-theme="dark"] .n-input__placeholder,
html[data-theme="dark"] ::placeholder {
  color: rgba(255, 255, 255, 0.6) !important;
}

/* 确保Portal渲染的组件也应用深色主题 */
body.dark .n-modal-container,
body.dark .n-drawer-container,
body.dark .n-popover-container,
body[data-theme="dark"] .n-modal-container,
body[data-theme="dark"] .n-drawer-container,
body[data-theme="dark"] .n-popover-container {
  color: #ffffff !important;
}

#app {
  min-height: 100vh;
  background: var(--app-background);
  color: var(--text-color);
  transition:
    background 0.3s ease,
    color 0.3s ease;
}

.loading-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--app-background);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-container p {
  margin-top: 16px;
  color: white;
  font-size: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  font-family:
    "SF Pro Display",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    "Helvetica Neue",
    Helvetica,
    Arial,
    sans-serif;
  color: var(--text-color);
  transition: color 0.3s ease;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
