//! 缺失值处理操作 (Missing Value Operations)
//! 
//! 负责检测和处理数据中的缺失值（Null、空字符串等）。
//! 包含：默认值填充、前向/后向填充、以及移除包含缺失值的整行等。

use polars::prelude::*;
use serde_json::Value;
use crate::cleaner::models::CleaningStats;

/// 填充默认值
/// 
/// 针对缺失值所在列，依据配置表 `values` 中给定的默认字符串进行替换。
/// 如果关闭了 `onlyWhenEmpty` 选项，则会将该列的所有数据强行覆盖为指定的默认值。
pub fn fill_default(mut df_res: DataFrame, rules: &Value) -> Result<DataFrame, String> {
    if rules["missing"]["fillDefault"]["enabled"].as_bool().unwrap_or(false) {
        let only_when_empty = rules["missing"]["fillDefault"]["onlyWhenEmpty"].as_bool().unwrap_or(true);
        if let Some(cols) = rules["missing"]["fillDefault"]["columns"].as_array() {
            let values = rules["missing"]["fillDefault"]["values"].as_object().cloned().unwrap_or_default();
            for v in cols {
                if let Some(c) = v.as_str() {
                    let def_val = values.get(c).and_then(|v| v.as_str()).unwrap_or("");
                    if let Ok(series) = df_res.column(c) {
                        if let Ok(ca) = series.str() {
                            let new_ca: StringChunked = ca
                                .into_iter()
                                .map(|opt_val| match opt_val {
                                    Some(raw) => {
                                        if !only_when_empty {
                                            Some(def_val.to_string())
                                        } else if raw.trim().is_empty() {
                                            Some(def_val.to_string())
                                        } else {
                                            Some(raw.to_string())
                                        }
                                    }
                                    None => {
                                        if !only_when_empty {
                                            Some(def_val.to_string())
                                        } else {
                                            Some(def_val.to_string())
                                        }
                                    }
                                })
                                .collect();
                            let _ = df_res.replace(c, new_ca.into_series());
                        }
                    }
                }
            }
        }
    }
    Ok(df_res)
}

/// 前向 / 后向填充
/// 
/// 使用同一个列中的相邻非空值去自动补充连续的缺失值（如分组后的时间序列数据）。
/// - 支持配置最大连续填充条数 `limit`
/// - 支持填充方向 `directions` (如 "forward" 沿数据向下填充, "backward" 沿数据向上填充)
pub fn fill_forward_backward(mut df_res: DataFrame, rules: &Value, stats: &mut CleaningStats) -> Result<DataFrame, String> {
    if rules["missing"]["fillForwardBackward"]["enabled"].as_bool().unwrap_or(false) {
        let trim = rules["missing"]["trimWhitespaceForEmptyCheck"].as_bool().unwrap_or(true);
        let limit = rules["missing"]["fillForwardBackward"]["limit"].as_u64().map(|v| v as usize);

        let directions = rules["missing"]["fillForwardBackward"]["directions"]
            .as_object()
            .cloned()
            .unwrap_or_default();

        if let Some(cols) = rules["missing"]["fillForwardBackward"]["columns"].as_array() {
            for v in cols {
                if let Some(c) = v.as_str() {
                    if let Ok(series) = df_res.column(c) {
                        let string_s = series.cast(&polars::datatypes::DataType::String).unwrap_or_else(|_| series.clone());
                        if let Ok(ca) = string_s.str() {
                            let mut values: Vec<Option<String>> = ca.into_iter().map(|opt| opt.map(|s| s.to_string())).collect();

                            let dir = directions.get(c).and_then(|v| v.as_str()).unwrap_or("forward");
                            let mut filled_count: usize = 0;

                            let fill_forward = |vals: &mut [Option<String>], filled: &mut usize| {
                                let mut last_non_empty: Option<String> = None;
                                let mut since = 0usize;
                                for cell in vals.iter_mut() {
                                    let empty = match cell.as_deref() {
                                        None => true,
                                        Some(s) => { let t = if trim { s.trim() } else { s }; t.is_empty() }
                                    };

                                    if !empty {
                                        last_non_empty = cell.clone();
                                        since = 0;
                                        continue;
                                    }

                                    let Some(last) = &last_non_empty else { continue };
                                    if let Some(lim) = limit { if since >= lim { continue; } }
                                    *cell = Some(last.clone());
                                    since += 1;
                                    *filled += 1;
                                }
                            };

                            let fill_backward = |vals: &mut [Option<String>], filled: &mut usize| {
                                let mut next_non_empty: Option<String> = None;
                                let mut since = 0usize;
                                for i in (0..vals.len()).rev() {
                                    let empty = match vals[i].as_deref() {
                                        None => true,
                                        Some(s) => { let t = if trim { s.trim() } else { s }; t.is_empty() }
                                    };

                                    if !empty {
                                        next_non_empty = vals[i].clone();
                                        since = 0;
                                        continue;
                                    }

                                    let Some(next) = &next_non_empty else { continue };
                                    if let Some(lim) = limit { if since >= lim { continue; } }
                                    vals[i] = Some(next.clone());
                                    since += 1;
                                    *filled += 1;
                                }
                            };

                            if dir == "forward" {
                                fill_forward(&mut values, &mut filled_count);
                            } else if dir == "backward" {
                                fill_backward(&mut values, &mut filled_count);
                            } else if dir == "both" {
                                fill_forward(&mut values, &mut filled_count);
                                fill_backward(&mut values, &mut filled_count);
                            }

                            stats.filled_forward_backward_cells += filled_count;
                            let new_ca: StringChunked = values.into_iter().collect();
                            let _ = df_res.replace(c, new_ca.into_series());
                        }
                    }
                }
            }
        }
    }
    Ok(df_res)
}

