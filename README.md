# Service Status Monitoring Skill

Zabbix 服务器监控告警分析 Skill - 连接数据库获取告警数据，通过 AI 生成专业的健康分析报告。

## 快速开始

### 1. 安装依赖

```bash
cd skills/service_status_monitoring_skill
npm install
```

### 2. 配置数据库

在 `.env` 文件中配置 Zabbix 数据库信息：

```ini
TEST_SERVER_LOG_DB_TYPE=MySql5.7
TEST_SERVER_LOG_DB_URL=ip
TEST_SERVER_LOG_DB_PORT=3306
TEST_SERVER_LOG_DB_DATABASE=zabbix
TEST_SERVER_LOG_DB_USER=user
TEST_SERVER_LOG_DB_PASSWORD=password
TEST_SERVER_LOG_DB_QUERY_LIMIT_PRE_HOUR=24
```

### 3. 配置 LLM（可选，推荐）

**方案 A: 通义千问（Bailian）- 推荐国内使用**

1. 访问 https://dashscope.console.aliyun.com/ 获取 API Key
2. 在 `.env` 中添加：

```ini
BAILIAN_API_KEY=sk-xxxxxxxxxxxxxxxx
LLM_PROVIDER=bailian
LLM_MODEL=qwen-plus
```

**方案 B: OpenAI**

```ini
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
```

**方案 C: 使用 OpenClaw 内置模型**

```ini
LLM_PROVIDER=openclaw
```

> ⚠️ 不配置 LLM 也可运行，但分析结果会显示"AI 分析未配置"

### 4. 运行测试

```bash
node test.js
```

### 5. 检查 LLM 配置

```bash
node -e "const { checkConfig } = require('./analyzer/llm-adapter'); console.log(checkConfig());"
```

输出 `{ ready: true, missing: [] }` 表示配置成功。

### 4. 在 OpenClaw 中使用

唤起关键词：
- "分析服务器日志"
- "服务器健康状况"
- "分析服务器状态"
- "服务性能分析"
- "Zabbix 告警分析"

## 目录结构

```
service_status_monitoring_skill/
├── SKILL.md           # Skill 定义
├── index.js           # 主入口
├── package.json       # 依赖配置
├── README.md          # 使用说明
├── test.js            # 测试文件
├── config/
│   └── loader.js      # 配置加载器
├── db/
│   └── connector.js   # 数据库连接器
├── analyzer/
│   ├── formatter.js   # 数据格式化
│   ├── classifier.js  # 告警分级
│   └── reasoner.js    # LLM 分析
├── templates/
│   ├── report.md      # 报告模板
│   └── report.js      # 报告生成器
└── utils/
    └── error-handler.js # 错误处理
```

## 执行流程

1. **配置加载** - 读取并校验 .env 配置
2. **数据库查询** - 连接 Zabbix 数据库获取告警
3. **数据格式化** - 解析 JSON，提取关键字段
4. **告警分级** - 严重/一般/信息三级分类
5. **LLM 分析** - AI 生成原因分析和解决方案
6. **报告生成** - 输出 Markdown 格式报告

## 输出示例

```markdown
## 服务器健康分析报告

**分析时间**: 2026-03-11 09:37
**数据范围**: 过去 24 小时

### 📊 概览
- 总告警数：15
- 严重：3 | 一般：8 | 信息：4

### 🔴 严重告警

#### [网络] High ICMP ping loss
- **主机**: prodnh-mcp-fileserver08 (10.2.17.184)
- **可能原因**:
  - 网络交换机端口故障（概率 60%）
  - 网线接触不良（概率 30%）
  - 服务器网卡驱动异常（概率 10%）
- **解决方案**:
  1. 检查交换机端口状态，尝试更换端口
  2. 重新插拔网线，更换测试
  3. 更新网卡驱动至最新版本
- **紧急程度**: ⭐⭐⭐⭐ (4/5)

### 💡 建议
- 建议优先处理 prodnh-mcp-fileserver08 的严重告警
- 存在网络相关告警，建议检查网络设备
```

## 错误处理

任何步骤失败都会返回明确的错误信息：

- `CONFIG_NOT_FOUND` - 配置文件缺失
- `DB_CONN_FAILED` - 数据库连接失败
- `DB_QUERY_TIMEOUT` - 查询超时
- `LLM_UNAVAILABLE` - AI 分析不可用（仍会生成基础报告）

## 自定义

### 修改 LLM 提示词

编辑 `analyzer/reasoner.js` 中的 `buildPrompt` 函数。

### 修改报告模板

编辑 `templates/report.md` 和 `templates/report.js`。

### 添加数据源

扩展 `db/connector.js` 支持 Prometheus、ELK 等。

## 注意事项

1. **数据库性能** - 查询默认限制 1000 条，超时 30s
2. **连接池** - 自动复用连接，无需手动管理
3. **敏感信息** - 密码存储在 .env，不要提交到版本控制
4. **LLM 调用** - 可配置并发数和跳过信息级别告警

## 版本

- v1.0.0 - 初始版本，支持 MySQL/Zabbix

## License

MIT
