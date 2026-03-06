/**
 * 任务管理API
 */

import express from 'express';
import TaskService from '../services/TaskService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

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
    await TaskService.executeTask(task);
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

export default router;
