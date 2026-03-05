import openpyxl

wb = openpyxl.load_workbook('../Automated IT ERD Spend Calculator.xlsx', data_only=False)
sheet = wb['Automated IT Spend Estimator ']

# The emerging tech table is around L4:O11
for row in range(4, 12):
    cell = sheet[f'L{row}']
    formula = cell.value
    print(f"L{row}: {formula}")
