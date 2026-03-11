/**
 * 统一错误处理器
 * 
 * 捕获并格式化各阶段的错误，返回友好的错误信息
 */

// 错误阶段枚举
const ErrorStage = {
  CONFIG: 'CONFIG',
  DB_CONNECT: 'DB_CONNECT',
  DB_QUERY: 'DB_QUERY',
  DATA_FORMAT: 'DATA_FORMAT',
  DATA_CLASSIFY: 'DATA_CLASSIFY',
  LLM_ANALYZE: 'LLM_ANALYZE',
  REPORT_GENERATE: 'REPORT_GENERATE',
  UNKNOWN: 'UNKNOWN'
};

// 错误码映射
const ERROR_MESSAGES = {
  CONFIG_NOT_FOUND: '未找到配置文件 .env，请确保文件存在于当前目录或父目录',
  CONFIG_INCOMPLETE: '配置文件缺失必填字段',
  DB_CONN_FAILED: '数据库连接失败，请检查网络、用户名和密码',
  DB_QUERY_TIMEOUT: '数据库查询超时，建议减小查询时间范围',
  DB_TABLE_NOT_FOUND: '数据库表不存在，请检查表名和数据库结构',
  DB_ACCESS_DENIED: '数据库访问被拒绝，请检查用户权限',
  DATA_FORMAT_FAILED: '数据格式化失败',
  LLM_UNAVAILABLE: 'AI 分析服务暂不可用',
  REPORT_GENERATE_FAILED: '报告生成失败'
};

/**
 * 错误处理器类
 */
class ErrorHandler {
  constructor() {
    this.config = null;
    this.startTime = Date.now();
  }
  
  /**
   * 设置配置信息（用于错误报告）
   * @param {Object} config - 配置对象
   */
  setConfig(config) {
    this.config = config;
  }
  
  /**
   * 判断错误阶段
   * @param {Error} error - 错误对象
   * @returns {string} 错误阶段
   */
  identifyStage(error) {
    const message = error.message || '';
    
    if (message.startsWith('CONFIG_')) return ErrorStage.CONFIG;
    if (message.startsWith('DB_CONN')) return ErrorStage.DB_CONNECT;
    if (message.startsWith('DB_QUERY')) return ErrorStage.DB_QUERY;
    if (message.startsWith('DB_')) return ErrorStage.DB_CONNECT;
    if (message.startsWith('FORMAT_')) return ErrorStage.DATA_FORMAT;
    if (message.startsWith('LLM_')) return ErrorStage.LLM_ANALYZE;
    if (message.startsWith('REPORT_')) return ErrorStage.REPORT_GENERATE;
    
    return ErrorStage.UNKNOWN;
  }
  
  /**
   * 获取友好的错误信息
   * @param {Error} error - 错误对象
   * @param {string} stage - 错误阶段
   * @returns {string} 友好的错误信息
   */
  getFriendlyMessage(error, stage) {
    const code = error.message.split(':')[0];
    const baseMessage = ERROR_MESSAGES[code] || error.message;
    
    const stageMessages = {
      [ErrorStage.CONFIG]: '📋 配置阶段出错',
      [ErrorStage.DB_CONNECT]: '🔌 数据库连接出错',
      [ErrorStage.DB_QUERY]: '📊 数据查询出错',
      [ErrorStage.DATA_FORMAT]: '🔧 数据处理出错',
      [ErrorStage.DATA_CLASSIFY]: '🏷️ 数据分级出错',
      [ErrorStage.LLM_ANALYZE]: '🤖 AI 分析出错',
      [ErrorStage.REPORT_GENERATE]: '📝 报告生成出错',
      [ErrorStage.UNKNOWN]: '❓ 未知错误'
    };
    
    return `${stageMessages[stage] || stageMessages[ErrorStage.UNKNOWN]}

**错误信息**: ${baseMessage}

**建议操作**:
${this.getSuggestion(stage, error)}`;
  }
  
  /**
   * 获取错误处理建议
   * @param {string} stage - 错误阶段
   * @param {Error} error - 错误对象
   * @returns {string} 建议文本
   */
  getSuggestion(stage, error) {
    switch (stage) {
      case ErrorStage.CONFIG:
        return '- 检查 .env 文件是否存在\n- 确认必填字段已配置（DB_TYPE, DB_URL, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD）';
      case ErrorStage.DB_CONNECT:
        return '- 检查数据库服务是否运行\n- 验证网络连接\n- 确认用户名和密码正确';
      case ErrorStage.DB_QUERY:
        return '- 减小查询时间范围（修改 QUERY_LIMIT_PRE_HOUR）\n- 检查 zabbix.alerts 表是否存在';
      case ErrorStage.LLM_ANALYZE:
        return '- 检查 LLM 服务配置\n- 稍后重试\n- 报告仍会生成，但缺少 AI 分析内容';
      default:
        return '- 查看详细错误日志\n- 联系技术支持';
    }
  }
  
  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @returns {string} 格式化的错误报告
   */
  handle(error) {
    const stage = this.identifyStage(error);
    const friendlyMessage = this.getFriendlyMessage(error, stage);
    
    const report = `## ⚠️ 服务监控分析失败

**失败阶段**: ${stage}
**错误代码**: ${error.message.split(':')[0]}
**执行时间**: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s

---

${friendlyMessage}

---
*如需技术支持，请提供完整错误信息*
`;

    // 记录错误日志（如果配置了日志）
    if (typeof console !== 'undefined') {
      console.error(`[ServiceStatusMonitor] Error at ${stage}:`, error);
    }
    
    return report;
  }
  
  /**
   * 创建自定义错误
   * @param {string} code - 错误代码
   * @param {string} message - 错误信息
   * @returns {Error} 错误对象
   */
  static createError(code, message) {
    return new Error(`${code}: ${message}`);
  }
}

module.exports = {
  ErrorHandler,
  ErrorStage,
  ERROR_MESSAGES
};
