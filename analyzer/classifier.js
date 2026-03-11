/**
 * 告警分级器
 * 
 * 根据告警类型和严重级别进行分类：严重/一般/正常
 */

// 严重级别映射
const SEVERITY_MAP = {
  // 严重级别
  'Disaster': 'severe',
  'High': 'severe',
  '灾难': 'severe',
  '严重': 'severe',
  
  // 一般级别
  'Average': 'normal',
  'Warning': 'normal',
  '一般': 'normal',
  '警告': 'normal',
  
  // 信息级别
  'Information': 'info',
  'Not classified': 'info',
  '信息': 'info',
  '正常': 'info'
};

// 关键词匹配规则（用于从告警名称判断严重程度）
const SEVERITY_KEYWORDS = {
  severe: [
    'network', '网络', 'icmp', 'ping', 'loss', '丢包',
    'disk', '磁盘', 'space', '空间', 'storage', '存储',
    'memory', '内存', 'ram', 'oom', 'out of memory',
    'cpu', 'processor', '处理器',
    'down', 'offline', '宕机', '离线', '不可用',
    'critical', 'fatal', 'error', '失败', '错误'
  ],
  normal: [
    'warning', 'warn', '警告', '阈值', 'threshold',
    'high load', '高负载', 'slow', '慢'
  ],
  info: [
    'info', 'information', 'notice', '通知',
    'recovered', 'resolved', '恢复', '正常'
  ]
};

/**
 * 判断告警是否属于某个级别（通过关键词匹配）
 * @param {string} text - 告警文本
 * @param {string} level - 目标级别
 * @returns {boolean} 是否匹配
 */
function matchesSeverityLevel(text, level) {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  const keywords = SEVERITY_KEYWORDS[level] || [];
  
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * 对单条告警进行分级
 * @param {Object} alert - 格式化后的告警对象
 * @returns {Object} 带分级信息的告警对象
 */
function classifyAlert(alert) {
  // 1. 首先尝试从严重级别字段映射
  const mappedSeverity = SEVERITY_MAP[alert.triggerSeverity] || 
                         SEVERITY_MAP[alert.eventSeverity];
  
  if (mappedSeverity) {
    return {
      ...alert,
      severity: mappedSeverity,
      severitySource: 'severity_field'
    };
  }
  
  // 2. 从告警名称关键词判断
  const triggerName = alert.triggerName || '';
  const subject = alert.rawSubject || '';
  const combinedText = `${triggerName} ${subject}`;
  
  if (matchesSeverityLevel(combinedText, 'severe')) {
    return {
      ...alert,
      severity: 'severe',
      severitySource: 'keyword_match'
    };
  }
  
  if (matchesSeverityLevel(combinedText, 'normal')) {
    return {
      ...alert,
      severity: 'normal',
      severitySource: 'keyword_match'
    };
  }
  
  if (matchesSeverityLevel(combinedText, 'info')) {
    return {
      ...alert,
      severity: 'info',
      severitySource: 'keyword_match'
    };
  }
  
  // 3. 默认归类为一般告警
  return {
    ...alert,
    severity: 'normal',
    severitySource: 'default'
  };
}

/**
 * 对告警数组进行分级
 * @param {Array} alerts - 格式化后的告警数组
 * @returns {Array} 带分级信息的告警数组
 */
function classifyAlerts(alerts) {
  if (!Array.isArray(alerts)) {
    return [];
  }
  
  return alerts.map(classifyAlert);
}

/**
 * 统计各级别告警数量
 * @param {Array} alerts - 已分级的告警数组
 * @returns {Object} 统计结果
 */
function countBySeverity(alerts) {
  const counts = {
    severe: 0,
    normal: 0,
    info: 0,
    unknown: 0
  };
  
  for (const alert of alerts) {
    const severity = alert.severity || 'unknown';
    counts[severity] = (counts[severity] || 0) + 1;
  }
  
  return counts;
}

/**
 * 按级别筛选告警
 * @param {Array} alerts - 已分级的告警数组
 * @param {string} severity - 目标级别
 * @returns {Array} 筛选后的告警数组
 */
function filterBySeverity(alerts, severity) {
  return alerts.filter(alert => alert.severity === severity);
}

module.exports = {
  classifyAlert,
  classifyAlerts,
  countBySeverity,
  filterBySeverity,
  SEVERITY_MAP,
  SEVERITY_KEYWORDS
};
