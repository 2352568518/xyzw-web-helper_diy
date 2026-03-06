/**
 * 任务服务
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { matchesCronExpression, calculateNextExecutionTime } from '../utils/cronUtils.js';
import WebSocketService from './WebSocketService.js';
import TaskExecutor from './TaskExecutor.js';
import TokenService from './TokenService.js';
import { buildCommandParams } from '../utils/gameCommands.js';

/**
 * 任务服务
 */
class TaskService {
  constructor() {
    this.cronJobs = new Map();
    this.init();
  }

  /**
   * 初始化
   */
  async init() {
    try {
      // 加载并启动所有激活的任务
      const tasks = await this.getActiveTasks();
      for (const task of tasks) {
        this.scheduleTask(task);
      }
      logger.info('任务服务初始化完成');
    } catch (error) {
      logger.error(`任务服务初始化失败: ${error.message}`);
    }
  }

  /**
   * 获取所有任务
   */
  async getAllTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(`获取任务列表失败: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`获取任务列表异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取单个任务
   */
  async getTaskById(id) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error(`获取任务失败: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`获取任务异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取激活的任务
   */
  async getActiveTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(`获取激活任务失败: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`获取激活任务异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建任务
   */
  async createTask(taskData) {
    try {
      // 处理 token_ids，确保是有效的 UUID 数组
      let tokenIds = taskData.selectedTokens || taskData.token_ids || [];
      // 过滤掉无效的 UUID
      tokenIds = tokenIds.filter(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      });

      // 处理前端创建的任务数据结构
      const task = {
        id: taskData.id || uuidv4(),
        name: taskData.name,
        type: 'daily', // 默认类型
        token_ids: tokenIds,
        run_type: taskData.runType || taskData.run_type || 'daily',
        run_time: taskData.runTime || taskData.run_time || '00:00',
        cron_expression: taskData.cronExpression || taskData.cron_expression || '0 0 * * *',
        settings: {
          selectedTasks: taskData.selectedTasks || [],
          ...(taskData.settings || {})
        },
        is_active: taskData.enabled !== false && taskData.is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      logger.info(`准备创建任务: ${JSON.stringify(task, null, 2)}`);

      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();

      if (error) {
        logger.error(`创建任务失败: ${JSON.stringify(error)}`);
        throw error;
      }

      if (task.is_active) {
        this.scheduleTask(data);
      }

      logger.info(`任务创建成功: ${task.name}`);
      return data;
    } catch (error) {
      logger.error(`创建任务异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新任务
   */
  async updateTask(id, updates) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // 处理 token_ids，确保是有效的 UUID 数组
      if (updateData.selectedTokens) {
        updateData.token_ids = updateData.selectedTokens.filter(tokenId => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(tokenId);
        });
        delete updateData.selectedTokens;
      }

      // 处理 selectedTasks，存储到 settings 中
      if (updateData.selectedTasks) {
        updateData.settings = {
          ...(updateData.settings || {}),
          selectedTasks: updateData.selectedTasks
        };
        delete updateData.selectedTasks;
      }

      // 处理字段名转换 - 无论值是否存在都要处理，避免发送驼峰命名字段到数据库
      if ('runType' in updateData) {
        updateData.run_type = updateData.runType;
        delete updateData.runType;
      }
      if ('runTime' in updateData) {
        updateData.run_time = updateData.runTime;
        delete updateData.runTime;
      }
      if ('cronExpression' in updateData) {
        updateData.cron_expression = updateData.cronExpression;
        delete updateData.cronExpression;
      }
      if ('enabled' in updateData) {
        updateData.is_active = updateData.enabled;
        delete updateData.enabled;
      }

      // 删除不应该存入数据库的字段
      delete updateData._synced;

      logger.info(`准备更新任务: ${id}, 数据: ${JSON.stringify(updateData, null, 2)}`);

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error(`更新任务失败: ${JSON.stringify(error)}`);
        throw error;
      }

      // 重新调度任务
      this.unscheduleTask(id);
      if (data.is_active) {
        this.scheduleTask(data);
      }

      logger.info(`任务更新成功: ${id}`);
      return data;
    } catch (error) {
      logger.error(`更新任务异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(id) {
    try {
      this.unscheduleTask(id);

      // 先删除相关的任务执行记录
      const { error: deleteExecutionsError } = await supabase
        .from('task_executions')
        .delete()
        .eq('task_id', id);

      if (deleteExecutionsError) {
        logger.error(`删除任务执行记录失败: ${JSON.stringify(deleteExecutionsError)}`);
        // 继续尝试删除任务
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error(`删除任务失败: ${JSON.stringify(error)}`);
        throw error;
      }

      logger.info(`任务删除成功: ${id}`);
      return true;
    } catch (error) {
      logger.error(`删除任务异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 调度任务
   */
  scheduleTask(task) {
    try {
      let cronExpression;
      if (task.run_type === 'daily') {
        const [hours, minutes] = task.run_time.split(':').map(Number);
        cronExpression = `${minutes} ${hours} * * *`;
      } else {
        cronExpression = task.cron_expression;
      }

      const job = cron.schedule(cronExpression, async () => {
        await this.executeTask(task);
      }, {
        scheduled: true,
        timezone: 'Asia/Shanghai'
      });

      this.cronJobs.set(task.id, job);
      logger.info(`任务调度成功: ${task.name}, 表达式: ${cronExpression}`);
    } catch (error) {
      logger.error(`任务调度失败: ${task.name}, ${error.message}`);
    }
  }

  /**
   * 取消调度任务
   */
  unscheduleTask(taskId) {
    const job = this.cronJobs.get(taskId);
    if (job) {
      job.stop();
      this.cronJobs.delete(taskId);
      logger.info(`任务取消调度: ${taskId}`);
    }
  }

  /**
   * 立即执行任务
   */
  async executeTask(task) {
    logger.info(`开始执行任务: ${task.name}`);

    try {
      // 获取任务关联的Token
      const tokens = await TokenService.getTokensByIds(task.token_ids);
      
      // 为同一次任务执行创建统一的开始时间
      const executionStartTime = new Date().toISOString();
      
      for (const [index, token] of tokens.entries()) {
        // 避免同时建立太多连接，添加延迟
        if (index > 0) {
          logger.info(`等待 ${Math.min(3000, index * 500)}ms 后执行下一个账号`);
          await new Promise(resolve => setTimeout(resolve, Math.min(3000, index * 500)));
        }
        await this.executeTaskForToken(task, token, executionStartTime);
      }

      logger.info(`任务执行完成: ${task.name}`);
    } catch (error) {
      logger.error(`任务执行失败: ${task.name}, ${error.message}`);
    }
  }

  /**
   * 为单个Token执行任务
   */
  async executeTaskForToken(task, token, executionStartTime) {
    logger.info(`为Token执行任务: ${task.name}, ${token.name}`);

    const executionId = uuidv4();
    let executionResult = {
      status: 'running',
      steps: []
    };

    try {
      // 创建执行记录，使用统一的开始时间
      await this.createExecutionRecord(executionId, task.id, token.id, 'running', executionStartTime);

      // 兼容前端逻辑：如果数据库中存的是 Base64/包装格式，先解析出实际 game token
      let actualToken = token.token;
      try {
        const parsed = TokenService.parseBase64Token(token.token);
        if (parsed && parsed.success && parsed.data && parsed.data.actualToken) {
          actualToken = parsed.data.actualToken;
        }
      } catch (e) {
        // 解析失败时退回原始 token，由 validateToken 做最终校验
        logger.warn(`Token解析失败，使用原始值: ${token.id}, ${e.message}`);
      }

      // 后端再次校验 token，有问题直接报错，避免无效 token 反复 1006
      if (!TokenService.validateToken(actualToken)) {
        throw new Error('Token 无效或格式错误');
      }

      // 建立WebSocket连接（使用解析后的实际 token）
      const wsClient = await WebSocketService.createConnection(token.id, actualToken, token.ws_url);

      // 执行任务步骤
      executionResult = await this.executeTaskSteps(task, token, wsClient);

      // 更新执行记录
      await this.updateExecutionRecord(executionId, 'completed', executionResult);

      // 断开连接
      WebSocketService.disconnect(token.id);

      logger.info(`Token任务执行完成: ${task.name}, ${token.name}`);
    } catch (error) {
      logger.error(`Token任务执行失败: ${task.name}, ${token.name}, ${error.message}`);
      executionResult.status = 'failed';
      executionResult.error = error.message;
      await this.updateExecutionRecord(executionId, 'failed', executionResult);
    }
  }

  /**
   * 执行任务步骤
   */
  async executeTaskSteps(task, token, wsClient) {
    const steps = [];

    try {
      // 执行前端选择的具体任务
      const selectedTasks = task.settings.selectedTasks || [];
      
      if (selectedTasks.length > 0) {
        // 使用TaskExecutor执行任务
        const executor = new TaskExecutor(wsClient, token, task.settings);
        
        for (const taskName of selectedTasks) {
          steps.push({ name: `执行任务: ${taskName}`, status: 'running' });
          
          try {
            const result = await executor.execute(taskName);
            if (result.success) {
              steps[steps.length - 1].status = 'success';
              // 添加详细步骤
              if (result.steps) {
                result.steps.forEach(s => {
                  if (s.name !== steps[steps.length - 1].name) {
                    steps.push(s);
                  }
                });
              }
            } else {
              steps[steps.length - 1].status = 'failed';
              steps[steps.length - 1].error = result.error;
            }
          } catch (error) {
            steps[steps.length - 1].status = 'failed';
            steps[steps.length - 1].error = error.message;
          }
        }
      } else {
        // 根据任务类型执行不同的步骤
        switch (task.type) {
          case 'daily':
            await this.executeDailyTask(steps, token, wsClient);
            break;
          case 'tower':
            await this.executeTowerTask(steps, token, wsClient, task.settings);
            break;
          case 'arena':
            await this.executeArenaTask(steps, token, wsClient, task.settings);
            break;
          case 'legion':
            await this.executeLegionTask(steps, token, wsClient, task.settings);
            break;
          default:
            throw new Error(`未知任务类型: ${task.type}`);
        }
      }

      return {
        status: steps.some(s => s.status === 'failed') ? 'failed' : 'success',
        steps
      };
    } catch (error) {
      steps.push({
        name: '执行失败',
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 执行具体的任务
   */
  async executeSpecificTask(taskName, steps, token, wsClient) {
    switch (taskName) {
      case 'signin':
        await wsClient.sendWithPromise('system_signinreward');
        break;
      case 'hangup':
        await wsClient.sendWithPromise('system_claimhangupreward');
        break;
      case 'daily':
        await wsClient.sendWithPromise('task_claimdailyreward', { rewardId: 0 });
        break;
      case 'legionSignin':
        await wsClient.sendWithPromise('legion_signin');
        break;
      case 'tower':
        await this.executeTowerTask(steps, token, wsClient, {});
        break;
      case 'arena':
        await this.executeArenaTask(steps, token, wsClient, {});
        break;
      case 'legion':
        await this.executeLegionTask(steps, token, wsClient, {});
        break;
      case 'resetBottles':
        // 重置罐子
        steps.push({ name: '停止计时', status: 'running' });
        await wsClient.sendWithPromise('bottlehelper_stop', {});
        steps[steps.length - 1].status = 'success';
        await new Promise(r => setTimeout(r, 500));
        steps.push({ name: '开始计时', status: 'running' });
        await wsClient.sendWithPromise('bottlehelper_start', {});
        steps[steps.length - 1].status = 'success';
        break;
      case 'claimBottles':
        // 领取盐罐
        await wsClient.sendWithPromise('bottlehelper_claim', {});
        break;
      default:
        logger.warn(`未知任务: ${taskName}`);
    }
  }

  /**
   * 执行日常任务
   */
  async executeDailyTask(steps, token, wsClient) {
    // 签到
    steps.push({ name: '开始签到', status: 'running' });
    await wsClient.sendWithPromise('system_signinreward');
    steps[steps.length - 1].status = 'success';

    // 领取挂机奖励
    steps.push({ name: '领取挂机奖励', status: 'running' });
    await wsClient.sendWithPromise('system_claimhangupreward');
    steps[steps.length - 1].status = 'success';

    // 领取日常任务奖励
    steps.push({ name: '领取日常任务奖励', status: 'running' });
    await wsClient.sendWithPromise('task_claimdailyreward', { rewardId: 0 });
    steps[steps.length - 1].status = 'success';

    // 军团签到
    steps.push({ name: '军团签到', status: 'running' });
    await wsClient.sendWithPromise('legion_signin');
    steps[steps.length - 1].status = 'success';
  }

  /**
   * 执行爬塔任务
   */
  async executeTowerTask(steps, token, wsClient, settings) {
    const { targetLevel = 100 } = settings;

    steps.push({ name: '获取塔信息', status: 'running' });
    const towerInfo = await wsClient.sendWithPromise('tower_getinfo');
    steps[steps.length - 1].status = 'success';

    const currentLevel = towerInfo?.tower?.level || 1;
    steps.push({ name: `当前塔层: ${currentLevel}`, status: 'success' });

    if (currentLevel >= targetLevel) {
      steps.push({ name: `已达到目标塔层: ${targetLevel}`, status: 'success' });
      return;
    }

    steps.push({ name: `开始爬塔到 ${targetLevel} 层`, status: 'running' });
    for (let i = currentLevel; i < targetLevel; i++) {
      try {
        await wsClient.sendWithPromise('fight_starttower');
      } catch (error) {
        steps.push({ name: `爬塔失败: ${i+1}层`, status: 'failed', error: error.message });
        break;
      }
    }
    steps[steps.length - 1].status = 'success';
  }

  /**
   * 执行竞技场任务
   */
  async executeArenaTask(steps, token, wsClient, settings) {
    const { count = 5 } = settings;

    steps.push({ name: '获取竞技场目标', status: 'running' });
    const targets = await wsClient.sendWithPromise('arena_getareatarget');
    steps[steps.length - 1].status = 'success';

    steps.push({ name: `开始竞技场战斗 (${count}次)`, status: 'running' });
    for (let i = 0; i < count; i++) {
      try {
        const targetId = targets?.targets?.[0]?.roleId;
        if (!targetId) {
          throw new Error('无可用目标');
        }
        await wsClient.sendWithPromise('fight_startareaarena', { targetId });
      } catch (error) {
        steps.push({ name: `竞技场战斗失败: ${i+1}次`, status: 'failed', error: error.message });
      }
    }
    steps[steps.length - 1].status = 'success';
  }

  /**
   * 执行军团任务
   */
  async executeLegionTask(steps, token, wsClient, settings) {
    steps.push({ name: '获取军团信息', status: 'running' });
    await wsClient.sendWithPromise('legion_getinfo');
    steps[steps.length - 1].status = 'success';

    steps.push({ name: '领取军团任务', status: 'running' });
    await wsClient.sendWithPromise('legion_claimpayloadtask');
    steps[steps.length - 1].status = 'success';

    steps.push({ name: '领取军团任务进度', status: 'running' });
    await wsClient.sendWithPromise('legion_claimpayloadtaskprogress');
    steps[steps.length - 1].status = 'success';
  }

  /**
   * 创建执行记录
   */
  async createExecutionRecord(id, taskId, tokenId, status, startedAt) {
    try {
      const { error } = await supabase
        .from('task_executions')
        .insert({
          id,
          task_id: taskId,
          token_id: tokenId,
          status,
          started_at: startedAt || new Date().toISOString()
        });

      if (error) {
        logger.error(`创建执行记录失败: ${error.message}`);
        throw error;
      }
    } catch (error) {
      logger.error(`创建执行记录异常: ${error.message}`);
    }
  }

  /**
   * 更新执行记录
   */
  async updateExecutionRecord(id, status, result) {
    try {
      const { error } = await supabase
        .from('task_executions')
        .update({
          status,
          result,
          completed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        logger.error(`更新执行记录失败: ${error.message}`);
        throw error;
      }
    } catch (error) {
      logger.error(`更新执行记录异常: ${error.message}`);
    }
  }

  /**
   * 获取执行历史
   */
  async getExecutions(params = {}) {
    try {
      let query = supabase.from('task_executions').select('*');

      if (params.taskId) {
        query = query.eq('task_id', params.taskId);
      }

      if (params.tokenId) {
        query = query.eq('token_id', params.tokenId);
      }

      if (params.status) {
        query = query.eq('status', params.status);
      }

      const { data, error } = await query
        .order('started_at', { ascending: false })
        .limit(params.limit || 100);

      if (error) {
        logger.error(`获取执行历史失败: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`获取执行历史异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取任务的下次执行时间
   */
  getNextExecutionTime(task) {
    return calculateNextExecutionTime(task);
  }

  /**
   * 获取所有任务的状态
   */
  getTaskStats() {
    return {
      scheduledTasks: this.cronJobs.size,
      tasks: this.cronJobs.keys()
    };
  }

  /**
   * 清空所有任务执行记录
   */
  async clearAllExecutions() {
    try {
      const { error } = await supabase
        .from('task_executions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        logger.error(`清空任务执行记录失败: ${error.message}`);
        throw error;
      }

      logger.info('任务执行记录清空成功');
      return true;
    } catch (error) {
      logger.error(`清空任务执行记录异常: ${error.message}`);
      throw error;
    }
  }
}

// 导出单例
export default new TaskService();
