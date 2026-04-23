import json
from scripts.cleaner import run_cleaning

with open("test_payload.json", "w") as f:
    json.dump({
        "input_path": "test.csv",
        "output_path": "test_out.csv",
        "rules": {
            "format": {
                "date": {
                    "enabled": True,
                    "columns": ["date_col"],
                    "outputFormat": "YYYY-MM-DD HH:mm:ss",
                    "timezone": "local",
                    "onInvalid": "keep"
                }
            }
        }
    }, f)
import pandas as pd
df = pd.DataFrame({"date_col": ["2023-01-01 12:30:00", "invalid"]})
df.to_csv("test.csv", index=False)

res = run_cleaning('test_payload.json')
print(res)
