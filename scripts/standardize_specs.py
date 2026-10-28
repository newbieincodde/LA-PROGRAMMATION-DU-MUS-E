import json

with open('assets/data/content.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for art in data['artworks']:
    specs = art.get('specs')
    if isinstance(specs, dict):
        new_specs = []
        if 'medium' in specs:
            new_specs.append({'label': 'Chất liệu', 'value': specs['medium']})
        if 'dimensions' in specs:
            new_specs.append({'label': 'Kích thước', 'value': specs['dimensions']})
        if 'period' in specs:
            new_specs.append({'label': 'Niên đại', 'value': specs['period']})
        if 'location' in specs:
            new_specs.append({'label': 'Địa điểm', 'value': specs['location']})
        if 'accession' in specs:
            new_specs.append({'label': 'Số hiệu hiện vật', 'value': specs['accession']})
        art['specs'] = new_specs

with open('assets/data/content.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Standardized specs for all artworks in content.json")
