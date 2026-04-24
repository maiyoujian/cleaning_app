//! 数据格式化操作 (Format Operations)
//! 
//! 负责对单元格内容进行清洗、提取和标准化。
//! 包含：文本清理（去空格）、邮箱小写化、手机号提取与 E.164 格式化、
//! 日期标准格式转换、以及货币金额清洗等。

use polars::prelude::*;
use serde_json::Value;
use crate::cleaner::utils::date::{try_parse_date, format_date};

/// 文本格式化清洗
/// 
/// 对指定范围（全部列或选中列）的文本数据进行基础清洗操作：
/// - 去除首尾空白符 (`trim`)
/// - 压缩连续空白符 (`collapseSpaces`) 为单个空格
/// - 完全移除所有空白符 (`removeAllWhitespace`)
pub fn format_text(mut lf: LazyFrame, rules: &Value, schema: &Schema) -> Result<LazyFrame, String> {
    if rules["format"]["text"]["enabled"].as_bool().unwrap_or(false) {
        let mode = rules["format"]["text"]["columnsMode"].as_str().unwrap_or("allText");
        let trim = rules["format"]["text"]["trim"].as_bool().unwrap_or(false);
        let collapse = rules["format"]["text"]["collapseSpaces"].as_bool().unwrap_or(false);
        let remove_all = rules["format"]["text"]["removeAllWhitespace"].as_bool().unwrap_or(false);

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
                    e = e.str().strip_chars(lit(NULL));
                }
                exprs.push(e.alias(&c));
            }
        }
        if !exprs.is_empty() {
            lf = lf.with_columns(exprs);
        }
    }
    Ok(lf)
}

/// 邮箱地址规范化
/// 
/// 针对包含邮箱的特定列进行清洗：
/// - 去除前后空格 (`trim`)
/// - 将字母统一转换为小写 (`lowercase`)
pub fn format_email(mut lf: LazyFrame, rules: &Value, schema: &Schema) -> Result<LazyFrame, String> {
    if rules["format"]["email"]["enabled"].as_bool().unwrap_or(false) {
        let trim = rules["format"]["email"]["trim"].as_bool().unwrap_or(true);
        let lowercase = rules["format"]["email"]["lowercase"].as_bool().unwrap_or(true);

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
    Ok(lf)
}

/// 手机号清洗与提取
/// 
/// 针对指定包含电话号码的列：
/// - 智能识别并剥离现有的国际区号、加号、以及括弧（如 `+86`, `(86)` 等）
/// - 剔除所有非数字的特殊分隔字符
/// - 根据 `output` 配置决定：仅输出纯本地数字，或者拼装成标准的 `E.164` 国际格式
pub fn format_phone(mut df_res: DataFrame, rules: &Value) -> Result<DataFrame, String> {
    if rules["format"]["phone"]["enabled"].as_bool().unwrap_or(false) {
        let cc = rules["format"]["phone"]["countryCode"]
            .as_str()
            .unwrap_or("")
            .replace(|c: char| !c.is_ascii_digit(), "");
        let output_mode = rules["format"]["phone"]["output"].as_str().unwrap_or("digits");

        let re_generic = regex::Regex::new(r"^\s*(?:\+\s*\d+|\+\s*\(\s*\d+\s*\)|\(\s*\+?\d+\s*\))\s*").unwrap();
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
                                        let digits = re_nondigit.replace_all(&cleaned, "").to_string();
                                        if digits.is_empty() { return None; }

                                        let res = if output_mode == "E164" {
                                            if !cc.is_empty() { format!("+{cc}{digits}") } else { format!("+{digits}") }
                                        } else {
                                            digits
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
    Ok(df_res)
}

/// 日期格式规范化
/// 
/// 针对指定包含日期的列：
/// - 自动尝试嗅探和解析各种混乱的不规范日期文本（含中文日期、点/横杠/斜杠分隔符）
/// - 将解析后的日期转回统一的标准输出格式（如 `YYYY-MM-DD` 或 `ISO`）
/// - 遇到无法解析的异常值时，根据 `onInvalid` 的策略选择保留原值或清空
pub fn format_date_col(mut df_res: DataFrame, rules: &Value) -> Result<DataFrame, String> {
    if rules["format"]["date"]["enabled"].as_bool().unwrap_or(false) {
        let target_fmt = rules["format"]["date"]["outputFormat"].as_str().unwrap_or("YYYY-MM-DD");
        let on_invalid = rules["format"]["date"]["onInvalid"].as_str().unwrap_or("keep");

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
    Ok(df_res)
}

/// 货币金额格式化
/// 
/// 针对指定的数值或金额文本列：
/// - 提取原始文本中的所有数字（剥离多余的中英文字符或原始符号）
/// - 依据配置指定要保留的小数位数 (`decimalPlaces`)，以及是否启用千位分隔符 (`thousandsSeparator`)
/// - 最终加上指定的货币符号前缀 (`symbol`)，如 `$1,234.00` 或 `¥ 100`
pub fn format_currency(mut df_res: DataFrame, rules: &Value) -> Result<DataFrame, String> {
    if rules["format"]["currency"]["enabled"].as_bool().unwrap_or(false) {
        let sym = rules["format"]["currency"]["symbol"].as_str().unwrap_or("¥");
        let decimals = rules["format"]["currency"]["decimalPlaces"].as_u64().unwrap_or(2) as usize;
        let thousands = rules["format"]["currency"]["thousandsSeparator"].as_bool().unwrap_or(true);
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
                                                    let parts: Vec<&str> = v_str.split('.').collect();
                                                    let int_part = parts[0];
                                                    let mut formatted_int = String::new();
                                                    let chars: Vec<char> = int_part.chars().collect();
                                                    let mut count_digit = 0;
                                                    for i in (0..chars.len()).rev() {
                                                        if chars[i].is_ascii_digit() {
                                                            if count_digit > 0 && count_digit % 3 == 0 {
                                                                formatted_int.push(',');
                                                            }
                                                            count_digit += 1;
                                                        }
                                                        formatted_int.push(chars[i]);
                                                    }
                                                    let int_part_thou: String = formatted_int.chars().rev().collect();
                                                    if parts.len() > 1 {
                                                        v_str = format!("{}.{}", int_part_thou, parts[1]);
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
    Ok(df_res)
}