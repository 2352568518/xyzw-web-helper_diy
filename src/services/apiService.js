import axios from 'axios';
import config from '@/config';
import { useTokenStore } from '@/stores/tokenStore';

// API密钥存储键
const API_KEY_STORAGE_KEY = 'xyzw_backend_api_key';

// 获取存储的API密钥
const getStoredApiKey = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(API_KEY_STORAGE_KEY);
  }
  return null;
};

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: config.api.backendUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 确保每个请求都带有API密钥
apiClient.interceptors.request.use(
  (requestConfig) => {
    // 每次请求时都从localStorage获取最新的API密钥
    const storedKey = getStoredApiKey();
    const effectiveKey = storedKey || config.api.apiKey;
    
    if (effectiveKey) {
      requestConfig.headers['X-API-Key'] = effectiveKey;
    }
    
    console.log('=== Axios Request ===');
    console.log('URL:', requestConfig.url);
    console.log('X-API-Key:', requestConfig.headers['X-API-Key'] ? '已设置' : '未设置');
    
    return requestConfig;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理401错误
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 如果是401错误，说明API密钥无效
    if (error.response?.status === 401) {
      console.log('API密钥无效，清除本地存储的密钥');
      
      // 清除无效的API密钥
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(API_KEY_STORAGE_KEY);
        
        // 如果不在API密钥设置页面，跳转到设置页面
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// 供其他地方在运行时更新 API Key
export const setBackendApiKey = (key) => {
  console.log('=== setBackendApiKey called ===');
  console.log('Key being set:', key ? '***' : 'empty');
  
  if (typeof window !== 'undefined') {
    if (key) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }
  
  console.log('API Key saved to localStorage');
};

// API 服务类
class ApiService {
  constructor() {
    this.tokenStore = useTokenStore();
  }

  // 检查是否使用后端 API
  shouldUseBackend() {
    const useBackend = config.api.useBackend;
    console.log('Should use backend:', useBackend);
    console.log('Backend URL:', config.api.backendUrl);
    return useBackend;
  }

  // Token 相关 API
  async getTokens() {
    console.log('Getting tokens from backend');
    if (!this.shouldUseBackend()) {
      console.log('Using local token store');
      return { success: true, data: this.tokenStore.gameTokens.value };
    }

    try {
      const response = await apiClient.get('/api/tokens');
      console.log('Backend tokens:', response.data);
      return response.data;
    } catch (error) {
      console.error('获取 Token 列表失败:', error);
      // 检查是否是401错误
      if (error.response?.status === 401) {
        return { success: false, error: 'Unauthorized - API密钥错误' };
      }
      return { success: false, error: error.message };
    }
  }

  async getToken(id) {
    if (!this.shouldUseBackend()) {
      const token = this.tokenStore.gameTokens.value.find(t => t.id === id);
      return { success: true, data: token };
    }

    try {
      const response = await apiClient.get(`/api/tokens/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取 Token 失败:', error);
      return { success: false, error: error.message };
    }
  }

  async createToken(tokenData) {
    console.log('Creating token:', tokenData);
    if (!this.shouldUseBackend()) {
      console.log('Using local token store');
      const token = this.tokenStore.addToken(tokenData);
      return { success: true, data: token };
    }

    try {
      console.log('Calling backend API to create token');
      const response = await apiClient.post('/api/tokens', tokenData);
      console.log('Backend API response:', response);
      return response.data;
    } catch (error) {
      console.error('Create token failed:', error);
      return { success: false, error: error.message };
    }
  }

  async updateToken(id, updates) {
    if (!this.shouldUseBackend()) {
      const success = this.tokenStore.updateToken(id, updates);
      return { success, data: success ? this.tokenStore.gameTokens.value.find(t => t.id === id) : null };
    }

    try {
      const response = await apiClient.put(`/api/tokens/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('更新 Token 失败:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteToken(id) {
    if (!this.shouldUseBackend()) {
      const success = await this.tokenStore.removeToken(id);
      return { success, message: 'Token 删除成功' };
    }

    try {
      const response = await apiClient.delete(`/api/tokens/${id}`);
      return response.data;
    } catch (error) {
      console.error('删除 Token 失败:', error);
      return { success: false, error: error.message };
    }
  }

  async updateTokensOrder(orders) {
    if (!this.shouldUseBackend()) {
      return { success: true, message: '本地模式，排序已更新' };
    }

    try {
      const response = await apiClient.post('/api/tokens/update-order', { orders });
      return response.data;
    } catch (error) {
      console.error('批量更新Token排序失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 任务相关 API
  async getTasks() {
    if (!this.shouldUseBackend()) {
      // 本地任务管理逻辑
      return { success: true, data: [] };
    }

    try {
      const response = await apiClient.get('/api/tasks');
      return response.data;
    } catch (error) {
      console.error('获取任务列表失败:', error);
      return { success: false, error: error.message };
    }
  }

  async getTask(id) {
    if (!this.shouldUseBackend()) {
      // 本地任务管理逻辑
      return { success: true, data: null };
    }

    try {
      const response = await apiClient.get(`/api/tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  async createTask(taskData) {
    if (!this.shouldUseBackend()) {
      // 本地任务管理逻辑
      return { success: true, data: taskData };
    }

    try {
      const response = await apiClient.post('/api/tasks', taskData);
      return response.data;
    } catch (error) {
      console.error('创建任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  async updateTask(id, updates) {
    if (!this.shouldUseBackend()) {
      // 本地任务管理逻辑
      return { success: true, data: { id, ...updates } };
    }

    try {
      const response = await apiClient.put(`/api/tasks/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('更新任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTask(id) {
    if (!this.shouldUseBackend()) {
      // 本地任务管理逻辑
      return { success: true, message: '任务删除成功' };
    }

    try {
      const response = await apiClient.delete(`/api/tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error('删除任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  async runTask(id) {
    if (!this.shouldUseBackend()) {
      // 本地任务执行逻辑
      return { success: true, message: '任务开始执行' };
    }

    try {
      const response = await apiClient.post(`/api/tasks/${id}/run`);
      return response.data;
    } catch (error) {
      console.error('执行任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  async getNextExecutionTime(id) {
    if (!this.shouldUseBackend()) {
      // 本地任务管理逻辑
      return { success: true, data: { nextExecutionTime: new Date().toISOString() } };
    }

    try {
      const response = await apiClient.get(`/api/tasks/${id}/next-execution`);
      return response.data;
    } catch (error) {
      console.error('获取下次执行时间失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取任务执行历史
   * @param {string} id 任务ID
   * @param {{ status?: string, tokenId?: string, limit?: number }} params 可选过滤条件
   */
  async getTaskExecutions(id, params = {}) {
    if (!this.shouldUseBackend()) {
      return { success: true, data: [] };
    }

    try {
      const response = await apiClient.get(`/api/tasks/${id}/executions`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('获取任务执行历史失败:', error);
      return { success: false, error: error.message };
    }
  }

  async clearTaskExecutions() {
    if (!this.shouldUseBackend()) {
      return { success: true, message: '本地模式，日志已清空' };
    }

    try {
      const response = await apiClient.delete('/api/tasks/executions');
      return response.data;
    } catch (error) {
      console.error('清空任务执行记录失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 健康检查
  async healthCheck() {
    if (!this.shouldUseBackend()) {
      return { success: true, data: { status: 'ok', timestamp: new Date().toISOString() } };
    }

    try {
      const response = await apiClient.get('/health');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('健康检查失败:', error);
      return { success: false, error: error.message };
    }
  }

  // Token 设置相关 API
  async getAllTokenSettings() {
    if (!this.shouldUseBackend()) {
      return { success: true, data: [] };
    }

    try {
      const response = await apiClient.get('/api/token-settings');
      return response.data;
    } catch (error) {
      console.error('获取Token设置列表失败:', error);
      return { success: false, error: error.message };
    }
  }

  async getTokenSettings(tokenId) {
    if (!this.shouldUseBackend()) {
      const settings = localStorage.getItem(`daily-settings:${tokenId}`);
      return { success: true, data: settings ? JSON.parse(settings) : null };
    }

    try {
      const response = await apiClient.get(`/api/token-settings/${tokenId}`);
      return response.data;
    } catch (error) {
      console.error('获取Token设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  async saveTokenSettings(tokenId, settings, templateId = null) {
    if (!this.shouldUseBackend()) {
      localStorage.setItem(`daily-settings:${tokenId}`, JSON.stringify(settings));
      return { success: true, data: { tokenId, settings } };
    }

    try {
      const response = await apiClient.post(`/api/token-settings/${tokenId}`, {
        settings,
        templateId
      });
      return response.data;
    } catch (error) {
      console.error('保存Token设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTokenSettings(tokenId) {
    if (!this.shouldUseBackend()) {
      localStorage.removeItem(`daily-settings:${tokenId}`);
      return { success: true, message: 'Token设置删除成功' };
    }

    try {
      const response = await apiClient.delete(`/api/token-settings/${tokenId}`);
      return response.data;
    } catch (error) {
      console.error('删除Token设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  async batchSaveTokenSettings(settingsList) {
    if (!this.shouldUseBackend()) {
      settingsList.forEach(item => {
        localStorage.setItem(`daily-settings:${item.tokenId}`, JSON.stringify(item.settings));
      });
      return { success: true, data: settingsList };
    }

    try {
      const response = await apiClient.post('/api/token-settings/batch/save', { settingsList });
      return response.data;
    } catch (error) {
      console.error('批量保存Token设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 任务模板相关 API
  async getTaskTemplates() {
    if (!this.shouldUseBackend()) {
      const templates = localStorage.getItem('task-templates');
      return { success: true, data: templates ? JSON.parse(templates) : [] };
    }

    try {
      const response = await apiClient.get('/api/task-templates');
      return response.data;
    } catch (error) {
      console.error('获取任务模板列表失败:', error);
      return { success: false, error: error.message };
    }
  }

  async getTaskTemplate(id) {
    if (!this.shouldUseBackend()) {
      const templates = JSON.parse(localStorage.getItem('task-templates') || '[]');
      const template = templates.find(t => t.id === id);
      return { success: true, data: template || null };
    }

    try {
      const response = await apiClient.get(`/api/task-templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取任务模板失败:', error);
      return { success: false, error: error.message };
    }
  }

  async createTaskTemplate(templateData) {
    if (!this.shouldUseBackend()) {
      const templates = JSON.parse(localStorage.getItem('task-templates') || '[]');
      const template = {
        ...templateData,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      templates.push(template);
      localStorage.setItem('task-templates', JSON.stringify(templates));
      return { success: true, data: template };
    }

    try {
      const response = await apiClient.post('/api/task-templates', templateData);
      return response.data;
    } catch (error) {
      console.error('创建任务模板失败:', error);
      return { success: false, error: error.message };
    }
  }

  async updateTaskTemplate(id, updates) {
    if (!this.shouldUseBackend()) {
      const templates = JSON.parse(localStorage.getItem('task-templates') || '[]');
      const index = templates.findIndex(t => t.id === id);
      if (index !== -1) {
        templates[index] = { ...templates[index], ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem('task-templates', JSON.stringify(templates));
        return { success: true, data: templates[index] };
      }
      return { success: false, error: '模板不存在' };
    }

    try {
      const response = await apiClient.put(`/api/task-templates/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('更新任务模板失败:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTaskTemplate(id) {
    if (!this.shouldUseBackend()) {
      let templates = JSON.parse(localStorage.getItem('task-templates') || '[]');
      templates = templates.filter(t => t.id !== id);
      localStorage.setItem('task-templates', JSON.stringify(templates));
      return { success: true, message: '模板删除成功' };
    }

    try {
      const response = await apiClient.delete(`/api/task-templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('删除任务模板失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 全局设置相关 API
  async getGlobalSettings() {
    if (!this.shouldUseBackend()) {
      const settings = localStorage.getItem('batchSettings');
      return { success: true, data: settings ? JSON.parse(settings) : {} };
    }

    try {
      const response = await apiClient.get('/api/global-settings');
      return response.data;
    } catch (error) {
      console.error('获取全局设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  async saveGlobalSettings(settings) {
    if (!this.shouldUseBackend()) {
      localStorage.setItem('batchSettings', JSON.stringify(settings));
      return { success: true, data: settings };
    }

    try {
      const response = await apiClient.post('/api/global-settings', settings);
      return response.data;
    } catch (error) {
      console.error('保存全局设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  async resetGlobalSettings() {
    if (!this.shouldUseBackend()) {
      localStorage.removeItem('batchSettings');
      return { success: true, message: '全局设置已重置' };
    }

    try {
      const response = await apiClient.post('/api/global-settings/reset');
      return response.data;
    } catch (error) {
      console.error('重置全局设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  // Token分组相关 API
  async getTokenGroups() {
    if (!this.shouldUseBackend()) {
      const groups = localStorage.getItem('tokenGroups');
      return { success: true, data: groups ? JSON.parse(groups) : [] };
    }

    try {
      const response = await apiClient.get('/api/token-groups');
      return response.data;
    } catch (error) {
      console.error('获取Token分组失败:', error);
      return { success: false, error: error.message };
    }
  }

  async createTokenGroup(groupData) {
    if (!this.shouldUseBackend()) {
      const groups = JSON.parse(localStorage.getItem('tokenGroups') || '[]');
      groups.push(groupData);
      localStorage.setItem('tokenGroups', JSON.stringify(groups));
      return { success: true, data: groupData };
    }

    try {
      const response = await apiClient.post('/api/token-groups', groupData);
      return response.data;
    } catch (error) {
      console.error('创建Token分组失败:', error);
      return { success: false, error: error.message };
    }
  }

  async updateTokenGroup(id, updates) {
    if (!this.shouldUseBackend()) {
      const groups = JSON.parse(localStorage.getItem('tokenGroups') || '[]');
      const index = groups.findIndex(g => g.id === id);
      if (index !== -1) {
        groups[index] = { ...groups[index], ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem('tokenGroups', JSON.stringify(groups));
        return { success: true, data: groups[index] };
      }
      return { success: false, error: '分组不存在' };
    }

    try {
      const response = await apiClient.put(`/api/token-groups/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('更新Token分组失败:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTokenGroup(id) {
    if (!this.shouldUseBackend()) {
      let groups = JSON.parse(localStorage.getItem('tokenGroups') || '[]');
      groups = groups.filter(g => g.id !== id);
      localStorage.setItem('tokenGroups', JSON.stringify(groups));
      return { success: true, message: '分组删除成功' };
    }

    try {
      const response = await apiClient.delete(`/api/token-groups/${id}`);
      return response.data;
    } catch (error) {
      console.error('删除Token分组失败:', error);
      return { success: false, error: error.message };
    }
  }

  async syncTokenGroups(groups) {
    if (!this.shouldUseBackend()) {
      localStorage.setItem('tokenGroups', JSON.stringify(groups));
      return { success: true, message: '分组同步成功' };
    }

    try {
      const response = await apiClient.post('/api/token-groups/sync', { groups });
      return response.data;
    } catch (error) {
      console.error('同步Token分组失败:', error);
      return { success: false, error: error.message };
    }
  }
}

// 导出单例
export default new ApiService();