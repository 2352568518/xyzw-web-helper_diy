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

        case 'legionStoreBuySkinCoins':
          await this.legionStoreBuySkinCoins();
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

        // 传统活动任务领取
        case 'batchLegacyClaim':
          await this.batchLegacyClaim();
          break;
        case 'batchLegacyGiftSendEnhanced':
          await this.batchLegacyGiftSendEnhanced();
          break;

        // 换皮闯关
        case 'skinChallenge':
          await this.skinChallenge();
          break;

        // 日常任务
        case 'startBatch':
          await this.startBatch();
          break;
        case 'batchStudy':
          await this.batchStudy();
          break;
        case 'batchSmartSendCar':
          await this.batchSmartSendCar();
          break;
        case 'batchClaimCars':
          await this.batchClaimCars();
          break;

        // 副本任务
        case 'batchBuyDreamItems':
          await this.batchBuyDreamItems();
          break;

        // 月度任务
        case 'batchTopUpFish':
          await this.batchTopUpFish();
          break;
        case 'batchTopUpArena':
          await this.batchTopUpArena();
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
    
    // 切换阵容
    const towerFormation = this.taskSettings.towerFormation;
    if (towerFormation) {
      const teamInfo = await this.send('presetteam_getinfo');
      const currentFormation = teamInfo?.presetTeamInfo?.useTeamId;
      if (currentFormation !== towerFormation) {
        this.addStep(`切换到阵容${towerFormation}`);
        await this.send('presetteam_saveteam', { teamId: towerFormation });
      }
    }
    
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
        
        // 每5次刷新体力
        if (count % 5 === 0) {
          const roleInfo = await this.send('role_getroleinfo');
          energy = roleInfo?.role?.tower?.energy || 0;
        }
      } catch (err) {
        if (err.message && err.message.includes('1500040')) {
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

  // ==================== 辅助函数 ====================

  /**
   * 获取品质标签
   */
  gradeLabel(color) {
    const map = {
      1: '绿·普通',
      2: '蓝·稀有',
      3: '紫·史诗',
      4: '橙·传说',
      5: '红·神话',
      6: '金·传奇'
    };
    return map[color] || '未知';
  }

  /**
   * 大奖配置
   */
  getBigPrizes() {
    return [
      { type: 3, itemId: 3201, value: 10 },
      { type: 3, itemId: 1001, value: 10 },
      { type: 3, itemId: 1022, value: 2000 },
      { type: 2, itemId: 0, value: 2000 },
      { type: 3, itemId: 1023, value: 5 },
      { type: 3, itemId: 1022, value: 2500 },
      { type: 3, itemId: 1001, value: 12 }
    ];
  }

  /**
   * 判断是否是大奖
   */
  isBigPrize(rewards) {
    if (!Array.isArray(rewards)) return false;
    return this.getBigPrizes().some(p =>
      rewards.find(r =>
        r.type === p.type &&
        r.itemId === p.itemId &&
        Number(r.value || 0) >= p.value
      )
    );
  }

  /**
   * 计算赛车刷新票数量
   */
  countRacingRefreshTickets(rewards) {
    if (!Array.isArray(rewards)) return 0;
    return rewards.reduce(
      (acc, r) => acc + (r.type === 3 && r.itemId === 35002 ? Number(r.value || 0) : 0),
      0
    );
  }

  /**
   * 检查奖励是否满足自定义条件
   */
  checkRewardConditions(rewards, conditions, matchAll = false) {
    if (!Array.isArray(rewards) || !conditions) return false;
    const { gold, recruit, jade, ticket } = conditions;
    
    if (!gold && !recruit && !jade && !ticket) return false;

    let goldCount = 0;
    let recruitCount = 0;
    let jadeCount = 0;
    let ticketCount = 0;

    rewards.forEach(r => {
      const val = Number(r.value || r.num || r.quantity || r.count || 0);
      const type = Number(r.type || 0);
      const itemId = Number(r.itemId || 0);

      if (type === 2) goldCount += val;
      if (itemId === 1001) recruitCount += val;
      if (itemId === 1022) jadeCount += val;
      if (itemId === 35002) ticketCount += val;
    });

    if (matchAll) {
      if (gold > 0 && goldCount < gold) return false;
      if (recruit > 0 && recruitCount < recruit) return false;
      if (jade > 0 && jadeCount < jade) return false;
      if (ticket > 0 && ticketCount < ticket) return false;
      return true;
    } else {
      if (gold > 0 && goldCount >= gold) return true;
      if (recruit > 0 && recruitCount >= recruit) return true;
      if (jade > 0 && jadeCount >= jade) return true;
      if (ticket > 0 && ticketCount >= ticket) return true;
      return false;
    }
  }

  /**
   * 判断是否应该发车
   */
  shouldSendCar(car, tickets, minColor = 4, customConditions = {}, useGoldRefreshFallback = false, matchAll = false) {
    const color = Number(car?.color || 0);
    const rewards = Array.isArray(car?.rewards) ? car.rewards : [];
    
    const customConditionsMet = this.checkRewardConditions(rewards, customConditions, matchAll);

    if (useGoldRefreshFallback) {
      if (color < minColor) return false;
      
      const hasConditions = (customConditions.gold > 0 || customConditions.recruit > 0 || customConditions.jade > 0 || customConditions.ticket > 0);
      
      if (hasConditions) return customConditionsMet;
      
      return true;
    }

    if (customConditionsMet) return true;

    const racingTickets = this.countRacingRefreshTickets(rewards);
    if (tickets >= 6) {
      return (
        color >= minColor &&
        (color >= 5 || racingTickets >= 4 || this.isBigPrize(rewards))
      );
    }
    return color >= minColor || racingTickets >= 2 || this.isBigPrize(rewards);
  }

  /**
   * 标准化车辆数据
   */
  normalizeCars(res) {
    const body = res?.body || res;
    const roleCar = body?.roleCar || body?.rolecar || body || {};
    
    const carMap = roleCar.carDataMap || roleCar.cardatamap;
    if (carMap && typeof carMap === 'object') {
      return Object.entries(carMap).map(([id, info]) => ({
        id,
        ...(info || {})
      }));
    }

    let arr = body?.cars || body?.list || body?.data || body?.carList || body?.vehicles || [];
    if (!Array.isArray(arr) && typeof arr === 'object' && arr !== null) {
      arr = Object.values(arr);
    }
    if (Array.isArray(body) && arr.length === 0) arr = body;
    
    return Array.isArray(arr) ? arr : [];
  }

  // ==================== 竞技场任务 ====================

  async batcharenafight() {
    this.addStep('开始一键竞技场');

    try {
      // 读取任务配置
      const arenaFormation = this.taskSettings.arenaFormation;
      const battleDelay = this.taskSettings.battleDelay || 1000;

      // 1. 检查咸神门票 (ID: 1007)
      this.addStep('获取角色信息(用于检查咸神门票)');
      let roleInfo;
      try {
        roleInfo = await this.send('role_getroleinfo', {}, 10000);
        try {
          // 限制日志长度，避免刷屏
          const preview = JSON.stringify(roleInfo).slice(0, 1000);
          logger.info(
            `[Arena] raw role_getroleinfo (${this.token.id}): ${preview}`
          );
        } catch (logErr) {
          logger.warn(
            `[Arena] 序列化 role_getroleinfo 失败: ${logErr.message}`
          );
        }
      } catch (e) {
        this.addStep(`获取角色信息失败: ${e.message}`, 'warning');
      }

      // 更鲁棒地解析角色与门票数量，兼容多种结构
      const role =
        roleInfo?.role ||
        roleInfo?.data?.role ||
        roleInfo?.body?.role ||
        roleInfo;

      const items = role?.items || {};
      const item1007 =
        items[1007] ||
        items['1007'] ||
        (typeof items.get === 'function' ? items.get(1007) : undefined) ||
        (typeof items.get === 'function' ? items.get('1007') : undefined) ||
        {};

      const ticketCount = Number(
        item1007.quantity ??
        item1007.num ??
        item1007.value ??
        item1007.count ??
        0
      );

      this.addStep(`当前咸神门票: ${ticketCount}`, 'info');

      if (ticketCount <= 0) {
        this.addStep('咸神门票不足，无法进行竞技场战斗', 'warning');
        return;
      }

      // 2. 获取并切换阵容
      let originalFormation = null;
      try {
        const teamInfo = await this.send('presetteam_getinfo');
        originalFormation = teamInfo?.presetTeamInfo?.useTeamId;

        if (arenaFormation && originalFormation !== arenaFormation) {
          this.addStep(`切换到阵容${arenaFormation}`);
          await this.send('presetteam_saveteam', { teamId: arenaFormation });
        } else if (arenaFormation) {
          this.addStep(`当前已是阵容${arenaFormation}，无需切换`, 'info');
        }
      } catch (e) {
        this.addStep(`获取/切换阵容失败: ${e.message}`, 'warning');
      }

      // 3. 计算实际战斗次数（最多3次，受门票数量限制）
      const fights = Math.min(3, ticketCount);
      if (fights < 3) {
        this.addStep(
          `咸神门票仅剩 ${ticketCount} 张，将执行 ${fights} 次战斗`,
          'warning'
        );
      }

      for (let i = 0; i < fights; i++) {
        try {
          this.addStep(`竞技场战斗 ${i + 1}/${fights}`);

          // 开始竞技场
          await this.send('arena_startarea');

          // 获取竞技场目标
          const targets = await this.send('arena_getareatarget');
          const targetId = this.pickArenaTargetId(targets);

          if (!targetId) {
            this.addStep('未找到可用的竞技场目标', 'warning');
            break;
          }

          // 开始竞技场战斗
          await this.send('fight_startareaarena', { targetId }, 15000);
          await this.delay(battleDelay);
        } catch (err) {
          this.addStep(`竞技场对决失败: ${err.message}`, 'error');
        }
      }

      await this.delay(battleDelay);

      // 4. 尝试领取通行证奖励
      try {
        this.addStep('尝试领取通行证奖励');
        const passResult = await this.send(
          'activity_recyclewarorderrewardclaim',
          { actId: 1 },
          5000
        );

        const rewards = passResult?.reward || [];
        if (rewards.length > 0) {
          const itemNames = { 1003: '金币', 1007: '咸神门票' };
          const rewardInfo = rewards
            .map((r) => `${itemNames[r.itemId] || '道具'} x${r.value}`)
            .join(', ');
          this.addStep(`领取通行证奖励: ${rewardInfo}`, 'success');
        } else if (passResult && passResult.errcode === 1001) {
          this.addStep('暂无可领取的通行证奖励', 'info');
        } else if (passResult) {
          this.addStep('通行证奖励已领取', 'info');
        }
      } catch (passErr) {
        this.addStep(
          `领取通行证奖励失败: ${passErr.message}`,
          'warning'
        );
      }

      // 5. 如有需要，切回原阵容
      if (originalFormation && arenaFormation && originalFormation !== arenaFormation) {
        try {
          this.addStep(`恢复原阵容: ${originalFormation}`);
          await this.send('presetteam_saveteam', { teamId: originalFormation });
        } catch (e) {
          this.addStep(`恢复原阵容失败: ${e.message}`, 'warning');
        }
      }
    } catch (err) {
      this.addStep(`一键竞技场失败: ${err.message}`, 'error');
      throw err;
    }
  }

  /**
   * 选择竞技场目标
   */
  pickArenaTargetId(targets) {
    if (!targets) return null;
    
    const targetList = targets.areaTargetList || targets.targets || targets.list || targets;
    if (!Array.isArray(targetList) || targetList.length === 0) return null;
    
    // 选择第一个目标
    const target = targetList[0];
    return target.roleId || target.id || target.targetId;
  }

  // ==================== 商店类任务 ====================

  async storePurchase() {
    this.addStep('黑市采购');
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

  async legionStoreBuySkinCoins() {
    this.addStep('购买俱乐部5皮肤币');
    try {
      for (let i = 0; i < 5; i++) {
        try {
          const result = await this.send('legion_storebuygoods', { goodsId: 1, number: 1 });
          await this.delay(300);
          if (result && result.error) {
            if (result.error.includes('俱乐部商品购买数量超出上限')) {
              this.addStep('本周已购买过皮肤币，跳过');
              return;
            } else if (result.error.includes('物品不存在')) {
              this.addStep('盐锭不足或未加入军团，购买失败');
              return;
            } else {
              this.addStep(`购买失败: ${result.error}`);
              return;
            }
          }
        } catch (err) {
          // 忽略单次购买失败
        }
      }
      this.addStep('购买成功，获得皮肤币');
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

  /**
   * 传统活动任务领取 - 功法残卷
   */
  async batchLegacyClaim() {
    this.addStep('开始领取功法残卷');
    
    try {
      const result = await this.send('legacy_claimhangup', {}, 5000);
      
      if (result && result.reward && result.reward.length > 0) {
        const rewardValue = result.reward[0].value;
        const totalQuantity = result.role?.items?.[37007]?.quantity || 0;
        this.addStep(`成功领取功法残卷${rewardValue}，共有${totalQuantity}个`);
      } else {
        this.addStep('没有可领取的功法残卷');
      }
    } catch (error) {
      logger.warn(`功法残卷领取失败: ${error.message}`);
      this.addStep(`功法残卷领取失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 传统活动礼物赠送增强版
   */
  async batchLegacyGiftSendEnhanced() {
    this.addStep('开始传统活动礼物赠送');
    
    try {
      await this.send('legacy_gift_send', { type: 1 });
      this.addStep('传统活动礼物赠送成功');
    } catch (error) {
      logger.warn(`传统活动礼物赠送失败: ${error.message}`);
      this.addStep(`传统活动礼物赠送失败: ${error.message}`);
    }
  }

  /**
   * 开始批量任务
   */
  async startBatch() {
    this.addStep('开始批量任务');
    
    const settings = this.taskSettings || {};
    logger.info(`批量任务配置: ${JSON.stringify(settings)}`);
    this.addStep(`配置: openBox=${settings.openBox}, claimBottle=${settings.claimBottle}, arenaEnable=${settings.arenaEnable}, bossTimes=${settings.bossTimes}`);
    
    // 辅助函数：检查任务是否完成
    const isTaskCompleted = (taskId) => {
      return this.roleData?.dailyTask?.complete?.[taskId] === -1;
    };
    
    // 辅助函数：检查是否今天可用
    const isTodayAvailable = (timestamp) => {
      if (!timestamp) return true;
      const today = new Date().toDateString();
      const recordDate = new Date(timestamp * 1000).toDateString();
      return today !== recordDate;
    };
    
    // 辅助函数：获取今日BOSS ID
    const getTodayBossId = () => {
      const DAY_BOSS_MAP = [9904, 9905, 9901, 9902, 9903, 9904, 9905];
      const dayOfWeek = new Date().getDay();
      return DAY_BOSS_MAP[dayOfWeek];
    };
    
    // 辅助函数：选择竞技场目标
    const pickArenaTargetId = (targets) => {
      if (!targets) return null;
      if (Array.isArray(targets)) {
        const candidate = targets[0];
        return candidate?.roleId || candidate?.id || candidate?.targetId;
      }
      const candidate = targets?.rankList?.[0] || targets?.roleList?.[0] || targets?.targets?.[0];
      if (candidate) {
        return candidate.roleId || candidate.id || candidate.targetId;
      }
      return targets?.roleId || targets?.id || targets?.targetId;
    };
    
    try {
      // 等待连接稳定
      await this.delay(1000);
      
      // 获取角色信息
      this.addStep('获取角色信息');
      const roleInfoResp = await this.send('role_getroleinfo', {
        clientVersion: '2.10.3-f10a39eaa0c409f4-wx',
        inviteUid: 0,
        platform: 'hortor',
        platformExt: 'mix',
        scene: ''
      }, 15000);
      
      logger.info(`角色信息响应: ${JSON.stringify(roleInfoResp).substring(0, 500)}`);
      
      // 尝试从不同位置获取角色数据
      this.roleData = roleInfoResp?.role || roleInfoResp?.body?.role || roleInfoResp;
      
      if (!this.roleData || typeof this.roleData !== 'object') {
        throw new Error('角色数据不存在或格式错误');
      }
      
      this.addStep(`角色名称: ${this.roleData?.name || '未知'}`);
      
      const completedTasks = this.roleData.dailyTask?.complete ?? {};
      const statistics = this.roleData.statistics ?? {};
      const statisticsTime = this.roleData.statisticsTime ?? {};
      
      // 读取当前阵容
      let originalFormation = null;
      try {
        const teamInfo = await this.send('presetteam_getinfo');
        originalFormation = teamInfo?.presetTeamInfo?.useTeamId;
        this.addStep(`当前阵容: ${originalFormation}`);
      } catch (e) {
        this.addStep(`读取当前阵容失败: ${e.message}`);
      }
      
      // 1. 基础任务
      if (!isTaskCompleted(2)) {
        this.addStep('分享一次游戏');
        await this.send('system_mysharecallback', { isSkipShareCard: true, type: 2 });
        await this.delay(500);
      }
      
      if (!isTaskCompleted(3)) {
        this.addStep('赠送好友金币');
        await this.send('friend_batch');
        await this.delay(500);
      }
      
      if (!isTaskCompleted(4)) {
        this.addStep('免费招募');
        await this.send('hero_recruit', { recruitType: 3, recruitNumber: 1 });
        await this.delay(500);
      }
      
      if (settings.payRecruit !== false) {
        this.addStep('付费招募');
        await this.send('hero_recruit', { recruitType: 1, recruitNumber: 1 });
        await this.delay(500);
      }
      
      if (!isTaskCompleted(6) && isTodayAvailable(statisticsTime["buy:gold"])) {
        for (let i = 0; i < 3; i++) {
          this.addStep(`免费点金 ${i + 1}/3`);
          await this.send('system_buygold', { buyNum: 1 });
          await this.delay(500);
        }
      }
      
      if (!isTaskCompleted(5) && settings.claimHangUp !== false) {
        this.addStep('领取挂机奖励');
        await this.send('system_claimhangupreward');
        await this.delay(500);
        
        for (let i = 0; i < 4; i++) {
          this.addStep(`挂机加钟 ${i + 1}/4`);
          await this.send('system_mysharecallback', { isSkipShareCard: true, type: 2 });
          await this.delay(500);
        }
      }
      
      if (!isTaskCompleted(7) && settings.openBox !== false) {
        this.addStep('开启木质宝箱');
        await this.send('item_openbox', { itemId: 2001, number: 10 });
        await this.delay(500);
      }
      
      // 盐罐
      this.addStep('停止盐罐计时');
      await this.send('bottlehelper_stop');
      await this.delay(500);
      
      this.addStep('开始盐罐计时');
      await this.send('bottlehelper_start');
      await this.delay(500);
      
      if (!isTaskCompleted(14) && settings.claimBottle !== false) {
        this.addStep('领取盐罐奖励');
        await this.send('bottlehelper_claim');
        await this.delay(500);
      }
      
      // 2. 竞技场
      if (!isTaskCompleted(13) && settings.arenaEnable !== false) {
        const hour = new Date().getHours();
        if (hour >= 6 && hour <= 22) {
          // 切换阵容
          const arenaFormation = settings.arenaFormation || 1;
          const teamInfo = await this.send('presetteam_getinfo');
          const currentFormation = teamInfo?.presetTeamInfo?.useTeamId;
          if (currentFormation !== arenaFormation) {
            this.addStep(`切换到阵容${arenaFormation}`);
            await this.send('presetteam_saveteam', { teamId: arenaFormation });
            await this.delay(500);
          }
          
          this.addStep('开始竞技场');
          await this.send('arena_startarea');
          await this.delay(500);
          
          for (let i = 1; i <= 3; i++) {
            this.addStep(`竞技场战斗 ${i}/3`);
            try {
              const targets = await this.send('arena_getareatarget');
              const targetId = pickArenaTargetId(targets);
              if (targetId) {
                await this.send('fight_startareaarena', { targetId }, 10000);
                await this.delay(1000);
              }
            } catch (e) {
              this.addStep(`竞技场战斗${i}失败: ${e.message}`);
            }
          }
        } else {
          this.addStep('当前时间不在6-22点，跳过竞技场');
        }
      }
      
      // 3. BOSS
      if (settings.bossTimes > 0) {
        let alreadyLegionBoss = statistics["legion:boss"] ?? 0;
        if (isTodayAvailable(statisticsTime["legion:boss"])) {
          alreadyLegionBoss = 1;
        }
        const remainingLegionBoss = Math.max(settings.bossTimes - alreadyLegionBoss, 0);
        
        if (remainingLegionBoss > 0) {
          const bossFormation = settings.bossFormation || 1;
          const teamInfo = await this.send('presetteam_getinfo');
          const currentFormation = teamInfo?.presetTeamInfo?.useTeamId;
          if (currentFormation !== bossFormation) {
            this.addStep(`切换到BOSS阵容${bossFormation}`);
            await this.send('presetteam_saveteam', { teamId: bossFormation });
            await this.delay(500);
          }
          
          for (let i = 0; i < remainingLegionBoss; i++) {
            this.addStep(`军团BOSS ${i + 1}/${remainingLegionBoss}`);
            await this.send('fight_startlegionboss', {}, 12000);
            await this.delay(1000);
          }
        }
        
        // 每日BOSS
        const todayBossId = getTodayBossId();
        for (let i = 0; i < 3; i++) {
          this.addStep(`每日BOSS ${i + 1}/3`);
          await this.send('fight_startboss', { bossId: todayBossId }, 12000);
          await this.delay(1000);
        }
      }
      
      // 4. 固定奖励
      const fixedRewards = [
        { name: '福利签到', cmd: 'system_signinreward' },
        { name: '俱乐部', cmd: 'legion_signin' },
        { name: '领取每日礼包', cmd: 'discount_claimreward' },
        { name: '领取每日免费奖励', cmd: 'collection_claimfreereward' },
        { name: '领取免费礼包', cmd: 'card_claimreward' },
        { name: '领取永久卡礼包', cmd: 'card_claimreward', params: { cardId: 4003 } }
      ];
      
      if (settings.claimEmail !== false) {
        fixedRewards.push({ name: '领取邮件奖励', cmd: 'mail_claimallattachment' });
      }
      
      for (const reward of fixedRewards) {
        this.addStep(reward.name);
        await this.send(reward.cmd, reward.params || {});
        await this.delay(500);
      }
      
      // 珍宝阁
      this.addStep('开始领取珍宝阁礼包');
      await this.send('collection_goodslist');
      await this.delay(500);
      
      this.addStep('领取珍宝阁免费礼包');
      await this.send('collection_claimfreereward');
      await this.delay(500);
      
      // 5. 免费活动
      if (isTodayAvailable(statistics["artifact:normal:lottery:time"])) {
        for (let i = 0; i < 3; i++) {
          this.addStep(`免费钓鱼 ${i + 1}/3`);
          await this.send('artifact_lottery', { lotteryNumber: 1, newFree: true, type: 1 });
          await this.delay(500);
        }
      }
      
      // 灯神免费扫荡
      const kingdoms = ['魏国', '蜀国', '吴国', '群雄'];
      for (let gid = 1; gid <= 4; gid++) {
        if (isTodayAvailable(statisticsTime[`genie:daily:free:${gid}`])) {
          this.addStep(`${kingdoms[gid - 1]}灯神免费扫荡`);
          await this.send('genie_sweep', { genieId: gid });
          await this.delay(500);
        }
      }
      
      // 领取免费扫荡卷
      for (let i = 0; i < 3; i++) {
        this.addStep(`领取免费扫荡卷 ${i + 1}/3`);
        await this.send('genie_buysweep');
        await this.delay(500);
      }
      
      // 6. 黑市
      if (!isTaskCompleted(12) && settings.blackMarketPurchase !== false) {
        this.addStep('黑市购买1次物品');
        await this.send('store_purchase', { goodsId: 1 });
        await this.delay(500);
      }
      
      // 恢复原阵容
      if (originalFormation) {
        this.addStep(`恢复原阵容: ${originalFormation}`);
        await this.send('presetteam_saveteam', { teamId: originalFormation });
      }
      
      this.addStep('批量任务完成');
      
    } catch (error) {
      this.addStep(`批量任务执行失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 批量学习
   */
  async batchStudy() {
    this.addStep('开始批量学习');
    
    try {
      await this.send('skill_studyskill');
      this.addStep('批量学习完成');
    } catch (error) {
      logger.warn(`批量学习失败: ${error.message}`);
      this.addStep(`批量学习失败: ${error.message}`);
    }
  }

  /**
   * 智能发车
   */
  async batchSmartSendCar() {
    this.addStep('开始智能发车');
    
    try {
      // 从taskSettings获取配置
      const settings = this.taskSettings || {};
      const useGoldRefreshFallback = settings.useGoldRefreshFallback || false;
      const carMinColor = settings.carMinColor || 4;
      const smartDepartureMatchAll = settings.smartDepartureMatchAll || false;
      const customConditions = {
        gold: settings.smartDepartureGoldThreshold || 0,
        recruit: settings.smartDepartureRecruitThreshold || 0,
        jade: settings.smartDepartureJadeThreshold || 0,
        ticket: settings.smartDepartureTicketThreshold || 0
      };

      // 1. 获取车辆信息
      this.addStep('获取车辆信息');
      const carRes = await this.send('car_getrolecar', {}, 10000);
      const carList = this.normalizeCars(carRes);

      // 2. 获取刷新票数量
      let refreshTickets = 0;
      try {
        const roleRes = await this.send('role_getroleinfo', {}, 10000);
        refreshTickets = Number(roleRes?.role?.items?.[35002]?.quantity || 0);
        this.addStep(`剩余刷新次数: ${refreshTickets}`);
      } catch (e) {
        this.addStep('获取刷新票数量失败');
      }

      // 3. 处理每辆车
      for (const car of carList) {
        if (Number(car.sendAt || 0) !== 0) continue;

        try {
          const effectiveTickets = useGoldRefreshFallback ? 999 : refreshTickets;

          if (this.shouldSendCar(car, effectiveTickets, carMinColor, customConditions, useGoldRefreshFallback, smartDepartureMatchAll)) {
            this.addStep(`车辆[${this.gradeLabel(car.color)}]满足条件，直接发车`);
            await this.send('car_send', {
              carId: String(car.id),
              helperId: 0,
              text: '',
              isUpgrade: false
            }, 10000);
            await this.delay(500);
            continue;
          }

          let shouldRefresh = false;
          const free = Number(car.refreshCount ?? 0) === 0;
          const useGoldFallback = useGoldRefreshFallback && !free && refreshTickets < 6;

          if (refreshTickets >= 6) shouldRefresh = true;
          else if (free) shouldRefresh = true;
          else if (useGoldFallback) {
            shouldRefresh = true;
            this.addStep(`车辆[${this.gradeLabel(car.color)}]将启用金砖刷新`);
          } else {
            this.addStep(`车辆[${this.gradeLabel(car.color)}]无刷新次数，直接发车`);
            await this.send('car_send', {
              carId: String(car.id),
              helperId: 0,
              text: '',
              isUpgrade: false
            }, 10000);
            await this.delay(500);
            continue;
          }

          while (shouldRefresh) {
            this.addStep(`车辆[${this.gradeLabel(car.color)}]尝试刷新`);
            const resp = await this.send('car_refresh', { carId: String(car.id) }, 10000);
            const data = resp?.car || resp?.body?.car || resp;

            if (data && typeof data === 'object') {
              if (data.color != null) car.color = Number(data.color);
              if (data.refreshCount != null) car.refreshCount = Number(data.refreshCount);
              if (data.rewards != null) car.rewards = data.rewards;
            }

            try {
              const roleRes = await this.send('role_getroleinfo', {}, 5000);
              refreshTickets = Number(roleRes?.role?.items?.[35002]?.quantity || 0);
            } catch (e) {}

            if (this.shouldSendCar(car, useGoldRefreshFallback ? 999 : refreshTickets, carMinColor, customConditions, useGoldRefreshFallback, smartDepartureMatchAll)) {
              this.addStep(`刷新后车辆[${this.gradeLabel(car.color)}]满足条件，发车`);
              await this.send('car_send', {
                carId: String(car.id),
                helperId: 0,
                text: '',
                isUpgrade: false
              }, 10000);
              await this.delay(500);
              break;
            }

            const freeNow = Number(car.refreshCount ?? 0) === 0;
            const useGoldFallbackNow = useGoldRefreshFallback && !freeNow && refreshTickets < 6;

            if (refreshTickets >= 6) shouldRefresh = true;
            else if (freeNow) shouldRefresh = true;
            else if (useGoldFallbackNow) shouldRefresh = true;
            else {
              this.addStep(`刷新后车辆[${this.gradeLabel(car.color)}]无刷新次数，发车`);
              await this.send('car_send', {
                carId: String(car.id),
                helperId: 0,
                text: '',
                isUpgrade: false
              }, 10000);
              await this.delay(500);
              break;
            }

            await this.delay(1000);
          }
        } catch (carError) {
          this.addStep(`车辆[${this.gradeLabel(car.color)}]处理失败: ${carError.message}`);
          continue;
        }
      }

      this.addStep('智能发车完成');
    } catch (error) {
      logger.warn(`智能发车失败: ${error.message}`);
      this.addStep(`智能发车失败: ${error.message}`);
    }
  }

  /**
   * 领取车辆奖励
   */
  async batchClaimCars() {
    this.addStep('开始领取车辆奖励');
    
    try {
      await this.send('car_claimreward');
      this.addStep('车辆奖励领取完成');
    } catch (error) {
      logger.warn(`领取车辆奖励失败: ${error.message}`);
      this.addStep(`领取车辆奖励失败: ${error.message}`);
    }
  }

  /**
   * 购买梦境道具
   */
  async batchBuyDreamItems() {
    this.addStep('开始购买梦境道具');
    
    try {
      await this.send('dream_buyitems');
      this.addStep('梦境道具购买完成');
    } catch (error) {
      logger.warn(`购买梦境道具失败: ${error.message}`);
      this.addStep(`购买梦境道具失败: ${error.message}`);
    }
  }

  /**
   * 月度钓鱼充值
   */
  async batchTopUpFish() {
    this.addStep('开始月度钓鱼充值');
    
    try {
      await this.send('fish_monthly_topup');
      this.addStep('月度钓鱼充值完成');
    } catch (error) {
      logger.warn(`月度钓鱼充值失败: ${error.message}`);
      this.addStep(`月度钓鱼充值失败: ${error.message}`);
    }
  }

  /**
   * 月度竞技场充值
   */
  async batchTopUpArena() {
    this.addStep('开始月度竞技场充值');
    
    try {
      await this.send('arena_monthly_topup');
      this.addStep('月度竞技场充值完成');
    } catch (error) {
      logger.warn(`月度竞技场充值失败: ${error.message}`);
      this.addStep(`月度竞技场充值失败: ${error.message}`);
    }
  }
}

export default TaskExecutor;
