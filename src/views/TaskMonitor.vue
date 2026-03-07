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
        <n-button @click="clearExecutionLogs" type="warning" :loading="clearingLogs">
          <template #icon>
            <n-icon><Trash /></n-icon>
          </template>
          清空日志
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
      <div class="stat-card success" @click="showStatsDetail('executed')">
        <div class="stat-icon">
          <n-icon size="24"><Checkmark /></n-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ todayStats.todayExecutedCount }}</div>
          <div class="stat-label">今日执行</div>
        </div>
        <div class="stat-action">
          <n-icon><ChevronForward /></n-icon>
        </div>
      </div>
      <div class="stat-card failed" @click="showStatsDetail('failed')">
        <div class="stat-icon">
          <n-icon size="24"><CloseCircle /></n-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ todayStats.todayFailedCount }}</div>
          <div class="stat-label">今日失败</div>
        </div>
        <div class="stat-action">
          <n-icon><ChevronForward /></n-icon>
        </div>
      </div>
    </div>

    <!-- 下个执行 -->
    <div class="upcoming-section" v-if="upcomingTasks.length > 0">
      <div class="section-header">
        <h2>下个执行</h2>
        <div class="view-toggle">
          <n-button-group size="small">
            <n-button 
              :type="viewMode === 'card' ? 'primary' : 'default'"
              @click="viewMode = 'card'"
            >
              <template #icon>
                <n-icon><GridOutline /></n-icon>
              </template>
              卡片
            </n-button>
            <n-button 
              :type="viewMode === 'list' ? 'primary' : 'default'"
              @click="viewMode = 'list'"
            >
              <template #icon>
                <n-icon><ListOutline /></n-icon>
              </template>
              列表
            </n-button>
          </n-button-group>
        </div>
      </div>
      
      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" class="upcoming-card">
        <div 
          v-for="task in upcomingTasks" 
          :key="task.id" 
          class="task-card is-active"
        >
          <div class="task-header">
            <div class="task-title">
              <n-icon size="18" color="#18a058">
                <TimeOutline />
              </n-icon>
              <span>{{ task.name }}</span>
            </div>
            <n-tag type="success" size="small">
              即将执行
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
              <span class="value highlight">{{ formatUpcomingTime(task.nextRunTime) }} ({{ formatRelativeTime(task.nextRunTime) }})</span>
            </div>
          </div>

          <div class="task-actions">
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
      
      <!-- 列表视图 -->
      <div v-else-if="viewMode === 'list'" class="upcoming-list">
        <n-data-table
          :columns="upcomingColumns"
          :data="upcomingTasks"
          :row-key="row => row.id"
          :row-class-name="() => 'row-active'"
        />
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-section">
      <div class="section-header">
        <h2>任务列表</h2>
        <div class="section-actions">
          <n-button type="primary" size="small" @click="openNewTaskModal">
            <template #icon>
              <n-icon><TimeOutline /></n-icon>
            </template>
            新增任务
          </n-button>
          <div class="view-toggle">
            <n-button-group size="small">
              <n-button 
                :type="viewMode === 'card' ? 'primary' : 'default'"
                @click="viewMode = 'card'"
              >
                <template #icon>
                  <n-icon><GridOutline /></n-icon>
                </template>
                卡片
              </n-button>
              <n-button 
                :type="viewMode === 'list' ? 'primary' : 'default'"
                @click="viewMode = 'list'"
              >
                <template #icon>
                  <n-icon><ListOutline /></n-icon>
                </template>
                列表
              </n-button>
            </n-button-group>
          </div>
        </div>
      </div>
      
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
        
        <!-- 卡片视图 -->
        <div v-else-if="viewMode === 'card'" class="tasks-grid">
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
                <div class="stat-row">
                  <span class="label">上次执行:</span>
                  <span class="value">{{ formatTime(taskStats[task.id].lastExecutionTime) }}</span>
                </div>
                <div class="stat-row">
                  <span class="success">{{ taskStats[task.id].success || 0 }} 成功</span>
                  <span class="failed">{{ taskStats[task.id].failed || 0 }} 失败</span>
                  <span class="total">共 {{ taskStats[task.id].total || 0 }} 个</span>
                </div>
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
                @click="openEditTaskModal(task)"
              >
                编辑
              </n-button>
              <n-button 
                size="small" 
                type="error"
                @click="deleteTask(task)"
              >
                删除
              </n-button>
            </div>
          </div>
        </div>
        
        <!-- 列表视图 -->
        <div v-else-if="viewMode === 'list'" class="tasks-list">
          <n-data-table
            :columns="taskColumns"
            :data="tasks"
            :row-key="row => row.id"
            :row-class-name="row => row.is_active ? 'row-active' : 'row-paused'"
          />
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

          <n-divider>上次执行情况</n-divider>
          
          <n-spin :show="loadingLogs">
            <div v-if="lastExecutionLogs && lastExecutionLogs.length > 0" class="execution-logs">
              <div class="logs-header">
                <div class="log-summary">
                  <n-tag type="info" size="small">
                    执行时间: {{ formatTime(lastExecutionLogs[0].started_at) }}
                  </n-tag>
                  <n-tag v-if="lastExecutionLogs.some(l => l.status === 'completed')" type="success" size="small">
                    成功: {{ lastExecutionLogs.filter(l => l.status === 'completed').length }} 个
                  </n-tag>
                  <n-tag v-if="lastExecutionLogs.some(l => l.status === 'failed')" type="error" size="small">
                    失败: {{ lastExecutionLogs.filter(l => l.status === 'failed').length }} 个
                  </n-tag>
                  <n-tag type="default" size="small">
                    共: {{ lastExecutionLogs.length }} 个
                  </n-tag>
                </div>
              </div>
              
              <div class="logs-list">
                <div 
                  v-for="log in lastExecutionLogs" 
                  :key="log.id" 
                  class="log-item"
                  :class="`status-${log.status}`"
                >
                  <div class="log-header">
                    <span class="account-name">{{ getTokenName(log.token_id) }}</span>
                    <n-tag :type="getStatusType(log.status)" size="small">
                      {{ getStatusText(log.status) }}
                    </n-tag>
                  </div>
                  <div class="log-time">
                    {{ formatTime(log.started_at) }}
                    <span v-if="log.completed_at">
                      (耗时: {{ formatDuration(log.started_at, log.completed_at) }})
                    </span>
                  </div>
                  <div class="log-result" v-if="log.result">
                    <div class="result-summary" @click="toggleResultDetail(log.id)">
                      <span>{{ summarizeResult(log.result) }}</span>
                      <n-icon><ChevronDownOutline /></n-icon>
                    </div>
                    <div class="result-detail" v-if="expandedResults[log.id]">
                      <pre>{{ JSON.stringify(log.result, null, 2) }}</pre>
                    </div>
                  </div>
                  <div class="log-error" v-if="log.status === 'failed' && log.result?.error">
                    <n-alert type="error" :bordered="false" size="small">
                      {{ log.result.error }}
                    </n-alert>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else class="no-logs">
              <n-empty description="暂无执行记录" />
            </div>
          </n-spin>
        </div>
      </n-drawer-content>
    </n-drawer>

    <!-- 统计详情抽屉 -->
    <n-drawer v-model:show="showStatsDrawer" width="600px">
      <n-drawer-content :title="statsDrawerData?.title || '统计详情'">
        <!-- 今日执行列表 -->
        <div v-if="statsDrawerData?.type === 'executed' && statsDrawerData.taskExecutions" class="stats-detail">
          <div class="stats-summary">
            <n-tag type="info" size="small">
              共 {{ statsDrawerData.taskExecutions.length }} 次调度
            </n-tag>
          </div>
          
          <div class="stats-list">
            <div 
              v-for="exec in statsDrawerData.taskExecutions" 
              :key="`${exec.taskId}_${exec.startedAt}`" 
              class="stat-item clickable"
              :class="{ expanded: expandedScheduleExecutions[`${exec.taskId}_${exec.startedAt}`] }"
            >
              <div class="stat-item-header" @click="toggleScheduleExecution(exec)">
                <div class="header-left">
                  <n-icon class="expand-icon" :class="{ rotated: expandedScheduleExecutions[`${exec.taskId}_${exec.startedAt}`] }">
                    <ChevronForward />
                  </n-icon>
                  <span class="task-name">{{ exec.taskName }}</span>
                </div>
                <n-tag :type="exec.failed > 0 ? 'error' : 'success'" size="small">
                  {{ exec.success }}/{{ exec.total }}
                </n-tag>
              </div>
              <div class="stat-item-time">
                {{ formatTime(exec.startedAt) }}
              </div>
              
              <!-- 展开的执行详情 -->
              <div 
                v-if="expandedScheduleExecutions[`${exec.taskId}_${exec.startedAt}`]" 
                class="execution-details"
              >
                <n-spin :show="loadingScheduleExecutions[`${exec.taskId}_${exec.startedAt}`]">
                  <div v-if="scheduleExecutionDetails[`${exec.taskId}_${exec.startedAt}`]?.length > 0" class="details-list">
                    <div 
                      v-for="log in scheduleExecutionDetails[`${exec.taskId}_${exec.startedAt}`]" 
                      :key="log.id" 
                      class="detail-log-item"
                      :class="`status-${log.status}`"
                    >
                      <div class="log-header">
                        <span class="account-name">{{ getTokenName(log.token_id) }}</span>
                        <n-tag :type="getStatusType(log.status)" size="small">
                          {{ getStatusText(log.status) }}
                        </n-tag>
                      </div>
                      <div class="log-time">
                        {{ formatTime(log.started_at) }}
                        <span v-if="log.completed_at">
                          (耗时: {{ formatDuration(log.started_at, log.completed_at) }})
                        </span>
                      </div>
                      <div class="log-result" v-if="log.result">
                        <div class="result-summary" @click="toggleResultDetail(log.id)">
                          <span>{{ summarizeResult(log.result) }}</span>
                          <n-icon><ChevronDownOutline /></n-icon>
                        </div>
                        <div class="result-detail" v-if="expandedResults[log.id]">
                          <pre>{{ JSON.stringify(log.result, null, 2) }}</pre>
                        </div>
                      </div>
                      <div class="log-error" v-if="log.status === 'failed' && log.result?.error">
                        <n-alert type="error" :bordered="false" size="small">
                          {{ log.result.error }}
                        </n-alert>
                      </div>
                    </div>
                  </div>
                  <n-empty v-else-if="!loadingScheduleExecutions[`${exec.taskId}_${exec.startedAt}`]" description="暂无执行记录" size="small" />
                </n-spin>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 今日失败列表 -->
        <div v-if="statsDrawerData?.type === 'failed' && statsDrawerData.failedTokens" class="stats-detail">
          <div class="stats-summary">
            <n-tag type="error" size="small">
              共 {{ statsDrawerData.failedTokens.length }} 个失败
            </n-tag>
          </div>
          
          <div class="stats-list">
            <div 
              v-for="(ft, index) in statsDrawerData.failedTokens" 
              :key="index" 
              class="stat-item status-failed"
            >
              <div class="stat-item-header">
                <span class="task-name">{{ ft.taskName }}</span>
                <span class="account-name">{{ getTokenName(ft.tokenId) }}</span>
              </div>
              <div class="stat-item-time">
                {{ formatTime(ft.startedAt) }}
              </div>
              <div class="stat-item-error">
                {{ ft.error }}
              </div>
            </div>
          </div>
        </div>
        
        <n-empty v-if="!statsDrawerData || 
          (statsDrawerData.type === 'executed' && (!statsDrawerData.taskExecutions || statsDrawerData.taskExecutions.length === 0)) ||
          (statsDrawerData.type === 'failed' && (!statsDrawerData.failedTokens || statsDrawerData.failedTokens.length === 0))" 
          description="暂无数据" 
        />
      </n-drawer-content>
    </n-drawer>

    <!-- 任务编辑模态框 -->
    <n-modal
      v-model:show="showTaskModal"
      preset="card"
      :title="editingTask ? '编辑定时任务' : '新增定时任务'"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">任务名称</label>
            <n-input
              v-model:value="taskForm.name"
              placeholder="请输入任务名称"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">运行类型</label>
            <n-radio-group
              v-model:value="taskForm.runType"
              @update:value="resetRunType"
            >
              <n-radio value="daily">每天固定时间</n-radio>
              <n-radio value="cron">Cron表达式</n-radio>
            </n-radio-group>
          </div>
          <div class="setting-item" v-if="taskForm.runType === 'daily'">
            <label class="setting-label">运行时间</label>
            <n-time-picker v-model:value="taskForm.runTime" format="HH:mm" />
          </div>
          <div class="setting-item" v-if="taskForm.runType === 'cron'">
            <label class="setting-label">Cron表达式</label>
            <n-input
              v-model:value="taskForm.cronExpression"
              placeholder="请输入Cron表达式"
              @input="parseCronExpression"
            />

            <!-- Cron表达式解析结果 -->
            <div class="cron-parser" v-if="taskForm.cronExpression">
              <div v-if="cronValidation.valid" class="cron-validation success">
                <n-text type="success">✓ {{ cronValidation.message }}</n-text>
              </div>
              <div v-else class="cron-validation error">
                <n-text type="error">✗ {{ cronValidation.message }}</n-text>
              </div>

              <!-- 未来执行时间 -->
              <div
                v-if="cronValidation.valid && cronNextRuns.length > 0"
                class="cron-next-runs"
              >
                <h4>未来5次执行时间：</h4>
                <ul>
                  <li v-for="(run, index) in cronNextRuns" :key="index">
                    {{ run }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="setting-item">
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
              "
            >
              <label class="setting-label">选择账号</label>
              <n-space size="small">
                <n-button size="small" @click="selectAllTokens">
                  全选
                </n-button>
                <n-button size="small" @click="deselectAllTokens">
                  全不选
                </n-button>
              </n-space>
            </div>

            <!-- 分组快速选择 -->
            <div style="margin-bottom: 12px">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 12px; color: #86909c">
                  快速选择分组：
                </div>
                <n-button type="primary" size="tiny" text @click="showGroupManageModal = true">
                  管理分组
                </n-button>
              </div>
              <div v-if="tokenGroups.length === 0" style="font-size: 12px; color: #ccc;">
                暂无分组
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap">
                <n-button
                  v-for="group in tokenGroups"
                  :key="group.id"
                  size="small"
                  :type="taskScheduleSelectedGroupIds.includes(group.id) ? 'primary' : 'default'"
                  @click="toggleGroupSelection(group)"
                  :style="{
                    borderColor: group.color,
                  }"
                >
                  {{ group.name }}
                </n-button>
              </div>
            </div>

            <n-checkbox-group v-model:value="taskForm.selectedTokens">
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="token in sortedTokens" :key="token.id">
                  <n-checkbox :value="token.id">{{ token.name }}</n-checkbox>
                </n-grid-item>
              </n-grid>
            </n-checkbox-group>
          </div>
          <div class="setting-item">
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
              "
            >
              <label class="setting-label">选择任务</label>
              <n-space size="small">
                <n-button size="small" @click="selectAllTasks"> 全选 </n-button>
                <n-button size="small" @click="deselectAllTasks">
                  全不选
                </n-button>
              </n-space>
            </div>
            
            <n-checkbox-group v-model:value="taskForm.selectedTasks">
              <n-tabs type="line" animated size="small" pane-style="padding-top: 12px;" default-value="daily">
                <n-tab-pane 
                  v-for="group in taskGroupDefinitions" 
                  :key="group.name" 
                  :name="group.name" 
                  :tab="group.label"
                >
                  <n-grid :cols="2" :x-gap="12" :y-gap="8">
                    <n-grid-item v-for="task in groupedAvailableTasks[group.name]" :key="task.value">
                      <n-checkbox :value="task.value">{{ task.label }}</n-checkbox>
                    </n-grid-item>
                  </n-grid>
                </n-tab-pane>
                
                <n-tab-pane 
                  v-if="groupedAvailableTasks['other'] && groupedAvailableTasks['other'].length > 0" 
                  name="other" 
                  tab="其他"
                >
                  <n-grid :cols="2" :x-gap="12" :y-gap="8">
                    <n-grid-item v-for="task in groupedAvailableTasks['other']" :key="task.value">
                      <n-checkbox :value="task.value">{{ task.label }}</n-checkbox>
                    </n-grid-item>
                  </n-grid>
                </n-tab-pane>
              </n-tabs>
            </n-checkbox-group>
          </div>
          <div class="setting-item">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label class="setting-label">启用状态</label>
              <n-switch v-model:value="taskForm.isActive" />
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showTaskModal = false" style="margin-right: 12px"
            >取消</n-button
          >
          <n-button type="primary" @click="saveTask" :loading="savingTask">保存</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h, reactive } from 'vue';
