-- Remove old CT data and insert correct Maine towns
delete from budget_line_items;
delete from documents;
delete from towns;

-- Insert 5 sample Maine towns (from spec)
insert into towns (id, name, state, population, road_miles, grand_list_valuation, fiscal_year) values
  ('11111111-1111-1111-1111-111111111111', 'Orland', 'ME', 2225, 42.3, 339878982, 2024),
  ('22222222-2222-2222-2222-222222222222', 'Bucksport', 'ME', 4924, 58.1, 512000000, 2024),
  ('33333333-3333-3333-3333-333333333333', 'Blue Hill', 'ME', 2689, 51.2, 485000000, 2024),
  ('44444444-4444-4444-4444-444444444444', 'Castine', 'ME', 1366, 22.4, 298000000, 2024),
  ('55555555-5555-5555-5555-555555555555', 'Penobscot', 'ME', 1277, 38.6, 189000000, 2024);

-- Budget line items for Orland
insert into budget_line_items (town_id, fiscal_year, category, subcategory, line_item, amount) values
  ('11111111-1111-1111-1111-111111111111', 2024, 'General Government', 'Selectboard / Town Manager', 'Selectmen Stipends', 9000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'General Government', 'Town Clerk', 'Town Clerk Office', 62000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'General Government', 'Finance / Treasurer', 'Treasurer / Tax Collector', 48000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'General Government', 'Assessor', 'Assessor Services', 32000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'General Government', 'General Administration', 'Town Office Operations', 45000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Public Safety', 'Fire Department', 'Volunteer Fire Department', 85000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Public Safety', 'Emergency Medical Services', 'Ambulance Service Contract', 42000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Public Safety', 'Animal Control', 'Animal Control Officer', 8500),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Public Works', 'Highway Department', 'Road Maintenance', 385000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Public Works', 'Winter Maintenance', 'Snow Removal & Sanding', 195000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Public Works', 'Solid Waste / Recycling', 'Transfer Station', 112000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Health & Human Services', 'Social Services', 'General Assistance', 15000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Culture & Recreation', 'Library', 'Orland Library', 18000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Culture & Recreation', 'Cemetery', 'Cemetery Maintenance', 12000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Education', 'K-12 Education', 'RSU 25 Assessment', 1850000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Debt Service', 'Principal', 'Debt Principal', 65000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Debt Service', 'Interest', 'Debt Interest', 18000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Insurance & Benefits', 'Property & Casualty Insurance', 'Municipal Insurance', 52000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Insurance & Benefits', 'Workers Compensation', 'Workers Comp', 22000),
  ('11111111-1111-1111-1111-111111111111', 2024, 'Transfers & Other', 'County Tax', 'Hancock County Tax', 185000);

