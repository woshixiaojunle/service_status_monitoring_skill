/**
 * LLM 适配器
 * 
 * 支持多种 LLM 后端调用（OpenClaw 内置 / OpenAI / 自定义 API）
 */

const https = require('https');
const http = require('http');

/**
 * OpenClaw 内置 LLM 调用（推荐）
 * 
 * 直接使用 OpenClaw 会话的模型，无需额外配置 API Key
 */
async function callOpenClawLLM(prompt, options = {}) {
  const {
    model = process.env.LLM_MODEL || 'qwen3.5-plus',
    temperature = 0.7,
    maxTokens = 500
  } = options;
  
  // 如果配置了外部 API Key，使用外部 API
  if (process.env.BAILIAN_API_KEY) {
    return callBailian(prompt, { model, temperature, maxTokens });
  }
  
  if (process.env.OPENAI_API_KEY) {
    return callOpenAI(prompt, { model, temperature, maxTokens });
  }
  
  // 否则使用 OpenClaw 内置模型（通过 HTTP 调用本地服务）
  // OpenClaw 会在运行时自动注入模型能力
  return callOpenClawNative(prompt, { model, temperature, maxTokens });
}

/**
 * OpenClaw 原生调用（通过本地 HTTP 服务）
 */
async function callOpenClawNative(prompt, options) {
  // 尝试调用 OpenClaw 本地服务
  const host = process.env.OPENCLAW_HOST || 'localhost';
  const port = process.env.OPENCLAW_PORT || '8080';
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      prompt: prompt,
      model: options.model,
      temperature: options.temperature,
      max_tokens: options.maxTokens
    });
    
    const req = http.request({
      hostname: host,
      port: port,
      path: '/v1/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result.text || result.content || result.choices?.[0]?.message?.content || '');
        } catch (e) {
          // 如果本地服务不可用，返回降级响应
          resolve('[OpenClaw 内置分析] ' + prompt.substring(0, 50) + '...');
        }
      });
    });
    
    req.on('error', () => {
      // 本地服务不可用时，使用内置简化分析
      resolve(generateBuiltInAnalysis(prompt));
    });
    
    req.write(data);
    req.end();
  });
}

/**
 * 内置简化分析（当 OpenClaw 服务不可用时）
 */
function generateBuiltInAnalysis(prompt) {
  // 从 prompt 中提取告警信息
  const hostMatch = prompt.match(/主机：([^\n]+)/);
  const typeMatch = prompt.match(/类型：([^\n]+)/);
  const levelMatch = prompt.match(/级别：([^\n]+)/);
  
  const level = levelMatch ? levelMatch[1].trim() : '';
  const type = typeMatch ? typeMatch[1].trim() : '';
  
  // 根据告警类型生成内置分析
  const analysis = {
    'cpu': {
      reasons: ['进程占用过高', '系统负载突增', '资源竞争'],
      solutions: ['使用 top 命令定位高占用进程', '检查是否有异常任务', '考虑扩容或优化代码']
    },
    '网络': {
      reasons: ['网络设备故障', '链路拥塞', '配置问题'],
      solutions: ['检查交换机/路由器状态', '测试网络连通性', '查看网络配置']
    },
    'disk': {
      reasons: ['日志文件累积', '数据增长过快', '未清理临时文件'],
      solutions: ['清理日志文件', '配置日志轮转', '扩容存储']
    },
    '应用': {
      reasons: ['服务进程异常', '依赖服务不可用', '配置错误'],
      solutions: ['重启服务', '检查依赖服务状态', '查看应用日志']
    }
  };
  
  // 匹配告警类型
  let selectedAnalysis = analysis['应用']; // 默认
  if (type.toLowerCase().includes('cpu')) selectedAnalysis = analysis['cpu'];
  else if (type.toLowerCase().includes('网络') || type.toLowerCase().includes('icmp')) selectedAnalysis = analysis['网络'];
  else if (type.toLowerCase().includes('disk') || type.toLowerCase().includes('空间')) selectedAnalysis = analysis['disk'];
  else if (type.toLowerCase().includes('应用') || type.toLowerCase().includes('服务')) selectedAnalysis = analysis['应用'];
  
  return `原因：
- ${selectedAnalysis.reasons[0]}
- ${selectedAnalysis.reasons[1]}
- ${selectedAnalysis.reasons[2]}

解决方案：
1. ${selectedAnalysis.solutions[0]}
2. ${selectedAnalysis.solutions[1]}
3. ${selectedAnalysis.solutions[2]}

紧急程度：${level.includes('High') || level.includes('Disaster') ? '4' : '3'}/5`;
}

/**
 * 调用通义千问（Bailian）API
 */
async function callBailian(prompt, options) {
  const apiKey = process.env.BAILIAN_API_KEY;
  const model = options.model || 'qwen-plus';
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model,
      input: { messages: [{ role: 'user', content: prompt }] },
      parameters: {
        temperature: options.temperature,
        max_tokens: options.maxTokens
      }
    });
    
    const req = https.request({
      hostname: 'dashscope.aliyuncs.com',
      port: 443,
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result.choices?.[0]?.message?.content || '');
        } catch (e) {
          reject(new Error(`BAILIAN_PARSE_ERROR: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * 调用 OpenAI API
 */
async function callOpenAI(prompt, options) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = options.model || 'gpt-3.5-turbo';
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature,
      max_tokens: options.maxTokens
    });
    
    const req = https.request({
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result.choices?.[0]?.message?.content || '');
        } catch (e) {
          reject(new Error(`OPENAI_PARSE_ERROR: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * 创建 LLM 调用函数
 * 
 * @param {string} provider - LLM 提供商（openclaw | bailian | openai | custom）
 * @param {Object} options - 配置选项
 * @returns {Function} LLM 调用函数（接收 prompt，返回 response）
 */
function createLLMCaller(provider = 'openclaw', options = {}) {
  switch (provider) {
    case 'bailian':
      return (prompt) => callBailian(prompt, options);
    case 'openai':
      return (prompt) => callOpenAI(prompt, options);
    case 'openclaw':
    default:
      return (prompt) => callOpenClawLLM(prompt, options);
  }
}

/**
 * 检查 LLM 配置是否就绪
 * @returns {Object} { ready: boolean, missing: string[] }
 */
function checkConfig() {
  const missing = [];
  
  if (!process.env.BAILIAN_API_KEY && !process.env.OPENAI_API_KEY) {
    missing.push('BAILIAN_API_KEY 或 OPENAI_API_KEY');
  }
  
  return {
    ready: missing.length === 0,
    missing
  };
}

module.exports = {
  callOpenClawLLM,
  callBailian,
  callOpenAI,
  createLLMCaller,
  checkConfig
};
