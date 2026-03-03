import pandas as pd
import json
import os

base_path = '/Users/vibhor/Documents/IT Spending Utility'
web_app_src = os.path.join(base_path, 'web-app/src')

def load_industry_multiyear():
    df = pd.read_csv(os.path.join(base_path, 'Industry_Base.csv'))
    it_data = {}
    erd_data = {}
    
    # Years 2022-2030 are columns 1-9 (IT) and 13-21 (ERD) roughly
    # IT columns: 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030
    # ERD columns: 2022.1, 2023.1, 2024.1, 2025.1, 2026.1, 2027.1, 2028.1, 2029.1, 2030.1
    
    years = [str(y) for y in range(2022, 2031)]
    
    for _, row in df.iterrows():
        it_industry = str(row['Industry']).strip()
        if it_industry and it_industry != 'nan' and it_industry != 'Industry':
            it_data[it_industry] = {}
            for y in years:
                val = row[y] if y in row and not pd.isna(row[y]) else 0
                it_data[it_industry][y] = float(val)
        
        erd_industry = str(row['Industry.1']).strip()
        if erd_industry and erd_industry != 'nan' and erd_industry != 'Industry.1':
            erd_data[erd_industry] = {}
            for y in years:
                y_col = y + ".1"
                val = row[y_col] if y_col in row and not pd.isna(row[y_col]) else 0
                erd_data[erd_industry][y] = float(val)
                
    return {
        'it': it_data,
        'erd': erd_data
    }

def load_lookups():
    df = pd.read_csv(os.path.join(base_path, 'Lookups.csv'))
    lookups = {
        'region_adj': {},
        'revenue_adj': {},
        'emerging_tech': {
            'region_adj': {},
            'revenue_adj': {},
            'industry_base': {}
        }
    }
    
    # Region Adj (simple)
    for _, row in df.iterrows():
        region = str(row['Region']).strip()
        if region in ['US', 'EU', 'APAC', 'ROW1', 'ROW2']:
            lookups['region_adj'][region] = float(row['Adj'])

    # Revenue Adj (simple)
    tiers = ['>$5B', '$1B-$5B', '$500M-$1B', '$100M-$500M', '$10M-$100M', '<$10M']
    for tier in tiers:
        for col in df.columns:
            matches = df[df[col] == tier]
            if not matches.empty:
                lookups['revenue_adj'][tier] = float(matches['Adj'].values[0])
                break

    # ET Region Adjustments & Revenue Adjustments from Lookups.csv
    # The CSV has two ET sections with a header row in between:
    # Section 1: region adj (cols US,EU,APAC,ROW1,ROW2)
    # Section 2: revenue adj (cols >$5B,$1B-$5B,$500M-$1B,$100M-$500M,$10M-$100M,<$10M)
    # The second section starts where the row with ">$5B" appears as a value in column 'US'
    et_cat_col = 'Emerging Tech Category'
    region_cols = ['US', 'EU', 'APAC', 'ROW1', 'ROW2']
    rev_cols = ['>$5B', '$1B-$5B', '$500M-$1B', '$100M-$500M', '$10M-$100M', '<$10M']

    in_rev_section = False
    rev_col_map = {}  # maps df column name -> tier name (e.g. 'US' -> '>$5B')
    for i, row in df.iterrows():
        cat = str(row[et_cat_col]).strip()
        us_val = str(row.get('US', '')).strip()
        # Detect the switch to revenue section: header row where US col has '>$5B'
        if us_val == '>$5B':
            in_rev_section = True
            # Build the mapping from column position to tier name
            for col in ['US', 'EU', 'APAC', 'ROW1', 'ROW2', 'Unnamed: 9']:
                tier = str(row.get(col, '')).strip()
                if tier and tier != 'nan':
                    rev_col_map[col] = tier
            continue
        if cat and cat != 'nan' and cat != 'Emerging Tech Category':
            if not in_rev_section:
                lookups['emerging_tech']['region_adj'][cat] = {
                    r: float(row[r]) if r in df.columns and pd.notna(row[r]) else 0
                    for r in region_cols
                }
            else:
                lookups['emerging_tech']['revenue_adj'][cat] = {
                    tier_name: float(row[col]) if pd.notna(row.get(col)) else 0
                    for col, tier_name in rev_col_map.items()
                    if pd.notna(row.get(col))
                }

    # Load Emerging Tech Industry Base (from EmergTech_Adj.csv)
    et_adj_df = pd.read_csv(os.path.join(base_path, 'EmergTech_Adj.csv'))
    for _, row in et_adj_df.iterrows():
        industry = str(row['Industry']).strip()
        if industry and industry != 'Industry':
            lookups['emerging_tech']['industry_base'][industry] = {}
            for et_cat in et_adj_df.columns[1:]:
                lookups['emerging_tech']['industry_base'][industry][et_cat] = float(row[et_cat] or 0)

    return lookups

