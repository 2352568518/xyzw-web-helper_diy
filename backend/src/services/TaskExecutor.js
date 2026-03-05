/**
 * 任务执行器
 * 支持所有前端预设的批量任务类型
 */

import { logger } from '../utils/logger.js';

/**
 * 任务执行器类
 */
class TaskExecutor {
  constructor(wsClient, token, taskSettings = {}) {
    this.wsClient = wsClient;
    this.token = token;
    this.taskSettings = taskSettings;
    this.steps = [];
  }

  /**
   * 延迟函数
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 发送消息并等待响应
   */
  async send(cmd, params = {}, timeout = 5000) {
    return await this.wsClient.sendWithPromise(cmd, params, timeout);
  }

  /**
   * 添加步骤日志
   */
  addStep(name, status = 'running') {
    this.steps.push({ name, status, time: new Date().toISOString() });
    logger.info(`任务步骤: ${name} - ${status}`);
  }

  /**
   * 更新最后一步状态
   */
  updateLastStep(status) {
    if (this.steps.length > 0) {
      this.steps[this.steps.length - 1].status = status;
    }
  }

  /**
   * 执行任务
   */
  async execute(taskName) {
    this.addStep(`开始执行任务: ${taskName}`);

    try {
      switch (taskName) {
        // 挂机类任务
        case 'claimHangUpRewards':
          await this.claimHangUpRewards();
          break;
        case 'batchAddHangUpTime':
          await this.batchAddHangUpTime();
          break;

        // 罐子类任务
        case 'resetBottles':
          await this.resetBottles();
          break;
        case 'batchlingguanzi':
          await this.batchlingguanzi();
          break;

        // 签到类任务
        case 'batchclubsign':
          await this.batchclubsign();
          break;

        // 爬塔类任务
        case 'climbTower':
          await this.climbTower();
          break;
        case 'climbWeirdTower':
          await this.climbWeirdTower();
          break;
        case 'batchClaimFreeEnergy':
          await this.batchClaimFreeEnergy();
          break;

        // 开箱、钓鱼、招募类任务
        case 'batchOpenBox':
          await this.batchOpenBox();
          break;
        case 'batchClaimBoxPointReward':
          await this.batchClaimBoxPointReward();
          break;
        case 'batchFish':
          await this.batchFish();
          break;
        case 'batchRecruit':
          await this.batchRecruit();
          break;

        // 宝库、梦境类任务
        case 'batchbaoku13':
          await this.batchbaoku13();
          break;
        case 'batchbaoku45':
          await this.batchbaoku45();
          break;
        case 'batchmengjing':
          await this.batchmengjing();
          break;

        // 竞技场任务
        case 'batcharenafight':
          await this.batcharenafight();
          break;

        // 商店类任务
        case 'store_purchase':
          await this.storePurchase();
          break;
        case 'legion_storebuygoods':
          await this.legionStoreBuyGoods();
          break;

        // 珍宝阁
        case 'collection_claimfreereward':
          await this.collectionClaimFreeReward();
          break;

        // 蟠桃园
        case 'batchClaimPeachTasks':
          await this.batchClaimPeachTasks();
          break;

        // 灯神扫荡
        case 'batchGenieSweep':
          await this.batchGenieSweep();
          break;

        // 怪异塔道具
        case 'batchUseItems':
          await this.batchUseItems();
          break;
        case 'batchMergeItems':
          await this.batchMergeItems();
          break;

        // 换皮闯关
        case 'skinChallenge':
          await this.skinChallenge();
          break;

        // 默认处理
        default:
          logger.warn(`未实现的任务类型: ${taskName}`);
          this.addStep(`任务类型未实现: ${taskName}`, 'warning');
      }

      this.updateLastStep('success');
      return { success: true, steps: this.steps };
    } catch (error) {
      this.updateLastStep('failed');
      this.addStep(`任务执行失败: ${error.message}`, 'error');
      return { success: false, error: error.message, steps: this.steps };
    }
  }

  // ==================== 挂机类任务 ====================

  async claimHangUpRewards() {
    this.addStep('领取挂机奖励');
    await this.send('system_claimhangupreward');
    await this.delay(500);

    // 加钟4次
    for (let i = 0; i < 4; i++) {
      this.addStep(`挂机加钟 ${i + 1}/4`);
      await this.send('system_mysharecallback', { isSkipShareCard: true, type: 2 });
      await this.delay(500);
    }
  }

  async batchAddHangUpTime() {
    for (let i = 0; i < 4; i++) {
      this.addStep(`执行加钟 ${i + 1}/4`);
      await this.send('system_mysharecallback', { isSkipShareCard: true, type: 2 });
      await this.delay(500);
    }
  }

