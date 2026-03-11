/**
 * LLM 智能分析器
 * 
 * 调用大模型对告警进行原因分析和解决方案生成
 */

/**
 * 构建 LLM 分析提示词
 * @param {Object} alert - 已分级的告警对象
 * @returns {string} 提示词
 */
function buildPrompt(alert) {
  return `你是一位拥有 15 年经验的高级运维专家 (SRE)。请分析以下服务器告警：

【告警信息】
主机：${alert.hostname} (${alert.hostIp})
类型：${alert.triggerName}
级别：${alert.triggerSeverity}
当前值：${alert.itemLastValue}
时间：${alert.eventDate} ${alert.eventTime}
状态：${alert.eventStatus}

请输出（保持精简，不要废话）：
1. 可能原因（最多 3 条，按概率从高到低排序，每条不超过 30 字）
2. 解决方案（可执行的具体步骤，最多 3 条）
3. 紧急程度（1-5 分，5 分最紧急）

输出格式：
原因：
- 原因 1
- 原因 2
- 原因 3

解决方案：
1. 步骤 1
2. 步骤 2
3. 步骤 3

紧急程度：X/5`;
}

/**
 * 解析 LLM 响应
 * @param {string} response - LLM 返回的文本
 * @returns {Object} 解析后的分析结果
 */
function parseResponse(response) {
  if (!response) {
    return {
      reasons: ['无法获取 AI 分析结果'],
      solutions: ['请手动检查相关配置和日志'],
      urgency: 3
    };
  }
  
  const result = {
    reasons: [],
    solutions: [],
    urgency: 3
  };
  
  // 解析原因
  const reasonsMatch = response.match(/原因：[\s\S]*?(?=解决方案：|紧急程度：|$)/);
  if (reasonsMatch) {
    const reasonsText = reasonsMatch[0];
    const reasonLines = reasonsText
      .split('\n')
      .filter(line => line.trim().match(/^[-•*]\s*/))
      .map(line => line.replace(/^[-•*]\s*/, '').trim());
    result.reasons = reasonLines.length > 0 ? reasonLines : ['需要进一步排查'];
  }
  
  // 解析解决方案
  const solutionsMatch = response.match(/解决方案：[\s\S]*?(?=紧急程度：|$)/);
  if (solutionsMatch) {
    const solutionsText = solutionsMatch[0];
    const solutionLines = solutionsText
      .split('\n')
      .filter(line => line.trim().match(/^\d+\.\s*/))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
    result.solutions = solutionLines.length > 0 ? solutionLines : ['请手动检查'];
  }
  
  // 解析紧急程度
  const urgencyMatch = response.match(/紧急程度 [::]\s*(\d+)\s*\/?\s*5/);
  if (urgencyMatch) {
    result.urgency = parseInt(urgencyMatch[1], 10);
  }
  
  return result;
}

/**
 * 分析单条告警（调用 LLM）
 * @param {Object} alert - 已分级的告警对象
 * @param {Function} llmCaller - LLM 调用函数
 * @returns {Promise<Object>} 带分析结果的告警对象
 */
async function analyzeAlert(alert, llmCaller) {
  // 信息级别告警不需要详细分析
  if (alert.severity === 'info') {
    return {
      ...alert,
      analysis: {
        reasons: ['信息级别告警，无需特别处理'],
        solutions: ['持续关注即可'],
        urgency: 1
      },
      analysisSkipped: true
    };
  }
  
  try {
    const prompt = buildPrompt(alert);
    const response = await llmCaller(prompt);
    const analysis = parseResponse(response);
    
    return {
      ...alert,
      analysis,
      analysisSkipped: false
    };
  } catch (error) {
    // LLM 调用失败时返回降级结果
    return {
      ...alert,
      analysis: {
        reasons: ['AI 分析暂不可用'],
        solutions: [`错误：${error.message}`],
        urgency: 3
      },
      analysisError: error.message
    };
  }
}

/**
 * 批量分析告警
 * @param {Array} alerts - 已分级的告警数组
 * @param {Function} llmCaller - LLM 调用函数（接收 prompt，返回 response）
 * @param {Object} options - 选项
 * @param {number} options.concurrency - 并发数（默认 3）
 * @param {boolean} options.skipInfo - 是否跳过信息级别告警（默认 true）
 * @returns {Promise<Array>} 带分析结果的告警数组
 */
async function analyzeWithLLM(alerts, llmCaller, options = {}) {
  const {
    concurrency = 3,
    skipInfo = true
  } = options;
  
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return [];
  }
  
  // 如果没有提供 LLM 调用函数，返回原始数据
  if (typeof llmCaller !== 'function') {
    return alerts.map(alert => ({
      ...alert,
      analysis: {
        reasons: ['AI 分析未配置'],
        solutions: ['请配置 LLM 调用函数'],
        urgency: 3
      },
      analysisSkipped: true
    }));
  }
  
  // 并发控制
  const results = [];
  const queue = [...alerts];
  
  async function worker() {
    while (queue.length > 0) {
      const alert = queue.shift();
      
      // 跳过信息级别告警（如果配置了）
      if (skipInfo && alert.severity === 'info') {
        results.push({
          ...alert,
          analysis: {
            reasons: ['信息级别告警，无需特别处理'],
            solutions: ['持续关注即可'],
            urgency: 1
          },
          analysisSkipped: true
        });
        continue;
      }
      
      const analyzed = await analyzeAlert(alert, llmCaller);
      results.push(analyzed);
    }
  }
  
  // 启动并发 worker
  const workers = Array.from({ length: Math.min(concurrency, alerts.length) }, worker);
  await Promise.all(workers);
  
  return results;
}

/**
 * 生成告警摘要（用于快速预览）
 * @param {Array} alerts - 已分析的告警数组
 * @returns {string} 摘要文本
 */
function generateSummary(alerts) {
  const severe = alerts.filter(a => a.severity === 'severe');
  const normal = alerts.filter(a => a.severity === 'normal');
  
  let summary = `共 ${alerts.length} 条告警`;
  
  if (severe.length > 0) {
    summary += `，其中 ${severe.length} 条严重告警需立即处理`;
  }
  
  if (normal.length > 0) {
    summary += `，${normal.length} 条一般告警`;
  }
  
  return summary;
}

module.exports = {
  analyzeAlert,
  analyzeWithLLM,
  buildPrompt,
  parseResponse,
  generateSummary
};
