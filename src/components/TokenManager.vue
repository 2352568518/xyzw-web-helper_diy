<template>
  <a-card>
    <template #extra>
      <div class="header-actions">
        <n-button size="small" @click="refreshTokens">
          <template #icon>
            <n-icon>
              <Refresh />
            </n-icon>
          </template>
          <span class="btn-text">刷新</span>
        </n-button>
        <n-button size="small" type="warning" @click="exportTokens">
          <template #icon>
            <i class="i-mdi:download"></i>
          </template>
          <span class="btn-text">导出</span>
        </n-button>
        <n-upload :show-file-list="false" accept=".json" @change="importTokens">
          <n-button size="small" type="info">
            <template #icon>
              <n-icon>
                <CloudUpload />
              </n-icon>
            </template>
            <span class="btn-text">导入</span>
          </n-button>
        </n-upload>
      </div>
    </template>
    <template #default>
      <!-- 用户Token -->
      <div class="token-section">
        <h4>用户认证Token</h4>
        <div class="empty-token">
          <span>用户Token管理已移至Token导入页面</span>
        </div>
      </div>
      <!-- 游戏Token列表 -->
      <div class="token-section">
        <h4>
          游戏角色Token ({{ tokenStore.gameTokens.length }}个)
        </h4>
        <div class="game-tokens-list">
          <div
            v-for="token in tokenStore.gameTokens"
            :key="token.id"
            class="game-token-item"
          >
            <div class="token-header">
              <div class="role-info">
                <span class="role-name">{{ token.name }}</span>
                <span class="role-server">{{ token.server }}</span>
              </div>
              <div class="token-actions">
                <n-button
                  size="tiny"
                  :type="
                    getWSStatus(token.id) === 'connected' ? 'success' : 'default'
                  "
                  @click="toggleWebSocket(token.id, token)"
                >
                  {{ 
                    getWSStatus(token.id) === "connected" ? "断开WS" : "连接WS"
                  }}
                </n-button>

                <n-dropdown
                  :options="getTokenMenuOptions(token)"
                  trigger="click"
                  @select="handleTokenAction($event, token.id, token)"
                >
                  <n-button size="tiny" type="tertiary">
                    <template #icon>
                      <n-icon>
                        <EllipsisHorizontal />
                      </n-icon>
                    </template>
                  </n-button>
                </n-dropdown>
              </div>
            </div>

            <div class="token-details">
              <div class="detail-item">
                <span class="detail-label">Token:</span>
                <span class="detail-value">{{
                  maskToken(token.token)
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">WebSocket URL:</span>
                <span class="detail-value">{{ token.wsUrl }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">创建时间:</span>
                <span class="detail-value">{{
                  formatTime(token.createdAt)
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">最后使用:</span>
                <span class="detail-value">{{
                  formatTime(token.lastUsed || token.createdAt)
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">连接状态:</span>
                <n-tag
                  size="small"
                  :type="getWSStatusType(getWSStatus(token.id))"
                >
                  {{ getWSStatusText(getWSStatus(token.id)) }}
                </n-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <!-- 批量操作 -->
    <template #actions>
      <n-button type="warning" @click="cleanExpiredTokens">
        清理过期Token
      </n-button>
      <n-button type="error" @click="clearAllTokens"> 清除所有Token </n-button>
    </template>
  </a-card>
</template>

<script setup>
import { ref, h } from "vue";
import { useMessage, useDialog, NIcon } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { useGameRolesStore } from "@/stores/gameRoles";
import apiService from "@/services/apiService";
import {
  Refresh,
  Download,
  CloudUpload,
  EllipsisHorizontal,
  Create,
  TrashBin,
  SyncCircle,
  CopyOutline,
} from "@vicons/ionicons5";

const message = useMessage();
const dialog = useDialog();
const tokenStore = useTokenStore();
const gameRolesStore = useGameRolesStore();

// 方法
const maskToken = (token) => {
  if (!token) return "";
  const len = token.length;
  if (len <= 8) return token;
  return token.substring(0, 8) + "***" + token.substring(len - 8);
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString("zh-CN");
};

const getWSStatus = (roleId) => {
  return tokenStore.getWebSocketStatus(roleId);
};

const getWSStatusType = (status) => {
  switch (status) {
    case "connected":
      return "success";
    case "error":
      return "error";
    case "connecting":
      return "warning";
    default:
      return "default";
  }
};

const getWSStatusText = (status) => {
  switch (status) {
    case "connected":
      return "已连接";
    case "error":
      return "连接错误";
    case "connecting":
      return "连接中";
    default:
      return "未连接";
  }
};

// 获取Token菜单选项
const getTokenMenuOptions = (tokenData) => {
  const options = [
    {
      label: "编辑",
      key: "edit",
      icon: () => h(NIcon, null, { default: () => h(Create) }),
    },
    {
      label: "复制Token",
      key: "copy",
      icon: () => h(NIcon, null, { default: () => h(CopyOutline) }),
    },
  ];

  // 如果是URL获取的Token，显示刷新选项
  if (tokenData.importMethod === "url" && tokenData.sourceUrl) {
    options.unshift({
      label: "从URL刷新",
      key: "refresh-url",
      icon: () => h(NIcon, null, { default: () => h(SyncCircle) }),
    });
  } else {
    // 手动添加的Token显示重新生成选项
    options.unshift({
      label: "刷新Token",
      key: "refresh",
      icon: () => h(NIcon, null, { default: () => h(Refresh) }),
    });
  }

  options.push(
    { type: "divider" },
    {
      label: "删除",
      key: "delete",
      icon: () => h(NIcon, null, { default: () => h(TrashBin) }),
    },
  );

  return options;
};

// 处理Token菜单操作
const handleTokenAction = (action, roleId, tokenData) => {
  switch (action) {
    case "edit":
      editToken(roleId, tokenData);
      break;
    case "copy":
      copyToken(tokenData.token);
      break;
    case "refresh":
      regenerateToken(roleId);
      break;
    case "refresh-url":
      refreshTokenFromUrl(roleId, tokenData);
      break;
    case "delete":
      removeToken(roleId);
      break;
  }
};

const refreshTokens = () => {
  tokenStore.initTokenStore();
  message.success("Token数据已刷新");
};

// 用户Token管理已移至Token导入页面

const toggleWebSocket = (roleId, tokenData) => {
  const status = getWSStatus(roleId);

  if (status === "connected") {
    tokenStore.closeWebSocketConnection(roleId);
    message.info("WebSocket连接已断开");
  } else {
    try {
      tokenStore.createWebSocketConnection(
        roleId,
        tokenData.token,
        tokenData.wsUrl,
      );
      message.success("正在建立WebSocket连接...");
    } catch (error) {
      message.error("建立WebSocket连接失败");
    }
  }
};

const regenerateToken = (roleId) => {
  const oldTokenData = tokenStore.gameTokens.find(token => token.id === roleId);
  if (!oldTokenData) {
    message.error("找不到对应的Token数据");
    return;
  }

  // 检查是否有源URL可以重新获取
  if (!oldTokenData.sourceUrl) {
    message.warning(
      "该Token没有配置源地址，无法重新生成。请手动重新导入Token。",
    );
    return;
  }

  dialog.info({
    title: "重新获取Token",
    content: "确定要从源地址重新获取此角色的Token吗？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        // 显示加载状态
        const loadingMsg = message.loading("正在重新获取Token...", {
          duration: 0,
        });

        // 从源URL重新获取token
        let response;
        const sourceUrl = oldTokenData.sourceUrl;

        // 使用与TokenImport相同的跨域处理逻辑
        const isLocalUrl =
          sourceUrl.startsWith(window.location.origin) ||
          sourceUrl.startsWith("/") ||
          sourceUrl.startsWith("http://localhost") ||
          sourceUrl.startsWith("http://127.0.0.1");

        if (isLocalUrl) {
          response = await fetch(sourceUrl);
        } else {
          try {
            response = await fetch(sourceUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
              mode: "cors",
            });
          } catch (corsError) {
            throw new Error(
              `跨域请求被阻止。请确保目标服务器支持CORS。错误详情: ${corsError.message}`,
            );
          }
        }

        if (!response.ok) {
          throw new Error(
            `请求失败: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (!data.token) {
          throw new Error("返回数据中未找到token字段");
        }

        // 更新token
        await tokenStore.updateToken(roleId, {
          token: data.token,
          server: data.server || oldTokenData.server,
          regeneratedAt: new Date().toISOString(),
          lastRefreshed: new Date().toISOString(),
        });

        // 如果当前token有连接，需要重新连接
        if (tokenStore.getWebSocketStatus(roleId) === "connected") {
          tokenStore.closeWebSocketConnection(roleId);
          setTimeout(() => {
            tokenStore.createWebSocketConnection(
              roleId,
              data.token,
              oldTokenData.wsUrl,
            );
          }, 500);
        }

        loadingMsg.destroy();
        message.success("Token已成功重新获取");
      } catch (error) {
        console.error("重新获取Token失败:", error);
        message.error(error.message || "Token重新获取失败");
      }
    },
  });
};

const removeToken = async (roleId) => {
  dialog.warning({
    title: "删除Token",
    content: "确定要删除此角色的游戏Token吗？这将断开相关的WebSocket连接。",
    positiveText: "确定删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      const success = await tokenStore.removeToken(roleId);
      if (success) {
        message.success("Token已删除");
      } else {
        message.error("删除Token失败");
      }
    },
  });
};

// 编辑Token（暂时显示提示信息，后续可以实现编辑功能）
const editToken = (roleId, tokenData) => {
  message.info("编辑功能正在开发中");
};

// 复制Token到剪贴板
const copyToken = async (token) => {
  try {
    await navigator.clipboard.writeText(token);
    message.success("Token已复制到剪贴板");
  } catch (error) {
    // 降级方案
    const textArea = document.createElement("textarea");
    textArea.value = token;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    message.success("Token已复制到剪贴板");
  }
};

// 从URL刷新Token
const refreshTokenFromUrl = async (roleId, tokenData) => {
  if (!tokenData.sourceUrl) {
    message.warning("该Token没有配置源URL");
    return;
  }

  dialog.info({
    title: "从URL刷新Token",
    content: `确定要从源URL重新获取Token吗？\n源地址：${tokenData.sourceUrl}`,
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        const loadingMsg = message.loading("正在从URL获取新Token...", {
          duration: 0,
        });

        // 使用与TokenImport相同的逻辑获取Token
        let response;
        const isLocalUrl =
          tokenData.sourceUrl.startsWith(window.location.origin) ||
          tokenData.sourceUrl.startsWith("/") ||
          tokenData.sourceUrl.startsWith("http://localhost") ||
          tokenData.sourceUrl.startsWith("http://127.0.0.1");

        if (isLocalUrl) {
          response = await fetch(tokenData.sourceUrl);
        } else {
          // 跨域请求，使用代理
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(tokenData.sourceUrl)}`;
          response = await fetch(proxyUrl);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.token) {
          throw new Error("返回数据中未找到token字段");
        }

        // 更新Token
        await apiService.updateToken(roleId, {
          token: data.token,
          lastUsed: new Date().toISOString(),
        });

        loadingMsg.destroy();
        message.success("Token刷新成功");
      } catch (error) {
        console.error("URL刷新Token失败:", error);
        message.error("刷新失败: " + error.message);
      }
    },
  });
};

const exportTokens = async () => {
  try {
    // 检查是否使用后端API
    const useBackend = await apiService.shouldUseBackend();
    
    let exportData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      tokens: [],
      tokenSettings: [],
      taskTemplates: [],
      scheduledTasks: [],
      batchSettings: null
    };
    
    if (useBackend) {
      // 从后端获取所有数据
      const [tokensResult, settingsResult, templatesResult, tasksResult] = await Promise.all([
        apiService.getTokens(),
        apiService.getAllTokenSettings(),
        apiService.getTaskTemplates(),
        apiService.getTasks()
      ]);
      
      // Token 列表
      exportData.tokens = tokensResult.success ? (tokensResult.data || []) : [];
      
      // Token 设置
      exportData.tokenSettings = settingsResult.success ? (settingsResult.data || []) : [];
      
      // 任务模板
      exportData.taskTemplates = templatesResult.success ? (templatesResult.data || []) : [];
      
      // 定时任务
      exportData.scheduledTasks = tasksResult.success ? (tasksResult.data || []) : [];
      
    } else {
      // 本地模式
      exportData.tokens = tokenStore.gameTokens || [];
    }
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `xyzw_full_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();

    message.success(`导出成功: ${exportData.tokens.length} 个Token, ${exportData.tokenSettings.length} 个设置, ${exportData.taskTemplates.length} 个模板, ${exportData.scheduledTasks.length} 个定时任务`);
  } catch (error) {
    console.error('导出失败:', error);
    message.error("导出失败: " + error.message);
  }
};

const importTokens = async ({ file }) => {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importData = JSON.parse(e.target.result);
      
      // 检测配置文件版本
      const version = importData.version || '1.0';
      console.log(`导入配置文件版本: ${version}`);
      
      // 检查是否使用后端API
      const useBackend = await apiService.shouldUseBackend();
      
      if (useBackend) {
        let importedTokens = 0;
        let importedSettings = 0;
        let importedTemplates = 0;
        let importedTasks = 0;
        let skippedTokens = 0;
        let skippedTasks = 0;
        
        // 用于存储 ID 映射（旧ID -> 新ID）
        const tokenIdMap = new Map();
        
        // 先从后端获取已有的 Token 列表
        const existingTokensResult = await apiService.getTokens();
        const existingTokens = existingTokensResult.success ? (existingTokensResult.data || []) : [];
        const existingTokenIds = new Set(existingTokens.map(t => t.id));
        const existingTokenStrings = new Set(existingTokens.map(t => t.token));
        const existingTokenNames = new Map(existingTokens.map(t => [t.name, t]));
        
        // 1. 导入 Token 列表 (兼容 gameTokens 和 tokens 字段)
        const tokensToImport = importData.tokens || importData.gameTokens;
        if (tokensToImport) {
          const tokensArray = Array.isArray(tokensToImport) 
            ? tokensToImport 
            : Object.entries(tokensToImport).map(([id, data]) => ({ id, ...data }));
          
          for (const data of tokensArray) {
            try {
              // 兼容多种字段名格式
              const tokenInfo = {
                id: data.id,
                name: data.name || data.roleName || '未命名',
                token: data.token,
                ws_url: data.wsUrl || data.ws_url || null,
                server: data.server || '未知',
                remark: data.remark || '',
                import_method: data.import_method || data.importMethod || 'import',
                source_url: data.source_url || data.sourceUrl || null,
                avatar: data.avatar || '',
                is_active: data.is_active !== false,
                sort_order: data.sort_order || data.sortOrder || undefined
              };
              
              // 跳过无效的 token
              if (!tokenInfo.token) {
                console.warn('跳过无效Token（缺少token字段）:', tokenInfo.id);
                skippedTokens++;
                continue;
              }
              
              // 检查是否已存在（按 ID、token 字符串或名称）
              const existsById = existingTokenIds.has(tokenInfo.id);
              const existsByToken = existingTokenStrings.has(tokenInfo.token);
              const existsByName = existingTokenNames.has(tokenInfo.name);
              
              if (existsById) {
                console.log('跳过已存在的Token（ID相同）:', tokenInfo.id);
                // 记录 ID 映射
                tokenIdMap.set(tokenInfo.id, tokenInfo.id);
                skippedTokens++;
                continue;
              }
              
              if (existsByToken) {
                // 找到已存在的 Token，记录 ID 映射
                const existingToken = existingTokens.find(t => t.token === tokenInfo.token);
                if (existingToken) {
                  tokenIdMap.set(tokenInfo.id, existingToken.id);
                  console.log('跳过已存在的Token（token相同）:', tokenInfo.name, '映射:', tokenInfo.id, '->', existingToken.id);
                }
                skippedTokens++;
                continue;
              }
              
              // 按名称检查重复（处理 token 刷新后字符串变化的情况）
              if (existsByName && tokenInfo.name) {
                const existingToken = existingTokenNames.get(tokenInfo.name);
                if (existingToken) {
                  tokenIdMap.set(tokenInfo.id, existingToken.id);
                  console.log('跳过已存在的Token（名称相同）:', tokenInfo.name, '映射:', tokenInfo.id, '->', existingToken.id);
                  skippedTokens++;
                  continue;
                }
              }
              
              // 创建新 Token
              const result = await apiService.createToken(tokenInfo);
              if (result.success && result.data?.id) {
                importedTokens++;
                // 记录 ID 映射（旧ID -> 新ID）
                if (tokenInfo.id !== result.data.id) {
                  tokenIdMap.set(tokenInfo.id, result.data.id);
                  console.log('Token ID 映射:', tokenInfo.id, '->', result.data.id);
                }
                // 添加到已存在列表，防止重复
                existingTokenIds.add(result.data.id);
                existingTokenStrings.add(tokenInfo.token);
              } else {
                console.warn('创建Token失败:', result.error);
                skippedTokens++;
              }
            } catch (tokenError) {
              console.error('导入Token失败:', tokenError);
              skippedTokens++;
            }
          }
        }
        
        // 2. 导入任务模板 (可选，旧版本可能没有)
        if (importData.taskTemplates && Array.isArray(importData.taskTemplates)) {
          // 先获取现有模板列表
          const existingTemplatesResult = await apiService.getTaskTemplates();
          const existingTemplates = existingTemplatesResult.success ? (existingTemplatesResult.data || []) : [];
          const existingTemplateNames = existingTemplates.map(t => t.name);
          
          for (const template of importData.taskTemplates) {
            try {
              if (template.name && template.settings) {
                // 检查是否已存在同名模板
                if (existingTemplateNames.includes(template.name)) {
                  console.log('跳过已存在的模板:', template.name);
                  continue;
                }
                const result = await apiService.createTaskTemplate({
                  name: template.name,
                  settings: template.settings
                });
                if (result.success) {
                  importedTemplates++;
                }
              }
            } catch (templateError) {
              console.warn('导入任务模板失败:', templateError);
            }
          }
        }
        
        // 3. 导入 Token 设置 (可选，旧版本可能没有)
        if (importData.tokenSettings && Array.isArray(importData.tokenSettings)) {
          for (const setting of importData.tokenSettings) {
            try {
              let tokenId = setting.token_id || setting.tokenId;
              if (tokenId && setting.settings) {
                // 使用 ID 映射获取新的 Token ID
                const mappedTokenId = tokenIdMap.get(tokenId) || tokenId;
                
                // 验证 tokenId 是否是有效的 UUID 格式
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(mappedTokenId)) {
                  console.warn('跳过无效的Token ID格式:', mappedTokenId);
                  continue;
                }
                
                const result = await apiService.saveTokenSettings(
                  mappedTokenId, 
                  setting.settings, 
                  setting.template_id || setting.templateId
                );
                if (result.success) {
                  importedSettings++;
                }
              }
            } catch (settingError) {
              console.warn('导入Token设置失败:', settingError);
            }
          }
        }
        
        // 4. 导入定时任务 (可选，旧版本可能没有)
        if (importData.scheduledTasks && Array.isArray(importData.scheduledTasks)) {
          for (const task of importData.scheduledTasks) {
            try {
              if (task.name) {
                // 兼容多种字段名格式
                const taskData = {
                  id: task.id,
                  name: task.name,
                  type: task.type || 'daily',
                  token_ids: task.token_ids || task.selectedTokens || [],
                  run_type: task.run_type || task.runType || 'daily',
                  run_time: task.run_time || task.runTime || '00:00',
                  cron_expression: task.cron_expression || task.cronExpression || '0 0 * * *',
                  settings: {
                    selectedTasks: task.settings?.selectedTasks || task.selectedTasks || []
                  },
                  is_active: task.is_active !== false && task.enabled !== false
                };
                const result = await apiService.createTask(taskData);
                if (result.success) {
                  importedTasks++;
                } else {
                  console.warn('创建定时任务失败:', result.error);
                  skippedTasks++;
                }
              }
            } catch (taskError) {
              console.warn('导入定时任务失败:', taskError);
              skippedTasks++;
            }
          }
        }
        
        // 刷新 token 列表
        try {
          const tokensResult = await apiService.getTokens();
          if (tokensResult.success) {
            tokenStore.gameTokens.value = [];
            tokensResult.data.forEach((token) => {
              tokenStore.gameTokens.value.push({
                id: token.id,
                name: token.name,
                token: token.token,
                wsUrl: token.ws_url,
                server: token.server,
                remark: token.remark,
                importMethod: token.import_method,
                sourceUrl: token.source_url,
                avatar: token.avatar,
                isActive: token.is_active,
                createdAt: token.created_at,
                updatedAt: token.updated_at
              });
            });
          }
        } catch (refreshError) {
          console.error('刷新Token列表失败:', refreshError);
        }
        
        // 构建结果消息
        let resultMessage = `导入成功: ${importedTokens} 个Token`;
        if (importedSettings > 0) resultMessage += `, ${importedSettings} 个设置`;
        if (importedTemplates > 0) resultMessage += `, ${importedTemplates} 个模板`;
        if (importedTasks > 0) resultMessage += `, ${importedTasks} 个定时任务`;
        if (skippedTokens > 0 || skippedTasks > 0) {
          resultMessage += ` (跳过 ${skippedTokens} 个Token, ${skippedTasks} 个任务)`;
        }
        message.success(resultMessage);
        gameRolesStore.fetchGameRoles();
      } else {
        // 本地导入（旧逻辑）
        const result = tokenStore.importTokens ? tokenStore.importTokens(importData) : { success: false, message: '导入失败' };
        if (result.success) {
          message.success(result.message);
          gameRolesStore.fetchGameRoles();
        } else {
          message.error(result.message);
        }
      }
    } catch (error) {
      console.error('导入失败:', error);
      message.error("文件格式错误: " + error.message);
    }
  };
  reader.readAsText(file.file);
};

const cleanExpiredTokens = async () => {
  dialog.info({
    title: "清理过期Token",
    content: "确定要清理超过24小时未使用的Token吗？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      const useBackend = await apiService.shouldUseBackend();
      if (useBackend) {
        // 后端暂不支持批量清理过期Token，需要手动处理
        message.info("后端模式暂不支持自动清理过期Token");
      } else {
        // 本地模式
        const cleanedCount = tokenStore.cleanExpiredTokens ? tokenStore.cleanExpiredTokens() : 0;
        message.success(`已清理 ${cleanedCount} 个过期Token`);
      }
    },
  });
};

const clearAllTokens = async () => {
  dialog.error({
    title: "清除所有Token",
    content:
      "确定要清除所有游戏Token吗？这将断开所有WebSocket连接。此操作不可恢复！",
    positiveText: "确定清除",
    negativeText: "取消",
    onPositiveClick: async () => {
      const useBackend = await apiService.shouldUseBackend();
      if (useBackend) {
        // 后端模式：逐个删除
        let deletedCount = 0;
        for (const token of tokenStore.gameTokens) {
          const result = await apiService.deleteToken(token.id);
          if (result.success) {
            deletedCount++;
          }
        }
        tokenStore.gameTokens.value = [];
        message.success(`已清除 ${deletedCount} 个Token`);
      } else {
        // 本地模式
        tokenStore.clearAllGameTokens ? tokenStore.clearAllGameTokens() : (tokenStore.gameTokens.value = []);
        message.success("所有游戏Token已清除");
      }
    },
  });
};
</script>

<style scoped lang="scss">
.token-manager {
  background: white;
  border-radius: var(--border-radius-large);
  padding: var(--spacing-lg);
  margin: var(--spacing-lg) 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-lg);
  }
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.token-section {
  margin-bottom: var(--spacing-lg);

  h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: var(--font-size-md);
  }
}

.game-tokens-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.token-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.token-info {
  display: flex;
  gap: var(--spacing-md);
}

.token-label {
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.token-value {
  font-family: monospace;
  color: var(--text-primary);
}

.empty-token {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.game-tokens-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.game-token-item {
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.role-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.role-name {
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.role-server {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.token-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.token-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.detail-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.detail-value {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-family: monospace;
  word-break: break-all;
}

.bulk-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 768px) {
  .header-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .btn-text {
    display: none;
  }

  .header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .token-item {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .token-header {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }

  .token-details {
    grid-template-columns: 1fr;
  }

  .bulk-actions {
    flex-direction: column;
  }
}
</style>