  // ==================== 罐子类任务 ====================

  async resetBottles() {
    this.addStep('停止计时');
    await this.send('bottlehelper_stop');
    await this.delay(500);

    this.addStep('开始计时');
    await this.send('bottlehelper_start');
  }

  async batchlingguanzi() {
    this.addStep('领取盐罐');
    await this.send('bottlehelper_claim');
  }

  // ==================== 签到类任务 ====================

  async batchclubsign() {
    this.addStep('俱乐部签到');
    await this.send('legion_signin');
  }

  // ==================== 爬塔类任务 ====================

  async climbTower() {
    this.addStep('获取爬塔信息');
    const info = await this.send('tower_getinfo');
    let energy = info?.tower?.energy || 0;
    
    this.addStep(`初始体力: ${energy}`);

    let count = 0;
    const MAX_CLIMB = 100;

    while (energy > 0 && count < MAX_CLIMB) {
      try {
        this.addStep(`爬塔第 ${count + 1} 次`);
        await this.send('fight_starttower');
        count++;
        energy--;
        await this.delay(1000);
      } catch (err) {
        if (err.message && err.message.includes('1500040')) {
          // 上座塔奖励未领取，尝试领取
          const towerId = info?.tower?.id || 0;
          const rewardFloor = Math.floor(towerId / 10);
          if (rewardFloor > 0) {
            await this.send('tower_claimreward', { rewardId: rewardFloor });
          }
          await this.delay(2000);
        } else {
          throw err;
        }
      }
    }

    this.addStep(`爬塔完成，共 ${count} 次`);
  }

  async climbWeirdTower() {
    this.addStep('获取怪异塔信息');
    const info = await this.send('evotower_getinfo');
    let energy = info?.evoTower?.energy || 0;

    this.addStep(`初始能量: ${energy}`);

    let count = 0;
    const MAX_CLIMB = 100;

    while (energy > 0 && count < MAX_CLIMB) {
      this.addStep(`爬怪异塔第 ${count + 1} 次`);
      await this.send('evotower_readyfight');
      await this.send('evotower_fight', { battleNum: 1, winNum: 1 });
      count++;
      energy--;
      await this.delay(500);

      // 刷新能量
      const newInfo = await this.send('evotower_getinfo');
      energy = newInfo?.evoTower?.energy || 0;
    }

    this.addStep(`爬怪异塔完成，共 ${count} 次`);
  }

  async batchClaimFreeEnergy() {
    this.addStep('获取活动信息');
    const info = await this.send('mergebox_getinfo', { actType: 1 });

    if (info?.mergeBox?.freeEnergy > 0) {
      this.addStep(`领取免费道具 ${info.mergeBox.freeEnergy} 个`);
      await this.send('mergebox_claimfreeenergy', { actType: 1 });
    } else {
      this.addStep('暂无免费道具可领取');
    }
  }

  // ==================== 开箱、钓鱼、招募类任务 ====================

  async batchOpenBox() {
    const boxType = this.taskSettings.defaultBoxType || 2001;
    const count = this.taskSettings.boxCount || 100;
    const batches = Math.floor(count / 10);
    const remainder = count % 10;

    const boxNames = { 2001: '木质宝箱', 2002: '青铜宝箱', 2003: '黄金宝箱', 2004: '铂金宝箱' };
    this.addStep(`开箱类型: ${boxNames[boxType]}, 数量: ${count}`);

    for (let i = 0; i < batches; i++) {
      this.addStep(`开箱进度: ${(i + 1) * 10}/${count}`);
      await this.send('item_openbox', { itemId: boxType, number: 10 });
      await this.delay(500);
    }

    if (remainder > 0) {
      this.addStep(`开箱进度: ${count}/${count}`);
      await this.send('item_openbox', { itemId: boxType, number: remainder });
    }

    // 领取宝箱积分
    await this.send('item_batchclaimboxpointreward');
  }

  async batchClaimBoxPointReward() {
    this.addStep('领取宝箱积分');
    await this.send('item_batchclaimboxpointreward');
  }

  async batchFish() {
    const fishType = this.taskSettings.defaultFishType || 1;
    const count = this.taskSettings.fishCount || 100;
    const batches = Math.floor(count / 10);
    const remainder = count % 10;

    const fishNames = { 1: '普通鱼竿', 2: '黄金鱼竿' };
    this.addStep(`钓鱼类型: ${fishNames[fishType]}, 数量: ${count}`);

    for (let i = 0; i < batches; i++) {
      this.addStep(`钓鱼进度: ${(i + 1) * 10}/${count}`);
      await this.send('artifact_lottery', { type: fishType, lotteryNumber: 10, newFree: true });
      await this.delay(500);
    }

    if (remainder > 0) {
      this.addStep(`钓鱼进度: ${count}/${count}`);
      await this.send('artifact_lottery', { type: fishType, lotteryNumber: remainder, newFree: true });
    }
  }

