/**
 * LLM 配置测试
 */

const { checkConfig, createLLMCaller } = require('./analyzer/llm-adapter');

async function testLLM() {
  console.log('🤖 LLM 配置测试\n');
  
  // 检查配置
  const config = checkConfig();
  console.log('📋 配置状态:', config.ready ? '✅ 就绪' : '❌ 缺失');
  if (!config.ready) {
    console.log('   缺失:', config.missing.join(', '));
    console.log('\n💡 提示：在 .env 文件中配置 BAILIAN_API_KEY 或 OPENAI_API_KEY\n');
    return;
  }
  
  console.log('   已配置 API Key\n');
  
  // 测试 LLM 调用
  console.log('🚀 测试 LLM 调用...');
  const llmCaller = createLLMCaller(process.env.LLM_PROVIDER || 'openclaw');
  
  try {
    const prompt = '用一句话介绍你自己';
    console.log(`   Prompt: ${prompt}`);
    
    const response = await llmCaller(prompt);
    console.log(`   Response: ${response.substring(0, 100)}...`);
    console.log('\n✅ LLM 调用成功\n');
  } catch (error) {
    console.log(`\n❌ LLM 调用失败：${error.message}\n`);
  }
}

testLLM().catch(console.error);
