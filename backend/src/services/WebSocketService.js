/**
 * WebSocket服务
 */

import WebSocket from 'ws';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { supabase } from '../config/supabase.js';
import { BonEncoder, BonDecoder, encodeBon, decodeBon, autoDecrypt, bon, getEnc } from '../utils/bonProtocol.js';

/**
 * 错误码映射表
 */
const errorCodeMap = {
  700010: "任务未达成完成条件",
  1400010: "没有购买该月卡,不能领取每日奖励",
  12000116: "今日已领取免费奖励",
  3300060: "扫荡条件不满足",
  1300050: "请修改您的采购次数",
  200020: "出了点小问题，请尝试重启游戏解决～",
  200160: "模块未开启",
  7500140: "请先输入密码",
  7500100: "密码输入错误",
  7500120: "密码输入错误次数已达上限",
  200400: "操作太快，请稍后再试",
  200760: "您当前看到的界面已发生变化，请重新登录",
  2300190: "今天已经签到过了",
  2300370: "俱乐部商品购买数量超出上限",
  400000: "物品不存在",
  1500020: "能量不足",
  2300070: "未加入俱乐部",
  3500020: "没有可领取的奖励",
  12000050: "今日发车次数已达上限",
  12000060: "不在发车时间内",
  400190: "没有可领取的签到奖励",
  1000020: "今天已经领取过奖励了",
  3300050: "购买数量超出限制",
  700020: "已经领取过这个任务",
  12400000: "挂机奖励领取过于频繁",
  2300250: "俱乐部BOSS今日攻打次数已用完",
  400010: "物品数量不足",
  7900023: "已达到使用次数上限",
  12300040: "没有空格子了",
  12300080: "未达到解锁条件",
  200330: "无效的ID",
  1500040: "上座塔的奖励未领取",
  1500010: "已经全部通关",
};

/**
 * 响应命令映射表
 * 用于处理服务器响应命令与原始请求命令不匹配的情况
 * 当服务器返回 cmd: "xxxresp" 而非 resp 字段时，需要此映射才能正确匹配 Promise
 */
const responseToCommandMap = {
  // 同步响应（一对多）
  syncresp: ['system_mysharecallback', 'task_claimdailypoint', 'role_commitpassword'],
  syncrewardresp: ['system_buygold', 'discount_claimreward', 'card_claimreward', 'artifact_lottery', 'genie_sweep', 'genie_buysweep', 'system_signinreward', 'dungeon_selecthero', 'artifact_exchange'],

  // 日常任务、挂机、签到相关（后端定时任务常用）
  system_claimhanguprewardresp: ['system_claimhangupreward'],
  task_claimdailyrewardresp: ['task_claimdailyreward'],
  legion_signinresp: ['legion_signin'],

  // 罐子相关
  bottlehelper_stopresp: ['bottlehelper_stop'],
  bottlehelper_startresp: ['bottlehelper_start'],
  bottlehelper_claimresp: ['bottlehelper_claim'],

  // 爬塔、竞技场、军团等
  tower_getinforesp: ['tower_getinfo'],
  tower_claimrewardresp: ['tower_claimreward'],
  fight_starttowerresp: ['fight_starttower'],
  arena_getareatargetresp: ['arena_getareatarget'],
  arena_startarearesp: ['arena_startarea'],
  fight_startareaarenaresp: ['fight_startareaarena'],
  legion_getinforesp: ['legion_getinfo'],
  legion_getinforresp: ['legion_getinfo'], // 服务端可能的拼写变体
  legion_claimpayloadtaskresp: ['legion_claimpayloadtask'],
  legion_claimpayloadtaskprogressresp: ['legion_claimpayloadtaskprogress'],

  // 阵容、竞技场切换
  presetteam_getinforesp: ['presetteam_getinfo'],
  presetteam_saveteamresp: ['presetteam_saveteam'],

  // 怪异塔、合并宝箱（一键领怪异塔免费道具 / 使用道具 / 合成）
  evotowerinforesp: ['evotower_getinfo'],
  evotower_fightresp: ['evotower_fight'],
  evotower_readyfightresp: ['evotower_readyfight'],
  evotower_claimrewardresp: ['evotower_claimreward'],
  mergeboxinforesp: ['mergebox_getinfo'],
  mergebox_claimfreeenergyresp: ['mergebox_claimfreeenergy'],
  mergebox_openboxresp: ['mergebox_openbox'],
  mergebox_automergeitemresp: ['mergebox_automergeitem'],
  mergebox_mergeitemresp: ['mergebox_mergeitem'],
  mergebox_claimcostprogressresp: ['mergebox_claimcostprogress'],
  mergebox_claimmergeprogressresp: ['mergebox_claimmergeprogress'],

  // 角色信息（爬塔刷新体力等）
  role_getroleinforesp: ['role_getroleinfo'],

  // 换皮闯关
  towers_getinforesp: ['towers_getinfo'],
  towers_startresp: ['towers_start'],
  towers_fightresp: ['towers_fight'],

  // 开箱、商店等
  item_openboxresp: ['item_openbox', 'item_batchclaimboxpointreward'],
  store_buyresp: ['store_purchase'],
  legion_storebuygoodsresp: ['legion_storebuygoods'],
  collection_claimfreerewardresp: ['collection_claimfreereward'],
  legacy_claimhangupresp: ['legacy_claimhangup'],
  legacy_getinforesp: ['legacy_getinfo'],
  legacy_sendgiftresp: ['legacy_sendgift'],
  legacy_getgiftsresp: ['legacy_getgifts'],
  hero_recruitresp: ['hero_recruit'],
  bosstower_getinforesp: ['bosstower_getinfo'],
  bosstower_startbossresp: ['bosstower_startboss'],
  bosstower_startboxresp: ['bosstower_startbox'],
  discount_getdiscountinforesp: ['discount_getdiscountinfo'],
}

