/**
 * Service Status Monitoring Skill - 主入口
 * 
 * 连接 Zabbix 数据库，分析服务器告警，生成健康报告
 */

const path = require('path');
const configLoader = require('./config/loader');
const dbConnector = require('./db/connector');
const { formatAlerts } = require('./analyzer/formatter');
const { classifyAlerts } = require('./analyzer/classifier');
const { analyzeWithLLM } = require('./analyzer/reasoner');
const { generateReport } = require('./templates/report');
const { ErrorHandler, ErrorStage } = require('./utils/error-handler');
const { createLLMCaller, checkConfig: checkLLMConfig } = require('./analyzer/llm-adapter');

/**
 * 主执行函数
 * @param {Object} options - 执行选项
 * @param {string} options.envPath - .env 文件路径（可选，默认当前目录）
 * @param {number} options.hours - 查询过去多少小时的数据（可选，默认配置值）
 * @returns {Promise<string>} Markdown 格式的分析报告
 */
async function execute(options = {}) {
  const errorHandler = new ErrorHandler();
  
  try {
    // Step 1: 加载配置
    const config = await configLoader.load(options.envPath);
    errorHandler.setConfig(config);
    
    // Step 2: 数据库连接与查询
    const queryHours = options.hours || config.QUERY_LIMIT_PRE_HOUR || 24;
    const alerts = await dbConnector.query(config, queryHours);
    
    if (!alerts || alerts.length === 0) {
      return generateReport({
        analysisTime: new Date(),
        queryHours,
        alerts: [],
        summary: { total: 0, severe: 0, normal: 0, info: 0 },
        empty: true
      });
    }
    
    // Step 3: 数据格式化
    const formattedAlerts = formatAlerts(alerts);
    
    // Step 4: 告警分级
    const classifiedAlerts = classifyAlerts(formattedAlerts);
    
    // Step 5: LLM 智能分析（使用 OpenClaw 内置模型）
    const llmCaller = createLLMCaller('openclaw');
    const analyzedAlerts = await analyzeWithLLM(classifiedAlerts, llmCaller);
    
    // Step 6: 生成报告
    const report = generateReport({
      analysisTime: new Date(),
      queryHours,
      alerts: analyzedAlerts,
      summary: {
        total: analyzedAlerts.length,
        severe: analyzedAlerts.filter(a => a.severity === 'severe').length,
        normal: analyzedAlerts.filter(a => a.severity === 'normal').length,
        info: analyzedAlerts.filter(a => a.severity === 'info').length
      }
    });
    
    return report;
    
  } catch (error) {
    return errorHandler.handle(error);
  }
}

// 导出主函数
module.exports = {
  execute,
  // 导出各模块供测试使用
  configLoader,
  dbConnector,
  formatAlerts,
  classifyAlerts,
  analyzeWithLLM,
  generateReport
};
