import pandas as pd
import numpy as np

# 构造一个涵盖所有配置规则边缘情况的脏数据集
data = {
    "id": ["1", "2", "3", "3", " 4 ", "5", "6", "", "7"],
    "user_name": ["Alice", "Bob", "Charlie", "Charlie", "David", "Eve", "Frank", "Ghost", "Grace"],
    "age": [25, 30, pd.NA, pd.NA, 40, 22, 290, pd.NA, 28],
    "phone": ["+86 138-0000-1111", "13911112222", "137 0000 3333", "137 0000 3333", "010-88889999", "13611114444", " 135 2222 5555 ", pd.NA, "(+86) 134-3333-6666"],
    "email": [" ALICE@Example.com ", "bob@example.com", "CHARLIE@EXAMPLE.COM", "CHARLIE@EXAMPLE.COM", "david@example.com", "EVE@example.com", " frank@example.com", "ghost@example", "Grace@example.com"],
    "join_date": ["2023-01-01", "2023/02/02", "2023.03.03", "2023.03.03", "2023年10月11日", "2023-05-01 12:30:00", "2023 - 11- 30 20 ：20:10", "2023年09月02日 16 时 49 分", "20231225"],
    "salary": ["$1,234.56", "¥ 2345.6", "€ 3456.789", "€ 3456.789", "4567", "-5678.9", "6789.01", pd.NA, "RMB 7890.123"],
    "address_code": ["BJ-100000", "SH-200000", "GZ-300000", "GZ-300000", "SZ-400000", "HZ-500000", "CD-600000", "", "NJ-700000"],
    "first_name": ["A", "B", "C", "C", "D", "E", "F", "", "G"],
    "last_name": ["lice", "ob", "harlie", "harlie", "avid", "ve", "rank", "", "race"],
    "drop_me": ["x", "x", "x", "x", "x", "x", "x", "x", "x"],
    "empty_col": [pd.NA, pd.NA, pd.NA, pd.NA, pd.NA, pd.NA, pd.NA, pd.NA, pd.NA],
    "notes": ["good", "bad", pd.NA, pd.NA, pd.NA, pd.NA, "ok", " ", pd.NA]
}

df = pd.DataFrame(data)

# 在第 4 行之后（即原数据中间）插入一个完全空行
empty_row_df = pd.DataFrame([[pd.NA] * len(df.columns)], columns=df.columns)
df = pd.concat([df.iloc[:4], empty_row_df, df.iloc[4:]], ignore_index=True)
# 在第 4 行之后（即原数据中间）插入一个完全空行
empty_row_df = pd.DataFrame([[pd.NA] * len(df.columns)], columns=df.columns)
df = pd.concat([df.iloc[:0], empty_row_df, df.iloc[0:]], ignore_index=True)

# 在表格绝对末尾再追加一个完全空行
df.loc[len(df)] = [pd.NA] * len(df.columns)

df.to_csv("test_dirty_data.csv", index=False)
df.to_excel("test_dirty_data.xlsx", index=False)
print("测试脏数据 test_dirty_data.csv 和 test_dirty_data.xlsx 更新成功！包含了新的金额列和复杂的中文日期。")