/**
 * 全局设置服务
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * 全局设置服务
 */
class GlobalSettingsService {
  /**
   * 获取全局设置
   */
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .eq('id', 'default')
        .single();

      if (error) {
        logger.error(`获取全局设置失败: ${error.message}`);
        throw error;
      }

      return data?.settings || {};
    } catch (error) {
      logger.error(`获取全局设置异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 保存全局设置
   */
  async saveSettings(settings) {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .upsert({
          id: 'default',
          settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) {
        logger.error(`保存全局设置失败: ${error.message}`);
        throw error;
      }

      logger.info('全局设置保存成功');
      return data?.settings || settings;
    } catch (error) {
      logger.error(`保存全局设置异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 重置全局设置为默认值
   */
  async resetSettings() {
    try {
      const defaultSettings = {
        boxCount: 100,
        fishCount: 100,
        recruitCount: 100,
        defaultBoxType: 2001,
        defaultFishType: 1,
        tokenListColumns: 2,
        useGoldRefreshFallback: false,
        commandDelay: 500,
        taskDelay: 500,
        actionDelay: 300,
        battleDelay: 500,
        refreshDelay: 1000,
        longDelay: 3000,
        maxActive: 2,
        carMinColor: 4,
        connectionTimeout: 10000,
        reconnectDelay: 1000,
        maxLogEntries: 1000,
        enableRefresh: false,
        refreshInterval: 360,
        smartDepartureGoldThreshold: 0,
        smartDepartureRecruitThreshold: 0,
        smartDepartureJadeThreshold: 0,
        smartDepartureTicketThreshold: 0,
        smartDepartureMatchAll: false
      };

      const { data, error } = await supabase
        .from('global_settings')
        .upsert({
          id: 'default',
          settings: defaultSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) {
        logger.error(`重置全局设置失败: ${error.message}`);
        throw error;
      }

      logger.info('全局设置已重置为默认值');
      return defaultSettings;
    } catch (error) {
      logger.error(`重置全局设置异常: ${error.message}`);
      throw error;
    }
  }
}

// 导出单例
export default new GlobalSettingsService();
