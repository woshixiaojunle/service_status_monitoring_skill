/**
 * 数据格式化器
 * 
 * 解析原始告警数据，提取关键字段
 */

/**
 * 解析 message 字段的 JSON 内容
 * @param {string} messageStr - message 字段的字符串
 * @returns {Object|null} 解析后的对象，失败返回 null
 */
function parseMessage(messageStr) {
  if (!messageStr) {
    return null;
  }
  
  try {
    // 尝试直接解析 JSON
    return JSON.parse(messageStr);
  } catch (error) {
    // 尝试清理后解析（处理可能的格式问题）
    try {
      const cleaned = messageStr
        .replace(/^[\s\S]*?\{/, '{')
        .replace(/\}[\s\S]*?$/, '}');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

/**
 * 格式化单条告警
 * @param {Object} rawAlert - 原始告警数据
 * @returns {Object} 格式化后的告警
 */
function formatAlert(rawAlert) {
  const message = parseMessage(rawAlert.message);
  
  // 从 subject 中提取信息（当 message 解析失败时作为备选）
  const subjectMatch = rawAlert.subject?.match(/服务器:([^\s]+) 发生:/);
  const hostnameFromSubject = subjectMatch ? subjectMatch[1] : null;
  
  // 解析时间戳
  const timestamp = rawAlert.clock ? new Date(rawAlert.clock * 1000) : new Date();
  
  return {
    id: rawAlert.alertid,
    hostname: message?.HOSTNAME || hostnameFromSubject || '未知主机',
    hostIp: message?.HOSTIP || '未知 IP',
    triggerName: message?.TRIGGERNAME || '未知告警类型',
    triggerSeverity: message?.TRIGGERSEVERITY || 'Unknown',
    itemName: message?.ITEMNAME || '',
    itemLastValue: message?.ITEMLASTVALUE || '',
    eventDate: message?.EVENTDATE || formatDate(timestamp),
    eventTime: message?.EVENTTIME || formatTime(timestamp),
    eventTimestamp: timestamp,
    eventSeverity: message?.TRIGGERSEVERITY || 'Unknown',
    eventStatus: message?.TRIGGERSTATUS || '',
    eventId: message?.EVENTID || '',
    robot: message?.robot || '',
    rawSubject: rawAlert.subject,
    rawMessage: message
  };
}

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串 (YYYY.MM.DD)
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * 格式化时间
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的时间字符串 (HH:MM:SS)
 */
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化告警数组
 * @param {Array} alerts - 原始告警数组
 * @returns {Array} 格式化后的告警数组
 */
function formatAlerts(alerts) {
  if (!Array.isArray(alerts)) {
    return [];
  }
  
  return alerts.map(formatAlert).filter(alert => alert !== null);
}

/**
 * 按主机分组告警
 * @param {Array} alerts - 格式化后的告警数组
 * @returns {Object} 按主机名分组的告警对象
 */
function groupByHost(alerts) {
  return alerts.reduce((groups, alert) => {
    const key = `${alert.hostname} (${alert.hostIp})`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(alert);
    return groups;
  }, {});
}

/**
 * 按告警类型分组
 * @param {Array} alerts - 格式化后的告警数组
 * @returns {Object} 按告警类型分组的对象
 */
function groupByTrigger(alerts) {
  return alerts.reduce((groups, alert) => {
    const key = alert.triggerName;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(alert);
    return groups;
  }, {});
}

module.exports = {
  formatAlert,
  formatAlerts,
  groupByHost,
  groupByTrigger,
  parseMessage,
  formatDate,
  formatTime
};
