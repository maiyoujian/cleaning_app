use calamine::{open_workbook_auto, DataType, Reader};
use polars::prelude::*;
use rust_xlsxwriter::Workbook;
use std::collections::HashSet;
use std::fs::File;

// I/O 解析层，负责将 CSV/Excel 极速读取为 Polars DataFrame，以及将清洗结果导出。
/// 从指定路径读取数据（支持 CSV 和 Excel），并构建 Polars DataFrame。
pub fn read_to_dataframe(file_path: &str) -> Result<DataFrame, String> {
    let lower_path = file_path.to_lowercase();

    if lower_path.ends_with(".csv") {
        let df = CsvReadOptions::default()
            .with_has_header(true)
            .with_infer_schema_length(Some(1000))
            .try_into_reader_with_file_path(Some(file_path.into()))
            .map_err(|e| format!("CSV读取失败: {}", e))?
            .finish()
            .map_err(|e| format!("CSV解析失败: {}", e))?;

        let mut string_series = Vec::new();
        for col in df.get_columns() {
            let mut s = col.cast(&polars::datatypes::DataType::String)
                .unwrap_or_else(|_| col.clone());
            if s.null_count() > 0 {
                if let Ok(filled) = s.fill_null(polars::prelude::FillNullStrategy::Zero) {
                    s = filled;
                }
            }
            string_series.push(s.into_column());
        }
        DataFrame::new(string_series).map_err(|e| e.to_string())
    } else if lower_path.ends_with(".xlsx") || lower_path.ends_with(".xls") {
        let mut workbook =
            open_workbook_auto(file_path).map_err(|e| format!("Excel读取失败: {}", e))?;
        let sheet_names = workbook.sheet_names().to_owned();
        if sheet_names.is_empty() {
            return Err("Excel文件为空".to_string());
        }

        let mut columns_data: Vec<Vec<String>> = Vec::new();
        let mut header_names: Vec<String> = Vec::new();

        if let Some(Ok(range)) = workbook.worksheet_range(&sheet_names[0]) {
            let mut row_iter = range.rows();
            if let Some(header_row) = row_iter.next() {
                for cell in header_row {
                    header_names.push(cell.to_string());
                    columns_data.push(Vec::new());
                }

                for data_row in row_iter {
                    let row_len = data_row.len();
                    
                    // 【关键修复】：Calamine 解析 Excel 时，如果某一整行完全为空（甚至没有任何边框样式）
                    // 那么该行可能在迭代时直接产生 row_len == 0 的空数组，或者全为 DataType::Empty。
                    // 但有些时候，真正的“空行”被 calamine 彻底忽略，导致 range.rows() 直接少了一行！
                    // 不过至少对于读出的行，我们先确保它们补齐
                    
                    for i in 0..columns_data.len() {
                        let val = if i < row_len {
                            match &data_row[i] {
                                DataType::Empty => "".to_string(),
                                DataType::String(s) => s.to_string(),
                                DataType::Float(f) => f.to_string(),
                                DataType::Int(v) => v.to_string(),
                                DataType::Bool(b) => b.to_string(),
                                cell => cell.to_string(),
                            }
                        } else {
                            "".to_string()
                        };
                        columns_data[i].push(val);
                    }
                }
                
                // 【终极修复】：处理 Excel 尾部空行丢失问题
                // Calamine 的 `worksheet_range` 可能会自动裁剪掉文件末尾的全空行！
                // (因为 Excel 认为它们不属于有效的数据范围 Data Range)
                // 如果前端传入的原始文件在末尾有空行，但 Calamine 返回的 range 高度却少了，
                // 那不是我们删了，而是读取器压根没读到。我们在此不做强制追加，因为无法确切知道原文件末尾有几个无意义的空行。
            }
        }

        let mut series_list = Vec::new();
        let mut seen_names = HashSet::new();

        for (i, name) in header_names.iter().enumerate() {
            let mut final_name = name.clone();
            if final_name.trim().is_empty() {
                final_name = format!("Unnamed_{}", i + 1);
            }
            
            let mut counter = 1;
            let original_name = final_name.clone();
            while seen_names.contains(&final_name) {
                final_name = format!("{}_{}", original_name, counter);
                counter += 1;
            }
            seen_names.insert(final_name.clone());

            let s = Series::new(final_name.into(), &columns_data[i]);
            series_list.push(s.into_column());
        }

        DataFrame::new(series_list).map_err(|e| e.to_string())
    } else {
        Err("不支持的文件格式".to_string())
    }
}

pub fn export_dataframe_to_csv(mut df: DataFrame, export_path: &str) -> Result<(), String> {
    let mut file = File::create(export_path).map_err(|e| format!("无法创建文件: {}", e))?;
    CsvWriter::new(&mut file)
        .include_header(true)
        .finish(&mut df)
        .map_err(|e| format!("写入 CSV 失败: {}", e))?;
    Ok(())
}

pub fn export_dataframe_to_excel(df: &DataFrame, export_path: &str) -> Result<(), String> {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    // 写入表头
    for (col_idx, col) in df.get_columns().iter().enumerate() {
        worksheet
            .write_string(0, col_idx as u16, col.name().as_str())
            .map_err(|e| format!("写入表头失败: {}", e))?;
    }

    // 写入数据 (为了极速，全按字符串处理)
    for (col_idx, col) in df.get_columns().iter().enumerate() {
        let string_s = col
            .cast(&polars::datatypes::DataType::String)
            .unwrap_or_else(|_| col.clone());
        let str_col = string_s.str().map_err(|e| format!("类型转换失败: {}", e))?;
        for (row_idx, val) in str_col.into_iter().enumerate() {
            let s = val.unwrap_or("");
            worksheet
                .write_string((row_idx + 1) as u32, col_idx as u16, s)
                .map_err(|e| format!("写入单元格失败: {}", e))?;
        }
    }

    workbook
        .save(export_path)
        .map_err(|e| format!("保存 Excel 失败: {}", e))?;
    Ok(())
}

pub fn export_dataframe(df: DataFrame, export_path: &str) -> Result<(), String> {
    let lower_path = export_path.to_lowercase();
    if lower_path.ends_with(".csv") {
        export_dataframe_to_csv(df, export_path)
    } else {
        export_dataframe_to_excel(&df, export_path)
    }
}