import { useMessage, useDialog, NButton, NTag } from 'naive-ui';
import apiService from '@/services/apiService';
import { useTokenStore, tokenGroups } from '@/stores/tokenStore';
import { availableTasks } from '@/utils/batch/constants';
import { validateCronExpression, calculateNextRuns } from '@/utils/batch';
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
  HelpCircle,
  Trash,
  GridOutline,
  ListOutline,
  ChevronForward
} from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();
const tokenStore = useTokenStore();

const tasks = ref([]);
const executions = ref([]);
const taskStats = ref({});
const todayStats = ref({
  todayExecutedCount: 0,
  todayFailedCount: 0,
  taskExecutions: []
});
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
const viewMode = ref('list'); // 'card' or 'list'，默认列表

// 任务编辑相关
const showTaskModal = ref(false);
const editingTask = ref(null);
const savingTask = ref(false);
const taskForm = reactive({
  name: '',
  runType: 'daily',
  runTime: null,
  cronExpression: '',
  selectedTokens: [],
  selectedTasks: [],
  isActive: true
});

// Cron表达式解析相关
const cronValidation = ref({ valid: true, message: "" });
const cronNextRuns = ref([]);

// 分组选择相关
const taskScheduleSelectedGroupIds = ref([]);
const showGroupManageModal = ref(false);

