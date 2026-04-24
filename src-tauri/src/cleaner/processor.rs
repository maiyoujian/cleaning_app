use polars::prelude::*;
use serde_json::Value;
use super::models::CleaningStats;
use chrono::{Datelike, Timelike};

// 解析中文等不规范日期并返回年月日时分秒的辅助函数
fn try_parse_date(input: &str) -> Option<chrono::NaiveDateTime> {
    let v = input.trim();
    if v.is_empty() {
        return None;
    }

    // 先尝试通用的中文清理
    let mut normalized = v
        .replace("年", "-")
        .replace("月", "-")
        .replace("日", " ")
        .replace("时", ":")
        .replace("分", ":")
        .replace("秒", "")
        .replace("：", ":");
    
    // 压缩空格和多余的符号
    let re_spaces = regex::Regex::new(r"\s+").unwrap();
    let re_colon_spaces = regex::Regex::new(r"\s*:\s*").unwrap();
    let re_dash_spaces = regex::Regex::new(r"\s*-\s*").unwrap();
    
    normalized = re_colon_spaces.replace_all(&normalized, ":").to_string();
    normalized = re_dash_spaces.replace_all(&normalized, "-").to_string();
    normalized = re_spaces.replace_all(&normalized, " ").to_string();
    normalized = normalized.trim().to_string();

    if normalized.ends_with(':') {
        normalized.pop();
    }

    // 尝试匹配各种格式
    // 1. YYYY-MM-DD HH:mm:ss 或 YYYY/MM/DD HH:mm:ss
    let re_ymdhms = regex::Regex::new(r"^(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.\d+)?\s*(?:Z|[+-]\d{2}:?\d{2})?$").unwrap();
    if let Some(caps) = re_ymdhms.captures(&normalized) {
        let year = caps[1].parse::<i32>().unwrap_or(0);
        let month = caps[2].parse::<u32>().unwrap_or(1);
        let day = caps[3].parse::<u32>().unwrap_or(1);
        let hour = caps[4].parse::<u32>().unwrap_or(0);
        let min = caps[5].parse::<u32>().unwrap_or(0);
        let sec = caps.get(6).map_or(0, |m| m.as_str().parse::<u32>().unwrap_or(0));
        
        if let Some(date) = chrono::NaiveDate::from_ymd_opt(year, month, day) {
            if let Some(dt) = date.and_hms_opt(hour, min, sec) {
                return Some(dt);
            }
        }
    }

    // 2. YYYY-MM-DD
    let re_ymd = regex::Regex::new(r"^(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})$").unwrap();
    if let Some(caps) = re_ymd.captures(&normalized) {
        let year = caps[1].parse::<i32>().unwrap_or(0);
        let month = caps[2].parse::<u32>().unwrap_or(1);
        let day = caps[3].parse::<u32>().unwrap_or(1);
        if let Some(date) = chrono::NaiveDate::from_ymd_opt(year, month, day) {
            return date.and_hms_opt(0, 0, 0);
        }
    }

    // 3. YYYYMMDD
    let re_ymd_compact = regex::Regex::new(r"^(\d{4})(\d{2})(\d{2})$").unwrap();
    if let Some(caps) = re_ymd_compact.captures(&normalized) {
        let year = caps[1].parse::<i32>().unwrap_or(0);
        let month = caps[2].parse::<u32>().unwrap_or(1);
        let day = caps[3].parse::<u32>().unwrap_or(1);
        if let Some(date) = chrono::NaiveDate::from_ymd_opt(year, month, day) {
            return date.and_hms_opt(0, 0, 0);
        }
    }

    // 4. DD-MM-YYYY
    let re_dmy = regex::Regex::new(r"^(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})$").unwrap();
    if let Some(caps) = re_dmy.captures(&normalized) {
        let year = caps[3].parse::<i32>().unwrap_or(0);
        let month = caps[2].parse::<u32>().unwrap_or(1);
        let day = caps[1].parse::<u32>().unwrap_or(1);
        if let Some(date) = chrono::NaiveDate::from_ymd_opt(year, month, day) {
            return date.and_hms_opt(0, 0, 0);
        }
    }

    None
}

