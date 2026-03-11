/**
 * 报告生成器
 * 
 * 根据分析结果生成 Markdown 格式的健康分析报告
 */

const fs = require('fs');
const path = require('path');

// 加载报告模板
const TEMPLATE_PATH = path.join(__dirname, 'report.md');
let TEMPLATE_CONTENT = '';

try {
  TEMPLATE_CONTENT = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
} catch (error) {
  // 使用内联模板作为后备
  TEMPLATE_CONTENT = `## 服务器健康分析报告

**分析时间**: \${analysisTimeStr}
**数据范围**: 过去 \${queryHours} 小时

\${emptyBlock}
\${summaryBlock}
\${severeAlertsBlock}
\${normalAlertsBlock}
\${infoAlertsBlock}
\${suggestionsBlock}

---
*报告由 Service Status Monitoring Skill 自动生成*`;
}

/**
 * 格式化日期时间
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的字符串
 */
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 生成紧急程度星级
 * @param {number} urgency - 紧急程度 (1-5)
 * @returns {string} 星级字符串
 */
function formatUrgency(urgency) {
  const stars = '⭐'.repeat(urgency) + '☆'.repeat(5 - urgency);
  return `${stars} (${urgency}/5)`;
}

/**
 * 生成单条告警详情
 * @param {Object} alert - 已分析的告警对象
 * @returns {string} Markdown 格式的告警详情
 */
function generateAlertBlock(alert) {
  const urgencyStars = alert.analysis?.urgency 
    ? formatUrgency(alert.analysis.urgency) 
    : '⭐⭐⭐ (3/5)';
  
  const reasons = alert.analysis?.reasons?.length > 0
    ? alert.analysis.reasons.map(r => `  - ${r}`).join('\n')
    : '  - 需要进一步排查';
  
  const solutions = alert.analysis?.solutions?.length > 0
    ? alert.analysis.solutions.map((s, i) => `  ${i + 1}. ${s}`).join('\n')
    : '  1. 请手动检查相关配置和日志';
  
  const analysisNote = alert.analysisSkipped 
    ? '' 
    : alert.analysisError 
      ? `\n> ⚠️ AI 分析异常：${alert.analysisError}`
      : '';
  
  return `#### ${alert.triggerName}
- **主机**: ${alert.hostname} (${alert.hostIp})
- **时间**: ${alert.eventDate} ${alert.eventTime}
- **级别**: ${alert.triggerSeverity}
- **当前值**: ${alert.itemLastValue || 'N/A'}
- **可能原因**:
${reasons}
- **解决方案**:
${solutions}
- **紧急程度**: ${urgencyStars}${analysisNote}
`;
}

/**
 * 生成告警列表块
 * @param {Array} alerts - 告警数组
 * @param {string} title - 块标题
 * @param {string} emoji - 表情符号
 * @returns {string} Markdown 格式的告警列表
 */
function generateAlertsSection(alerts, title, emoji) {
  if (!alerts || alerts.length === 0) {
    return '';
  }
  
  const alertBlocks = alerts.map(generateAlertBlock).join('\n');
  
  return `### ${emoji} ${title}

${alertBlocks}
`;
}

/**
 * 生成建议块
 * @param {Array} alerts - 已分析的告警数组
 * @returns {string} Markdown 格式的建议
 */
