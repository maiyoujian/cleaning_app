//! 数据去重操作 (Deduplication Operations)
//! 
//! 负责处理重复行数据。
//! 包含：全行完全匹配去重、以及基于特定主键列的部分去重。

use polars::prelude::*;
use serde_json::Value;

/// 数据去重操作
/// 
/// 根据配置对 LazyFrame 进行去重。
/// - 支持全行完全匹配去重 (`mode: "wholeRow"`)。
/// - 支持基于特定主键列的部分匹配去重 (`mode: "selected"`)。
/// - 支持保留策略设置（如保留第一项 `keep: "first"`、最后一项 `last`，或全不保留 `none`）。
pub fn dedup_rows(mut lf: LazyFrame, rules: &Value) -> Result<LazyFrame, String> {
    if rules["dedup"]["enabled"].as_bool().unwrap_or(false) {
        let mode = rules["dedup"]["mode"].as_str().unwrap_or("wholeRow");
        let keep = rules["dedup"]["keep"].as_str().unwrap_or("first");
        let keep_strategy = match keep {
            "first" => UniqueKeepStrategy::First,
            "last" => UniqueKeepStrategy::Last,
            "none" => UniqueKeepStrategy::None,
            _ => UniqueKeepStrategy::Any,
        };

        if mode == "wholeRow" {
            lf = lf.unique_stable(None, keep_strategy);
        } else {
            let cols: Vec<PlSmallStr> = rules["dedup"]["columns"]
                .as_array()
                .unwrap_or(&Vec::new())
                .iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.into())
                .collect();
            if !cols.is_empty() {
                lf = lf.unique_stable(Some(cols), keep_strategy);
            }
        }
    }
    Ok(lf)
}