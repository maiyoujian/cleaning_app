import pandas as pd
import numpy as np
import random

# Generate 10000 rows of test data
n = 10000

data = {
    "ID": [f"U-{i:05d}" for i in range(1, n+1)],
    "user_name": [random.choice(["Alice", "Bob", " Charlie ", "Dave", "Eve\n", "", None, "Frank  "]) for _ in range(n)],
    "age": [random.choice([25, 30, 45, "", " 22 ", None, 99]) for _ in range(n)],
    "phone": [random.choice(["+86 138-0000-1111", "(+86) 134-3333-6666", "13911112222", " +1 (555) 123-4567 ", "无效号码", "", None]) for _ in range(n)],
    "email": [random.choice(["ALICE@Example.com", "  bob@test.com  ", "CHARLIE@DOMAIN.COM", "", None, "invalid-email"]) for _ in range(n)],
    "join_date": [random.choice(["2023-01-01", "2023/02/02", "2023.03.03", "2023年10月11日", "2023 - 11- 30 20 ：20:10", "20231225", "", None]) for _ in range(n)],
    "salary": [random.choice(["RMB 7890.123", "1,234.56", " 5000 ", "-100.5", "¥9999", "", None]) for _ in range(n)],
    "province": [random.choice(["浙江省", "广东省", "北京市", "", None]) for _ in range(n)],
    "city": [random.choice(["杭州市", "深圳市", "广州市", "", None]) for _ in range(n)],
    "district": [random.choice(["西湖区", "南山区", "天河区", "", None]) for _ in range(n)],
    "status": [random.choice(["active", " inactive ", "PENDING", "", None]) for _ in range(n)],
    "address,code": [random.choice(["Address1,100000", "Address2, 200000", "Address3", "", None]) for _ in range(n)],
    "extra_col1": [""] * n,
    "extra_col2": [""] * n,
}

df = pd.DataFrame(data)

# Add some duplicate rows for dedup test
duplicate_indices = random.sample(range(n), 50)
duplicates = df.iloc[duplicate_indices]
df = pd.concat([df, duplicates], ignore_index=True)

# Add some completely empty rows
empty_rows = pd.DataFrame([[None] * len(df.columns)] * 20, columns=df.columns)
df = pd.concat([df, empty_rows], ignore_index=True)

# Shuffle
df = df.sample(frac=1).reset_index(drop=True)

df.to_csv("test_10000_dirty_data.csv", index=False)
print("test_10000_dirty_data.csv generated successfully with {} rows.".format(len(df)))