def load_deep_hierarchy():
    # We'll use the structure from IT_Spend_Estimator.csv (rows 29-137)
    df = pd.read_csv(os.path.join(base_path, 'IT_Spend_Estimator.csv'), skiprows=28)
    # Mapping based on user request: Level 1 -> Level 2 -> Level 3
    # L1_Name corresponds to the "Level 1" column in the original CSV
    df.columns = ['Segment', 'L1', 'L1_Name', 'L2', 'L3', 'Weight', 'M', 'K', 'U1', 'U2', 'U3', 'U4', 'U5']
    
    # Build a map: L3 -> {L1, L2}
    mapping = {}
    for _, row in df.iterrows():
        l3 = str(row['L3']).strip()
        if l3 and l3 != 'nan' and l3 != 'Level 3':
            mapping[l3] = {
                'l1': str(row['L1_Name']).strip() if not pd.isna(row['L1_Name']) else 'Other',
                'l2': str(row['L2']).strip() if not pd.isna(row['L2']) else 'General'
            }
            
    # Now load weights and group them by Level 1 -> Level 2 -> Level 3
    it_df = pd.read_csv(os.path.join(base_path, 'Breakdown_2024_Subcat.csv'))
    it_breakdowns = {}
    for _, row in it_df.iterrows():
        industry = str(row['Industry']).strip()
        l3 = str(row['Subcategory']).strip()
        weight = float(row['% of IT (decimal)'])
        
        info = mapping.get(l3, {'l1': 'Other', 'l2': 'General'})
        top_l1 = info['l1']
        top_l2 = info['l2']
        
        if industry not in it_breakdowns:
            it_breakdowns[industry] = {}
        
        if top_l1 not in it_breakdowns[industry]:
            it_breakdowns[industry][top_l1] = {}
        if top_l2 not in it_breakdowns[industry][top_l1]:
            it_breakdowns[industry][top_l1][top_l2] = {}
            
        it_breakdowns[industry][top_l1][top_l2][l3] = weight
        
    return it_breakdowns

def load_erd_breakdowns():
    erd_df = pd.read_csv(os.path.join(base_path, 'ERD_Spend_Split.csv'))
    erd_breakdowns = {}
    categories = erd_df.columns[1:-1]
    for _, row in erd_df.iterrows():
        industry = str(row['Industry']).strip()
        if industry and industry != 'Industry':
            erd_breakdowns[industry] = {}
            for cat in categories:
                erd_breakdowns[industry][cat] = float(row[cat] or 0)
    return erd_breakdowns

def load_countries():
    df = pd.read_csv(os.path.join(base_path, 'Countries.csv'))
    data = {}
    for _, row in df.iterrows():
        country = str(row['Country']).strip()
        region = str(row['Region']).strip()
        if country and country != 'nan' and country != 'Country':
            data[country] = region
    return data

data = {
    'multiyear': load_industry_multiyear(),
    'lookups': load_lookups(),
    'countries': load_countries(),
    'it_breakdown': load_deep_hierarchy(),
    'erd_breakdown': load_erd_breakdowns()
}

with open(os.path.join(web_app_src, 'data.json'), 'w') as f:
    json.dump(data, f, indent=2)

print("Data extraction complete: src/data.json")
