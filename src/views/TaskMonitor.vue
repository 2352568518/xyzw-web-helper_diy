<template>
  <div class="task-monitor-page">
    <div class="page-header">
      <h1>定时任务监控</h1>
      <div class="header-actions">
        <n-button @click="loadTasks" :loading="loadingTasks">
          <template #icon>
            <n-icon><Refresh /></n-icon>
          </template>
          刷新
        </n-button>
        <n-switch v-model:value="autoRefresh" @update:value="handleAutoRefresh">
          <template #checked>自动刷新</template>
          <template #unchecked>手动刷新</template>
        </n-switch>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card total">
        <div class="stat-icon">
          <n-icon size="24"><List /></n-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ tasks.length }}</div>
          <div class="stat-label">总任务数</div>
        </div>
      </div>
      <div class="stat-card active">
        <div class="stat-icon">
          <n-icon size="24"><CheckmarkCircle /></n-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ activeTaskCount }}</div>
          <div class="stat-label">激活任务</div>
        </div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">
          <n-icon size="24"><Checkmark /></n-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ todaySuccessCount }}</div>
          <div class="stat-label">今日成功</div>
        </div>
      </div>
      <div class="stat-card failed">
        <div class="stat-icon">
          <n-icon size="24"><CloseCircle /></n-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ todayFailedCount }}</div>
          <div class="stat-label">今日失败</div>
        </div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-section">
      <h2>任务列表</h2>
      
      <n-spin :show="loadingTasks">
        <div v-if="tasks.length === 0" class="empty-state">
          <n-empty description="暂无定时任务">
            <template #extra>
              <n-button @click="$router.push('/admin/batch-daily-tasks')">
                去创建任务
              </n-button>
            </template>
          </n-empty>
        </div>
        
        <div v-else class="tasks-grid">
          <div 
            v-for="task in tasks" 
            :key="task.id" 
            class="task-card"
            :class="{ 'is-active': task.is_active, 'is-paused': !task.is_active }"
          >
            <div class="task-header">
              <div class="task-title">
                <n-icon size="18" :color="task.is_active ? '#18a058' : '#999'">
                  <TimeOutline />
                </n-icon>
                <span>{{ task.name }}</span>
              </div>
              <n-tag 
                :type="task.is_active ? 'success' : 'default'" 
                size="small"
              >
                {{ task.is_active ? '运行中' : '已暂停' }}
              </n-tag>
            </div>
            
            <div class="task-info">
              <div class="info-item">
                <span class="label">执行时间:</span>
                <span class="value">{{ formatRunInfo(task) }}</span>
              </div>
              <div class="info-item">
                <span class="label">关联账号:</span>
                <span class="value">{{ task.token_ids?.length || 0 }} 个</span>
              </div>
              <div class="info-item">
                <span class="label">下次执行:</span>
                <span class="value">{{ formatNextRun(task) }}</span>
              </div>
            </div>

            <div class="task-stats">
              <div class="mini-stat" v-if="taskStats[task.id]">
                <span class="success">{{ taskStats[task.id].success || 0 }} 成功</span>
                <span class="failed">{{ taskStats[task.id].failed || 0 }} 失败</span>
              </div>
            </div>

            <div class="task-actions">
              <n-button 
                size="small" 
                :type="task.is_active ? 'warning' : 'success'"
                @click="toggleTaskStatus(task)"
              >
                {{ task.is_active ? '暂停' : '启用' }}
              </n-button>
              <n-button 
                size="small" 
                type="primary"
                @click="runTaskNow(task)"
                :loading="runningTasks[task.id]"
              >
                立即执行
              </n-button>
              <n-button 
                size="small" 
                @click="showTaskDetail(task)"
              >
                查看详情
              </n-button>
            </div>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- 执行记录 -->
    <div class="executions-section">
      <div class="section-header">
        <h2>执行记录</h2>
        <div class="filters">
          <n-select 
            v-model:value="filterTaskId" 
            :options="taskOptions"
            placeholder="选择任务"
            clearable
            style="width: 200px"
          />
          <n-select 
            v-model:value="filterStatus" 
            :options="statusOptions"
            placeholder="状态筛选"
            clearable
            style="width: 120px"
          />
          <n-button @click="loadExecutions" :loading="loadingExecutions">
            刷新记录
          </n-button>
        </div>
      </div>

      <n-spin :show="loadingExecutions">
        <div v-if="executions.length === 0" class="empty-state">
          <n-empty description="暂无执行记录" />
        </div>
        
        <div v-else class="executions-list">
          <div 
            v-for="exec in executions" 
            :key="exec.id" 
            class="execution-item"
            :class="`status-${exec.status}`"
          >
            <div class="exec-status">
              <n-icon 
                size="24" 
                :color="getStatusColor(exec.status)"
              >
                <component :is="getStatusIcon(exec.status)" />
              </n-icon>
            </div>
            
            <div class="exec-content">
              <div class="exec-header">
                <span class="task-name">{{ getTaskName(exec.task_id) }}</span>
                <span class="token-name">{{ getTokenName(exec.token_id) }}</span>
                <n-tag :type="getStatusType(exec.status)" size="small">
                  {{ getStatusText(exec.status) }}
                </n-tag>
              </div>
              
              <div class="exec-details">
                <div class="detail-item">
                  <n-icon><TimeOutline /></n-icon>
                  <span>开始: {{ formatTime(exec.started_at) }}</span>
                </div>
                <div class="detail-item" v-if="exec.completed_at">
                  <n-icon><TimerOutline /></n-icon>
                  <span>耗时: {{ formatDuration(exec.started_at, exec.completed_at) }}</span>
                </div>
              </div>

              <div class="exec-result" v-if="exec.result">
                <div class="result-summary" @click="toggleResultDetail(exec.id)">
                  <span>{{ summarizeResult(exec.result) }}</span>
                  <n-icon><ChevronDownOutline /></n-icon>
                </div>
                <div class="result-detail" v-if="expandedResults[exec.id]">
                  <pre>{{ JSON.stringify(exec.result, null, 2) }}</pre>
                </div>
              </div>

              <div class="exec-error" v-if="exec.status === 'failed' && exec.result?.error">
                <n-alert type="error" :bordered="false">
                  {{ exec.result.error }}
                </n-alert>
              </div>
            </div>

            <div class="exec-actions">
              <n-button 
                v-if="exec.status === 'failed'"
                size="small" 
                type="primary"
                @click="retryExecution(exec)"
                :loading="retryingExecutions[exec.id]"
              >
                重试
              </n-button>
            </div>
          </div>
        </div>
      </n-spin>

      <!-- 加载更多 -->
      <div class="load-more" v-if="hasMoreExecutions">
        <n-button @click="loadMoreExecutions" :loading="loadingMore">
          加载更多
        </n-button>
      </div>
    </div>

    <!-- 任务详情抽屉 -->
    <n-drawer v-model:show="showDetailDrawer" width="600px">
      <n-drawer-content title="任务详情">
        <div v-if="selectedTask" class="task-detail">
          <n-descriptions label-placement="left" :column="1">
            <n-descriptions-item label="任务名称">
              {{ selectedTask.name }}
            </n-descriptions-item>
            <n-descriptions-item label="任务类型">
              {{ selectedTask.type }}
            </n-descriptions-item>
            <n-descriptions-item label="执行方式">
              {{ selectedTask.run_type === 'daily' ? '每日定时' : 'Cron表达式' }}
            </n-descriptions-item>
            <n-descriptions-item label="执行时间">
              {{ formatRunInfo(selectedTask) }}
            </n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag :type="selectedTask.is_active ? 'success' : 'default'">
                {{ selectedTask.is_active ? '激活' : '停用' }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="关联账号">
              {{ selectedTask.token_ids?.length || 0 }} 个
            </n-descriptions-item>
            <n-descriptions-item label="创建时间">
              {{ formatTime(selectedTask.created_at) }}
            </n-descriptions-item>
          </n-descriptions>

          <n-divider>任务设置</n-divider>
          
          <div class="settings-preview">
            <pre>{{ JSON.stringify(selectedTask.settings, null, 2) }}</pre>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import apiService from '@/services/apiService';
import { useTokenStore } from '@/stores/tokenStore';
import {
  Refresh,
  List,
  CheckmarkCircle,
  CloseCircle,
  Checkmark,
  TimeOutline,
  TimerOutline,
  ChevronDownOutline,
  PlayCircle,
  PauseCircle,
  HelpCircle
} from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();
const tokenStore = useTokenStore();

const tasks = ref([]);
const executions = ref([]);
const taskStats = ref({});
const selectedTask = ref(null);
const showDetailDrawer = ref(false);

const loadingTasks = ref(false);
const loadingExecutions = ref(false);
const loadingMore = ref(false);

const filterTaskId = ref(null);
const filterStatus = ref(null);
const autoRefresh = ref(false);
const expandedResults = ref({});
const runningTasks = ref({});
const retryingExecutions = ref({});

let refreshTimer = null;
let executionOffset = 0;
const executionLimit = 20;

const statusOptions = [
  { label: '全部', value: null },
  { label: '运行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' }
];

const taskOptions = computed(() => {
  return [
    { label: '全部任务', value: null },
    ...tasks.value.map(t => ({ label: t.name, value: t.id }))
  ];
});

const activeTaskCount = computed(() => tasks.value.filter(t => t.is_active).length);

const todaySuccessCount = computed(() => {
  const today = new Date().toDateString();
  return executions.value.filter(e => 
    e.status === 'completed' && 
    new Date(e.started_at).toDateString() === today
  ).length;
});

const todayFailedCount = computed(() => {
  const today = new Date().toDateString();
  return executions.value.filter(e => 
    e.status === 'failed' && 
    new Date(e.started_at).toDateString() === today
  ).length;
});

const hasMoreExecutions = ref(false);

const loadTasks = async () => {
  loadingTasks.value = true;
  try {
    const res = await apiService.getTasks();
    if (res?.success && Array.isArray(res.data)) {
      tasks.value = res.data;
      loadTaskStats();
    } else {
      tasks.value = [];
    }
  } catch (error) {
    console.error('加载任务失败:', error);
    message.error('加载任务失败');
  } finally {
    loadingTasks.value = false;
  }
};

const loadTaskStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const task of tasks.value) {
    try {
      const res = await apiService.getTaskExecutions(task.id, {
        limit: 100
      });
      
      if (res?.success && Array.isArray(res.data)) {
        const todayExecs = res.data.filter(e => 
          new Date(e.started_at) >= today
        );
        
        taskStats.value[task.id] = {
          success: todayExecs.filter(e => e.status === 'completed').length,
          failed: todayExecs.filter(e => e.status === 'failed').length
        };
      }
    } catch (error) {
      console.error('加载任务统计失败:', error);
    }
  }
};

