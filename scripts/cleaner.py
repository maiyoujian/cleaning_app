import sys
import json
import pandas as pd
import os

def main():
    try:
        # 1. 从命令行参数获取文件路径
        if len(sys.argv) < 2:
            raise ValueError("未提供文件路径参数")
        
        file_path = sys.argv[1]
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"找不到文件: {file_path}")

        # 2. 从标准输入 (stdin) 读取所有的 JSON 规则配置
        rules_json_str = sys.stdin.read()
        if not rules_json_str.strip():
            raise ValueError("未能从标准输入读取到规则配置")
            
        rules = json.loads(rules_json_str)
        
        # 3. 使用 Pandas 读取数据 (支持 Excel 和 CSV)
        # 自动推断文件类型
        if file_path.lower().endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
            
        rows_before, cols_before = df.shape

        # --- 以下为数据清洗逻辑的执行 ---
        # 统计指标初始化
        stats = {
            "rowsBefore": int(rows_before),
            "colsBefore": int(cols_before),
            "rowsAfter": 0,
            "colsAfter": 0,
            "removedEmptyRows": 0,
            "removedEmptyCols": 0,
            "filledDefaultCells": 0,
            "filledForwardBackwardCells": 0,
            "removedDuplicates": 0,
            "formattedDateCells": 0,
            "normalizedPhoneCells": 0,
            "normalizedEmailCells": 0,
            "cleanedTextCells": 0,
            "renamedColumns": 0,
            "droppedColumns": 0,
            "splitColumnsAdded": 0,
            "mergedColumnsAdded": 0
        }

        # [空值判断]: 是否将纯空格视为 NaN
        missing_rules = rules.get("missing", {})
        if missing_rules.get("trimWhitespaceForEmptyCheck", True):
            # 将纯空格字符替换为 NaN
            df = df.replace(r'^\s*$', pd.NA, regex=True)

        # [删除空行/空列]
        remove_empty_rows = missing_rules.get("removeEmptyRows", {})
        if remove_empty_rows.get("enabled", False):
            rows_before_drop = len(df)
            condition = remove_empty_rows.get("condition", "all")
            columns_mode = remove_empty_rows.get("columnsMode", "all")
            target_columns = remove_empty_rows.get("columns", [])
            
            if columns_mode == "custom" and target_columns:
                valid_cols = [c for c in target_columns if c in df.columns]
                if valid_cols:
                    df.dropna(subset=valid_cols, how=condition, inplace=True)
            else:
                df.dropna(how=condition, inplace=True)
                
            stats["removedEmptyRows"] = rows_before_drop - len(df)

        columns_rules = rules.get("columns", {})
        remove_empty_cols = columns_rules.get("removeEmptyCols", {})
        if remove_empty_cols.get("enabled", False):
            cols_before_drop = len(df.columns)
            condition = remove_empty_cols.get("condition", "all")
            df.dropna(axis=1, how=condition, inplace=True)
            stats["removedEmptyCols"] = cols_before_drop - len(df.columns)

        # [填充默认值]
        fill_default_rules = missing_rules.get("fillDefault", {})
        if fill_default_rules.get("enabled", False):
            columns_to_fill = fill_default_rules.get("columns", [])
            fill_values = fill_default_rules.get("values", {})
            only_when_empty = fill_default_rules.get("onlyWhenEmpty", True)
            for col in columns_to_fill:
                if col in df.columns and col in fill_values:
                    if only_when_empty:
                        null_mask = df[col].isna()
                        null_count = int(null_mask.sum())
                        df.loc[null_mask, col] = fill_values[col]
                        stats["filledDefaultCells"] += null_count
                    else:
                        changed_mask = df[col] != fill_values[col]
                        changed_count = int(changed_mask.sum())
                        df[col] = fill_values[col]
                        stats["filledDefaultCells"] += changed_count

        # [数据去重]
        dedup_rules = rules.get("dedup", {})
        if dedup_rules.get("enabled", False):
            rows_before_dedup = len(df)
            mode = dedup_rules.get("mode", "wholeRow")
            keep = dedup_rules.get("keep", "first")
            keep_arg = False if keep == "none" else keep
            normalize_text = dedup_rules.get("normalizeText", True)
            
            # 如果启用了文本归一化，我们需要创建一个临时的归一化 df 进行去重比较
            compare_df = df.copy()
            if normalize_text:
                for col in compare_df.columns:
                    if compare_df[col].dtype == "object":
                        compare_df[col] = compare_df[col].astype(str).str.strip().str.lower()
            
            if mode == "wholeRow":
                duplicated_mask = compare_df.duplicated(keep=keep_arg)
            else:
                dedup_cols = dedup_rules.get("columns", [])
                valid_cols = [c for c in dedup_cols if c in compare_df.columns]
                if valid_cols:
                    duplicated_mask = compare_df.duplicated(subset=valid_cols, keep=keep_arg)
                else:
                    duplicated_mask = pd.Series(False, index=df.index)
                    
            df = df[~duplicated_mask]
            stats["removedDuplicates"] = rows_before_dedup - len(df)

        # [格式统一]
        format_rules = rules.get("format", {})
        
        # 1. 文本清理
        text_rules = format_rules.get("text", {})
        if text_rules.get("enabled", False):
            mode = text_rules.get("columnsMode", "allText")
            trim = text_rules.get("trim", False) # Python 端默认不需要自动去空格，遵循前端的配置
            collapse = text_rules.get("collapseSpaces", False)
            remove_all = text_rules.get("removeAllWhitespace", False)
            
            target_cols = text_rules.get("columns", []) if mode == "selected" else df.columns
            for col in target_cols:
                # pandas 的 string 类型或者 object 类型
                if col in df.columns and pd.api.types.is_string_dtype(df[col]):
                    original = df[col].copy()
                    
                    # 只有在非空且为字符串的情况下处理，避免将 NaN 转为 "nan" 字符串
                    # 同时忽略全是空格或纯空的情况
                    mask = pd.notna(df[col]) & (df[col].astype(str).str.strip() != '')
                    
                    if mask.any():
                        if remove_all:
                            df.loc[mask, col] = df.loc[mask, col].astype(str).str.replace(r'\s+', '', regex=True)
                        elif collapse:
                            df.loc[mask, col] = df.loc[mask, col].astype(str).str.replace(r'\s+', ' ', regex=True)
                        
                        if trim:
                            # Pandas 的 str.strip() 默认就能去除首尾空白字符
                            df.loc[mask, col] = df.loc[mask, col].astype(str).str.strip()
                        
                    # 我们只统计真实发生了非空文本清理的单元格
                    changed_mask = (original.astype(str) != df[col].astype(str)) & mask
                    stats["cleanedTextCells"] += int(changed_mask.sum())

        # 2. 日期格式统一
        date_rules = format_rules.get("date", {})
        if date_rules.get("enabled", False):
            target_cols = date_rules.get("columns", [])
            out_fmt = date_rules.get("outputFormat", "YYYY-MM-DD")
            tz_mode = date_rules.get("timezone", "local")
            on_invalid = date_rules.get("onInvalid", "keep")
            
            for col in target_cols:
                if col in df.columns:
                    original = df[col].copy()
                    
                    # 尝试转换为日期
                    # 清理中文年月日以便 pandas 能够原生解析
                    # 同时去除时间中冒号和连字符周围可能多出的空格（例如 20 : 10 或者 2023 - 11 - 30）
                    cleaned_date_str = df[col].astype(str)
                    cleaned_date_str = cleaned_date_str.str.replace(r'年|月', '-', regex=True)
                    cleaned_date_str = cleaned_date_str.str.replace(r'日\s*', ' ', regex=True)
                    cleaned_date_str = cleaned_date_str.str.replace(r'时|分', ':', regex=True)
                    cleaned_date_str = cleaned_date_str.str.replace(r'秒', '', regex=True)
                    cleaned_date_str = cleaned_date_str.str.replace(r'：', ':', regex=True) # 替换中文冒号
                    cleaned_date_str = cleaned_date_str.str.replace(r'\s*:\s*', ':', regex=True)
                    cleaned_date_str = cleaned_date_str.str.replace(r'\s*-\s*', '-', regex=True)
                    parsed_dates = pd.to_datetime(cleaned_date_str, errors='coerce')
                    
                    # 处理时区
                    if tz_mode == "utc":
                        parsed_dates = parsed_dates.dt.tz_localize(None) # 简单模拟
                    
                    # 格式化输出
                    if out_fmt == "YYYY-MM-DD":
                        formatted = parsed_dates.dt.strftime('%Y-%m-%d')
                    elif out_fmt == "YYYY/MM/DD":
                        formatted = parsed_dates.dt.strftime('%Y/%m/%d')
                    elif out_fmt == "YYYY-MM-DD HH:mm":
                        formatted = parsed_dates.dt.strftime('%Y-%m-%d %H:%M')
                    elif out_fmt == "YYYY-MM-DD HH:mm:ss":
                        formatted = parsed_dates.dt.strftime('%Y-%m-%d %H:%M:%S')
                    elif out_fmt == "YYYY年MM月DD日":
                        formatted = parsed_dates.dt.strftime('%Y年%m月%d日')
                    elif out_fmt == "YYYY年MM月DD日 HH时mm分":
                        formatted = parsed_dates.dt.strftime('%Y年%m月%d日 %H时%M分')
                    elif out_fmt == "YYYY年MM月DD日 HH时mm分ss秒":
                        formatted = parsed_dates.dt.strftime('%Y年%m月%d日 %H时%M分%S秒')
                    elif out_fmt == "ISO":
                        formatted = parsed_dates.dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                    else:
                        formatted = parsed_dates.dt.strftime('%Y-%m-%d')
                    
                    # 处理无效日期
                    if on_invalid == "keep":
                        df[col] = formatted.fillna(df[col])
                    else:
                        # 确保完全空的也是 pd.NA 而不是 nan 字符串
                        df[col] = formatted
                        df[col] = df[col].where(pd.notna(df[col]), pd.NA)
                        
                    stats["formattedDateCells"] += int((original != df[col]).sum())

        # 3. 手机号规范化
        phone_rules = format_rules.get("phone", {})
        if phone_rules.get("enabled", False):
            target_cols = phone_rules.get("columns", [])
            country_code = phone_rules.get("countryCode", "86")
            import re
            country_code = re.sub(r'\D', '', str(country_code))
            out_mode = phone_rules.get("output", "digits")
            
            for col in target_cols:
                if col in df.columns:
                    original = df[col].copy()
                    # 提取纯数字
                    
                    # 去除原值中可能已有的 + 及其紧跟的国家码（例如 +86、+(86)、+ 86）
                    # 避免用户选了 E164 后，原值自带的 86 和新加的 86 重复
                    cleaned_raw = df[col].astype(str)
                    # 1. 无论是否有配置 cc，先剥离所有带 + 号或括号的通用国际区号
                    regex_generic = r'^\s*(?:\+\s*\d+|\+\s*\(\s*\d+\s*\)|\(\s*\+?\d+\s*\))\s*'
                    prev = pd.Series([''] * len(cleaned_raw), index=cleaned_raw.index)
                    while not cleaned_raw.equals(prev):
                        prev = cleaned_raw.copy()
                        cleaned_raw = cleaned_raw.str.replace(regex_generic, '', regex=True)

                    # 2. 如果配置了 cc，额外剥离正好等于 cc 的前缀数字
                    if country_code:
                        regex_specific = rf'^\s*{country_code}\s*'
                        prev = pd.Series([''] * len(cleaned_raw), index=cleaned_raw.index)
                        while not cleaned_raw.equals(prev):
                            prev = cleaned_raw.copy()
                            cleaned_raw = cleaned_raw.str.replace(regex_specific, '', regex=True, flags=re.IGNORECASE)

                    # 3. 去除可能残留的单纯 + 号
                    cleaned_raw = cleaned_raw.str.replace(r'^\s*\+?\s*', '', regex=True)

                    digits = cleaned_raw.str.replace(r'\D', '', regex=True)
                    # 过滤掉原本为空的
                    digits = digits.where(pd.notna(df[col]) & (df[col] != ''), pd.NA)
                    
                    if out_mode == "E164":
                        if country_code:
                            # 简单拼接国家码
                            formatted = digits.apply(lambda x: f"+{country_code}{x}" if pd.notna(x) and str(x).strip() else x)
                        else:
                            # 即使国家码为空，E164也需要以 + 开头
                            formatted = digits.apply(lambda x: f"+{x}" if pd.notna(x) and str(x).strip() else x)
                    else:
                        formatted = digits
                        
                    df[col] = formatted
                    stats["normalizedPhoneCells"] += int((original.astype(str) != df[col].astype(str)).sum())

        # 4. 邮箱规范化
        email_rules = format_rules.get("email", {})
        if email_rules.get("enabled", False):
            target_cols = email_rules.get("columns", [])
            to_lower = email_rules.get("lowercase", True)
            to_trim = email_rules.get("trim", True)
            
            for col in target_cols:
                if col in df.columns:
                    original = df[col].copy()
                    if to_trim:
                        df[col] = df[col].astype(str).str.strip()
                    if to_lower:
                        df[col] = df[col].astype(str).str.lower()
                        
                    # 恢复原本的空值
                    df[col] = df[col].where(pd.notna(original) & (original != ''), pd.NA)
                    stats["normalizedEmailCells"] += int((original != df[col]).sum())

        # 5. 金额格式化
        currency_rules = format_rules.get("currency", {})
        if currency_rules.get("enabled", False):
            target_cols = currency_rules.get("columns", [])
            symbol = currency_rules.get("symbol", "¥")
            decimals = currency_rules.get("decimalPlaces", 2)
            thousands = currency_rules.get("thousandsSeparator", True)
            
            for col in target_cols:
                if col in df.columns:
                    original = df[col].copy()
                    
                    # 提取纯数字和小数点 (考虑到可能有负数)
                    # 先将所有的千分位逗号和空白字符删掉，避免正则提取时截断
                    cleaned_raw = df[col].astype(str).str.replace(r',', '', regex=True).str.replace(r'\s+', '', regex=True)
                    nums = cleaned_raw.str.extract(r'([-+]?\d*\.?\d+)')[0]
                    nums = pd.to_numeric(nums, errors='coerce')
                    
                    def fmt_curr(x):
                        if pd.isna(x):
                            return pd.NA
                        if thousands:
                            return f"{symbol}{x:,.{decimals}f}"
                        else:
                            return f"{symbol}{x:.{decimals}f}"
                            
                    formatted = nums.apply(fmt_curr)
                        
                    df[col] = formatted
                    stats["formattedCurrencyCells"] += int((original.astype(str) != df[col].astype(str)).sum())

        # [列处理]
        col_rules = rules.get("columns", {})
        
        # 1. 重命名
        rename_rules = col_rules.get("rename", {})
        if rename_rules.get("enabled", False):
            mappings = rename_rules.get("mappings", [])
            rename_dict = {m["from"]: m["to"] for m in mappings if m.get("from") and m.get("to")}
            if rename_dict:
                df.rename(columns=rename_dict, inplace=True)
                stats["renamedColumns"] += len(rename_dict)

        # 2. 删除特定列
        drop_rules = col_rules.get("drop", {})
        if drop_rules.get("enabled", False):
            cols_to_drop = drop_rules.get("columns", [])
            valid_drops = [c for c in cols_to_drop if c in df.columns]
            if valid_drops:
                df.drop(columns=valid_drops, inplace=True)
                stats["droppedColumns"] += len(valid_drops)

        # 3. 拆分列
        split_rules = col_rules.get("split", {})
        if split_rules.get("enabled", False):
            target_col = split_rules.get("column")
            sep = split_rules.get("separator", "")
            # 后端也要过滤掉空字符串，避免前端输入中间状态的逗号时产生空列名
            into_cols = [c.strip() for c in split_rules.get("into", []) if c.strip()]
            keep_orig = split_rules.get("keepOriginal", True)
            
            if target_col in df.columns and into_cols:
                valid_mask = pd.notna(df[target_col]) & (df[target_col] != '')
                if sep:
                    split_df = df.loc[valid_mask, target_col].astype(str).str.split(sep, expand=True)
                else:
                    split_df = df.loc[valid_mask, target_col].astype(str).str.split(r'\s+', expand=True)
                
                # 重命名拆分后的列
                for i, new_col in enumerate(into_cols):
                    if i < len(split_df.columns):
                        df.loc[valid_mask, new_col] = split_df[i]
                        df.loc[~valid_mask, new_col] = pd.NA
                    else:
                        df[new_col] = pd.NA
                        
                stats["splitColumnsAdded"] += len(into_cols)
                if not keep_orig:
                    df.drop(columns=[target_col], inplace=True)

        # 4. 合并列
        merge_rules = col_rules.get("merge", {})
        if merge_rules.get("enabled", False):
            target_cols = merge_rules.get("columns", [])
            sep = merge_rules.get("separator", "")
            into_col = merge_rules.get("into")
            drop_src = merge_rules.get("dropSources", False)
            
            valid_cols = [c for c in target_cols if c in df.columns]
            if valid_cols and into_col:
                # 只合并那些非空(notna 且 非纯空格)的值
                def join_valid_values(row):
                    # 获取该行需要合并的列的数据
                    vals = row[valid_cols].astype(str)
                    # 过滤掉 '<NA>', 'nan', 'None' 和空字符串
                    valid_vals = [v for v in vals if pd.notna(v) and v.strip() not in ('', '<NA>', 'nan', 'None')]
                    if valid_vals:
                        stats["mergedColumnsAdded"] = 1 # 只要有一次成功合并，就标记为1
                    return sep.join(valid_vals) if valid_vals else pd.NA
                    
                stats["mergedColumnsAdded"] = 0
                df[into_col] = df.apply(join_valid_values, axis=1)
                
                if drop_src:
                    # 不把新列自身算在被删除的列中
                    valid_drops = [c for c in valid_cols if c != into_col]
                    if valid_drops:
                        df.drop(columns=valid_drops, inplace=True)
                        stats["droppedColumns"] += len(valid_drops)

        # 5. 前向/后向填充 (放在最后，或者根据需要在缺失值处理处)
        fill_fb_rules = missing_rules.get("fillForwardBackward", {})
        if fill_fb_rules.get("enabled", False):
            target_cols = fill_fb_rules.get("columns", [])
            directions = fill_fb_rules.get("directions", {})
            limit = fill_fb_rules.get("limit")
            
            for col in target_cols:
                if col in df.columns:
                    direction = directions.get(col, "forward")
                    null_count = int(df[col].isna().sum())
                    if direction == "forward":
                        df[col] = df[col].ffill(limit=limit)
                    elif direction == "backward":
                        df[col] = df[col].bfill(limit=limit)
                    elif direction == "both":
                        df[col] = df[col].ffill(limit=limit).bfill(limit=limit)
                    stats["filledForwardBackwardCells"] += null_count - int(df[col].isna().sum())

        # 4. 统计处理后的最终行列数
        stats["rowsAfter"] = int(len(df))
        stats["colsAfter"] = int(len(df.columns))

        # 5. 如果需要保存文件，可以将其保存到原目录并加上 _cleaned 后缀
        # 实际开发中也可以通过规则参数决定是否要在此处直接落盘
        # dirname = os.path.dirname(file_path)
        # basename = os.path.basename(file_path)
        # name, ext = os.path.splitext(basename)
        # output_path = os.path.join(dirname, f"{name}_cleaned{ext}")
        # if ext.lower() == '.csv':
        #     df.to_csv(output_path, index=False)
        # else:
        #     df.to_excel(output_path, index=False)

        # 6. 准备返回结果，由于 JSON 序列化大小限制，通常前端只展示预览数据
        # 把 NaN 转换为 None (在 JSON 中为 null)
        df = df.where(pd.notnull(df), None)
        
        # 提取前 100 行用于预览展示
        preview_df = df.head(100)
        
        result_dict = {
            "stats": stats,
            "data": {
                "columns": list(df.columns),
                "rows": preview_df.to_dict(orient="records")
            }
        }
        
        # 7. 打印 JSON 字符串到 stdout (供 Tauri 捕获)
        print(json.dumps(result_dict))
        
    except Exception as e:
        # 如果发生错误，将错误信息通过 stderr 打印
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
