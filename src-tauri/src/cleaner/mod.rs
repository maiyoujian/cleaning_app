pub mod models;
pub mod parser;
pub mod processor;

use models::CleaningStats;
use parser::{export_dataframe, read_to_dataframe};
use processor::apply_rules;
use serde_json::{json, Value};

// 核心调度层，负责组合“读取 -> 处理 -> 导出/预览”的完整生命周期。
/// 运行清洗并返回预览结果（前 100 行）
pub fn process_and_preview(file_path: &str, rules_json: &str) -> Result<String, String> {
    let rules: Value = serde_json::from_str(rules_json).map_err(|e| e.to_string())?;

    // 1. 读取数据
    let mut df = read_to_dataframe(file_path)?;
    let mut stats = CleaningStats::new(df.height(), df.width());

    // 2. 处理数据
    df = apply_rules(df, &rules, &mut stats)?;

    // 3. 提取前 100 行作为预览
    let head_df = df.head(Some(100));

    // 将 DataFrame 转换为前端需要的 JSON 格式
    let mut columns = Vec::new();
    let mut rows = Vec::new();

    for col in head_df.get_columns() {
        columns.push(col.name().to_string());
    }

    for i in 0..head_df.height() {
        let mut row_map = serde_json::Map::new();
        for col in head_df.get_columns() {
            let val = col.str().unwrap().get(i).unwrap_or("");
            row_map.insert(col.name().to_string(), json!(val));
        }
        rows.push(json!(row_map));
    }

    let result = json!({
        "stats": stats,
        "data": {
            "columns": columns,
            "rows": rows
        }
    });

    Ok(result.to_string())
}

/// 运行清洗并将结果全量导出到指定路径
pub fn process_and_export(
    file_path: &str,
    rules_json: &str,
    export_path: &str,
) -> Result<String, String> {
    let rules: Value = serde_json::from_str(rules_json).map_err(|e| e.to_string())?;

    // 1. 读取数据
    let mut df = read_to_dataframe(file_path)?;
    let mut stats = CleaningStats::new(df.height(), df.width());

    // 2. 处理数据
    df = apply_rules(df, &rules, &mut stats)?;

    // 3. 导出全量数据
    export_dataframe(df, export_path)?;

    Ok("导出成功".to_string())
}