/**
 * WebSocket客户端类
 */
class WebSocketClient {
  constructor(tokenId, token, wsUrl) {
    this.tokenId = tokenId;
    this.token = token;
    this.wsUrl = wsUrl || `wss://xxz-xyzw.hortorgames.com/agent?p=${encodeURIComponent(token)}&e=x&lang=chinese`;
    this.socket = null;
    this.ack = 0;
    this.seq = 0;
    this.sendQueue = [];
    this.sendQueueTimer = null;
    this.heartbeatTimer = null;
    this.heartbeatInterval = config.websocket.heartbeatInterval;
    this.connected = false;
    this.isReconnecting = false;
    // 最近一次关闭信息，用于上层诊断错误
    this.lastCloseCode = null;
    this.lastCloseReason = null;
    this.promises = {};
    this.messageListeners = [];
    // 重连控制：服务主动断开时不再重连，避免死循环
    this.shouldReconnect = true;
    this.reconnectTimerId = null;
    this.reconnectCount = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * 初始化连接
   */
  init() {
    logger.info(`WebSocket连接初始化: ${this.tokenId}`);
    // 建立连接时启用握手超时，避免在 Render 等环境下无限等待
    // ws 的握手超时仅覆盖 HTTP Upgrade 阶段；连接后仍由心跳机制维持
    const handshakeTimeout = Number.isFinite(this.heartbeatInterval)
      ? config.websocket.connectionTimeout
      : 30000;

    this.socket = new WebSocket(this.wsUrl, {
      handshakeTimeout,
      perMessageDeflate: false,
    });

    // 额外的“连接建立超时”兜底：握手超时/网络黑洞时强制终止，确保上层能收到明确错误
    const connectTimer = setTimeout(() => {
      if (!this.connected && this.socket && this.socket.readyState === WebSocket.CONNECTING) {
        logger.error(`WebSocket连接超时(terminate): ${this.tokenId} timeout=${handshakeTimeout}ms url=${this.wsUrl.split('?')[0]}`);
        try {
          this.socket.terminate();
        } catch (e) {
          logger.debug(`terminate失败: ${this.tokenId} ${e?.message || e}`);
        }
      }
    }, handshakeTimeout + 1000);

    this.socket.onopen = () => {
      clearTimeout(connectTimer);
      logger.info(`WebSocket连接成功: ${this.tokenId}`);
      this.connected = true;
      this.reconnectCount = 0; // 连接成功则重置重连计数
      this._setupHeartbeat();
      this._processQueueLoop();
      this._updateConnectionStatus('connected');
      
      // 不再自动发送初始化消息，让任务执行时自己发送
      // this._sendInitMessage();
    };

    this.socket.onmessage = (event) => {
      try {
        let packet;
        if (typeof event.data === 'string') {
          packet = JSON.parse(event.data);
        } else if (event.data instanceof ArrayBuffer || Buffer.isBuffer(event.data)) {
          // BON协议二进制数据处理
          packet = this._parseBinaryData(event.data);
        } else {
          logger.warn(`未知数据类型: ${typeof event.data}`);
          packet = event.data;
        }

        // 更新ack
        if (packet.seq !== undefined) {
          this.ack = packet.seq;
        }

        // 处理消息
        this._handleMessage(packet);

        // 通知监听器
        this.messageListeners.forEach(listener => {
          try {
            listener(packet);
          } catch (error) {
            logger.error(`消息监听器执行失败: ${error.message}`);
          }
        });
      } catch (error) {
        logger.error(`WebSocket消息处理失败: ${error.message}`);
      }
    };

    this.socket.onclose = (event) => {
      clearTimeout(connectTimer);
      // 只在非主动关闭时输出日志
      if (event.code !== 1000 && event.code !== 1001 && event.code !== 1005) {
        logger.info(`WebSocket连接关闭: ${this.tokenId}, 代码: ${event.code}, 原因: ${event.reason}`);
      }
      // 记录最近一次关闭详情，便于上层根据 code 做区分
      this.lastCloseCode = event.code;
      this.lastCloseReason = event.reason || '';
      this.connected = false;
      this._clearTimers();
      this._updateConnectionStatus('disconnected');
      
      // 异常关闭(1006)时尝试重连，但需满足：未被服务主动断开、未超过最大重连次数
      if (event.code === 1006 && this.shouldReconnect) {
        this.reconnect();
      }
    };

    this.socket.onerror = (error) => {
      // ws 在 Node 环境下经常只给出笼统的 error.message；这里尽可能打印底层网络信息便于定位
      const detail = {
        message: error?.message,
        code: error?.code,
        errno: error?.errno,
        syscall: error?.syscall,
        address: error?.address,
        port: error?.port,
        stack: error?.stack,
        url: this.wsUrl?.split('?')?.[0],
      };
      logger.error(`WebSocket错误: ${this.tokenId}`, detail);
      this.connected = false;
      this._clearTimers();
      this._updateConnectionStatus('error', error.message);
    };

    // 握手被服务端拒绝时，ws 会触发 unexpected-response，记录状态码/头部便于排查
    this.socket.on('unexpected-response', (_req, res) => {
      try {
        logger.error(`WebSocket握手被拒绝: ${this.tokenId}`, {
          statusCode: res?.statusCode,
          statusMessage: res?.statusMessage,
          headers: res?.headers,
          url: this.wsUrl?.split('?')?.[0],
        });
      } catch (e) {
        logger.error(`WebSocket握手拒绝日志失败: ${this.tokenId} ${e?.message || e}`);
      }
    });
  }

  /**
   * 解析二进制数据（BON协议 + 加密）
   */
  _parseBinaryData(data) {
    try {
      // 转换为Buffer
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      // 使用bon.decode自动解密和解码
      const packet = bon.decode(buffer);
      
      if (packet && typeof packet === 'object') {
        logger.debug(`BON解码成功: cmd=${packet.cmd || 'unknown'}`);
        
        // 对 body 字段进行二次解码（与前端 ProtoMsg.rawData 保持一致）
        if (packet.body && Buffer.isBuffer(packet.body)) {
          try {
            packet.rawData = bon.decode(packet.body);
            logger.debug(`消息体二次解码成功: cmd=${packet.cmd || 'unknown'}`);
          } catch (bodyError) {
            logger.warn(`消息体二次解码失败: ${bodyError.message}`);
            packet.rawData = packet.body;
          }
        } else if (packet.body) {
          // body 已经是解码后的数据
          packet.rawData = packet.body;
        }
        
        return packet;
      } else {
        logger.warn(`BON解码返回非对象: ${typeof packet}`);
        return { error: 'Invalid packet', binary: true };
      }
    } catch (error) {
      logger.error(`BON解码失败: ${error.message}`);
      return { error: error.message, binary: true };
    }
  }

  /**
   * 发送初始化消息
   */
  _sendInitMessage() {
    // 发送获取角色信息请求（仅用于调试/记录，不影响任务执行）
    setTimeout(() => {
      if (this.connected) {
        logger.info(`发送初始化消息: ${this.tokenId}`);
        this.sendWithPromise('role_getroleinfo', {
          clientVersion: '2.10.3-f10a39eaa0c409f4-wx',
          inviteUid: 0,
          platform: 'hortor',
          platformExt: 'mix',
          scene: ''
        }, 10000).then(resp => {
          logger.debug(`角色信息获取成功: ${this.tokenId}`);
        }).catch(err => {
          // 这里的失败通常不影响后续任务执行，降级为调试日志，避免制造误导性的“错误”信息
          logger.debug(`角色信息获取失败(忽略): ${this.tokenId}, ${err.message}`);
        });
      }
    }, 500);
  }

  /**
   * 处理消息
   */
  _handleMessage(packet) {
    // 游戏协议中 code 为 0/undefined 表示成功；
    // code=-1 有时代表成功(无额外数据)，但当携带 error/hint 时应视为失败（如“指令解析错误”）
    const isSuccess =
      packet.code === 0 ||
      packet.code === undefined ||
      (packet.code === -1 && !packet.error && !packet.hint);

    // 响应数据优先级: rawData > body（与前端 xyzwWebSocket.js 保持一致）
    const responseBody = packet.rawData !== undefined ? packet.rawData : packet.body;

    // 处理Promise响应 - 优先使用resp字段进行响应匹配
    if (packet.resp !== undefined && this.promises[packet.resp]) {
      const promise = this.promises[packet.resp];
      delete this.promises[packet.resp];

      if (isSuccess) {
        promise.resolve(responseBody || packet);
      } else {
        const errorDesc =
          errorCodeMap[packet.code] ||
          packet.error ||
          packet.hint ||
          '未知错误';
        promise.reject(new Error(`服务器错误: ${packet.code} - ${errorDesc}`));
      }
      return;
    }

    // 处理响应命令映射 - 当服务器响应命令与原始请求命令不匹配时
    const cmd = packet.cmd;
    if (cmd) {
      const respCmdKey = typeof cmd === 'string' ? cmd.toLowerCase() : cmd;
      let originalCmds = responseToCommandMap[respCmdKey];
      
      if (originalCmds) {
        if (typeof originalCmds === 'string') {
          originalCmds = [originalCmds];
        }
        
        // 查找对应的Promise
        for (const [requestId, promiseData] of Object.entries(this.promises)) {
          if (originalCmds.includes(promiseData.originalCmd)) {
            delete this.promises[requestId];
            
            if (isSuccess) {
              promiseData.resolve(responseBody || packet);
            } else {
              const errorDesc =
                errorCodeMap[packet.code] ||
                packet.error ||
                packet.hint ||
                '未知错误';
              promiseData.reject(new Error(`服务器错误: ${packet.code} - ${errorDesc}`));
            }
            return;
          }
        }
      }
    }
  }

  /**
   * 设置心跳
   */
  _setupHeartbeat() {
    // 延迟3秒后开始发送第一个心跳
    setTimeout(() => {
      if (this.connected && this.socket.readyState === WebSocket.OPEN) {
        this.sendHeartbeat();
      }
    }, 3000);

    // 设置定期心跳
    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.socket.readyState === WebSocket.OPEN) {
        this.sendHeartbeat();
      } else {
        logger.warn(`心跳检查失败: ${this.tokenId} 连接状态异常`);
      }
    }, this.heartbeatInterval);
  }

  /**
   * 处理发送队列
   */
  _processQueueLoop() {
    if (this.sendQueueTimer) clearInterval(this.sendQueueTimer);

    this.sendQueueTimer = setInterval(() => {
      if (!this.sendQueue.length) return;
      if (!this.connected || this.socket.readyState !== WebSocket.OPEN) return;

      const task = this.sendQueue.shift();
      if (!task) return;

      try {
        const packet = this._buildPacket(task.cmd, task.params, task.seq);
        this._sendPacket(packet);
        logger.debug(`发送消息: ${this.tokenId}, ${task.cmd}`, task.params);

        if (task.onSent) {
          task.onSent();
        }
      } catch (error) {
        logger.error(`发送消息失败: ${this.tokenId}, ${task.cmd}, ${error.message}`);
      }
    }, 50);
  }

  /**
   * 构建数据包（BON协议）
   */
  _buildPacket(cmd, params = {}, seq) {
    // 心跳是协议特例：cmd="_sys/ack" 且 body 为普通对象 {}
    // 前端实现不会对心跳 body 做 BON 编码
    const normalizedCmd = typeof cmd === 'string' ? cmd.toLowerCase() : cmd;
    const isHeartbeat = normalizedCmd === '_sys/ack';
    const encodedBody = isHeartbeat ? {} : bon.encode(params);
    
    return {
      cmd: normalizedCmd,
      ack: this.ack,
      // 心跳 seq 固定为 0；其它命令使用传入 seq 或自增
      seq: isHeartbeat ? 0 : (seq || ++this.seq),
      time: Date.now(),
      body: encodedBody
    };
  }

  /**
   * 编码并发送数据包（BON协议 + 加密）
   */
  _sendPacket(packet) {
    try {
      // 1. 先对整个消息包进行 BON 编码
      const bonData = bon.encode(packet);
      
      // 2. 再使用 x 加密方案进行加密
      const x = getEnc('x');
      const encryptedData = x.encrypt(bonData);
      
      this.socket.send(encryptedData);
      
      logger.debug(`发送BON消息: ${packet.cmd}, 原始大小: ${bonData.length}, 加密后: ${encryptedData.length}`);
    } catch (error) {
      logger.error(`BON编码失败: ${error.message}`);
      // 降级为JSON
      this.socket.send(JSON.stringify(packet));
    }
  }

  /**
   * 清理定时器
   */
  _clearTimers() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.sendQueueTimer) {
      clearInterval(this.sendQueueTimer);
      this.sendQueueTimer = null;
    }
  }

  /**
   * 更新连接状态到数据库
   */
  async _updateConnectionStatus(status, error = null) {
    try {
      await supabase
        .from('connections')
        .upsert({
          token_id: this.tokenId,
          status,
          last_heartbeat: status === 'connected' ? new Date().toISOString() : null,
          error,
          updated_at: new Date().toISOString()
        }, { onConflict: 'token_id' });
    } catch (error) {
      logger.error(`更新连接状态失败: ${error.message}`);
    }
  }

  /**
   * 发送消息
   */
  send(cmd, params = {}, options = {}) {
    const task = {
      cmd,
      params,
      // 注意：seq 可能为 0（例如心跳），不能用 || 判断
      seq: options.seq !== undefined ? options.seq : ++this.seq,
      onSent: options.onSent
    };

    this.sendQueue.push(task);
    return task;
  }

  /**
   * 发送消息（Promise版）
   */
  sendWithPromise(cmd, params = {}, timeout = 5000) {
    return new Promise((resolve, reject) => {
      // 连接未就绪时不要继续排队等待，否则只会触发“请求超时”误导排查
      if (!this.socket || !this.connected || this.socket.readyState !== WebSocket.OPEN) {
        const status = this.getStatus();
        const closeInfo =
          this.lastCloseCode != null
            ? ` close=${this.lastCloseCode}${this.lastCloseReason ? `(${this.lastCloseReason})` : ''}`
            : '';
        return reject(new Error(`WebSocket未连接(status=${status}${closeInfo})`));
      }

      const requestSeq = ++this.seq;
      this.promises[requestSeq] = { resolve, reject, originalCmd: cmd };

      // 超时处理
      const timer = setTimeout(() => {
        delete this.promises[requestSeq];
        reject(new Error(`请求超时: ${cmd} (${timeout}ms)`));
      }, timeout);

      this.send(cmd, params, {
        seq: requestSeq,
        onSent: () => {
          // 消息发送成功
        }
      });
    });
  }

  /**
   * 发送心跳
   */
  sendHeartbeat() {
    // 与前端一致：心跳实际发送的是 cmd="_sys/ack"
    this.send('_sys/ack', {}, { seq: 0 });
  }

  /**
   * 重连
   */
  reconnect() {
    if (!this.shouldReconnect) {
      logger.debug(`已由服务主动断开，跳过重连: ${this.tokenId}`);
      return;
    }
    if (this.isReconnecting) {
      logger.debug(`重连已在进行中: ${this.tokenId}`);
      return;
    }
    if (this.reconnectCount >= this.maxReconnectAttempts) {
      logger.warn(`重连次数已达上限(${this.maxReconnectAttempts})，停止重连: ${this.tokenId}`);
      return;
    }

    this.isReconnecting = true;
    this.reconnectCount++;
    logger.info(`开始WebSocket重连: ${this.tokenId} (第${this.reconnectCount}/${this.maxReconnectAttempts}次)`);

    this._clearReconnectTimer();
    this._disconnectInternal();

    // 延迟重连，指数退避
    const delay = Math.min(1000 * Math.pow(2, this.reconnectCount - 1), 30000);
    this.reconnectTimerId = setTimeout(() => {
      this.reconnectTimerId = null;
      try {
        this.init();
      } finally {
        setTimeout(() => {
          this.isReconnecting = false;
        }, 2000);
      }
    }, delay);
  }

  _clearReconnectTimer() {
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
  }

  _disconnectInternal() {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        logger.debug(`关闭socket异常: ${e.message}`);
      }
      this.socket = null;
    }
    this.connected = false;
    this._clearTimers();
  }

  /**
   * 断开连接
   * @param {Object} opts - { fromService: true } 表示由 TaskService 主动断开，将停止重连
   */
  disconnect(opts = {}) {
    if (opts.fromService) {
      this.shouldReconnect = false;
      this._clearReconnectTimer();
    }
    this._disconnectInternal();
  }

  /**
   * 添加消息监听器
   */
  addMessageListener(listener) {
    this.messageListeners.push(listener);
  }

  /**
   * 移除消息监听器
   */
  removeMessageListener(listener) {
    const index = this.messageListeners.indexOf(listener);
    if (index > -1) {
      this.messageListeners.splice(index, 1);
    }
  }

  /**
   * 获取连接状态
   */
  getStatus() {
    if (!this.socket) return 'disconnected';
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnecting';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }
}

