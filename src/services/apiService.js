import axios from 'axios';
import config from '@/config';
import { useTokenStore } from '@/stores/tokenStore';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: config.api.backendUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

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
}

// 导出单例
export default new ApiService();