// 排序后的Token列表 - 保持与tokenStore相同的顺序
const sortedTokens = computed(() => {
  return [...tokenStore.gameTokens];
});

// 任务分组定义
const taskGroupDefinitions = [
  { name: 'daily', label: '日常', tasks: ['startBatch', 'claimHangUpRewards', 'batchAddHangUpTime', 'resetBottles', 'batchlingguanzi', 'batchclubsign', 'batchStudy', 'batcharenafight', 'batchSmartSendCar', 'batchClaimCars', 'store_purchase', 'collection_claimfreereward', 'batchGenieSweep'] },
  { name: 'dungeon', label: '副本', tasks: ['climbTower', 'batchmengjing', 'skinChallenge', 'batchClaimPeachTasks', 'batchBuyDreamItems'] },
  { name: 'baoku', label: '宝库', tasks: ['batchbaoku13', 'batchbaoku45'] },
  { name: 'weirdTower', label: '怪异塔', tasks: ['climbWeirdTower', 'batchUseItems', 'batchMergeItems', 'batchClaimFreeEnergy'] },
  { name: 'resource', label: '资源', tasks: ['batchOpenBox', 'batchClaimBoxPointReward', 'batchFish', 'batchRecruit', 'legion_storebuygoods'] },
  { name: 'legacy', label: '功法', tasks: ['batchLegacyClaim', 'batchLegacyGiftSendEnhanced'] },
  { name: 'monthly', label: '月度', tasks: ['batchTopUpFish', 'batchTopUpArena'] }
];