const loadExecutions = async () => {
  loadingExecutions.value = true;
  executionOffset = 0;
  
  try {
    const params = {
      limit: executionLimit,
      offset: 0
    };
    
    if (filterStatus.value) {
      params.status = filterStatus.value;
    }

    let result;
    if (filterTaskId.value) {
      result = await apiService.getTaskExecutions(filterTaskId.value, params);
    } else {
      result = await getAllExecutions(params);
    }

    if (result?.success && Array.isArray(result.data)) {
      executions.value = result.data;
      hasMoreExecutions.value = result.data.length === executionLimit;
    } else {
      executions.value = [];
      hasMoreExecutions.value = false;
    }
  } catch (error) {
    console.error('加载执行记录失败:', error);
    message.error('加载执行记录失败');
  } finally {
    loadingExecutions.value = false;
  }
};

const loadMoreExecutions = async () => {
  loadingMore.value = true;
  executionOffset += executionLimit;
  
  try {
    const params = {
      limit: executionLimit,
      offset: executionOffset
    };
    
    if (filterStatus.value) {
      params.status = filterStatus.value;
    }

    let result;
    if (filterTaskId.value) {
      result = await apiService.getTaskExecutions(filterTaskId.value, params);
    } else {
      result = await getAllExecutions(params);
    }

    if (result?.success && Array.isArray(result.data)) {
      executions.value = [...executions.value, ...result.data];
      hasMoreExecutions.value = result.data.length === executionLimit;
    }
  } catch (error) {
    console.error('加载更多失败:', error);
    message.error('加载更多失败');
  } finally {
    loadingMore.value = false;
  }
};

