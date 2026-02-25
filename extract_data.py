import pandas as pd
import json
import os

base_path = '/Users/vibhor/Documents/IT Spending Utility'
web_app_src = os.path.join(base_path, 'web-app/src')

def load_industry_base():
    df = pd.read_csv(os.path.join(base_path, 'Industry_Base.csv'))
    data = {}
    for _, row in df.iterrows():
        industry = str(row['Industry']).strip()
        if industry and industry != 'nan':
            data[industry] = {
                'it': float(row['2024']) if not pd.isna(row['2024']) else 0,
                'erd': float(row['2024.1']) if not pd.isna(row['2024.1']) else 0
            }
    return data

def load_lookups():
    df = pd.read_csv(os.path.join(base_path, 'Lookups.csv'))
    lookups = {
        'region_adj': {},
        'revenue_adj': {}
    }
    
    # Region Adj
    regions = ['US', 'EU', 'APAC', 'ROW1', 'ROW2']
    # Look for the 'Region' column
    region_col = 'Region'
    adj_col = 'Adj'
    for region in regions:
        matches = df[df[region_col] == region]
        if not matches.empty:
            lookups['region_adj'][region] = float(matches[adj_col].values[0])
        
    # Revenue Adj
    # Revenue Tier table starts after a few rows, we can search for it in the 'Region' column (which becomes 'Revenue Tier' later)
    tiers = ['>$5B', '$1B-$5B', '$500M-$1B', '$100M-$500M', '$10M-$100M', '<$10M']
    for tier in tiers:
        # Search in any column for the tier name
        for col in df.columns:
            matches = df[df[col] == tier]
            if not matches.empty:
                # The adjustment value is likely in the 'Adj' column (index 1 usually)
                lookups['revenue_adj'][tier] = float(matches['Adj'].values[0])
                break
        
    return lookups

def load_countries():
    df = pd.read_csv(os.path.join(base_path, 'Countries.csv'))
    data = {}
    for _, row in df.iterrows():
        country = str(row['Country']).strip()
        region = str(row['Region']).strip()
        if country and country != 'nan':
            data[country] = region
    return data

data = {
    'industries': load_industry_base(),
    'lookups': load_lookups(),
    'countries': load_countries()
}

with open(os.path.join(web_app_src, 'data.json'), 'w') as f:
    json.dump(data, f, indent=2)

print("Data extraction complete: src/data.json")
