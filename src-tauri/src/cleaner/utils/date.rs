//! 日期处理工具库 (Date Utilities)
//! 
//! 提供各种非标准日期字符串的嗅探、解析、以及标准化输出功能。
//! 能够处理中文日期描述、不规范的分隔符、以及时间戳拼接。

use chrono::{Datelike, Timelike};

/// 智能解析不规范日期字符串
/// 
/// 接收一个包含日期、时间文本的字符串，尝试将其解析成标准的 `chrono::NaiveDateTime`。
/// 
/// 该工具函数具有强大的容错与纠偏能力：
/// 1. 剥离无用的汉字（“年月日时分秒”）并转化为规范分隔符。
/// 2. 去除各类诡异的多余空格与全角冒号。
/// 3. 通过一系列按优先级排列的正则表达式去嗅探真实的年、月、日、时、分、秒片段。
/// 4. 完美兼容 `YYYY-MM-DD HH:mm:ss`, `YYYY/MM/DD`, `YYYYMMDD`, `DD-MM-YYYY` 等不同格式。
pub fn try_parse_date(input: &str) -> Option<chrono::NaiveDateTime> {
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

/// 将日期时间对象格式化输出
/// 
/// 接收一个通过了正确解析的 `chrono::NaiveDateTime`，并将其格式化
/// 为目标模板 `fmt` 指定的结构化字符串，例如 `YYYY年MM月DD日 HH时mm分ss秒` 或 `ISO`。
pub fn format_date(dt: &chrono::NaiveDateTime, fmt: &str) -> String {
    let year = dt.year();
    let month = dt.month();
    let day = dt.day();
    let hours = dt.hour();
    let minutes = dt.minute();
    let seconds = dt.second();

    match fmt {
        "ISO" => format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.000Z", year, month, day, hours, minutes, seconds),
        "YYYY/MM/DD" => format!("{:04}/{:02}/{:02}", year, month, day),
        "YYYY/MM/DD HH:mm" => format!("{:04}/{:02}/{:02} {:02}:{:02}", year, month, day, hours, minutes),
        "YYYY/MM/DD HH:mm:ss" => format!("{:04}/{:02}/{:02} {:02}:{:02}:{:02}", year, month, day, hours, minutes, seconds),
        "YYYY-MM-DD HH:mm" => format!("{:04}-{:02}-{:02} {:02}:{:02}", year, month, day, hours, minutes),
        "YYYY-MM-DD HH:mm:ss" => format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02}", year, month, day, hours, minutes, seconds),
        "YYYY年MM月DD日" => format!("{:04}年{:02}月{:02}日", year, month, day),
        "YYYY年MM月DD日 HH时mm分" => format!("{:04}年{:02}月{:02}日 {:02}时{:02}分", year, month, day, hours, minutes),
        "YYYY年MM月DD日 HH时mm分ss秒" => format!("{:04}年{:02}月{:02}日 {:02}时{:02}分{:02}秒", year, month, day, hours, minutes, seconds),
        _ => format!("{:04}-{:02}-{:02}", year, month, day), // 默认 YYYY-MM-DD
    }
}