  async batchRecruit() {
    const count = this.taskSettings.recruitCount || 100;
    const batches = Math.floor(count / 10);
    const remainder = count % 10;

    this.addStep(`招募数量: ${count}`);

    for (let i = 0; i < batches; i++) {
      this.addStep(`招募进度: ${(i + 1) * 10}/${count}`);
      await this.send('hero_recruit', { recruitType: 1, recruitNumber: 10 });
      await this.delay(500);
    }

    if (remainder > 0) {
      this.addStep(`招募进度: ${count}/${count}`);
      await this.send('hero_recruit', { recruitType: 1, recruitNumber: remainder });
    }
  }

  // ==================== 宝库、梦境类任务 ====================

  async batchbaoku13() {
    this.addStep('获取宝库信息');
    const info = await this.send('bosstower_getinfo');
    const towerId = info?.bossTower?.towerId;

    if (towerId >= 1 && towerId <= 3) {
      // 打BOSS
      for (let i = 0; i < 2; i++) {
        this.addStep(`打BOSS ${i + 1}/2`);
        await this.send('bosstower_startboss');
        await this.delay(500);
      }
      // 开箱子
      for (let i = 0; i < 9; i++) {
        this.addStep(`开箱子 ${i + 1}/9`);
        await this.send('bosstower_startbox');
        await this.delay(500);
      }
    } else {
      this.addStep('当前不在1-3层');
    }
  }

  async batchbaoku45() {
    this.addStep('获取宝库信息');
    const info = await this.send('bosstower_getinfo');
    const towerId = info?.bossTower?.towerId;

    if (towerId >= 4 && towerId <= 5) {
      for (let i = 0; i < 2; i++) {
        this.addStep(`打BOSS ${i + 1}/2`);
        await this.send('bosstower_startboss');
        await this.delay(500);
      }
    } else {
      this.addStep('当前不在4-5层');
    }
  }

  async batchmengjing() {
    const dayOfWeek = new Date().getDay();
    if ([0, 1, 3, 4].includes(dayOfWeek)) {
      this.addStep('选择英雄进入梦境');
      const battleTeam = { 0: 107 };
      await this.send('dungeon_selecthero', { battleTeam });
    } else {
      this.addStep('当前未在梦境开放时间');
    }
  }

  // ==================== 竞技场任务 ====================

  async batcharenafight() {
    this.addStep('获取竞技场信息');
    
    for (let i = 0; i < 3; i++) {
      try {
        this.addStep(`竞技场战斗 ${i + 1}/3`);
        // 获取对手列表
        const rivalInfo = await this.send('arena_getrival');
        if (rivalInfo?.rivals && rivalInfo.rivals.length > 0) {
          const rivalId = rivalInfo.rivals[0].roleId;
          await this.send('arena_fight', { rivalId });
          await this.delay(1000);
        }
      } catch (err) {
        this.addStep(`战斗失败: ${err.message}`);
      }
    }
  }

  // ==================== 商店类任务 ====================

  async storePurchase() {
    this.addStep('黑市采购');
    // 黑市商品ID列表
    const blackMarketItems = [1001, 1002, 1003, 1004, 1005];
    
    for (const itemId of blackMarketItems) {
      try {
        this.addStep(`购买商品 ${itemId}`);
        await this.send('store_purchase', { storeType: 3, itemId, number: 1 });
        await this.delay(300);
      } catch (err) {
        // 忽略购买失败
      }
    }
  }

  async legionStoreBuyGoods() {
    this.addStep('购买四圣碎片');
    try {
      // 商品ID 8001-8004 为四圣碎片
      for (let itemId = 8001; itemId <= 8004; itemId++) {
        try {
          await this.send('legion_storebuygoods', { goodsId: itemId, number: 1 });
          await this.delay(300);
        } catch (err) {
          // 忽略购买失败
        }
      }
    } catch (err) {
      this.addStep(`购买失败: ${err.message}`);
    }
  }

  // ==================== 珍宝阁 ====================

  async collectionClaimFreeReward() {
    this.addStep('领取珍宝阁免费奖励');
    try {
      await this.send('collection_claimfreereward');
    } catch (err) {
      this.addStep(`领取失败: ${err.message}`);
    }
  }

  // ==================== 蟠桃园 ====================