/**
 * WebSocket服务
 */
class WebSocketService {
  constructor() {
    this.clients = new Map();
    this.connectionQueue = { active: 0 };
  }

  /**
   * 创建WebSocket连接
   */
  async createConnection(tokenId, token, wsUrl) {
    // 限制并发连接数
    while (this.connectionQueue.active >= config.task.maxActiveConnections) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    this.connectionQueue.active++;

    try {
      const client = new WebSocketClient(tokenId, token, wsUrl);
      client.init();
      this.clients.set(tokenId, client);
      
      // 等待连接建立
      await this.waitForConnection(tokenId, config.websocket.connectionTimeout);
      
      return client;
    } catch (error) {
      this.connectionQueue.active--;
      throw error;
    }
  }

  /**
   * 等待连接建立
   */
  async waitForConnection(tokenId, timeout = 30000) {
    const start = Date.now();
    let lastError = null;

    while (Date.now() - start < timeout) {
      const client = this.clients.get(tokenId);
      if (!client) {
        break;
      }

      if (client.connected) {
        return true;
      }

      // 如果最近一次关闭是 1006，说明服务端主动异常断开，直接给出更明确的错误
      if (client.lastCloseCode === 1006) {
        lastError = new Error(
          `服务器异常关闭连接(code=1006)，请检查 Token 是否有效或协议实现是否正确`,
        );
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('连接超时');
  }

  /**
   * 获取WebSocket客户端
   */
  getClient(tokenId) {
    return this.clients.get(tokenId);
  }

  /**
   * 断开连接（由 TaskService 主动调用，会停止客户端的重连循环）
   */
  disconnect(tokenId) {
    const client = this.clients.get(tokenId);
    if (client) {
      client.disconnect({ fromService: true });
      this.clients.delete(tokenId);
      if (this.connectionQueue.active > 0) {
        this.connectionQueue.active--;
      }
    }
  }

  /**
   * 断开所有连接
   */
  disconnectAll() {
    for (const tokenId of this.clients.keys()) {
      this.disconnect(tokenId);
    }
  }

  /**
   * 发送消息
   */
  sendMessage(tokenId, cmd, params = {}, options = {}) {
    const client = this.clients.get(tokenId);
    if (!client) {
      throw new Error('WebSocket客户端不存在');
    }
    return client.send(cmd, params, options);
  }

  /**
   * 发送消息（Promise版）
   */
  sendMessageWithPromise(tokenId, cmd, params = {}, timeout = 5000) {
    const client = this.clients.get(tokenId);
    if (!client) {
      return Promise.reject(new Error('WebSocket客户端不存在'));
    }
    return client.sendWithPromise(cmd, params, timeout);
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(tokenId) {
    const client = this.clients.get(tokenId);
    if (!client) {
      return 'disconnected';
    }
    return client.getStatus();
  }

  /**
   * 获取所有连接状态
   */
  getConnectionStats() {
    const stats = {
      total: this.clients.size,
      connected: 0,
      connecting: 0,
      disconnected: 0,
      error: 0
    };

    for (const client of this.clients.values()) {
      const status = client.getStatus();
      stats[status]++;
    }

    return stats;
  }
}

// 导出单例
export default new WebSocketService();

