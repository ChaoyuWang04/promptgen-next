# node-canvas 渲染问题诊断报告

## 问题总结

最终生成的图片**没有白色背景**和**没有文字覆盖层**，仅显示左右两张图片并排。

## 根本原因

经过详细调试和测试，确认问题根源是：**node-canvas 库在当前系统上完全损坏**。

### 关键证据

1. **measureText() 返回错误值**：
   - 文本 `"I've tried 465 times but"` 在 110px 字体下
   - 预期宽度：~500-600px
   - 实际返回：**100.29px**（小了约 5 倍）

2. **独立测试验证**：
   ```bash
   node test-canvas.js
   # 输出: Measured width: 100.29296875px ❌ 错误！
   ```

3. **无论如何配置都失败**：
   - ✅ 字体文件存在且有效 (ARIAL.TTF)
   - ✅ 系统依赖已安装 (cairo, pango, fontconfig)
   - ✅ 字体注册成功（registerFont 无错误）
   - ✅ Canvas 操作正常执行（fillRect, fillText 无异常）
   - ❌ **但 measureText() 始终返回错误值**

4. **与字体无关**：
   - 测试了注册自定义字体（Font_Lang1）
   - 测试了使用系统 Arial 字体
   - 测试了不注册字体直接使用
   - **结果完全相同：100.29px**

## 我们做过的修复尝试

### 1. 代码层面修复 ✅ 已完成
- ✅ 增强日志输出（font-loader.ts, image-stitcher.ts, canvas-renderer.ts）
- ✅ 使用完整 CSS 字体规范（`normal normal normal 110px 'Arial'`）
- ✅ 映射到实际字体family名称（Arial, Noto Sans JP, etc.）
- ✅ 添加模块级字体预加载
- ✅ 设置 globalAlpha=1.0 确保不透明度

### 2. 环境层面修复 ❌ 未解决
- ❌ 重新编译 canvas：`npm rebuild canvas`
- ❌ 完全重装 canvas：`npm uninstall canvas && npm install canvas@2.11.2`
- ❌ 验证系统依赖：cairo, pango, pixman, fontconfig, freetype, harfbuzz 都已安装

## 影响范围

**当前所有图片拼接功能都无法正常工作**：
- Round 1（主图生成）：✅ 正常
- Round 2（修改图生成）：✅ 正常
- Round 3（拼接+文字覆盖）：❌ **失败**
  - 图片能拼接（左右并排）
  - 白色背景缺失
  - 文字完全不可见（因为 measureText 错误导致文字被渲染到错误位置）

## 解决方案

### 方案 1：修复 node-canvas 环境（推荐）

**可能的原因和解决方法**：

1. **macOS 版本问题**：
   ```bash
   # 检查 macOS 版本
   sw_vers

   # 如果是 macOS 15+ (Sequoia)，可能需要特殊处理
   # node-canvas 在新版 macOS 上可能有兼容性问题
   ```

2. **Cairo/Pango 版本冲突**：
   ```bash
   # 重新安装 Cairo 依赖
   brew reinstall cairo pango pixman libpng libjpeg giflib

   # 然后重新编译 canvas
   cd /Users/samwong/Desktop/1Project/promptgen-next
   npm rebuild canvas
   ```

3. **使用预编译二进制文件**：
   ```bash
   # 卸载当前版本
   npm uninstall canvas

   # 安装预编译版本（不从源码编译）
   npm install canvas@2.11.2
   ```

4. **尝试其他 node-canvas 版本**：
   ```bash
   # 尝试更早或更新的版本
   npm install canvas@3.0.0-rc2  # 最新 RC 版本
   # 或
   npm install canvas@2.10.2     # 稳定旧版本
   ```

### 方案 2：切换到其他 Canvas 实现

如果 node-canvas 无法修复，考虑：

1. **skia-canvas**（基于 Google Skia 引擎）：
   ```bash
   npm install skia-canvas
   ```
   - 更现代化的实现
   - 更好的字体支持
   - API 与 node-canvas 非常相似

2. **使用浏览器 Playwright/Puppeteer 渲染**：
   - 在无头浏览器中渲染 Canvas
   - 100% 准确的字体渲染
   - 但性能较慢

### 方案 3：临时 Workaround（不推荐）

如果暂时无法修复 Canvas，可以：
1. 使用 Python 脚本进行图片拼接（调用原 `stitch_generator.py`）
2. 通过 child_process 从 Node.js 调用 Python
3. 但这会引入额外依赖和复杂性

## 测试方法

修复后运行测试验证：

```bash
# 1. 独立测试（应该输出 width > 500px）
node test-canvas.js

# 2. 运行拼接 API 测试
curl -X POST http://localhost:3000/api/images/stitch \
  -H 'Content-Type: application/json' \
  -d '{
    "imageId":"wilma_sittinghold_entrancedoor_christmas_retro1950flat_0002",
    "version":"v2",
    "languageIds":[1]
  }'

# 3. 检查生成的图片
open public/images/wilma_sittinghold_entrancedoor_christmas_retro1950flat_0002/v2/final_en.png

# 4. 验证日志中文本宽度
tail -50 dev-server.log | grep "Text render complete"
# 应该看到：Text render complete, total width: ~500px（而不是 100px）
```

## 预期结果

修复后应该看到：
- ✅ 白色背景
- ✅ 两行游戏文字（如 "I've tried <红色>465</红色> times but"）
- ✅ 红色高亮数字
- ✅ 左右图片正确并排摆放
- ✅ 控制台日志显示正确的文本宽度（~500-600px）

## 相关文件

- 测试脚本：`test-canvas.js`, `test-canvas-no-register.js`
- 测试输出：`test-canvas-output.png`, `test-canvas-no-register.png`
- 修改后的代码：
  - `src/lib/stitcher/font-loader.ts`
  - `src/lib/stitcher/canvas-renderer.ts`
  - `src/lib/stitcher/image-stitcher.ts`

## 下一步

1. **尝试方案 1 的修复方法**（重装 Cairo 依赖 + 重编译 canvas）
2. 如果方案 1 失败，**尝试切换到 skia-canvas**（方案 2）
3. 运行测试验证修复效果
4. 生成实际图片确认文字和背景正确显示

---

**创建时间**：2025-11-25
**诊断人员**：Claude Code
**系统环境**：macOS (Darwin 25.1.0), Node.js, canvas@2.11.2
