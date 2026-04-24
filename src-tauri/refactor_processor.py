import os
import re

base_dir = "/Users/xxy/Desktop/cleaning_app/src-tauri/src/cleaner"

# 1. Read the original processor.rs
with open(os.path.join(base_dir, "processor.rs"), "r") as f:
    content = f.read()

# Create utils.rs
utils_rs = """use chrono::{Datelike, Timelike};

// 解析中文等不规范日期并返回年月日时分秒的辅助函数
pub fn try_parse_date(input: &str) -> Option<chrono::NaiveDateTime> {
""" + content.split("fn try_parse_date(input: &str) -> Option<chrono::NaiveDateTime> {")[1].split("// 业务逻辑层")[0]

with open(os.path.join(base_dir, "utils.rs"), "w") as f:
    f.write(utils_rs)

# Let's use a simpler approach. I will just create the files manually using Rust code.
