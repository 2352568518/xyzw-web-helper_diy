/**
 * Token管理API
 */

import express from 'express';
import TokenService from '../services/TokenService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * 获取所有Token
 */
router.get('/', async (req, res) => {
  try {
    const tokens = await TokenService.getAllTokens();
    res.json({ success: true, data: tokens });
  } catch (error) {
    logger.error(`获取Token列表失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取单个Token
 */
router.get('/:id', async (req, res) => {
  try {
    const token = await TokenService.getTokenById(req.params.id);
    res.json({ success: true, data: token });
  } catch (error) {
    logger.error(`获取Token失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 创建Token
 */
router.post('/', async (req, res) => {
  try {
    const token = await TokenService.createToken(req.body);
    res.json({ success: true, data: token });
  } catch (error) {
    logger.error(`创建Token失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 更新Token
 */
router.put('/:id', async (req, res) => {
  try {
    const token = await TokenService.updateToken(req.params.id, req.body);
    res.json({ success: true, data: token });
  } catch (error) {
    logger.error(`更新Token失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 删除Token
 */
router.delete('/:id', async (req, res) => {
  try {
    await TokenService.deleteToken(req.params.id);
    res.json({ success: true, message: 'Token删除成功' });
  } catch (error) {
    logger.error(`删除Token失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取激活的Token
 */
router.get('/active/list', async (req, res) => {
  try {
    const tokens = await TokenService.getActiveTokens();
    res.json({ success: true, data: tokens });
  } catch (error) {
    logger.error(`获取激活Token失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 批量更新Token排序
 */
router.post('/update-order', async (req, res) => {
  try {
    const { orders } = req.body; // orders 格式: [{ id: 'token-id', sort_order: 1 }, ...]
    if (!Array.isArray(orders)) {
      return res.status(400).json({ success: false, error: 'orders 必须是数组' });
    }
    await TokenService.updateTokensOrder(orders);
    res.json({ success: true, message: '排序更新成功' });
  } catch (error) {
    logger.error(`批量更新Token排序失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
