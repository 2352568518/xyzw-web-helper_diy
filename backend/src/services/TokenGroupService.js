/**
 * Token分组服务
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Token分组服务
 */
class TokenGroupService {
  /**
   * 获取所有分组
   */
  async getAllGroups() {
    try {
      const { data, error } = await supabase
        .from('token_groups')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        logger.error(`获取分组列表失败: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`获取分组列表异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建分组
   */
  async createGroup(groupData) {
    try {
      // 获取当前最大的sort_order
      const { data: maxOrderData } = await supabase
        .from('token_groups')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      
      const maxOrder = maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0].sort_order || 0) : 0;

      const group = {
        id: groupData.id,
        name: groupData.name,
        color: groupData.color || '#1677ff',
        token_ids: groupData.token_ids || [],
        sort_order: groupData.sort_order !== undefined ? groupData.sort_order : maxOrder + 1,
        created_at: groupData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('token_groups')
        .insert(group)
        .select()
        .single();

      if (error) {
        logger.error(`创建分组失败: ${error.message}`);
        throw error;
      }

      logger.info(`分组创建成功: ${group.name}`);
      return data;
    } catch (error) {
      logger.error(`创建分组异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新分组
   */
  async updateGroup(id, updates) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('token_groups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error(`更新分组失败: ${error.message}`);
        throw error;
      }

      logger.info(`分组更新成功: ${id}`);
      return data;
    } catch (error) {
      logger.error(`更新分组异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除分组
   */
  async deleteGroup(id) {
    try {
      const { error } = await supabase
        .from('token_groups')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error(`删除分组失败: ${error.message}`);
        throw error;
      }

      logger.info(`分组删除成功: ${id}`);
      return true;
    } catch (error) {
      logger.error(`删除分组异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 批量保存分组（用于同步）
   */
  async saveGroups(groups) {
    try {
      // 先删除所有分组
      await supabase.from('token_groups').delete().neq('id', 'never_match');

      // 批量插入新分组
      if (groups && groups.length > 0) {
        const groupsToInsert = groups.map((g, index) => ({
          id: g.id,
          name: g.name,
          color: g.color || '#1677ff',
          token_ids: g.tokenIds || g.token_ids || [],
          sort_order: g.sortOrder !== undefined ? g.sortOrder : (g.sort_order !== undefined ? g.sort_order : index),
          created_at: g.createdAt || g.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('token_groups')
          .insert(groupsToInsert);

        if (error) {
          logger.error(`批量保存分组失败: ${error.message}`);
          throw error;
        }
      }

      logger.info(`批量保存分组成功: ${groups ? groups.length : 0} 个分组`);
      return true;
    } catch (error) {
      logger.error(`批量保存分组异常: ${error.message}`);
      throw error;
    }
  }
}

// 导出单例
export default new TokenGroupService();