fn format_date(dt: &chrono::NaiveDateTime, fmt: &str) -> String {
    let year = dt.year();
    let month = dt.month();
    let day = dt.day();
    let hours = dt.hour();
    let minutes = dt.minute();
    let seconds = dt.second();

    match fmt {
        "ISO" => format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.000Z", year, month, day, hours, minutes, seconds),
        "YYYY/MM/DD" => format!("{:04}/{:02}/{:02}", year, month, day),
        "YYYY-MM-DD HH:mm" => format!("{:04}-{:02}-{:02} {:02}:{:02}", year, month, day, hours, minutes),
        "YYYY-MM-DD HH:mm:ss" => format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02}", year, month, day, hours, minutes, seconds),
        "YYYY年MM月DD日" => format!("{:04}年{:02}月{:02}日", year, month, day),
        "YYYY年MM月DD日 HH时mm分" => format!("{:04}年{:02}月{:02}日 {:02}时{:02}分", year, month, day, hours, minutes),
        "YYYY年MM月DD日 HH时mm分ss秒" => format!("{:04}年{:02}月{:02}日 {:02}时{:02}分{:02}秒", year, month, day, hours, minutes, seconds),
        _ => format!("{:04}-{:02}-{:02}", year, month, day), // 默认 YYYY-MM-DD
    }
}

