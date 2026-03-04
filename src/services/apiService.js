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
}

// 导出单例
export default new ApiService();