function generateSuggestions(alerts) {
  const severe = alerts.filter(a => a.severity === 'severe');
  const normal = alerts.filter(a => a.severity === 'normal');
  
  if (alerts.length === 0) {
    return '';
  }
  
  const suggestions = [];
  
  // 根据严重告警生成建议
  if (severe.length > 0) {
    const hosts = [...new Set(severe.map(a => a.hostname))];
    if (hosts.length === 1) {
      suggestions.push(`建议优先处理 **${hosts[0]}** 的 ${severe.length} 条严重告警`);
    } else {
      suggestions.push(`建议优先处理 ${severe.length} 条严重告警，涉及 ${hosts.length} 台主机`);
    }
  }
  
  // 根据告警类型生成建议
  const triggerTypes = [...new Set(alerts.map(a => a.triggerName))];
  if (triggerTypes.length > 3) {
    suggestions.push('告警类型较多，建议检查监控系统配置，避免告警风暴');
  }
  
  // 根据磁盘告警生成建议
  const diskAlerts = alerts.filter(a => 
    a.triggerName.toLowerCase().includes('disk') || 
    a.triggerName.toLowerCase().includes('空间')
  );
  if (diskAlerts.length > 0) {
    suggestions.push('存在磁盘空间告警，建议配置日志轮转或扩容存储');
  }
  
  // 根据网络告警生成建议
  const networkAlerts = alerts.filter(a => 
    a.triggerName.toLowerCase().includes('network') || 
    a.triggerName.toLowerCase().includes('网络') ||
    a.triggerName.toLowerCase().includes('icmp')
  );
  if (networkAlerts.length > 0) {
    suggestions.push('存在网络相关告警，建议检查网络设备和链路状态');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('系统整体运行正常，持续关注即可');
  }
  
  return `### 💡 建议

${suggestions.map(s => `- ${s}`).join('\n')}
`;
}

/**
 * 生成报告
 * @param {Object} data - 报告数据
 * @param {Date} data.analysisTime - 分析时间
 * @param {number} data.queryHours - 查询时间范围（小时）
 * @param {Array} data.alerts - 已分析的告警数组
 * @param {Object} data.summary - 告警统计 { total, severe, normal, info }
 * @param {boolean} data.empty - 是否为空数据
 * @returns {string} Markdown 格式的报告
 */
function generateReport(data) {
  const {
    analysisTime,
    queryHours,
    alerts = [],
    summary,
    empty = false
  } = data;
  
  const analysisTimeStr = formatDateTime(analysisTime);
  
  // 空数据块
  const emptyBlock = empty
    ? `> ✅ **过去 ${queryHours} 小时无告警记录，系统运行正常**`
    : '';
  
  // 概览块
  const summaryBlock = empty ? '' : `### 📊 概览
- 总告警数：**${summary.total}**
- 🔴 严重：**${summary.severe}** | 🟡 一般：**${summary.normal}** | 🟢 信息：**${summary.info}**
`;
  
  // 按级别分组
  const severeAlerts = alerts.filter(a => a.severity === 'severe');
  const normalAlerts = alerts.filter(a => a.severity === 'normal');
  const infoAlerts = alerts.filter(a => a.severity === 'info');
  
  // 各告警块
  const severeAlertsBlock = generateAlertsSection(severeAlerts, '严重告警', '🔴');
  const normalAlertsBlock = generateAlertsSection(normalAlerts, '一般告警', '🟡');
  const infoAlertsBlock = infoAlerts.length > 0 
    ? `### 🟢 信息级别告警

共 ${infoAlerts.length} 条，无需特别处理，持续关注即可。
`
    : '';
  
  // 建议块
  const suggestionsBlock = empty ? '' : generateSuggestions(alerts);
  
  // 替换模板变量
  let report = TEMPLATE_CONTENT
    .replace(/\$\{analysisTimeStr\}/g, analysisTimeStr)
    .replace(/\$\{queryHours\}/g, queryHours.toString())
    .replace(/\$\{emptyBlock\}/g, emptyBlock)
    .replace(/\$\{summaryBlock\}/g, summaryBlock)
    .replace(/\$\{severeAlertsBlock\}/g, severeAlertsBlock)
    .replace(/\$\{normalAlertsBlock\}/g, normalAlertsBlock)
    .replace(/\$\{infoAlertsBlock\}/g, infoAlertsBlock)
    .replace(/\$\{suggestionsBlock\}/g, suggestionsBlock);
  
  // 清理多余的空行
  report = report.replace(/\n{3,}/g, '\n\n');
  
  return report;
}

module.exports = {
  generateReport,
  formatDateTime,
  formatUrgency,
  generateAlertBlock,
  generateSuggestions
};
