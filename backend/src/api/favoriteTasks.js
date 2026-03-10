/**
 * 收藏任务 API
 */

import express from 'express';
import FavoriteTasksService from '../services/FavoriteTasksService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const favorites = await FavoriteTasksService.getFavorites();
    res.json({ success: true, data: favorites });
  } catch (error) {
    logger.error(`获取收藏任务失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const favorites = await FavoriteTasksService.saveFavorites(req.body);
    res.json({ success: true, data: favorites });
  } catch (error) {
    logger.error(`保存收藏任务失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/toggle', async (req, res) => {
  try {
    const { taskId } = req.body;
    const favorites = await FavoriteTasksService.toggleFavorite(taskId);
    res.json({ success: true, data: favorites });
  } catch (error) {
    logger.error(`切换收藏任务失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
