use std::process::{Command, Stdio};
use std::io::Write;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 核心功能：调用 Python 子进程进行数据清洗
/// file_path: 需要清洗的文件绝对路径
/// rules_json: 前端配置好并通过 JSON.stringify() 序列化后的清洗规则字符串
#[tauri::command]
async fn run_python_cleaner(file_path: String, rules_json: String) -> Result<String, String> {
    // 假设系统环境中已经安装了 python3（如果是打包给用户，可能需要捆绑 python 或者指定内置的 python 解释器路径）
    // 此外，为了解决路径问题，在开发环境下，假设 scripts 位于当前运行目录
    let mut child = Command::new("python3")
        .arg("../scripts/cleaner.py") // Tauri 运行的 CWD 在 src-tauri 内，往上一层
        .arg(&file_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("无法启动 Python 进程: {}", e))?;

    // 1. 通过标准输入 (stdin) 将 JSON 规则传递给 Python 脚本
    // 这是一种最佳实践：避免命令行长度超限，且无需处理繁琐的引号转义
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(rules_json.as_bytes())
            .map_err(|e| format!("无法向 Python 写入规则配置: {}", e))?;
    }

    // 2. 等待 Python 执行完成并捕获所有的标准输出 (stdout) 与标准错误 (stderr)
    let output = child.wait_with_output()
        .map_err(|e| format!("读取 Python 输出失败: {}", e))?;

    // 3. 判断 Python 进程是否成功退出 (exit code == 0)
    if output.status.success() {
        // 如果成功，返回 Python 打印出来的 JSON 字符串
        let result_json = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(result_json)
    } else {
        // 如果失败，读取 stderr 里的错误信息并返回给前端展示
        let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Python 脚本执行报错:\n{}", error_msg))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, run_python_cleaner])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
