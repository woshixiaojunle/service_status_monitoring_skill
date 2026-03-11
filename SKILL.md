# Service Status Monitoring Skill

## 触发关键词

- "分析服务器日志"
- "服务器健康状况"
- "分析服务器状态"
- "服务性能分析"
- "Zabbix 告警分析"
- "服务器监控"
- "查看告警"

## 功能描述

连接 Zabbix 数据库，获取指定时间范围内的告警数据，通过 AI 分析生成专业的服务器健康分析报告。

## 配置要求

需要在 `.env` 文件中配置以下数据库信息：

```ini
TEST_SERVER_LOG_DB_TYPE=MySql5.7
TEST_SERVER_LOG_DB_URL=101.132.250.72
TEST_SERVER_LOG_DB_PORT=3306
TEST_SERVER_LOG_DB_DATABASE=zabbix
TEST_SERVER_LOG_DB_USER=user
TEST_SERVER_LOG_DB_PASSWORD=password
TEST_SERVER_LOG_DB_QUERY_LIMIT_PRE_HOUR=24
```

## 输出格式

Markdown 格式的健康分析报告，包含：
- 告警概览（总数/分级统计）
- 严重告警详情（含原因分析和解决方案）
- 一般告警详情
- 正常/信息级告警
- 汇总建议

## 错误处理

任何步骤失败都会返回明确的错误信息和失败阶段，确保用户了解问题所在。
