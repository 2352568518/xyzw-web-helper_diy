import express from 'express';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 测试数据库连接
router.get('/db-test', async (req, res) => {
  try {
    // 尝试查询 tokens 表
    const { data, error } = await supabase.from('tokens').select('*');
    
    if (error) {
      logger.error('数据库查询错误:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    logger.info('数据库查询成功:', data);
    res.json({ success: true, data, message: '数据库连接正常' });
  } catch (error) {
    logger.error('数据库连接测试失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 测试插入数据
router.post('/db-test', async (req, res) => {
  try {
    // 生成有效的 UUID
    const testId = uuidv4();
    
    // 尝试插入测试数据
    const { data, error } = await supabase
      .from('tokens')
      .insert({
        id: testId,
        name: '测试令牌',
        token: 'test-token',
        is_active: true
      })
      .select();
    
    if (error) {
      logger.error('数据库插入错误:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    logger.info('数据库插入成功:', data);
    res.json({ success: true, data, message: '数据插入成功' });
  } catch (error) {
    logger.error('数据库插入测试失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;