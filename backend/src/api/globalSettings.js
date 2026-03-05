/**
 * 全局设置 API
 */

import express from 'express';
import GlobalSettingsService from '../services/GlobalSettingsService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * 获取全局设置
 */
router.get('/', async (req, res) => {
  try {
    const settings = await GlobalSettingsService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error(`获取全局设置失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 保存全局设置
 */
router.post('/', async (req, res) => {
  try {
    const settings = await GlobalSettingsService.saveSettings(req.body);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error(`保存全局设置失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 重置全局设置
 */
router.post('/reset', async (req, res) => {
  try {
    const settings = await GlobalSettingsService.resetSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error(`重置全局设置失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