const getAllExecutions = async (params) => {
  const allExecutions = [];
  
  for (const task of tasks.value) {
    try {
      const res = await apiService.getTaskExecutions(task.id, params);
      if (res?.success && Array.isArray(res.data)) {
        allExecutions.push(...res.data);
      }
    } catch (error) {
      console.error(`获取任务 ${task.id} 执行记录失败:`, error);
    }
  }
  
  allExecutions.sort((a, b) => 
    new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );
  
  return {
    success: true,
    data: allExecutions.slice(0, params.limit)
  };
};

const toggleTaskStatus = async (task) => {
  dialog.warning({
    title: task.is_active ? '暂停任务' : '启用任务',
    content: `确定要${task.is_active ? '暂停' : '启用'}任务 "${task.name}" 吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res = await apiService.updateTask(task.id, {
          is_active: !task.is_active
        });
        
        if (res?.success) {
          task.is_active = !task.is_active;
          message.success(task.is_active ? '任务已启用' : '任务已暂停');
        } else {
          message.error('操作失败');
        }
      } catch (error) {
        console.error('更新任务状态失败:', error);
        message.error('操作失败');
      }
    }
  });
};

const runTaskNow = async (task) => {
  runningTasks.value[task.id] = true;
  
  try {
    const res = await apiService.runTask(task.id);
    
    if (res?.success) {
      message.success('任务已开始执行');
      setTimeout(() => {
        loadExecutions();
        loadTaskStats();
      }, 1000);
    } else {
      message.error(res?.error || '执行失败');
    }
  } catch (error) {
    console.error('执行任务失败:', error);
    message.error('执行任务失败');
  } finally {
    runningTasks.value[task.id] = false;
  }
};

const retryExecution = async (exec) => {
  retryingExecutions.value[exec.id] = true;
  
  try {
    const res = await apiService.runTask(exec.task_id);
    
    if (res?.success) {
      message.success('任务已重新执行');
      setTimeout(() => loadExecutions(), 1000);
    } else {
      message.error(res?.error || '重试失败');
    }
  } catch (error) {
    console.error('重试失败:', error);
    message.error('重试失败');
  } finally {
    retryingExecutions.value[exec.id] = false;
  }
};

const showTaskDetail = (task) => {
  selectedTask.value = task;
  showDetailDrawer.value = true;
};

const toggleResultDetail = (execId) => {
  expandedResults.value[execId] = !expandedResults.value[execId];
};

const handleAutoRefresh = (value) => {
  if (value) {
    refreshTimer = setInterval(() => {
      loadExecutions();
      loadTaskStats();
    }, 10000);
  } else {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }
};

const formatRunInfo = (task) => {
  if (task.run_type === 'daily') {
    return `每天 ${task.run_time || '00:00'}`;
  }
  return task.cron_expression || '-';
};

const formatNextRun = (task) => {
  if (!task.is_active) return '已暂停';
  
  const now = new Date();
  let nextRun = null;
  
  if (task.run_type === 'daily' && task.run_time) {
    // 每日任务
    const [hours, minutes] = task.run_time.split(':').map(Number);
    nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    // 如果今天的时间已过，设置为明天
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (task.run_type === 'cron' && task.cron_expression) {
    // Cron任务 - 简单解析
    nextRun = calculateNextCronRun(task.cron_expression);
  }
  
  if (!nextRun) return '-';
  
  // 格式化显示
  const diffMs = nextRun - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  const timeStr = nextRun.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = nextRun.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  
  if (diffDays > 0) {
    return `${dateStr} ${timeStr} (${diffDays}天后)`;
  } else if (diffHours > 0) {
    return `${timeStr} (${diffHours}小时后)`;
  } else if (diffMins > 0) {
    return `${timeStr} (${diffMins}分钟后)`;
  } else {
    return `${timeStr} (即将执行)`;
  }
};

// 简单的Cron表达式解析（仅支持基本格式）
const calculateNextCronRun = (cronExpression) => {
  try {
    const parts = cronExpression.split(' ').filter(Boolean);
    if (parts.length < 5) return null;
    
    const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = parts;
    
    // 解析分钟和小时
    const minutes = parseCronFieldValues(minuteField, 0, 59);
    const hours = parseCronFieldValues(hourField, 0, 23);
    
    if (minutes.length === 0 || hours.length === 0) return null;
    
    const now = new Date();
    now.setSeconds(0, 0);
    
    // 从当前时间开始，寻找下一个匹配的时间
    for (let d = 0; d < 366; d++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + d);
      
      // 检查月份和日期是否匹配
      const month = checkDate.getMonth() + 1;
      const dayOfMonth = checkDate.getDate();
      const dayOfWeek = checkDate.getDay();
      
      const months = parseCronFieldValues(monthField, 1, 12);
      const daysOfMonth = parseCronFieldValues(dayOfMonthField, 1, 31);
      const daysOfWeek = parseCronFieldValues(dayOfWeekField, 0, 6);
      
      if (months.length > 0 && !months.includes(month)) continue;
      if (daysOfMonth.length > 0 && !daysOfMonth.includes(dayOfMonth)) continue;
      if (daysOfWeek.length > 0 && !daysOfWeek.includes(dayOfWeek)) continue;
      
      // 找到匹配的日期，检查时间
      for (const hour of hours) {
        for (const minute of minutes) {
          const candidate = new Date(checkDate);
          candidate.setHours(hour, minute, 0, 0);
          
          if (candidate > now) {
            return candidate;
          }
        }
      }
    }
    
    return null;
  } catch (e) {
    console.error('解析Cron表达式失败:', e);
    return null;
  }
};

// 解析Cron字段值
const parseCronFieldValues = (field, min, max) => {
  if (field === '*') {
    const values = [];
    for (let i = min; i <= max; i++) values.push(i);
    return values;
  }
  
  if (field.includes('/')) {
    const [base, step] = field.split('/');
    const stepNum = parseInt(step, 10);
    const values = [];
    let start = base === '*' ? min : parseInt(base, 10);
    for (let i = start; i <= max; i += stepNum) {
      values.push(i);
    }
    return values;
  }
  
  if (field.includes(',')) {
    return field.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v));
  }
  
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(v => parseInt(v, 10));
    const values = [];
    for (let i = start; i <= end; i++) values.push(i);
    return values;
  }
  
  const num = parseInt(field, 10);
  return isNaN(num) ? [] : [num];
};

const formatTime = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN');
};

const formatDuration = (start, end) => {
  if (!start || !end) return '-';
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!s || !e || e < s) return '-';
  const diff = Math.floor((e - s) / 1000);
  if (diff < 60) return `${diff}秒`;
  const m = Math.floor(diff / 60);
  const sRem = diff % 60;
  return `${m}分${sRem}秒`;
};

const getTaskName = (taskId) => {
  const task = tasks.value.find(t => t.id === taskId);
  return task?.name || taskId;
};

const getTokenName = (tokenId) => {
  const token = tokenStore.gameTokens.value?.find(t => t.id === tokenId);
  return token?.name || tokenId;
};

const summarizeResult = (result) => {
  if (!result) return '';
  
  if (result.steps) {
    const steps = result.steps;
    const success = steps.filter(s => s.status === 'success').length;
    const failed = steps.filter(s => s.status === 'failed').length;
    return `执行 ${steps.length} 步: ${success} 成功, ${failed} 失败`;
  }
  
  if (result.error) {
    return `错误: ${result.error}`;
  }
  
  if (result.status) {
    return result.status;
  }
  
  return '完成';
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return '#18a058';
    case 'failed': return '#d03050';
    case 'running': return '#2080f0';
    default: return '#999';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed': return CheckmarkCircle;
    case 'failed': return CloseCircle;
    case 'running': return PlayCircle;
    default: return HelpCircle;
  }
};

const getStatusType = (status) => {
  switch (status) {
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'running': return 'info';
    default: return 'default';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'completed': return '成功';
    case 'failed': return '失败';
    case 'running': return '运行中';
    default: return status;
  }
};

onMounted(() => {
  loadTasks();
  loadExecutions();
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<style scoped lang="scss">
.task-monitor-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
  }

  .stat-label {
    font-size: 14px;
    color: #666;
  }

  &.total .stat-icon { background: #e3f2fd; color: #1976d2; }
  &.total .stat-value { color: #1976d2; }
  
  &.active .stat-icon { background: #e8f5e9; color: #388e3c; }
  &.active .stat-value { color: #388e3c; }
  
  &.success .stat-icon { background: #e8f5e9; color: #2e7d32; }
  &.success .stat-value { color: #2e7d32; }
  
  &.failed .stat-icon { background: #ffebee; color: #d32f2f; }
  &.failed .stat-value { color: #d32f2f; }
}

.tasks-section, .executions-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  h2 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 16px 0;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h2 {
    margin: 0;
  }

  .filters {
    display: flex;
    gap: 12px;
  }
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.task-card {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.is-active {
    border-color: #18a058;
    background: linear-gradient(to bottom, #f6ffed, white);
  }

  &.is-paused {
    background: #fafafa;
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .task-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }
  }

  .task-info {
    margin-bottom: 12px;

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 13px;

      .label {
        color: #666;
      }

      .value {
        color: #333;
      }
    }
  }

  .task-stats {
    margin-bottom: 12px;

    .mini-stat {
      display: flex;
      gap: 16px;
      font-size: 12px;

      .success { color: #18a058; }
      .failed { color: #d03050; }
    }
  }

  .task-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.executions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.execution-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  &.status-completed {
    border-left: 4px solid #18a058;
  }

  &.status-failed {
    border-left: 4px solid #d03050;
    background: #fff7f7;
  }

  &.status-running {
    border-left: 4px solid #2080f0;
    background: #f0f7ff;
  }

  .exec-status {
    margin-right: 16px;
    padding-top: 4px;
  }

  .exec-content {
    flex: 1;

    .exec-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;

      .task-name {
        font-weight: 600;
      }

      .token-name {
        color: #666;
        font-size: 13px;
      }
    }

    .exec-details {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;

      .detail-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: #666;
      }
    }

    .exec-result {
      margin-top: 8px;

      .result-summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #f5f5f5;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;

        &:hover {
          background: #eee;
        }
      }

      .result-detail {
        margin-top: 8px;
        padding: 12px;
        background: #f8f8f8;
        border-radius: 6px;
        overflow-x: auto;

        pre {
          margin: 0;
          font-size: 12px;
          white-space: pre-wrap;
        }
      }
    }

    .exec-error {
      margin-top: 8px;
    }
  }

  .exec-actions {
    margin-left: 16px;
  }
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.empty-state {
  padding: 40px;
  text-align: center;
}

.task-detail {
  .settings-preview {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;

    pre {
      margin: 0;
      font-size: 12px;
    }
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .tasks-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    gap: 12px;

    .filters {
      width: 100%;
      flex-wrap: wrap;
    }
  }

  .execution-item {
    flex-direction: column;

    .exec-status {
      margin-right: 0;
      margin-bottom: 12px;
    }

    .exec-actions {
      margin-left: 0;
      margin-top: 12px;
    }
  }
}
</style>