// 计算属性，根据 taskGroupDefinitions 将 availableTasks 分组
const groupedAvailableTasks = computed(() => {
  const groups = {};
  taskGroupDefinitions.forEach(group => {
    groups[group.name] = availableTasks.filter(task => group.tasks.includes(task.value));
  });
  
  // 处理未分组的任务
  const groupedTaskValues = taskGroupDefinitions.flatMap(g => g.tasks);
  const otherTasks = availableTasks.filter(task => !groupedTaskValues.includes(task.value));
  if (otherTasks.length > 0) {
    groups['other'] = otherTasks;
  }
  
  return groups;
});

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

const tokenOptions = computed(() => {
  const tokens = tokenStore.gameTokens || [];
  return tokens.map(t => ({
    label: t.name || t.id,
    value: t.id
  }));
});

const availableTaskOptions = computed(() => {
  return availableTasks.map(t => ({
    label: t.label,
    value: t.value
  }));
});

const taskColumns = [
  {
    title: '任务名称',
    key: 'name',
    render: (row) => h('div', { class: 'task-name-cell' }, [
      h('span', { class: 'task-name' }, row.name)
    ])
  },
  {
    title: '状态',
    key: 'is_active',
    width: 100,
    render: (row) => h(NTag, {
      type: row.is_active ? 'success' : 'default',
      size: 'small'
    }, () => row.is_active ? '运行中' : '已暂停')
  },
  {
    title: '执行时间',
    key: 'run_time',
    width: 150,
    render: (row) => formatRunInfo(row)
  },
  {
    title: '关联账号',
    key: 'token_ids',
    width: 100,
    render: (row) => `${row.token_ids?.length || 0} 个`
  },
  {
    title: '下次执行',
    key: 'next_run',
    width: 150,
    render: (row) => formatNextRun(row)
  },
  {
    title: '操作',
    key: 'actions',
    width: 250,
    render: (row) => h('div', { class: 'task-actions-cell' }, [
      h(NButton, {
        size: 'small',
        type: row.is_active ? 'warning' : 'success',
        onClick: () => toggleTaskStatus(row)
      }, () => row.is_active ? '暂停' : '启用'),
      h(NButton, {
        size: 'small',
        type: 'primary',
        loading: runningTasks.value[row.id],
        onClick: () => runTaskNow(row)
      }, () => '执行'),
      h(NButton, {
        size: 'small',
        onClick: () => openEditTaskModal(row)
      }, () => '编辑'),
      h(NButton, {
        size: 'small',
        type: 'error',
        onClick: () => deleteTask(row)
      }, () => '删除')
    ])
  }
];

