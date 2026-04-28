# 🧹 Excel 脏数据清洗工具

一个基于 **Tauri (Rust) + React + Tailwind CSS** 构建的现代化、高性能、跨平台（Windows / macOS）的免安装绿色版数据清洗应用。专为处理带有各种脏数据的 Excel/CSV 表格而设计。

借助底层强大的 `Polars` 引擎，它能够在极短时间内清洗百万级行数据，并且通过前端直观的 JSON 配置面板，实现了全自动的“提取、清洗、规范化、输出”流水线。

---

## ✨ 核心特性

- **多格式支持**：支持批量导入和导出 `.csv`, `.xlsx`, `.xls` 文件。
- **极致性能**：核心清洗逻辑由 Rust 编写，结合 Polars 的惰性求值（Lazy Evaluation）和向量化计算引擎，性能碾压纯前端或 Python 脚本方案。
- **可视化规则配置**：无需写代码即可配置复杂的清洗流水线（包含重命名、删除、合并、拆分、填充缺失值、去重等）。
- **智能格式化探测**：
  - 📞 **手机号嗅探**：智能剥离国家码、特殊字符，支持输出为纯数字或标准 `E.164` 格式。
  - 📅 **日期格式化**：强大的中文和非标准分隔符容错解析，支持转化为 `YYYY-MM-DD`, `ISO` 乃至自定义的中英文混合格式。
  - 💰 **金额清洗**：自动剥离文本，提取纯数字并支持千分位与自定义前缀（如 `¥`, `$`）。
  - 📧 **文本与邮箱**：自动去空格、强制小写等。
- **跨平台绿色版**：一键编译出 Windows / macOS 免安装的独立可执行文件，解压即用。

---

## 🚀 快速上手 (开发指南)

### 环境要求
1. **Node.js** (推荐 v20 LTS 或以上)
2. **Rust** 编译器 (通过 `rustup` 安装)
3. 相关的 C++ / Xcode 编译工具链（Tauri 依赖，具体参考 [Tauri 官方环境配置](https://v2.tauri.app/start/prerequisites/)）

### 本地运行调试
1. 克隆本仓库到本地并进入目录：
   ```bash
   git clone https://github.com/maiyoujian/cleaning_app.git
   cd cleaning_app
   ```
2. 安装前端依赖：
   ```bash
   npm install
   ```
3. 启动开发服务器（包含热更新的前端 + Rust 后端）：
   ```bash
   npm run tauri dev
   ```

---

## 📦 打包与编译

### 方案 A：本地手动打包
如果你已经在本地配置好了 Rust 环境，可以直接在终端执行以下命令：

```bash
# 🍎 打包 macOS 独立应用 (生成 .app)
npm run build:mac

# 🪟 打包 Windows 独立应用 (生成 .exe)
# 注意：在 Mac 上交叉编译 Windows 需要配置 mingw-w64 等工具链，建议在 Windows 实体机上运行此命令
npm run build:win
```
编译产物会输出在 `src-tauri/target/release/bundle/` 目录下。

### 方案 B：使用 GitHub Actions 云端自动打包 (推荐)
本项目已经配置了完善的 GitHub Actions 工作流（详见 `.github/workflows/release.yml`）。它利用矩阵构建技术，自动打包出针对不同系统和架构的极致压缩绿色版。

1. 提交所有代码更改并推送到 GitHub 仓库。
2. 为你的代码打上带有 `v` 前缀的 Tag（例如 `v1.0.0`）：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. 前往 GitHub 仓库的 **Actions** 页面，等待约 10-15 分钟编译完成。
4. 前往 **Releases** 页面，在最新发布的 `v1.0.0` 版本底部的 **Assets** 列表中，即可下载到三种格式的免安装 zip 包：
   - `cleaning_app_windows_portable.zip` (Windows 纯净版)
   - `cleaning_app_macos-arm64_portable.zip` (Apple Silicon M1/M2/M3 版)
   - `cleaning_app_macos-x64_portable.zip` (Mac Intel 版)

---

## 📖 应用使用说明

### 1. 导入数据
- 打开软件后，点击主界面的虚线框区域，或者直接将 Excel / CSV 文件**拖拽**到窗口中。
- 支持一次性导入多个文件，它们会出现在左侧的文件列表中。

### 2. 配置清洗规则
在主界面的右侧面板，你可以像搭积木一样自由开启和配置各种清洗规则：
- **缺失值处理**：可选择将空单元格统一填充为某个默认值，或者使用同一列的前一个/后一个有效值进行“前向/后向填充”（非常适合时间序列数据）。
- **列操作**：如果你对某些列名不满意，可以在这里配置“重命名映射”；或者通过“列拆分”和“列合并”将多个单元格内容重新组合。
- **去重处理**：选择“整行去重”或是基于某几个“唯一键列”进行去重，并决定是保留第一条还是最后一条。
- **特定格式清洗**：
  - 勾选你需要清洗的特定列（例如勾选“入职时间”作为日期列）。
  - 设置你的输出偏好（例如日期输出为 `YYYY/MM/DD HH:mm:ss`，手机号输出为 `仅数字`）。

### 3. 预览结果
- 规则配置完毕后，无需等待全量处理，主界面的表格会**实时**抽取前 100 行数据，展示经过 Rust 引擎极速清洗后的最终样貌。
- 预览界面会真实还原所有的空白清理、大小写转换和格式化结果。

### 4. 导出纯净数据
- 确认预览无误后，点击右上角的 **“导出结果”**。
- 你可以选择导出为全量的 `.csv` 或 `.xlsx` 文件。
- 导出的文件名会自动拼装当前的精确时间戳（如 `data_cleaned_20240428_153022.csv`），防止多次导出时发生同名文件覆盖。

---

## 🛠️ 技术栈与项目结构

### 技术栈
- **前端**：React 19, TypeScript, Vite, Tailwind CSS v4, shadcn-ui, Lucide Icons
- **后端**：Rust, Tauri v2
- **核心数据引擎**：[Polars](https://pola.rs/) (高性能 DataFrame 处理)
- **其他 Rust 依赖**：chrono (时间处理), regex (正则嗅探), calamine (Excel 读取), rust_xlsxwriter (Excel 写入)

### 核心目录说明
```text
.
├── src/                        # 前端 React 源码
│   ├── components/             # UI 组件 (侧边栏、上传区、规则配置表单等)
│   ├── lib/                    # 前端逻辑与类型定义 (包含清洗规则 JSON 结构)
│   └── App.tsx                 # 主入口
├── src-tauri/                  # Tauri Rust 后端源码
│   ├── src/
│   │   ├── cleaner/            # ⚡ 核心清洗引擎目录
│   │   │   ├── operations/     # 具体的清洗规则实现 (拆分成 columns, dedup, format, missing)
│   │   │   ├── utils/          # 纯工具库 (如智能日期解析)
│   │   │   ├── processor.rs    # 流水线总控 (负责接收规则 JSON 并调用 operations)
│   │   │   └── parser.rs       # IO 编解码器 (Excel/CSV 读取与导出)
│   │   └── main.rs             # Tauri IPC 命令注册与启动
│   ├── Cargo.toml              # Rust 依赖配置 (已开启 LTO 极限体积压缩)
│   └── tauri.conf.json         # Tauri 编译与窗口配置
└── .github/workflows/          # CI/CD 自动化流水线配置 (包含跨平台免安装打包)
```