// 业务逻辑层，包含所有具体的脏数据清洗规则实现。
/// 核心数据处理入口，将前端传入的 JSON 规则转化为 Polars 的链式操作或批处理
pub fn apply_rules(
    mut df: DataFrame,
    rules: &Value,
    stats: &mut CleaningStats,
) -> Result<DataFrame, String> {
    // ==========================================
    // 1. 列级别的基本操作 (重命名已移至末尾，删除)
    // ==========================================



    // 1.2 删除特定列 (Drop)
    if rules["columns"]["drop"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        if let Some(cols_to_drop) = rules["columns"]["drop"]["columns"].as_array() {
            let drop_list: Vec<&str> = cols_to_drop
                .iter()
                .filter_map(|v| v.as_str())
                .filter(|&c| df.get_column_names().iter().any(|col| col.as_str() == c))
                .collect();
            if !drop_list.is_empty() {
                df = df.drop_many(drop_list.iter().copied());
                stats.dropped_columns = drop_list.len();
            }
        }
    }

    if rules["columns"]["split"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        let from = rules["columns"]["split"]["column"].as_str().unwrap_or("").trim();
        let sep = rules["columns"]["split"]["separator"].as_str().unwrap_or("");
        let keep_original = rules["columns"]["split"]["keepOriginal"]
            .as_bool()
            .unwrap_or(true);

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
            let src = src_col
                .cast(&polars::datatypes::DataType::String)
                .unwrap_or_else(|_| src_col.clone());

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
                        if t.is_empty() {
                            Vec::new()
                        } else {
                            re_ws.split(t).collect()
                        }
                    } else {
                        raw.split(sep).collect()
                    };
                    out.push(parts.get(idx).map(|s| s.to_string()).unwrap_or_default());
                }
                let s = Series::new(name.clone().into(), out);
                df.with_column(s.into_column())
                    .map_err(|e| format!("列拆分失败: {}", e))?;
                new_cols_added += 1;
            }

            stats.split_columns_added = new_cols_added;
            if !keep_original {
                df = df.drop(from).map_err(|e| format!("列拆分失败: {}", e))?;
            }
        }
    }

    if rules["columns"]["merge"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        let into = rules["columns"]["merge"]["into"].as_str().unwrap_or("").trim().to_string();
        let sep = rules["columns"]["merge"]["separator"].as_str().unwrap_or("");
        let drop_sources = rules["columns"]["merge"]["dropSources"]
            .as_bool()
            .unwrap_or(false);

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
                let s = col
                    .cast(&polars::datatypes::DataType::String)
                    .unwrap_or_else(|_| col.clone());
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
                df.replace(&into, s)
                    .map_err(|e| format!("列合并失败: {}", e))?;
            } else {
                df.with_column(s.into_column())
                    .map_err(|e| format!("列合并失败: {}", e))?;
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

    // ==========================================
    // 2. 转换为 LazyFrame 以进行高效的向量化处理
    // LazyFrame 可以自动优化查询计划，极大提升处理千万级数据的速度
    // ==========================================
    let mut lf = df.lazy();
    let schema = lf.collect_schema().map_err(|e| e.to_string())?;

    // 2.1 文本格式化 (Text)
    if rules["format"]["text"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        let mode = rules["format"]["text"]["columnsMode"]
            .as_str()
            .unwrap_or("allText");
        let trim = rules["format"]["text"]["trim"].as_bool().unwrap_or(false);
        let collapse = rules["format"]["text"]["collapseSpaces"]
            .as_bool()
            .unwrap_or(false);
        let remove_all = rules["format"]["text"]["removeAllWhitespace"]
            .as_bool()
            .unwrap_or(false);

        let target_cols: Vec<String> = if mode == "selected" {
            rules["format"]["text"]["columns"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect()
        } else {
            schema.iter_names().map(|s| s.to_string()).collect()
        };

        let mut exprs = Vec::new();
        for c in target_cols {
            if schema.iter_names().any(|name| name.as_str() == c) {
                let mut e = col(&c);
                if remove_all {
                    e = e.str().replace_all(lit(r"\s+"), lit(""), false);
                } else if collapse {
                    e = e.str().replace_all(lit(r"\s+"), lit(" "), false);
                }
                if trim {
                    // Polars 的 strip_chars 如果传 NULL 则默认去除两端空白符
                    e = e.str().strip_chars(lit(NULL));
                }
                exprs.push(e.alias(&c));
            }
        }
        if !exprs.is_empty() {
            lf = lf.with_columns(exprs);
        }
    }

    // 2.2 邮箱规范化 (Email)
    if rules["format"]["email"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        let trim = rules["format"]["email"]["trim"].as_bool().unwrap_or(true);
        let lowercase = rules["format"]["email"]["lowercase"]
            .as_bool()
            .unwrap_or(true);

        if let Some(cols) = rules["format"]["email"]["columns"].as_array() {
            let mut exprs = Vec::new();
            for v in cols {
                if let Some(c) = v.as_str() {
                    if schema.iter_names().any(|name| name.as_str() == c) {
                        let mut e = col(c);
                        if trim {
                            e = e.str().strip_chars(lit(NULL));
                        }
                        if lowercase {
                            e = e.str().to_lowercase();
                        }
                        exprs.push(e.alias(c));
                    }
                }
            }
            if !exprs.is_empty() {
                lf = lf.with_columns(exprs);
            }
        }
    }

    // 2.3 去重 (Dedup)
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

    // ==========================================
    // 3. 执行 LazyFrame 计算并回退到 DataFrame 进行某些极其复杂的自定义逻辑
    // (例如特定正则的提取和动态格式化，Polars 表达式有时过于严格，使用 ChunkedArray 迭代更加灵活)
    // ==========================================
    let mut df_res = lf
        .collect()
        .map_err(|e| format!("Polars 引擎执行失败: {}", e))?;

    // 3.1 手机号清洗 (由于涉及到复杂的国家码嗅探和前缀剥离，直接对 ChunkedArray 进行操作)
    if rules["format"]["phone"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        let cc = rules["format"]["phone"]["countryCode"]
            .as_str()
            .unwrap_or("")
            .replace(|c: char| !c.is_ascii_digit(), "");
        let output_mode = rules["format"]["phone"]["output"]
            .as_str()
            .unwrap_or("digits");

        let re_generic =
            regex::Regex::new(r"^\s*(?:\+\s*\d+|\+\s*\(\s*\d+\s*\)|\(\s*\+?\d+\s*\))\s*").unwrap();
        let re_specific = if !cc.is_empty() {
            Some(regex::Regex::new(&format!(r"^\s*{}\s*", cc)).unwrap())
        } else {
            None
        };
        let re_plus = regex::Regex::new(r"^\s*\+?\s*").unwrap();
        let re_nondigit = regex::Regex::new(r"\D").unwrap();

        if let Some(cols) = rules["format"]["phone"]["columns"].as_array() {
            for v in cols {
                if let Some(c) = v.as_str() {
                    if let Ok(series) = df_res.column(c) {
                        if let Ok(ca) = series.str() {
                            let new_ca: StringChunked = ca
                                .into_iter()
                                .map(|opt_val| {
                                    if let Some(raw) = opt_val {
                                        let mut cleaned = raw.to_string();
                                        let mut prev = String::new();
                                        while cleaned != prev {
                                            prev = cleaned.clone();
                                            cleaned = re_generic.replace(&cleaned, "").to_string();
                                        }
                                        if let Some(re) = &re_specific {
                                            prev = String::new();
                                            while cleaned != prev {
                                                prev = cleaned.clone();
                                                cleaned = re.replace(&cleaned, "").to_string();
                                            }
                                        }
                                        cleaned = re_plus.replace(&cleaned, "").to_string();
                                        let digits =
                                            re_nondigit.replace_all(&cleaned, "").to_string();
                                        if digits.is_empty() {
                                            return None;
                                        }

                                        let res = if output_mode == "E164" {
                                            if !cc.is_empty() {
                                                format!("+{cc}{digits}")
                                            } else {
                                                format!("+{digits}")
                                            }
                                        } else {
                                            digits // 纯数字模式，直接返回，不拼接 cc
                                        };
                                        Some(res)
                                    } else {
                                        None
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

    // 3.1.5 日期格式化
    if rules["format"]["date"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        let target_fmt = rules["format"]["date"]["outputFormat"]
            .as_str()
            .unwrap_or("YYYY-MM-DD");
        let on_invalid = rules["format"]["date"]["onInvalid"]
            .as_str()
            .unwrap_or("keep");

        if let Some(cols) = rules["format"]["date"]["columns"].as_array() {
            for v in cols {
                if let Some(c) = v.as_str() {
                    if let Ok(series) = df_res.column(c) {
                        if let Ok(ca) = series.str() {
                            let new_ca: StringChunked = ca
                                .into_iter()
                                .map(|opt_val| {
                                    if let Some(raw) = opt_val {
                                        if let Some(dt) = try_parse_date(raw) {
                                            Some(format_date(&dt, target_fmt))
                                        } else {
                                            if on_invalid == "empty" && !raw.trim().is_empty() {
                                                Some("".to_string())
                                            } else {
                                                Some(raw.to_string())
                                            }
                                        }
                                    } else {
                                        None
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

    // 3.2 金额格式化
    if rules["format"]["currency"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        let sym = rules["format"]["currency"]["symbol"]
            .as_str()
            .unwrap_or("¥");
        let decimals = rules["format"]["currency"]["decimalPlaces"]
            .as_u64()
            .unwrap_or(2) as usize;
        let thousands = rules["format"]["currency"]["thousandsSeparator"]
            .as_bool()
            .unwrap_or(true);
        let re_extract = regex::Regex::new(r"[-+]?\d*\.?\d+").unwrap();

        if let Some(cols) = rules["format"]["currency"]["columns"].as_array() {
            for v in cols {
                if let Some(c) = v.as_str() {
                    if let Ok(series) = df_res.column(c) {
                        if let Ok(ca) = series.str() {
                            let new_ca: StringChunked = ca
                                .into_iter()
                                .map(|opt_val| {
                                    if let Some(raw) = opt_val {
                                        let cleaned = raw.replace(',', "").replace(' ', "");
                                        if let Some(m) = re_extract.find(&cleaned) {
                                            if let Ok(num) = m.as_str().parse::<f64>() {
                                                let mut v_str = format!("{:.*}", decimals, num);
                                                if thousands {
                                                    let parts: Vec<&str> =
                                                        v_str.split('.').collect();
                                                    let int_part = parts[0];
                                                    let mut formatted_int = String::new();
                                                    let chars: Vec<char> =
                                                        int_part.chars().collect();
                                                    let mut count_digit = 0;
                                                    for i in (0..chars.len()).rev() {
                                                        if chars[i].is_ascii_digit() {
                                                            if count_digit > 0
                                                                && count_digit % 3 == 0
                                                            {
                                                                formatted_int.push(',');
                                                            }
                                                            count_digit += 1;
                                                        }
                                                        formatted_int.push(chars[i]);
                                                    }
                                                    let int_part_thou: String =
                                                        formatted_int.chars().rev().collect();
                                                    if parts.len() > 1 {
                                                        v_str = format!(
                                                            "{}.{}",
                                                            int_part_thou, parts[1]
                                                        );
                                                    } else {
                                                        v_str = int_part_thou;
                                                    }
                                                }
                                                return Some(format!("{}{}", sym, v_str));
                                            }
                                        }
                                        Some(raw.to_string())
                                    } else {
                                        None
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

    // 3.3 缺失值处理: 填充默认值
    if rules["missing"]["fillDefault"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        let only_when_empty = rules["missing"]["fillDefault"]["onlyWhenEmpty"]
            .as_bool()
            .unwrap_or(true);
        if let Some(cols) = rules["missing"]["fillDefault"]["columns"].as_array() {
            let values = rules["missing"]["fillDefault"]["values"]
                .as_object()
                .cloned()
                .unwrap_or_default();
            for v in cols {
                if let Some(c) = v.as_str() {
                    let def_val = values.get(c).and_then(|v| v.as_str()).unwrap_or("");
                    if let Ok(series) = df_res.column(c) {
                        if let Ok(ca) = series.str() {
                            let new_ca: StringChunked = ca
                                .into_iter()
                                .map(|opt_val| match opt_val {
                                    Some(raw) => {
                                        // 【逻辑修复】：
                                        // 如果开启了 only_when_empty（仅对空值填充），则检查 raw 是否为空，为空才填充 def_val。
                                        // 如果关闭了 only_when_empty（即覆盖所有原有值），则无论 raw 是什么，都直接填充 def_val！
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
                                    },
                                })
                                .collect();
                            let _ = df_res.replace(c, new_ca.into_series());
                        }
                    }
                }
            }
        }
    }

    // 3.3.1 缺失值处理: 前向 / 后向填充
    if rules["missing"]["fillForwardBackward"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        let trim = rules["missing"]["trimWhitespaceForEmptyCheck"]
            .as_bool()
            .unwrap_or(true);
        let limit = rules["missing"]["fillForwardBackward"]["limit"]
            .as_u64()
            .map(|v| v as usize);

        let directions = rules["missing"]["fillForwardBackward"]["directions"]
            .as_object()
            .cloned()
            .unwrap_or_default();

        if let Some(cols) = rules["missing"]["fillForwardBackward"]["columns"].as_array() {
            for v in cols {
                if let Some(c) = v.as_str() {
                    if let Ok(series) = df_res.column(c) {
                        let string_s = series
                            .cast(&polars::datatypes::DataType::String)
                            .unwrap_or_else(|_| series.clone());
                        if let Ok(ca) = string_s.str() {
                            let mut values: Vec<Option<String>> =
                                ca.into_iter().map(|opt| opt.map(|s| s.to_string())).collect();

                            let dir = directions
                                .get(c)
                                .and_then(|v| v.as_str())
                                .unwrap_or("forward");

                            let mut filled_count: usize = 0;

                            let fill_forward = |vals: &mut [Option<String>], filled: &mut usize| {
                                let mut last_non_empty: Option<String> = None;
                                let mut since = 0usize;
                                for cell in vals.iter_mut() {
                                    let empty = match cell.as_deref() {
                                        None => true,
                                        Some(s) => {
                                            let t = if trim { s.trim() } else { s };
                                            t.is_empty()
                                        }
                                    };

                                    if !empty {
                                        last_non_empty = cell.clone();
                                        since = 0;
                                        continue;
                                    }

                                    let Some(last) = &last_non_empty else { continue };
                                    if let Some(lim) = limit {
                                        if since >= lim {
                                            continue;
                                        }
                                    }
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
                                        Some(s) => {
                                            let t = if trim { s.trim() } else { s };
                                            t.is_empty()
                                        }
                                    };

                                    if !empty {
                                        next_non_empty = vals[i].clone();
                                        since = 0;
                                        continue;
                                    }

                                    let Some(next) = &next_non_empty else { continue };
                                    if let Some(lim) = limit {
                                        if since >= lim {
                                            continue;
                                        }
                                    }
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

    // 3.4 移除空行
    let remove_empty_rows_enabled = rules.get("missing")
        .and_then(|m| m.get("removeEmptyRows"))
        .and_then(|r| r.get("enabled"))
        .and_then(|e| e.as_bool())
        .unwrap_or(false);

    if remove_empty_rows_enabled {
        let cond = rules["missing"]["removeEmptyRows"]["condition"]
            .as_str()
            .unwrap_or("all");
        let mode = rules["missing"]["removeEmptyRows"]["columnsMode"]
            .as_str()
            .unwrap_or("all");
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
                        // 修复：需要使用 `neq(lit(""))` 来保留非空字符串
                        e = e.and(col(&c).str().strip_chars(lit(NULL)).neq(lit("")));
                    }
                    exprs.push(e);
                }
            }
            if !exprs.is_empty() {
                let mut lf_tmp = df_res.clone().lazy();
                // 【逻辑修复】：
                // 当我们在 Polars 中使用 `.filter(expr)` 时，保留的是 expr 为 true 的行。
                // 我们的 exprs 代表的是：每一列是否【不为空】（is_not_null AND != ""）。
                //
                // 选项 "all" (原意: 检查范围内的列全部为空时删除)
                // 也就是：只要有任何一个列【不为空】，这行就要保留。所以用 any_horizontal。
                // 即使你只选了 1 列，any_horizontal(1列) = 只要这1列不为空就保留，完全正确。
                // 
                // 选项 "any" (原意: 检查范围内的列包含空值时删除)
                // 也就是：必须所有的列都【不为空】，这行才能保留。所以用 all_horizontal。
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

    // 3.5 移除空列 (新加的逻辑，修复原先遗漏的移除空列功能，但前提是开关开启)
    let remove_empty_cols_enabled = rules.get("columns")
        .and_then(|m| m.get("removeEmptyCols"))
        .and_then(|r| r.get("enabled"))
        .and_then(|e| e.as_bool())
        .unwrap_or(false);

    if remove_empty_cols_enabled {
        let cond = rules["columns"]["removeEmptyCols"]["condition"].as_str().unwrap_or("all");
        let mut cols_to_drop = Vec::new();
        for col_name in df_res.get_column_names() {
            if let Ok(series) = df_res.column(col_name) {
                let is_empty = if matches!(series.dtype(), DataType::String) {
                    if let Ok(ca) = series.str() {
                        let empty_count = ca.into_iter().filter(|opt_val| {
                            match opt_val {
                                Some(s) => s.trim().is_empty(),
                                None => true,
                            }
                        }).count();
                        if cond == "all" {
                            empty_count == series.len()
                        } else {
                            empty_count > 0
                        }
                    } else {
                        false
                    }
                } else {
                    let null_count = series.null_count();
                    if cond == "all" {
                        null_count == series.len()
                    } else {
                        null_count > 0
                    }
                };
                
                if is_empty {
                    cols_to_drop.push(col_name.clone());
                }
            }
        }
        if !cols_to_drop.is_empty() {
            let drop_str: Vec<&str> = cols_to_drop.iter().map(|s| s.as_str()).collect();
            df_res = df_res.drop_many(drop_str.iter().copied());
            stats.removed_empty_cols = cols_to_drop.len();
        }
    }

    // 3.6 重命名列 (Rename) 
    // 移到末尾执行，以防止前面基于原始列名的规则因找不到列而失效
    if rules["columns"]["rename"]["enabled"]
        .as_bool()
        .unwrap_or(false)
    {
        if let Some(mappings) = rules["columns"]["rename"]["mappings"].as_array() {
            let mut old_names = Vec::new();
            let mut new_names = Vec::new();
            for m in mappings {
                let from = m["from"].as_str().unwrap_or("").trim();
                let to = m["to"].as_str().unwrap_or("").trim();
                if !from.is_empty() && !to.is_empty() && df_res.get_column_names().iter().any(|c| c.as_str() == from) {
                    old_names.push(from);
                    new_names.push(to);
                }
            }
            if !old_names.is_empty() {
                for i in 0..old_names.len() {
                    df_res.rename(old_names[i], new_names[i].into()).map_err(|e| format!("重命名失败: {}", e))?;
                }
                stats.renamed_columns = old_names.len();
            }
        }
    }

    stats.rows_after = df_res.height();
    stats.cols_after = df_res.width();

    Ok(df_res)
}
