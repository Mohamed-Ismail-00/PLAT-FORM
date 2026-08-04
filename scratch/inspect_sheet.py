import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

xl = pd.ExcelFile('Attend Sheet Intern.xlsx')
out = []
out.append(f"Sheet Names: {xl.sheet_names}\n")

for sheet in xl.sheet_names:
    df = pd.read_excel(xl, sheet)
    out.append(f"\n=== Sheet: {sheet} (Rows: {len(df)}) ===")
    out.append(f"Columns ({len(df.columns)}): {[str(c) for c in df.columns]}")
    if not df.empty:
        out.append("Head 3:")
        out.append(df.head(3).to_string())

with open("scratch/sheet_details.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print("Wrote details to scratch/sheet_details.txt successfully.")