const upcomingColumns = [
  {
    title: '任务名称',
    key: 'name',
    render: (row) => h('div', { class: 'task-name-cell' }, [
      h('span', { class: 'task-name' }, row.name)
    ])
  },
  {
    title: '执行时间',
    key: 'run_time',
    width: 150,
    render: (row) => formatRunInfo(row)
  },
  {
    title: '关联账号',
    key: 'token_ids',
    width: 100,
    render: (row) => `${row.token_ids?.length || 0} 个`
  },
  {
    title: '下次执行',
    key: 'next_run',
    width: 200,
    render: (row) => h('span', { class: 'highlight' }, 
      `${formatUpcomingTime(row.nextRunTime)} (${formatRelativeTime(row.nextRunTime)})`
    )
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => h('div', { class: 'task-actions-cell' }, [
      h(NButton, {
        size: 'small',
        type: 'primary',
        loading: runningTasks.value[row.id],
        onClick: () => runTaskNow(row)
      }, () => '执行'),
      h(NButton, {
        size: 'small',
        onClick: () => showTaskDetail(row)
      }, () => '详情')
    ])
  }
];

const activeTaskCount = computed(() => tasks.value.filter(t => t.is_active).length);

// 获取最近会执行的任务（只显示1个）
const upcomingTasks = computed(() => {
  const now = new Date();
  const activeTasks = tasks.value.filter(t => t.is_active);
  
  // 计算每个任务的下次执行时间
  const tasksWithNextRun = activeTasks.map(task => {
    let nextRun = null;
    
    if (task.run_type === 'daily' && task.run_time) {
      const [hours, minutes] = task.run_time.split(':').map(Number);
      nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else if (task.run_type === 'cron' && task.cron_expression) {
      nextRun = calculateNextCronRun(task.cron_expression);
    }
    
    return {
      ...task,
      nextRunTime: nextRun
    };
  });
  
  // 按下次执行时间排序，只返回最近的一个
  return tasksWithNextRun
    .filter(t => t.nextRunTime)
    .sort((a, b) => a.nextRunTime - b.nextRunTime)
    .slice(0, 1);
});

const hasMoreExecutions = ref(false);

const loadTasks = async () => {
  loadingTasks.value = true;
  try {
    const res = await apiService.getTasks();
    if (res?.success && Array.isArray(res.data)) {
      tasks.value = res.data;
      loadTaskStats();
      loadTodayStats();
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

const loadTodayStats = async () => {
  try {
    const res = await apiService.getTodayStats();
    if (res?.success && res.data) {
      todayStats.value = res.data;
    }
  } catch (error) {
    console.error('加载今日统计失败:', error);
  }
};

const loadTaskStats = async () => {
  for (const task of tasks.value) {
    try {
      const res = await apiService.getTaskExecutions(task.id, {
        limit: 100
      });
      
      if (res?.success && Array.isArray(res.data)) {
        // 按时间排序，找到最新的一次任务执行
        const sortedExecs = res.data.sort((a, b) => 
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
        
        if (sortedExecs.length > 0) {
          // 找到同一次执行的所有记录（相同的开始时间）
          const latestStartTime = sortedExecs[0].started_at;
          const lastExecution = sortedExecs.filter(e => 
            e.started_at === latestStartTime
          );
          
          // 统计这次执行的成功和失败数量
          taskStats.value[task.id] = {
            success: lastExecution.filter(e => e.status === 'completed').length,
            failed: lastExecution.filter(e => e.status === 'failed').length,
            total: lastExecution.length,
            lastExecutionTime: latestStartTime
          };
        } else {
          taskStats.value[task.id] = {
            success: 0,
            failed: 0,
            total: 0,
            lastExecutionTime: null
          };
        }
      }
    } catch (error) {
      console.error('加载任务统计失败:', error);
      taskStats.value[task.id] = {
        success: 0,
        failed: 0,
        total: 0,
        lastExecutionTime: null
      };
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

// 编辑任务相关函数
const openEditTaskModal = (task) => {
  editingTask.value = task;
  
  // 解析运行时间
  let runTime = null;
  if (task.run_type === 'daily' && task.run_time) {
    const [hours, minutes] = task.run_time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    runTime = date.getTime();
  }
  
  // 填充表单
  taskForm.name = task.name;
  taskForm.runType = task.run_type || 'daily';
  taskForm.runTime = runTime;
  taskForm.cronExpression = task.cron_expression || '';
  taskForm.selectedTokens = task.token_ids || [];
  taskForm.selectedTasks = task.settings?.selectedTasks || [];
  taskForm.isActive = task.is_active;
  
  // 解析Cron表达式
  if (taskForm.cronExpression) {
    parseCronExpression(taskForm.cronExpression);
  } else {
    cronValidation.value = { valid: true, message: "" };
    cronNextRuns.value = [];
  }
  
  // 根据已选token设置分组选择状态
  taskScheduleSelectedGroupIds.value = [];
  tokenGroups.value.forEach(group => {
    const groupTokenIds = group.tokenIds || [];
    const allSelected = groupTokenIds.every(id => taskForm.selectedTokens.includes(id));
    if (allSelected && groupTokenIds.length > 0) {
      taskScheduleSelectedGroupIds.value.push(group.id);
    }
  });
  
  showTaskModal.value = true;
};

const openNewTaskModal = () => {
  editingTask.value = null;
  
  // 重置表单
  taskForm.name = '';
  taskForm.runType = 'daily';
  taskForm.runTime = null;
  taskForm.cronExpression = '';
  taskForm.selectedTokens = [];
  taskForm.selectedTasks = [];
  taskForm.isActive = true;
  
  // 重置分组选择
  taskScheduleSelectedGroupIds.value = [];
  cronValidation.value = { valid: true, message: "" };
  cronNextRuns.value = [];
  
  showTaskModal.value = true;
};

// Cron表达式解析
const parseCronExpression = (expression) => {
  const validation = validateCronExpression(expression);
  cronValidation.value = validation;

  if (!validation.valid) {
    cronNextRuns.value = [];
    return;
  }

  const cronParts = expression.split(" ").filter(Boolean);
  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = cronParts;

  const nextRuns = calculateNextRuns(
    minuteField,
    hourField,
    dayOfMonthField,
    monthField,
    dayOfWeekField,
    5,
  );
  cronNextRuns.value = nextRuns;
};

// 重置运行类型相关字段
const resetRunType = () => {
  if (taskForm.runType === "daily") {
    taskForm.cronExpression = "";
    cronValidation.value = { valid: true, message: "" };
    cronNextRuns.value = [];
  } else {
    taskForm.runTime = undefined;
  }
};

// 全选账号
const selectAllTokens = () => {
  taskForm.selectedTokens = sortedTokens.value.map((token) => token.id);
};

// 取消全选账号
const deselectAllTokens = () => {
  taskForm.selectedTokens = [];
  taskScheduleSelectedGroupIds.value = [];
};

// 全选任务
const selectAllTasks = () => {
  taskForm.selectedTasks = availableTasks.map((task) => task.value);
};

// 取消全选任务
const deselectAllTasks = () => {
  taskForm.selectedTasks = [];
};

// 切换分组选择
const toggleGroupSelection = (group) => {
  const index = taskScheduleSelectedGroupIds.value.indexOf(group.id);
  // 获取分组中有效的token IDs
  const groupTokenIds = (group.tokenIds || []).filter(id => 
    sortedTokens.value.some(t => t.id === id)
  );
  
  if (index > -1) {
    // 取消选择该分组
    taskScheduleSelectedGroupIds.value.splice(index, 1);
    taskForm.selectedTokens = taskForm.selectedTokens.filter(
      (id) => !groupTokenIds.includes(id),
    );
  } else {
    // 选择该分组
    taskScheduleSelectedGroupIds.value.push(group.id);
    groupTokenIds.forEach((id) => {
      if (!taskForm.selectedTokens.includes(id)) {
        taskForm.selectedTokens.push(id);
      }
    });
  }
};

const saveTask = async () => {
  if (!taskForm.name) {
    message.warning('请输入任务名称');
    return;
  }
  
  if (taskForm.runType === 'daily' && !taskForm.runTime) {
    message.warning('请选择运行时间');
    return;
  }
  
  if (taskForm.runType === 'cron') {
    if (!taskForm.cronExpression) {
      message.warning('请输入Cron表达式');
      return;
    }
    
    // 验证Cron表达式
    const validation = validateCronExpression(taskForm.cronExpression);
    if (!validation.valid) {
      message.warning(validation.message);
      return;
    }
  }
  
  if (taskForm.selectedTokens.length === 0) {
    message.warning('请选择至少一个账号');
    return;
  }
  
  if (taskForm.selectedTasks.length === 0) {
    message.warning('请选择至少一个任务');
    return;
  }
  
  savingTask.value = true;
  
  try {
    // 格式化运行时间
    let formattedRunTime = null;
    if (taskForm.runType === 'daily' && taskForm.runTime) {
      const time = new Date(taskForm.runTime);
      formattedRunTime = time.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    const taskData = {
      name: taskForm.name,
      type: 'daily',
      run_type: taskForm.runType,
      run_time: formattedRunTime,
      cron_expression: taskForm.cronExpression || null,
      token_ids: taskForm.selectedTokens,
      is_active: taskForm.isActive,
      settings: {
        selectedTasks: taskForm.selectedTasks
      }
    };
    
    let res;
    if (editingTask.value) {
      res = await apiService.updateTask(editingTask.value.id, taskData);
    } else {
      res = await apiService.createTask(taskData);
    }
    
    if (res?.success) {
      message.success(editingTask.value ? '任务已更新' : '任务已创建');
      showTaskModal.value = false;
      loadTasks();
    } else {
      message.error(res?.error || '保存失败');
    }
  } catch (error) {
    console.error('保存任务失败:', error);
    message.error('保存任务失败');
  } finally {
    savingTask.value = false;
  }
};

const deleteTask = async (task) => {
  dialog.warning({
    title: '删除任务',
    content: `确定要删除任务 "${task.name}" 吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res = await apiService.deleteTask(task.id);
        
        if (res?.success) {
          message.success('任务已删除');
          loadTasks();
        } else {
          message.error('删除失败');
        }
      } catch (error) {
        console.error('删除任务失败:', error);
        message.error('删除失败');
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

const lastExecutionLogs = ref(null);
const loadingLogs = ref(false);
const clearingLogs = ref(false);
const showStatsDrawer = ref(false);
const statsDrawerData = ref(null);
const expandedScheduleExecutions = ref({});
const loadingScheduleExecutions = ref({});
const scheduleExecutionDetails = ref({});

const showTaskDetail = async (task) => {
  selectedTask.value = task;
  loadingLogs.value = true;
  
  try {
    // 加载上次执行的详细日志
    const res = await apiService.getTaskExecutions(task.id, {
      limit: 100
    });
    
    if (res?.success && Array.isArray(res.data)) {
      // 按时间排序，找到最新的一次执行
      const sortedExecs = res.data.sort((a, b) => 
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      
      if (sortedExecs.length > 0) {
        // 找到同一次执行的所有记录
        const latestStartTime = sortedExecs[0].started_at;
        const latestExecs = sortedExecs.filter(e => 
          e.started_at === latestStartTime
        );
        
        // 按照任务的token_ids顺序排序
        const tokenIdOrder = task.token_ids || [];
        lastExecutionLogs.value = latestExecs.sort((a, b) => {
          const indexA = tokenIdOrder.indexOf(a.token_id);
          const indexB = tokenIdOrder.indexOf(b.token_id);
          // 如果token_id不在列表中，放到最后
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      } else {
        lastExecutionLogs.value = [];
      }
    } else {
      lastExecutionLogs.value = [];
    }
  } catch (error) {
    console.error('加载执行日志失败:', error);
    lastExecutionLogs.value = [];
  } finally {
    loadingLogs.value = false;
  }
  
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

const clearExecutionLogs = () => {
  dialog.warning({
    title: '清空执行日志',
    content: '确定要清空所有历史执行日志吗？此操作不可恢复。',
    positiveText: '确定清空',
    negativeText: '取消',
    onPositiveClick: async () => {
      clearingLogs.value = true;
      try {
        // 调用API清空日志
        const result = await apiService.clearTaskExecutions();
        if (result?.success) {
          message.success('日志清空成功');
          // 重新加载数据
          await loadExecutions();
          await loadTaskStats();
        } else {
          message.error(result?.error || '清空失败');
        }
      } catch (error) {
        console.error('清空日志失败:', error);
        message.error('清空失败，请稍后重试');
      } finally {
        clearingLogs.value = false;
      }
    }
  });
};

const showStatsDetail = (type) => {
  if (type === 'executed') {
    // 显示今日执行的调度列表
    statsDrawerData.value = {
      type,
      title: '今日执行',
      taskExecutions: todayStats.value.taskExecutions
    };
  } else if (type === 'failed') {
    // 显示今日失败的账号列表
    const failedTokens = [];
    todayStats.value.taskExecutions.forEach(exec => {
      exec.failedTokens.forEach(ft => {
        failedTokens.push({
          ...ft,
          taskName: exec.taskName,
          startedAt: exec.startedAt
        });
      });
    });
    statsDrawerData.value = {
      type,
      title: '今日失败',
      failedTokens
    };
  }
  showStatsDrawer.value = true;
};

const toggleScheduleExecution = async (exec) => {
  const key = `${exec.taskId}_${exec.startedAt}`;
  
  if (expandedScheduleExecutions.value[key]) {
    expandedScheduleExecutions.value[key] = false;
    return;
  }
  
  expandedScheduleExecutions.value[key] = true;
  
  if (!scheduleExecutionDetails.value[key]) {
    loadingScheduleExecutions.value[key] = true;
    
    try {
      const res = await apiService.getScheduleExecutions(exec.taskId, exec.startedAt);
      
      if (res?.success && Array.isArray(res.data)) {
        scheduleExecutionDetails.value[key] = res.data;
      } else {
        scheduleExecutionDetails.value[key] = [];
      }
    } catch (error) {
      console.error('加载调度执行记录失败:', error);
      scheduleExecutionDetails.value[key] = [];
    } finally {
      loadingScheduleExecutions.value[key] = false;
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

const formatUpcomingTime = (nextRunTime) => {
  if (!nextRunTime) return '-';
  return nextRunTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const formatRelativeTime = (nextRunTime) => {
  if (!nextRunTime) return '';
  
  const now = new Date();
  const diffMs = nextRunTime - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}天后`;
  } else if (diffHours > 0) {
    return `${diffHours}小时后`;
  } else if (diffMins > 0) {
    return `${diffMins}分钟后`;
  } else {
    return '即将执行';
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

onMounted(async () => {
  // 先加载token列表，以便显示账号名称
  try {
    const res = await apiService.getTokens();
    if (res?.success && Array.isArray(res.data)) {
      tokenStore.gameTokens.value = res.data;
    }
  } catch (error) {
    console.error('加载Token列表失败:', error);
  }
  
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
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
  }

  .stat-info {
    flex: 1;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
  }

  .stat-label {
    font-size: 14px;
    color: #666;
  }

  .stat-action {
    color: #999;
    margin-left: 8px;
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

.stats-detail {
  .stats-summary {
    margin-bottom: 16px;
  }

  .stats-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .stat-item {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 12px;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    &.clickable {
      cursor: pointer;
    }

    &.expanded {
      border-color: #18a058;
    }

    &.status-completed {
      border-left: 4px solid #18a058;
      background: linear-gradient(to right, #f6ffed, white);
    }

    &.status-failed {
      border-left: 4px solid #d03050;
      background: linear-gradient(to right, #fff7f7, white);
    }

    .stat-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;

        .expand-icon {
          transition: transform 0.3s;

          &.rotated {
            transform: rotate(90deg);
          }
        }
      }

      .task-name {
        font-weight: 600;
      }

      .account-name {
        font-size: 12px;
        color: #666;
      }
    }

    .stat-item-time {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .execution-details {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #e8e8e8;

      .details-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .detail-log-item {
        padding: 10px;
        background: #fafafa;
        border-radius: 6px;
        border-left: 3px solid #ddd;

        &.status-completed {
          border-left-color: #18a058;
          background: #f6ffed;
        }

        &.status-failed {
          border-left-color: #d03050;
          background: #fff7f7;
        }

        &.status-running {
          border-left-color: #2080f0;
          background: #f0f7ff;
        }

        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;

          .account-name {
            font-weight: 500;
          }
        }

        .log-time {
          font-size: 12px;
          color: #666;
          margin-bottom: 6px;
        }

        .log-result {
          margin-top: 8px;

          .result-summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 10px;
            background: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;

            &:hover {
              background: #f5f5f5;
            }
          }

          .result-detail {
            margin-top: 6px;
            padding: 10px;
            background: #fff;
            border-radius: 4px;
            overflow-x: auto;

            pre {
              margin: 0;
              font-size: 11px;
              white-space: pre-wrap;
            }
          }
        }

        .log-error {
          margin-top: 6px;
        }
      }
    }

    .stat-item-result {
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

    .stat-item-error {
      margin-top: 8px;
    }
  }
}

.no-stats {
  padding: 40px 0;
  text-align: center;
}

.upcoming-section {
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

  .upcoming-card {
    .task-card {
      border-color: #18a058;
      background: linear-gradient(to bottom, #f6ffed, white);
    }
  }

  .upcoming-list {
    .highlight {
      color: #18a058;
      font-weight: 600;
    }
  }

  .highlight {
    color: #18a058;
    font-weight: 600;
  }
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

  .section-actions {
    display: flex;
    align-items: center;
    gap: 12px;
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
      font-size: 12px;

      .stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;

        &:last-child {
          margin-bottom: 0;
        }

        .label {
          color: #666;
        }

        .value {
          color: #333;
          font-weight: 500;
        }

        .success { color: #18a058; margin-right: 12px; }
        .failed { color: #d03050; margin-right: 12px; }
        .total { color: #2080f0; }
      }
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

  .execution-logs {
    .logs-header {
      margin-bottom: 16px;

      .log-summary {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
    }

    .logs-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .log-item {
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 12px;
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      &.status-completed {
        border-left: 4px solid #18a058;
        background: linear-gradient(to right, #f6ffed, white);
      }

      &.status-failed {
        border-left: 4px solid #d03050;
        background: linear-gradient(to right, #fff7f7, white);
      }

      &.status-running {
        border-left: 4px solid #2080f0;
        background: linear-gradient(to right, #f0f7ff, white);
      }

      .log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .account-name {
          font-weight: 600;
        }
      }

      .log-time {
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
      }

      .log-result {
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

      .log-error {
        margin-top: 8px;
      }
    }
  }

  .no-logs {
    padding: 40px 0;
    text-align: center;
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

/* Settings Modal Styles */
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 14px;
  color: #666;
}

.cron-parser {
  margin-top: 8px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
}

.cron-validation {
  margin-bottom: 8px;
  
  &.success {
    color: #18a058;
  }
  
  &.error {
    color: #d03050;
  }
}

.cron-next-runs {
  h4 {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #666;
  }
  
  ul {
    margin: 0;
    padding-left: 20px;
    
    li {
      font-size: 12px;
      color: #888;
      margin-bottom: 4px;
    }
  }
}
</style>
