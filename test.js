/**
 * Service Status Monitoring Skill - 测试文件
 * 
 * 使用方法：
 * 1. 确保 .env 文件存在且配置正确
 * 2. 运行：node test.js
 */

const { execute } = require('./index');

// 模拟 LLM 调用（测试用）
async function mockLLMCaller(prompt) {
  return `原因：
- 网络交换机端口故障（概率 60%）
- 网线接触不良（概率 30%）
- 服务器网卡驱动异常（概率 10%）

解决方案：
1. 检查交换机端口状态，尝试更换端口
2. 重新插拔网线，更换测试
3. 更新网卡驱动至最新版本

紧急程度：4/5`;
}

async function runTests() {
  console.log('🧪 开始测试 Service Status Monitoring Skill...\n');
  
  // 测试 1: 配置加载
  console.log('📋 测试 1: 配置加载');
  try {
    const { configLoader } = require('./index');
    const config = await configLoader.load();
    console.log('✅ 配置加载成功');
    console.log(`   数据库：${config.host}:${config.port}/${config.database}\n`);
  } catch (error) {
    console.log('❌ 配置加载失败');
    console.log(`   错误：${error.message}\n`);
    console.log('💡 提示：请确保 .env 文件存在且配置正确\n');
  }
  
  // 测试 2: 数据库查询
  console.log('📊 测试 2: 数据库查询');
  try {
    const { configLoader, dbConnector } = require('./index');
    const config = await configLoader.load();
    const alerts = await dbConnector.query(config, 1);
    console.log(`✅ 查询成功，获取 ${alerts.length} 条告警\n`);
  } catch (error) {
    console.log('❌ 数据库查询失败');
    console.log(`   错误：${error.message}\n`);
  }
  
  // 测试 3: 数据格式化
  console.log('🔧 测试 3: 数据格式化');
  try {
    const { formatAlerts } = require('./index');
    const mockAlerts = [{
      alertid: 12345,
      clock: Math.floor(Date.now() / 1000),
      subject: '服务器:test-server01 发生：[网络]High ICMP ping loss',
      message: JSON.stringify({
        HOSTNAME: 'test-server01',
        HOSTIP: '192.168.1.100',
        TRIGGERNAME: '[网络] High ICMP ping loss',
        TRIGGERSEVERITY: 'High',
        ITEMLASTVALUE: '50%',
        EVENTDATE: '2026.03.11',
        EVENTTIME: '09:30:00'
      })
    }];
    const formatted = formatAlerts(mockAlerts);
    console.log('✅ 格式化成功');
    console.log(`   主机：${formatted[0].hostname}`);
    console.log(`   告警：${formatted[0].triggerName}\n`);
  } catch (error) {
    console.log('❌ 数据格式化失败');
    console.log(`   错误：${error.message}\n`);
  }
  
  // 测试 4: 告警分级
  console.log('🏷️ 测试 4: 告警分级');
  try {
    const { formatAlerts, classifyAlerts } = require('./index');
    const mockAlerts = [{
      alertid: 12345,
      clock: Math.floor(Date.now() / 1000),
      subject: '服务器:test-server01 发生：[网络]High ICMP ping loss',
      message: JSON.stringify({
        HOSTNAME: 'test-server01',
        HOSTIP: '192.168.1.100',
        TRIGGERNAME: '[网络] High ICMP ping loss',
        TRIGGERSEVERITY: 'High',
        ITEMLASTVALUE: '50%',
        EVENTDATE: '2026.03.11',
        EVENTTIME: '09:30:00'
      })
    }];
    const formatted = formatAlerts(mockAlerts);
    const classified = classifyAlerts(formatted);
    console.log('✅ 分级成功');
    console.log(`   级别：${classified[0].severity}\n`);
  } catch (error) {
    console.log('❌ 告警分级失败');
    console.log(`   错误：${error.message}\n`);
  }
  
  // 测试 5: 完整流程（使用模拟 LLM）
  console.log('🚀 测试 5: 完整流程（模拟 LLM）');
  try {
    const report = await execute({ hours: 1 });
    console.log('✅ 完整流程执行成功');
    console.log('\n--- 报告预览 ---\n');
    console.log(report.substring(0, 500) + '...\n');
  } catch (error) {
    console.log('❌ 完整流程执行失败');
    console.log(`   错误：${error.message}\n`);
  }
  
  console.log('🧪 测试完成');
}

// 运行测试
runTests().catch(console.error);
