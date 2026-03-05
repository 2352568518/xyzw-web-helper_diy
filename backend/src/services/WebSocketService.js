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
    this.promises = {};
    this.messageListeners = [];
  }

  /**
   * 初始化连接
   */
  init() {
    logger.info(`WebSocket连接初始化: ${this.tokenId}`);

    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => {
      logger.info(`WebSocket连接成功: ${this.tokenId}`);
      this.connected = true;
      this._setupHeartbeat();
      this._processQueueLoop();
      this._updateConnectionStatus('connected');
      
      // 发送初始化消息获取角色信息
      this._sendInitMessage();
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
      logger.info(`WebSocket连接关闭: ${this.tokenId}, 代码: ${event.code}, 原因: ${event.reason}`);
      this.connected = false;
      this._clearTimers();
      this._updateConnectionStatus('disconnected');
      
      // 如果是异常关闭，尝试重连
      if (event.code === 1006) {
        this.reconnect();
      }
    };

    this.socket.onerror = (error) => {
      logger.error(`WebSocket错误: ${this.tokenId}, ${error.message}`);
      this.connected = false;
      this._clearTimers();
      this._updateConnectionStatus('error', error.message);
    };
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
    // 发送获取角色信息请求，这是连接后必须发送的初始化消息
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
          logger.info(`角色信息获取成功: ${this.tokenId}`);
        }).catch(err => {
          logger.error(`角色信息获取失败: ${this.tokenId}, ${err.message}`);
        });
      }
    }, 500);
  }

  /**
   * 处理消息
   */
  _handleMessage(packet) {
    // 处理Promise响应
    if (packet.resp !== undefined && this.promises[packet.resp]) {
      const promise = this.promises[packet.resp];
      delete this.promises[packet.resp];

      if (packet.code === 0 || packet.code === undefined) {
        promise.resolve(packet.body || packet);
      } else {
        const errorDesc = errorCodeMap[packet.code] || packet.hint || '未知错误';
        promise.reject(new Error(`服务器错误: ${packet.code} - ${errorDesc}`));
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
    // body 需要先进行 BON 编码（与前端一致）
    const encodedBody = bon.encode(params);
    
    return {
      cmd,
      ack: this.ack,
      seq: seq || ++this.seq,
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
      seq: options.seq || ++this.seq,
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
      if (!this.connected && !this.socket) {
        return reject(new Error('WebSocket未连接'));
      }

      const requestSeq = ++this.seq;
      this.promises[requestSeq] = { resolve, reject };

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
    this.send('heart_beat', {}, { respKey: '_sys/ack' });
  }

  /**
   * 重连
   */
  reconnect() {
    if (this.isReconnecting) {
      logger.debug(`重连已在进行中: ${this.tokenId}`);
      return;
    }

    this.isReconnecting = true;
    logger.info(`开始WebSocket重连: ${this.tokenId}`);

    this.disconnect();

    // 延迟重连
    setTimeout(() => {
      try {
        this.init();
      } finally {
        setTimeout(() => {
          this.isReconnecting = false;
        }, 2000);
      }
    }, 1000);
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
    this._clearTimers();
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
    while (Date.now() - start < timeout) {
      const client = this.clients.get(tokenId);
      if (client && client.connected) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
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
   * 断开连接
   */
  disconnect(tokenId) {
    const client = this.clients.get(tokenId);
    if (client) {
      client.disconnect();
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
