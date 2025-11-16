#!/bin/bash

# 三层密钥防火墙自动化配置脚本
# 适用于任何语言的项目
# 作者：Samuel Wang

set -e  # 遇到错误立即退出

echo "🔐 开始配置三层密钥防火墙..."
echo ""

# 检查是否在 git 仓库中
if [ ! -d .git ]; then
    echo "❌ 错误：当前目录不是 Git 仓库"
    echo "请先运行：git init"
    exit 1
fi

# 第一步：安装 pre-commit
echo "📦 [1/6] 检查 pre-commit..."
if ! command -v pre-commit &> /dev/null; then
    echo "正在安装 pre-commit..."
    pip install pre-commit --break-system-packages 2>/dev/null || pip install pre-commit
else
    echo "✅ pre-commit 已安装"
fi

# 第二步：安装 detect-secrets
echo "📦 [2/6] 检查 detect-secrets..."
if ! command -v detect-secrets &> /dev/null; then
    echo "正在安装 detect-secrets..."
    pip install detect-secrets --break-system-packages 2>/dev/null || pip install detect-secrets
else
    echo "✅ detect-secrets 已安装"
fi

# 第三步：创建 .pre-commit-config.yaml
echo "📝 [3/6] 创建 pre-commit 配置..."
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-added-large-files

  # 基础代码质量检查
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0
    hooks:
      - id: trailing-whitespace  # 清理多余空格
      - id: end-of-file-fixer    # 文件结尾换行
      - id: check-yaml           # 检查 yaml 格式
      - id: check-added-large-files  # 防止大文件（比如不小心加了数据库）
        args: ['--maxkb=500']
      - id: check-merge-conflict  # 防止 merge 冲突标记
      - id: debug-statements      # 防止 Python 的 debugger 残留

EOF
echo "✅ .pre-commit-config.yaml 已创建"

# 第四步：生成密钥基线
echo "🔍 [4/6] 扫描现有代码生成基线..."
detect-secrets scan > .secrets.baseline
echo "✅ .secrets.baseline 已生成"

# 第五步：安装 git hooks
echo "🪝 [5/6] 安装 Git Hooks..."
pre-commit install

# 创建 pre-push hook
cat > .git/hooks/pre-push << 'HOOK_EOF'
#!/bin/sh

echo "🔍 Running final secret scan before push..."
detect-secrets scan --baseline .secrets.baseline

if [ $? -ne 0 ]; then
    echo "❌ Secret detected! Push blocked."
    exit 1
fi

echo "✅ No secrets found. Push approved."
exit 0
HOOK_EOF

chmod +x .git/hooks/pre-push
echo "✅ Pre-push hook 已安装"

# 第六步：创建 GitHub Actions
echo "☁️  [6/6] 创建 GitHub Actions 配置..."
mkdir -p .github/workflows
cat > .github/workflows/security-check.yml << 'WORKFLOW_EOF'
name: Security Check

on:
  push:
    branches: [ main, master, dev, feature/* ]
  pull_request:
    branches: [ main, master, dev ]

jobs:
  detect-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install detect-secrets
        run: pip install detect-secrets

      - name: Scan for secrets
        run: |
          echo "🔍 Scanning for secrets..."
          detect-secrets scan --baseline .secrets.baseline
          if [ $? -ne 0 ]; then
            echo "❌ SECURITY ALERT: Secrets detected in repository!"
            exit 1
          fi
          echo "✅ No secrets detected."
WORKFLOW_EOF
echo "✅ GitHub Actions 配置已创建"

# 完成
echo ""
echo "🎉 三层防火墙配置完成！"
echo ""
echo "📋 配置摘要："
echo "  ✅ 第一层：Pre-commit Hook（commit 前检查）"
echo "  ✅ 第二层：Pre-push Hook（push 前检查）"
echo "  ✅ 第三层：GitHub Actions（云端检查）"
echo ""
echo "📦 已创建的文件："
echo "  - .pre-commit-config.yaml"
echo "  - .secrets.baseline"
echo "  - .github/workflows/security-check.yml"
echo ""
echo "🚀 下一步："
echo "  1. 提交配置文件："
echo "     git add .pre-commit-config.yaml .secrets.baseline .github/"
echo "     git commit -m \"feat: add three-layer security firewall\""
echo "     git push"
echo ""
echo "  2. 测试防火墙："
echo "     echo 'API_KEY=\"sk-test-123456\"' > test.py"
echo "     git add test.py"
echo "     git commit -m \"test\"  # 应该被拦截"
echo ""
echo "✨ 现在你的项目受到三层防火墙保护！"
