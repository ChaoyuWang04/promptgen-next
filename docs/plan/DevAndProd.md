# 任务：为项目添加 dev/prod 环境完全隔离

## 背景
- 技术栈：npm + just + docker + Next.js + PostgreSQL
- 当前启动方式：`just dev` / `just docker:up`
- 目标：dev 和 prod 数据库完全隔离，一键切换，防止误操作

## 要求

### 1. 创建/修改这些文件：
请帮我检查并修改以下文件：

**必须创建的新文件**：
- [ ] `.env.development` - 开发环境配置
- [ ] `.env.production` - 生产环境配置
- [ ] `.env.example` - 配置模板（会提交到git）
- [ ] `docker-compose.dev.yml` - 开发数据库配置
- [ ] `docker-compose.prod.yml` - 生产数据库配置

**需要修改的现有文件**：
- [ ] `justfile` - 添加环境切换命令
- [ ] `package.json` - 添加环境相关脚本
- [ ] `.gitignore` - 确保敏感配置不提交
- [ ] 数据库连接文件（告诉我你找到的文件路径）

### 2. 环境隔离规则：

**开发环境 (dev)**：
- 数据库端口：5432
- 数据库名：`[项目名]_dev`
- 容器名：`[项目名]-postgres-dev`
- 数据目录：`./data/postgres-dev`
- 可以随意删除/重置数据

**生产环境 (prod)**：
- 数据库端口：5433（避免冲突）
- 数据库名：`[项目名]_prod`
- 容器名：`[项目名]-postgres-prod`
- 数据目录：`./data/postgres-prod`
- 禁止执行危险操作（DROP/TRUNCATE）

### 3. justfile 命令需求：
```just
# 我希望有这些命令：

just dev              # 启动开发环境（前端+dev数据库）
just prod             # 启动生产环境（前端+prod数据库）

just docker:dev       # 只启动开发数据库
just docker:prod      # 只启动生产数据库
just docker:both      # 同时启动两个数据库

just db:reset-dev     # 重置开发数据库（带安全检查）
just db:migrate-dev   # 开发数据库迁移
just db:migrate-prod  # 生产数据库迁移（需要确认）

just check-env        # 显示当前环境信息
just switch-to-dev    # 切换到开发环境
just switch-to-prod   # 切换到生产环境
```

### 4. 安全措施：

在数据库操作代码中添加：
- 生产环境禁止执行 DROP/TRUNCATE 操作（代码层面阻止）
- 危险操作前打印当前环境和数据库信息
- `db:reset` 命令只能在 dev 环境执行

### 5. 实施步骤：

请按以下顺序操作：
1. 先列出当前项目结构（`just --list` 和主要文件）
2. 创建所有环境配置文件
3. 修改 docker-compose 配置
4. 更新 justfile
5. 添加代码层面的安全检查
6. 提供测试验证步骤

### 6. 不要做：
- ❌ 不要修改现有的生产数据
- ❌ 不要删除任何现有配置
- ❌ 不要立即执行数据库操作
- ✅ 只生成配置文件，让我review后再执行

## 输出格式
每个文件请用代码块标注文件路径，例如：
\`\`\`yaml
# docker-compose.dev.yml
...
\`\`\`

完成后给我一个checklist让我验证。
