/**
 * 任务管理API
 */

import express from 'express';
import TaskService from '../services/TaskService.js';
import { logger } from '../utils/logger.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * 获取今日执行统计
 */
router.get('/today-stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    // 获取今日所有执行记录
    const { data: executions, error } = await supabase
      .from('task_executions')
      .select('id, task_id, token_id, status, started_at, result')
      .gte('started_at', todayStr);
    
    if (error) {
      throw error;
    }
    
    // 按task_id和started_at（精确到分钟）分组，统计调度执行次数
    const executionGroups = {};
    executions.forEach(e => {
      if (!e.task_id) return;
      // 按分钟分组（同一分钟内的执行算同一次调度）
      const startTime = new Date(e.started_at);
      startTime.setSeconds(0, 0);
      const groupKey = `${e.task_id}_${startTime.toISOString()}`;
      
      if (!executionGroups[groupKey]) {
        executionGroups[groupKey] = {
          taskId: e.task_id,
          startedAt: e.started_at,
          total: 0,
          success: 0,
          failed: 0,
          failedTokens: []
        };
      }
      executionGroups[groupKey].total++;
      if (e.status === 'completed') {
        executionGroups[groupKey].success++;
      } else if (e.status === 'failed') {
        executionGroups[groupKey].failed++;
        executionGroups[groupKey].failedTokens.push({
          tokenId: e.token_id,
          error: e.result?.error || '未知错误'
        });
      }
    });
    
    // 今日执行数 = 调度执行次数
    const todayExecutedCount = Object.keys(executionGroups).length;
    
    // 今日失败数 = 失败的账号数
    const todayFailedCount = executions.filter(e => e.status === 'failed').length;
    
    // 获取任务名称
    const taskIds = [...new Set(executions.map(e => e.task_id).filter(id => id))];
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name')
      .in('id', taskIds);
    
    if (tasksError) {
      throw tasksError;
    }
    
    // 组装返回数据
    const taskExecutions = Object.values(executionGroups).map(group => ({
      ...group,
      taskName: tasks.find(t => t.id === group.taskId)?.name || '未知任务'
    }));
    
    // 按时间排序
    taskExecutions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    
    res.json({
      success: true,
      data: {
        todayExecutedCount,
        todayFailedCount,
        taskExecutions
      }
    });
  } catch (error) {
    logger.error(`获取今日执行统计失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取所有任务
 */
router.get('/', async (req, res) => {
  try {
    const tasks = await TaskService.getAllTasks();
    res.json({ success: true, data: tasks });
  } catch (error) {
    logger.error(`获取任务列表失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取单个任务
 */
router.get('/:id', async (req, res) => {
  try {
    const task = await TaskService.getTaskById(req.params.id);
    res.json({ success: true, data: task });
  } catch (error) {
    logger.error(`获取任务失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 创建任务
 */
router.post('/', async (req, res) => {
  try {
    const task = await TaskService.createTask(req.body);
    res.json({ success: true, data: task });
  } catch (error) {
    logger.error(`创建任务失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 更新任务
 */
router.put('/:id', async (req, res) => {
  try {
    const task = await TaskService.updateTask(req.params.id, req.body);
    res.json({ success: true, data: task });
  } catch (error) {
    logger.error(`更新任务失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 清空所有任务执行记录
 */
router.delete('/clear-executions', async (req, res) => {
  try {
    await TaskService.clearAllExecutions();
    res.json({ success: true, message: '任务执行记录清空成功' });
  } catch (error) {
    logger.error(`清空任务执行记录失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 删除任务
 */
router.delete('/:id', async (req, res) => {
  try {
    await TaskService.deleteTask(req.params.id);
    res.json({ success: true, message: '任务删除成功' });
  } catch (error) {
    logger.error(`删除任务失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 立即执行任务
 */
router.post('/:id/run', async (req, res) => {
  try {
    const task = await TaskService.getTaskById(req.params.id);
    // 异步执行任务，不等待完成
    TaskService.executeTask(task).catch(error => {
      logger.error(`后台执行任务失败: ${error.message}`);
    });
    res.json({ success: true, message: '任务开始执行' });
  } catch (error) {
    logger.error(`执行任务失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取任务的下次执行时间
 */
router.get('/:id/next-execution', async (req, res) => {
  try {
    const task = await TaskService.getTaskById(req.params.id);
    const nextExecutionTime = TaskService.getNextExecutionTime(task);
    res.json({ success: true, data: { nextExecutionTime } });
  } catch (error) {
    logger.error(`获取下次执行时间失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取任务执行历史
 * 支持按 tokenId / status / limit 过滤
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const { status, tokenId, limit } = req.query;
    const params = {
      taskId: req.params.id,
    };
    if (status) {
      params.status = status;
    }
    if (tokenId) {
      params.tokenId = tokenId;
    }
    if (limit) {
      const n = parseInt(limit, 10);
      if (!Number.isNaN(n) && n > 0) {
        params.limit = n;
      }
    }

    const executions = await TaskService.getExecutions(params);
    res.json({ success: true, data: executions });
  } catch (error) {
    logger.error(`获取任务执行历史失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 创建手动执行记录（前端浏览器执行批量任务时使用）
 */
router.post('/manual-execution', async (req, res) => {
  try {
    const { tokenId, status, result, taskName } = req.body;
    const execution = await TaskService.createManualExecution(tokenId, status, result, taskName);
    res.json({ success: true, data: execution });
  } catch (error) {
    logger.error(`创建手动执行记录失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
