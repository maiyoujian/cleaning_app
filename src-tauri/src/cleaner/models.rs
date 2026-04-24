use serde::{Deserialize, Serialize};

// 数据模型层，存放统计面板相关的 CleaningStats 结构体。
/// 数据清洗统计模型
/// 用于在前端展示右侧边栏的“处理明细”
#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleaningStats {
    pub rows_before: usize,
    pub cols_before: usize,
    pub rows_after: usize,
    pub cols_after: usize,
    pub removed_empty_rows: usize,
    pub removed_empty_cols: usize,
    pub filled_default_cells: usize,
    pub filled_forward_backward_cells: usize,
    pub removed_duplicates: usize,
    pub formatted_date_cells: usize,
    pub formatted_currency_cells: usize,
    pub normalized_phone_cells: usize,
    pub normalized_email_cells: usize,
    pub cleaned_text_cells: usize,
    pub renamed_columns: usize,
    pub dropped_columns: usize,
    pub split_columns_added: usize,
    pub merged_columns_added: usize,
}

impl CleaningStats {
    pub fn new(rows: usize, cols: usize) -> Self {
        let mut stats = Self::default();
        stats.rows_before = rows;
        stats.cols_before = cols;
        stats
    }
}
