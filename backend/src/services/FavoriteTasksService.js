/**
 * 收藏任务服务
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

class FavoriteTasksService {
  async getFavorites() {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('settings')
        .eq('id', 'default')
        .single();

      if (error) {
        logger.error(`获取收藏任务失败: ${error.message}`);
        throw error;
      }

      return data?.settings?.favoriteTasks || [];
    } catch (error) {
      logger.error(`获取收藏任务异常: ${error.message}`);
      throw error;
    }
  }

  async saveFavorites(favorites) {
    try {
      const { data: existing, error: getError } = await supabase
        .from('global_settings')
        .select('settings')
        .eq('id', 'default')
        .single();

      let currentSettings = existing?.settings || {};
      
      currentSettings.favoriteTasks = favorites;

      const { data, error } = await supabase
        .from('global_settings')
        .upsert({
          id: 'default',
          settings: currentSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) {
        logger.error(`保存收藏任务失败: ${error.message}`);
        throw error;
      }

      logger.info('收藏任务保存成功');
      return favorites;
    } catch (error) {
      logger.error(`保存收藏任务异常: ${error.message}`);
      throw error;
    }
  }

  async toggleFavorite(taskId) {
    try {
      const favorites = await this.getFavorites();
      const index = favorites.indexOf(taskId);
      
      if (index === -1) {
        favorites.push(taskId);
      } else {
        favorites.splice(index, 1);
      }
      
      await this.saveFavorites(favorites);
      return favorites;
    } catch (error) {
      logger.error(`切换收藏任务异常: ${error.message}`);
      throw error;
    }
  }
}

export default new FavoriteTasksService();