  async batchClaimPeachTasks() {
    this.addStep('获取蟠桃园任务');
    try {
      const res = await this.send('legion_getpayloadtask');
      const payloadTask = res?.payloadTask;

      if (payloadTask?.taskMap) {
        let claimedCount = 0;
        for (const [taskId, task] of Object.entries(payloadTask.taskMap)) {
          try {
            await this.send('legion_claimpayloadtask', { taskId: parseInt(taskId) });
            claimedCount++;
            await this.delay(300);
          } catch (err) {
            // 忽略领取失败
          }
        }
        this.addStep(`领取了 ${claimedCount} 个任务奖励`);
      }
    } catch (err) {
      this.addStep(`领取失败: ${err.message}`);
    }
  }

  // ==================== 灯神扫荡 ====================

  async batchGenieSweep() {
    this.addStep('获取灯神信息');
    try {
      const roleInfo = await this.send('role_getroleinfo');
      const genieData = roleInfo?.role?.genie || {};
      const sweepTickets = roleInfo?.role?.items?.[1021]?.quantity || 0;

      if (sweepTickets <= 0) {
        this.addStep('扫荡券不足');
        return;
      }

      // 找最高层数
      let maxLayer = -1;
      let bestGenieId = -1;
      for (let i = 1; i <= 4; i++) {
        if (genieData[i] !== undefined) {
          const layer = genieData[i] + 1;
          if (layer > maxLayer) {
            maxLayer = layer;
            bestGenieId = i;
          }
        }
      }

      if (bestGenieId === -1) {
        this.addStep('未找到可扫荡关卡');
        return;
      }

      const genieNames = { 1: '魏国', 2: '蜀国', 3: '吴国', 4: '群雄' };
      this.addStep(`扫荡: ${genieNames[bestGenieId]}灯神`);

      let remaining = sweepTickets;
      while (remaining > 0) {
        const sweepCnt = Math.min(remaining, 20);
        await this.send('genie_sweep', { genieId: bestGenieId, sweepCnt });
        remaining -= sweepCnt;
        await this.delay(500);
      }
    } catch (err) {
      this.addStep(`扫荡失败: ${err.message}`);
    }
  }

  // ==================== 怪异塔道具 ====================

  async batchUseItems() {
    this.addStep('获取道具信息');
    try {
      const towerInfo = await this.send('evotower_getinfo');
      let lotteryLeftCnt = towerInfo?.evoTower?.lotteryLeftCnt || 0;

      if (lotteryLeftCnt <= 0) {
        this.addStep('没有剩余道具');
        return;
      }

      const infoRes = await this.send('mergebox_getinfo', { actType: 1 });
      let costTotalCnt = infoRes?.mergeBox?.costTotalCnt || 0;

      while (lotteryLeftCnt > 0) {
        let pos = { gridX: 4, gridY: 5 };
        if (costTotalCnt >= 2 && costTotalCnt < 102) {
          pos = { gridX: 7, gridY: 3 };
        } else if (costTotalCnt >= 102) {
          pos = { gridX: 6, gridY: 3 };
        }

        await this.send('mergebox_openbox', { actType: 1, pos });
        costTotalCnt++;
        lotteryLeftCnt--;
        await this.delay(500);
      }

      this.addStep('道具使用完成');
    } catch (err) {
      this.addStep(`使用失败: ${err.message}`);
    }
  }

  async batchMergeItems() {
    this.addStep('开始合成');
    try {
      // 使用自动合成
      await this.send('mergebox_automergeitem', { actType: 1 });
      this.addStep('自动合成完成');
    } catch (err) {
      this.addStep(`合成失败: ${err.message}`);
    }
  }

  // ==================== 换皮闯关 ====================

  async skinChallenge() {
    this.addStep('获取换皮闯关信息');
    try {
      const res = await this.send('towers_getinfo');
      const towerData = res.actId ? res : (res.towerData || res);

      if (!towerData.actId) {
        this.addStep('活动信息获取失败');
        return;
      }

      const levelRewardMap = towerData.levelRewardMap || {};
      const todayWeekDay = new Date().getDay();
      const openTowerMap = {
        5: [1], 6: [2], 0: [3], 1: [4], 2: [5], 3: [6], 4: [1, 2, 3, 4, 5, 6]
      };
      const todayOpenTowers = openTowerMap[todayWeekDay] || [];

      // 找未通关的
      for (const type of todayOpenTowers) {
        const key = `${type}008`;
        if (!levelRewardMap[key]) {
          this.addStep(`挑战BOSS ${type}`);
          try {
            await this.send('towers_start', { towerType: type });
            await this.send('towers_fight', { towerType: type });
            await this.delay(1000);
          } catch (err) {
            this.addStep(`挑战失败: ${err.message}`);
          }
        }
      }
    } catch (err) {
      this.addStep(`换皮闯关失败: ${err.message}`);
    }
  }
}

export default TaskExecutor;
