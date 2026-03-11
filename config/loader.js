/**
 * 配置加载器
 * 
 * 读取并校验 .env 文件中的数据库配置
 */

const fs = require('fs');
const path = require('path');

// 必填配置字段
const REQUIRED_FIELDS = [
  'TEST_SERVER_LOG_DB_TYPE',
  'TEST_SERVER_LOG_DB_URL',
  'TEST_SERVER_LOG_DB_PORT',
  'TEST_SERVER_LOG_DB_DATABASE',
  'TEST_SERVER_LOG_DB_USER',
  'TEST_SERVER_LOG_DB_PASSWORD'
];

// 配置字段映射
const FIELD_MAPPING = {
  DB_TYPE: 'TEST_SERVER_LOG_DB_TYPE',
  DB_URL: 'TEST_SERVER_LOG_DB_URL',
  DB_PORT: 'TEST_SERVER_LOG_DB_PORT',
  DB_DATABASE: 'TEST_SERVER_LOG_DB_DATABASE',
  DB_USER: 'TEST_SERVER_LOG_DB_USER',
  DB_PASSWORD: 'TEST_SERVER_LOG_DB_PASSWORD',
  QUERY_LIMIT_PRE_HOUR: 'TEST_SERVER_LOG_DB_QUERY_LIMIT_PRE_HOUR'
};

/**
 * 解析 .env 文件内容
 * @param {string} content - .env 文件内容
 * @returns {Object} 配置对象
 */
function parseEnvContent(content) {
  const config = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 跳过空行和注释
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      config[key.trim()] = value;
    }
  }
  
  return config;
}

/**
 * 校验配置完整性
 * @param {Object} config - 配置对象
 * @returns {Object} { valid: boolean, missing: string[] }
 */
function validateConfig(config) {
  const missing = [];
  
  for (const field of REQUIRED_FIELDS) {
    if (!config[field] || config[field].trim() === '') {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * 加载配置
 * @param {string} envPath - .env 文件路径（可选）
 * @returns {Promise<Object>} 配置对象
 * @throws {Error} 配置缺失时抛出错误
 */
async function load(envPath = null) {
  const searchPaths = [
    envPath,
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env'),
    path.join(process.cwd(), '..', '..', '.env')
  ].filter(Boolean);
  
  let envContent = null;
  let usedPath = null;
  
  for (const searchPath of searchPaths) {
    try {
      if (fs.existsSync(searchPath)) {
        envContent = fs.readFileSync(searchPath, 'utf-8');
        usedPath = searchPath;
        break;
      }
    } catch (error) {
      // 继续尝试下一个路径
    }
  }
  
  if (!envContent) {
    throw new Error('CONFIG_NOT_FOUND: 未找到 .env 配置文件，请确保文件存在');
  }
  
  const rawConfig = parseEnvContent(envContent);
  const validation = validateConfig(rawConfig);
  
  if (!validation.valid) {
    throw new Error(`CONFIG_INCOMPLETE: 配置缺失以下必填字段：${validation.missing.join(', ')}`);
  }
  
  // 构建标准化配置对象
  const config = {
    type: rawConfig[FIELD_MAPPING.DB_TYPE] || 'mysql',
    host: rawConfig[FIELD_MAPPING.DB_URL],
    port: parseInt(rawConfig[FIELD_MAPPING.DB_PORT], 10) || 3306,
    database: rawConfig[FIELD_MAPPING.DB_DATABASE],
    user: rawConfig[FIELD_MAPPING.DB_USER],
    password: rawConfig[FIELD_MAPPING.DB_PASSWORD],
    queryLimitPreHour: parseInt(rawConfig[FIELD_MAPPING.QUERY_LIMIT_PRE_HOUR], 10) || 24
  };
  
  // 映射数据库类型
  if (config.type.toLowerCase().includes('mysql')) {
    config.driver = 'mysql2';
  } else if (config.type.toLowerCase().includes('postgres') || config.type.toLowerCase().includes('pg')) {
    config.driver = 'pg';
  } else {
    config.driver = 'mysql2'; // 默认 MySQL
  }
  
  config._rawPath = usedPath;
  
  return config;
}

module.exports = {
  load,
  parseEnvContent,
  validateConfig,
  REQUIRED_FIELDS
};