-- Budget line items for Bucksport
insert into budget_line_items (town_id, fiscal_year, category, subcategory, line_item, amount) values
  ('22222222-2222-2222-2222-222222222222', 2024, 'General Government', 'Selectboard / Town Manager', 'Town Manager Office', 185000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'General Government', 'Town Clerk', 'Town Clerk', 78000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'General Government', 'Finance / Treasurer', 'Finance Department', 95000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'General Government', 'Assessor', 'Assessor Office', 68000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'General Government', 'Planning & Zoning', 'Code Enforcement', 72000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Public Safety', 'Police', 'Police Department', 820000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Public Safety', 'Fire Department', 'Fire Department', 245000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Public Safety', 'Emergency Medical Services', 'Ambulance Service', 185000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Public Works', 'Highway Department', 'Public Works Department', 680000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Public Works', 'Winter Maintenance', 'Snow Removal', 310000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Public Works', 'Solid Waste / Recycling', 'Transfer Station', 285000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Public Works', 'Water / Sewer', 'Wastewater Treatment', 420000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Health & Human Services', 'Social Services', 'General Assistance', 35000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Culture & Recreation', 'Library', 'Buck Memorial Library', 165000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Culture & Recreation', 'Parks & Recreation', 'Recreation Department', 95000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Education', 'K-12 Education', 'RSU 25 Assessment', 4200000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Debt Service', 'Principal', 'Debt Principal', 320000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Debt Service', 'Interest', 'Debt Interest', 85000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Insurance & Benefits', 'Employee Benefits', 'Employee Benefits', 480000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Insurance & Benefits', 'Property & Casualty Insurance', 'Municipal Insurance', 125000),
  ('22222222-2222-2222-2222-222222222222', 2024, 'Transfers & Other', 'County Tax', 'Hancock County Tax', 395000);

-- Budget line items for Blue Hill
insert into budget_line_items (town_id, fiscal_year, category, subcategory, line_item, amount) values
  ('33333333-3333-3333-3333-333333333333', 2024, 'General Government', 'Selectboard / Town Manager', 'Selectmen & Administration', 145000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'General Government', 'Town Clerk', 'Town Clerk Office', 72000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'General Government', 'Finance / Treasurer', 'Treasurer', 55000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'General Government', 'Assessor', 'Assessor', 42000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'General Government', 'Planning & Zoning', 'Code Enforcement', 48000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Public Safety', 'Police', 'Police Coverage Contract', 125000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Public Safety', 'Fire Department', 'Volunteer Fire Department', 135000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Public Safety', 'Emergency Medical Services', 'Ambulance Service', 68000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Public Works', 'Highway Department', 'Road Department', 520000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Public Works', 'Winter Maintenance', 'Snow Removal & Salt', 240000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Public Works', 'Solid Waste / Recycling', 'Transfer Station', 165000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Health & Human Services', 'Social Services', 'General Assistance', 20000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Culture & Recreation', 'Library', 'Blue Hill Public Library', 142000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Culture & Recreation', 'Parks & Recreation', 'Town Park', 28000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Culture & Recreation', 'Cemetery', 'Cemeteries', 18000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Education', 'K-12 Education', 'School Department', 2950000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Debt Service', 'Principal', 'Debt Principal', 145000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Debt Service', 'Interest', 'Debt Interest', 38000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Insurance & Benefits', 'Property & Casualty Insurance', 'Municipal Insurance', 78000),
  ('33333333-3333-3333-3333-333333333333', 2024, 'Transfers & Other', 'County Tax', 'Hancock County Tax', 245000);

-- Budget line items for Castine
insert into budget_line_items (town_id, fiscal_year, category, subcategory, line_item, amount) values
  ('44444444-4444-4444-4444-444444444444', 2024, 'General Government', 'Selectboard / Town Manager', 'Town Manager & Selectmen', 125000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'General Government', 'Town Clerk', 'Town Clerk', 52000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'General Government', 'Finance / Treasurer', 'Treasurer', 42000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'General Government', 'Assessor', 'Assessor Services', 28000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Public Safety', 'Fire Department', 'Volunteer Fire Department', 72000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Public Safety', 'Emergency Medical Services', 'Ambulance Contract', 35000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Public Works', 'Highway Department', 'Road Maintenance', 285000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Public Works', 'Winter Maintenance', 'Snow Removal', 135000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Public Works', 'Solid Waste / Recycling', 'Solid Waste Disposal', 82000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Public Works', 'Water / Sewer', 'Water Department', 185000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Health & Human Services', 'Social Services', 'General Assistance', 8000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Culture & Recreation', 'Library', 'Witherle Memorial Library', 95000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Culture & Recreation', 'Parks & Recreation', 'Recreation', 22000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Culture & Recreation', 'Cemetery', 'Cemetery Care', 15000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Education', 'K-12 Education', 'School Department', 1650000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Debt Service', 'Principal', 'Debt Principal', 95000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Debt Service', 'Interest', 'Debt Interest', 22000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Insurance & Benefits', 'Property & Casualty Insurance', 'Municipal Insurance', 58000),
  ('44444444-4444-4444-4444-444444444444', 2024, 'Transfers & Other', 'County Tax', 'Hancock County Tax', 145000);

-- Budget line items for Penobscot
insert into budget_line_items (town_id, fiscal_year, category, subcategory, line_item, amount) values
  ('55555555-5555-5555-5555-555555555555', 2024, 'General Government', 'Selectboard / Town Manager', 'Selectmen Stipends', 7500),
  ('55555555-5555-5555-5555-555555555555', 2024, 'General Government', 'Town Clerk', 'Town Clerk', 45000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'General Government', 'Finance / Treasurer', 'Treasurer / Tax Collector', 38000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'General Government', 'Assessor', 'Assessor Contract', 25000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'General Government', 'General Administration', 'Town Office', 32000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Public Safety', 'Fire Department', 'Volunteer Fire Department', 65000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Public Safety', 'Emergency Medical Services', 'Ambulance Contract', 32000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Public Works', 'Highway Department', 'Road Maintenance', 310000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Public Works', 'Winter Maintenance', 'Snow Removal & Sanding', 165000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Public Works', 'Solid Waste / Recycling', 'Transfer Station', 85000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Health & Human Services', 'Social Services', 'General Assistance', 10000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Culture & Recreation', 'Library', 'Penobscot Library', 5000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Culture & Recreation', 'Cemetery', 'Cemetery Maintenance', 8000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Education', 'K-12 Education', 'School Assessment', 1250000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Debt Service', 'Principal', 'Debt Principal', 45000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Debt Service', 'Interest', 'Debt Interest', 12000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Insurance & Benefits', 'Property & Casualty Insurance', 'Municipal Insurance', 42000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Insurance & Benefits', 'Workers Compensation', 'Workers Comp', 15000),
  ('55555555-5555-5555-5555-555555555555', 2024, 'Transfers & Other', 'County Tax', 'Hancock County Tax', 125000);
