/**
 * 数据库连接器
 * 
 * 支持 MySQL 和 PostgreSQL，使用连接池管理
 */

const mysql = require('mysql2/promise');

// 连接池缓存
const connectionPools = new Map();

/**
 * 获取或创建连接池
 * @param {Object} config - 数据库配置
 * @returns {Object} 连接池
 */
function getPool(config) {
  const poolKey = `${config.host}:${config.port}:${config.database}`;
  
  if (!connectionPools.has(poolKey)) {
    const poolConfig = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };
    
    const pool = mysql.createPool(poolConfig);
    connectionPools.set(poolKey, pool);
  }
  
  return connectionPools.get(poolKey);
}

/**
 * 执行查询
 * @param {Object} config - 数据库配置
 * @param {number} hours - 查询过去多少小时的数据
 * @returns {Promise<Array>} 告警数据数组
 * @throws {Error} 连接或查询失败时抛出错误
 */
async function query(config, hours = 24) {
  const pool = getPool(config);
  const connection = await pool.getConnection();
  
  try {
    // 设置查询超时
    await connection.query('SET SESSION max_execution_time = 30000');
    
    // 参数化查询（防止 SQL 注入）
    const sql = `
      SELECT alertid, clock, subject, message 
      FROM zabbix.alerts 
      WHERE clock >= UNIX_TIMESTAMP(NOW() - INTERVAL ? HOUR)
      ORDER BY clock DESC
      LIMIT 1000
    `;
    
    const [rows] = await connection.execute(sql, [hours]);
    
    return rows;
    
  } catch (error) {
    if (error.code === 'ER_QUERY_TIMEOUT' || error.errno === 3024) {
      throw new Error(`DB_QUERY_TIMEOUT: 查询超时（${hours}小时数据量过大，建议减小查询范围）`);
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      throw new Error('DB_TABLE_NOT_FOUND: zabbix.alerts 表不存在，请检查数据库结构');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      throw new Error('DB_ACCESS_DENIED: 数据库访问被拒绝，请检查用户名和密码');
    } else {
      throw new Error(`DB_QUERY_ERROR: ${error.message}`);
    }
  } finally {
    connection.release();
  }
}

/**
 * 测试数据库连接
 * @param {Object} config - 数据库配置
 * @returns {Promise<boolean>} 连接是否成功
 */
async function testConnection(config) {
  const pool = getPool(config);
  
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 关闭所有连接池
 */
async function closeAll() {
  for (const [key, pool] of connectionPools.entries()) {
    await pool.end();
  }
  connectionPools.clear();
}

module.exports = {
  query,
  testConnection,
  closeAll,
  getPool
};
