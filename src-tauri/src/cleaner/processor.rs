//! 核心处理器 (Processor)
//! 
//! 作为清洗流水线的总控调度器。它负责解析前端传入的 JSON 规则，
//! 并按照既定的优先级顺序，将 DataFrame 路由给 ops 模块下的具体函数进行处理。

use polars::prelude::*;
use serde_json::Value;
use crate::cleaner::models::CleaningStats;

use crate::cleaner::operations::columns;
use crate::cleaner::operations::format;
use crate::cleaner::operations::dedup;
use crate::cleaner::operations::missing;

/// 核心数据处理入口，将前端传入的 JSON 规则转化为 Polars 的链式操作或批处理
pub fn apply_rules(
    mut df: DataFrame,
    rules: &Value,
    stats: &mut CleaningStats,
) -> Result<DataFrame, String> {
    // ==========================================
    // 1. 列级别的基本操作 (重命名移至末尾，删除、拆分、合并)
    // ==========================================
    
    // 1.1 删除特定列 (Drop)
    df = columns::drop_columns(df, rules, stats)?;

    // 1.2 列拆分 (Split)
    df = columns::split_columns(df, rules, stats)?;

    // 1.3 列合并 (Merge)
    df = columns::merge_columns(df, rules, stats)?;

    // ==========================================
    // 2. 转换为 LazyFrame 以进行高效的向量化处理
    // LazyFrame 可以自动优化查询计划，极大提升处理千万级数据的速度
    // ==========================================
    let mut lf = df.lazy();
    let schema = lf.collect_schema().map_err(|e| e.to_string())?;

    // 2.1 文本格式化 (Text)
    lf = format::format_text(lf, rules, &schema)?;

    // 2.2 邮箱规范化 (Email)
    lf = format::format_email(lf, rules, &schema)?;

    // 2.3 去重 (Dedup)
    lf = dedup::dedup_rows(lf, rules)?;

    // ==========================================
    // 3. 执行 LazyFrame 计算并回退到 DataFrame 进行某些极其复杂的自定义逻辑
    // (例如特定正则的提取和动态格式化，Polars 表达式有时过于严格，使用 ChunkedArray 迭代更加灵活)
    // ==========================================
    let mut df_res = lf
        .collect()
        .map_err(|e| format!("Polars 引擎执行失败: {}", e))?;

    // 3.1 手机号清洗
    df_res = format::format_phone(df_res, rules)?;

    // 3.2 日期格式化
    df_res = format::format_date_col(df_res, rules)?;

    // 3.3 金额格式化
    df_res = format::format_currency(df_res, rules)?;

    // 3.4 缺失值处理: 填充默认值
    df_res = missing::fill_default(df_res, rules)?;

    // 3.5 缺失值处理: 前向 / 后向填充
    df_res = missing::fill_forward_backward(df_res, rules, stats)?;

    // 3.6 移除空行
    df_res = missing::remove_empty_rows(df_res, rules)?;

    // 3.7 移除空列
    df_res = columns::remove_empty_cols(df_res, rules, stats)?;

    // 3.8 重命名列 (Rename) 
    // 移到末尾执行，以防止前面基于原始列名的规则因找不到列而失效
    df_res = columns::rename_columns(df_res, rules, stats)?;

    // 最终统计
    stats.rows_after = df_res.height();
    stats.cols_after = df_res.width();

    Ok(df_res)
}