/// 移除空行
/// 
/// 根据配置（是全部列为空，还是某几列为空），对数据中的废弃空行进行删除：
/// - `cond == "all"`：仅当目标列范围全部无有效数据时，移除该行。
/// - `cond == "any"`：只要目标列范围内出现了至少一个空值，就移除整行。
pub fn remove_empty_rows(mut df_res: DataFrame, rules: &Value) -> Result<DataFrame, String> {
    let remove_empty_rows_enabled = rules.get("missing")
        .and_then(|m| m.get("removeEmptyRows"))
        .and_then(|r| r.get("enabled"))
        .and_then(|e| e.as_bool())
        .unwrap_or(false);

    if remove_empty_rows_enabled {
        let cond = rules["missing"]["removeEmptyRows"]["condition"].as_str().unwrap_or("all");
        let mode = rules["missing"]["removeEmptyRows"]["columnsMode"].as_str().unwrap_or("all");
        let target_cols: Vec<String> = if mode == "custom" {
            rules["missing"]["removeEmptyRows"]["columns"].as_array().unwrap_or(&vec![]).iter()
                .filter_map(|v| v.as_str()).map(|s| s.to_string())
                .filter(|c| df_res.get_column_names().iter().any(|col| col.as_str() == c)).collect()
        } else {
            df_res.get_column_names().iter().map(|s| s.to_string()).collect()
        };

        if !target_cols.is_empty() {
            let mut exprs = Vec::new();
            for c in target_cols {
                if let Ok(series) = df_res.column(&c) {
                    let mut e = col(&c).is_not_null();
                    if matches!(series.dtype(), DataType::String) {
                        e = e.and(col(&c).str().strip_chars(lit(NULL)).neq(lit("")));
                    }
                    exprs.push(e);
                }
            }
            if !exprs.is_empty() {
                let mut lf_tmp = df_res.clone().lazy();
                let combined_expr = if cond == "all" {
                    polars::lazy::dsl::any_horizontal(exprs).unwrap()
                } else {
                    polars::lazy::dsl::all_horizontal(exprs).unwrap()
                };
                lf_tmp = lf_tmp.filter(combined_expr);
                df_res = lf_tmp.collect().unwrap_or(df_res);
            }
        }
    }
    Ok(df_res)
}