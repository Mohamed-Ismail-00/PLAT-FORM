import pandas as pd
df = pd.read_excel('Attend Sheet Intern.xlsx', sheet_name='Ai')
with open('ai_sheet_utf8.txt', 'w', encoding='utf-8') as f:
    f.write(str(df.columns.tolist()) + '\n\n')
    f.write(df.head(10).to_string())
