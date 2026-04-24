//! 列操作 (Column Operations)
//! 
//! 负责执行所有与 DataFrame 结构（列级别）相关的变更。
//! 包含：删除列、拆分列、合并列、移除空列、重命名列等。

use polars::prelude::*;
use serde_json::Value;
use crate::cleaner::models::CleaningStats;

/// 删除指定的列
/// 
/// 根据配置 `rules.columns.drop.columns` 中的列名列表，
/// 在数据表中将对应的列删除，并更新已删除列数量的统计信息。
pub fn drop_columns(mut df: DataFrame, rules: &Value, stats: &mut CleaningStats) -> Result<DataFrame, String> {
    if rules["columns"]["drop"]["enabled"].as_bool().unwrap_or(false) {
        if let Some(cols_to_drop) = rules["columns"]["drop"]["columns"].as_array() {
            let drop_list: Vec<&str> = cols_to_drop
                .iter()
                .filter_map(|v| v.as_str())
                .filter(|&c| df.get_column_names().iter().any(|col| col.as_str() == c))
                .collect();
            if !drop_list.is_empty() {
                df = df.drop_many(drop_list.iter().copied());
                stats.dropped_columns += drop_list.len();
            }
        }
    }
    Ok(df)
}

/// 拆分列
/// 
/// 将指定列的字符串内容按指定分隔符（如逗号、空格等）拆分成多个新列，
/// 可选择是否保留原始列。
pub fn split_columns(mut df: DataFrame, rules: &Value, stats: &mut CleaningStats) -> Result<DataFrame, String> {
    if rules["columns"]["split"]["enabled"].as_bool().unwrap_or(false) {
        let from = rules["columns"]["split"]["column"].as_str().unwrap_or("").trim();
        let sep = rules["columns"]["split"]["separator"].as_str().unwrap_or("");
        let keep_original = rules["columns"]["split"]["keepOriginal"].as_bool().unwrap_or(true);

        let into: Vec<String> = rules["columns"]["split"]["into"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        if !from.is_empty() && !into.is_empty() && df.get_column_names().iter().any(|c| c.as_str() == from) {
            let re_ws = regex::Regex::new(r"\s+").unwrap();
            let height = df.height();
            let mut new_cols_added = 0usize;

            let src_col = df.column(from).map_err(|e| format!("列拆分失败: {}", e))?;
            let src = src_col.cast(&polars::datatypes::DataType::String).unwrap_or_else(|_| src_col.clone());
            let src_ca = src.str().map_err(|e| format!("列拆分失败: {}", e))?;

            for (idx, name) in into.iter().enumerate() {
                if df.get_column_names().iter().any(|c| c.as_str() == name) {
                    continue;
                }
                let mut out: Vec<String> = Vec::with_capacity(height);
                for opt in src_ca.into_iter() {
                    let raw = opt.unwrap_or("");
                    let parts: Vec<&str> = if sep.trim().is_empty() {
                        let t = raw.trim();
                        if t.is_empty() { Vec::new() } else { re_ws.split(t).collect() }
                    } else {
                        raw.split(sep).collect()
                    };
                    out.push(parts.get(idx).map(|s| s.to_string()).unwrap_or_default());
                }
                let s = Series::new(name.clone().into(), out);
                df.with_column(s.into_column()).map_err(|e| format!("列拆分失败: {}", e))?;
                new_cols_added += 1;
            }

            stats.split_columns_added = new_cols_added;
            if !keep_original {
                df = df.drop(from).map_err(|e| format!("列拆分失败: {}", e))?;
            }
        }
    }
    Ok(df)
}

/// 合并列
/// 
/// 将多个指定的源列内容按特定的连接符拼接到一起，生成一列新数据。
/// 合并时会自动忽略空白和 null 单元格。可选择是否在合并后删除源列。
pub fn merge_columns(mut df: DataFrame, rules: &Value, stats: &mut CleaningStats) -> Result<DataFrame, String> {
    if rules["columns"]["merge"]["enabled"].as_bool().unwrap_or(false) {
        let into = rules["columns"]["merge"]["into"].as_str().unwrap_or("").trim().to_string();
        let sep = rules["columns"]["merge"]["separator"].as_str().unwrap_or("");
        let drop_sources = rules["columns"]["merge"]["dropSources"].as_bool().unwrap_or(false);

        let cols: Vec<String> = rules["columns"]["merge"]["columns"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|v| v.as_str())
            .filter(|c| df.get_column_names().iter().any(|col| col.as_str() == *c))
            .map(|s| s.to_string())
            .collect();

        if !into.is_empty() && !cols.is_empty() {
            let height = df.height();
            let mut merged: Vec<String> = Vec::with_capacity(height);
            let mut merged_count = 0usize;

            let mut col_arrays: Vec<StringChunked> = Vec::new();
            for c in &cols {
                let col = df.column(c).map_err(|e| format!("列合并失败: {}", e))?;
                let s = col.cast(&polars::datatypes::DataType::String).unwrap_or_else(|_| col.clone());
                col_arrays.push(s.str().map_err(|e| format!("列合并失败: {}", e))?.clone());
            }

            for row_idx in 0..height {
                let mut vals: Vec<String> = Vec::new();
                for ca in &col_arrays {
                    let v = ca.get(row_idx).unwrap_or("");
                    if !v.trim().is_empty() {
                        vals.push(v.to_string());
                    }
                }
                if vals.is_empty() {
                    merged.push(String::new());
                } else {
                    merged.push(vals.join(sep));
                    merged_count += 1;
                }
            }

            let s = Series::new(into.clone().into(), merged);
            if df.get_column_names().iter().any(|c| c.as_str() == into) {
                df.replace(&into, s).map_err(|e| format!("列合并失败: {}", e))?;
            } else {
                df.with_column(s.into_column()).map_err(|e| format!("列合并失败: {}", e))?;
            }

            stats.merged_columns_added = if merged_count > 0 { 1 } else { 0 };

            if drop_sources {
                let mut to_drop: Vec<String> = Vec::new();
                for c in &cols {
                    if c != &into {
                        to_drop.push(c.clone());
                    }
                }
                if !to_drop.is_empty() {
                    let drop_refs: Vec<&str> = to_drop.iter().map(|s| s.as_str()).collect();
                    df = df.drop_many(drop_refs.iter().copied());
                    stats.dropped_columns += to_drop.len();
                }
            }
        }
    }
    Ok(df)
}

/// 移除空列
/// 
/// 扫描整个 DataFrame，如果某列的内容全部为空值（或含有空值，依据 condition 而定），
/// 则将该列完全移除。支持针对字符串和其他数据类型的差异化判断。
pub fn remove_empty_cols(mut df: DataFrame, rules: &Value, stats: &mut CleaningStats) -> Result<DataFrame, String> {
    if rules["columns"]["removeEmptyCols"]["enabled"].as_bool().unwrap_or(false) {
        let cond = rules["columns"]["removeEmptyCols"]["condition"].as_str().unwrap_or("all");
        let mut cols_to_drop = Vec::new();
        for col_name in df.get_column_names() {
            if let Ok(series) = df.column(col_name) {
                let is_empty = if matches!(series.dtype(), DataType::String) {
                    if let Ok(ca) = series.str() {
                        let empty_count = ca.into_iter().filter(|opt_val| {
                            match opt_val {
                                Some(s) => s.trim().is_empty(),
                                None => true,
                            }
                        }).count();
                        if cond == "all" { empty_count == series.len() } else { empty_count > 0 }
                    } else { false }
                } else {
                    let null_count = series.null_count();
                    if cond == "all" { null_count == series.len() } else { null_count > 0 }
                };
                
                if is_empty {
                    cols_to_drop.push(col_name.clone());
                }
            }
        }
        if !cols_to_drop.is_empty() {
            let drop_str: Vec<&str> = cols_to_drop.iter().map(|s| s.as_str()).collect();
            df = df.drop_many(drop_str.iter().copied());
            stats.removed_empty_cols = cols_to_drop.len();
        }
    }
    Ok(df)
}

/// 重命名列
/// 
/// 依据配置中定义的映射关系 `mappings`（旧名字 -> 新名字），对数据列进行重命名。
/// 该操作通常在流水线的最后执行，以确保其他规则能准确匹配到原列名。
pub fn rename_columns(mut df: DataFrame, rules: &Value, stats: &mut CleaningStats) -> Result<DataFrame, String> {
    if rules["columns"]["rename"]["enabled"].as_bool().unwrap_or(false) {
        if let Some(mappings) = rules["columns"]["rename"]["mappings"].as_array() {
            let mut old_names = Vec::new();
            let mut new_names = Vec::new();
            for m in mappings {
                let from = m["from"].as_str().unwrap_or("").trim();
                let to = m["to"].as_str().unwrap_or("").trim();
                if !from.is_empty() && !to.is_empty() && df.get_column_names().iter().any(|c| c.as_str() == from) {
                    old_names.push(from);
                    new_names.push(to);
                }
            }
            if !old_names.is_empty() {
                for i in 0..old_names.len() {
                    df.rename(old_names[i], new_names[i].into()).map_err(|e| format!("重命名失败: {}", e))?;
                }
                stats.renamed_columns = old_names.len();
            }
        }
    }
    Ok(df)
}
