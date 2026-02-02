/**
 * NHPFC DRA account code → TownBench taxonomy mapping
 *
 * NHPFC expenditure CSVs use NH DRA account codes as column headers, e.g.:
 *   "4130-4139 - Executive"
 *   "4210-4214 - Police"
 *
 * This maps the descriptive part (after the code) to our 10-category taxonomy.
 */

interface CategoryMapping {
  category: string;
  subcategory: string;
}

export const NHPFC_CATEGORY_MAP: Record<string, CategoryMapping> = {
  // General Government
  "Executive": { category: "General Government", subcategory: "Selectboard / Town Manager" },
  "Election Registration Vital Statistics": { category: "General Government", subcategory: "Town Clerk" },
  "Financial Administration": { category: "General Government", subcategory: "Finance / Treasurer" },
  "Revaulation of Property": { category: "General Government", subcategory: "Assessor" },
  "Revaluation of Property": { category: "General Government", subcategory: "Assessor" },
  "Legal Expense": { category: "General Government", subcategory: "Legal Services" },
  "Personnel Administration": { category: "Insurance & Benefits", subcategory: "Employee Benefits" },
  "Planning and Zoning": { category: "General Government", subcategory: "Planning & Zoning" },
  "Planning & Zoning": { category: "General Government", subcategory: "Planning & Zoning" },
  "General Government Buildings": { category: "General Government", subcategory: "General Administration" },
  "Cemeteries": { category: "Culture & Recreation", subcategory: "Cemetery" },
  "Insurance": { category: "Insurance & Benefits", subcategory: "Property & Casualty Insurance" },
  "Advertising and Regional Association": { category: "General Government", subcategory: "General Administration" },
  "Other General Government": { category: "General Government", subcategory: "General Administration" },

  // Public Safety
  "Police": { category: "Public Safety", subcategory: "Police" },
  "Ambulance": { category: "Public Safety", subcategory: "Emergency Medical Services" },
  "Fire": { category: "Public Safety", subcategory: "Fire Department" },
  "Building Inspection": { category: "Public Safety", subcategory: "Building Inspection" },
  "Emergency Management": { category: "Public Safety", subcategory: "Emergency Management" },
  "Other (Incl. Communications)": { category: "Public Safety", subcategory: "Police" },

  // Highways / Public Works
  "Administration": { category: "Public Works", subcategory: "Highway Department" },
  "Highways and Streets": { category: "Public Works", subcategory: "Highway Department" },
  "Bridges": { category: "Public Works", subcategory: "Highway Department" },
  "Street Lighting": { category: "Public Works", subcategory: "Street Lighting" },
  "Other": { category: "Transfers & Other", subcategory: "Other" },

  // Sanitation
  "Solid Waste Collection": { category: "Public Works", subcategory: "Solid Waste / Recycling" },
  "Solid Waste Disposal": { category: "Public Works", subcategory: "Solid Waste / Recycling" },
  "Solid Waste Cleanup": { category: "Public Works", subcategory: "Solid Waste / Recycling" },
  "Sewage Collection and Disposal": { category: "Public Works", subcategory: "Water / Sewer" },
  "Sewage and Other": { category: "Public Works", subcategory: "Water / Sewer" },
  "Other Sanitation": { category: "Public Works", subcategory: "Solid Waste / Recycling" },

  // Water
  "Water Services": { category: "Public Works", subcategory: "Water / Sewer" },
  "Water Treatment": { category: "Public Works", subcategory: "Water / Sewer" },
  "Water Conservation and Other": { category: "Public Works", subcategory: "Water / Sewer" },

  // Electric
  "Administration and Generation": { category: "Public Works", subcategory: "Fleet Maintenance" },
  "Purchase Costs": { category: "Public Works", subcategory: "Fleet Maintenance" },
  "Electric Equipment Maintenance": { category: "Public Works", subcategory: "Fleet Maintenance" },
  "Other Electric Costs": { category: "Public Works", subcategory: "Fleet Maintenance" },

  // Airport
  "Airport Operations": { category: "Transfers & Other", subcategory: "Other" },

  // Health
  "Pest Control": { category: "Health & Human Services", subcategory: "Health Department" },
  "Health Agencies Hospitals Other": { category: "Health & Human Services", subcategory: "Health Department" },

  // Welfare
  "Administration and Direct Assistance": { category: "Health & Human Services", subcategory: "Social Services" },
  "Intergovernmental Welfare Payments": { category: "Health & Human Services", subcategory: "Social Services" },
  "Vendor Payments and Other": { category: "Health & Human Services", subcategory: "Social Services" },

  // Culture & Recreation
  "Parks and Recreation": { category: "Culture & Recreation", subcategory: "Parks & Recreation" },
  "Library": { category: "Culture & Recreation", subcategory: "Library" },
  "Patriotic Purposes": { category: "Culture & Recreation", subcategory: "Arts & Culture" },
  "Other Culture and Recreation": { category: "Culture & Recreation", subcategory: "Arts & Culture" },

  // Conservation
  "Admin and Purch of Natural Resources": { category: "Culture & Recreation", subcategory: "Conservation" },
  "Other Conservation": { category: "Culture & Recreation", subcategory: "Conservation" },
  "Redevelopment and Housing": { category: "Health & Human Services", subcategory: "Housing" },
  "Economic Development": { category: "General Government", subcategory: "General Administration" },

  // Debt Service
  "Long Term Bonds and Notes Principal": { category: "Debt Service", subcategory: "Principal" },
  "Long Term Bonds and Notes Interest": { category: "Debt Service", subcategory: "Interest" },
  "Tax Anticipation Notes Interest": { category: "Debt Service", subcategory: "Short-term Borrowing" },
  "Other Debt Service": { category: "Debt Service", subcategory: "Interest" },

  // Capital Outlay
  "Land": { category: "Capital Improvements", subcategory: "Buildings" },
  "Machinery Vehicles Equipment": { category: "Capital Improvements", subcategory: "Equipment" },
  "Buildings": { category: "Capital Improvements", subcategory: "Buildings" },
  "Improvements Other than Buildings": { category: "Capital Improvements", subcategory: "Roads & Bridges" },

  // Transfers
  "To Special Revenue Fund": { category: "Transfers & Other", subcategory: "Reserve Fund" },
  "To Capital Projects Fund": { category: "Transfers & Other", subcategory: "Reserve Fund" },
  "To Proprietary Fund Airport": { category: "Transfers & Other", subcategory: "Other" },
  "To Proprietary Fund Electric": { category: "Transfers & Other", subcategory: "Other" },
  "To Proprietary Fund Other": { category: "Transfers & Other", subcategory: "Other" },
  "To Proprietary Fund Sewer": { category: "Transfers & Other", subcategory: "Other" },
  "To Proprietary Fund Water": { category: "Transfers & Other", subcategory: "Other" },
  "To Capital Reserve Fund": { category: "Transfers & Other", subcategory: "Reserve Fund" },
  "To Expendable Trusts": { category: "Transfers & Other", subcategory: "Reserve Fund" },
  "To Health Maint Trusts": { category: "Transfers & Other", subcategory: "Reserve Fund" },
  "To Nonexpendable Trusts": { category: "Transfers & Other", subcategory: "Reserve Fund" },
  "To Agency Funds": { category: "Transfers & Other", subcategory: "Other" },

  // Tax assessments (pass-through, not municipal expenditure)
  "Taxes Assessed for County": { category: "Transfers & Other", subcategory: "County Tax" },
  "Taxes Assessed for Village District": { category: "Transfers & Other", subcategory: "Regional Assessments" },
  "Taxes Assessed for Local Education": { category: "Education", subcategory: "K-12 Education" },
  "Taxes Assessed for State Education": { category: "Education", subcategory: "K-12 Education" },
  "Payments to Other Governments": { category: "Transfers & Other", subcategory: "Regional Assessments" },
};

/** Default mapping for unmapped NHPFC categories */
export const DEFAULT_MAPPING: CategoryMapping = {
  category: "Transfers & Other",
  subcategory: "Other",
};

/**
 * Extract the descriptive name from an NHPFC column header.
 * E.g. "4130-4139 - Executive" → "Executive"
 *      "4914A - To Proprietary Fund Airport" → "To Proprietary Fund Airport"
 */
export function extractCategoryName(columnHeader: string): string {
  // Match pattern: optional code prefix, then " - ", then the name
  const match = columnHeader.match(/^\d[\d\w-]*\s*-\s*(.+)$/);
  return match ? match[1].trim() : columnHeader.trim();
}

/**
 * Map an NHPFC column header to a TownBench category/subcategory.
 */
export function mapNhpfcCategory(columnHeader: string): CategoryMapping {
  const name = extractCategoryName(columnHeader);

  // Exact match on extracted name
  if (NHPFC_CATEGORY_MAP[name]) {
    return NHPFC_CATEGORY_MAP[name];
  }

  // Try the full header as-is
  if (NHPFC_CATEGORY_MAP[columnHeader]) {
    return NHPFC_CATEGORY_MAP[columnHeader];
  }

  // Substring match
  const lower = name.toLowerCase();
  for (const [key, mapping] of Object.entries(NHPFC_CATEGORY_MAP)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return mapping;
    }
  }

  console.warn(`  [WARN] Unmapped NHPFC category: "${columnHeader}" → defaulting to Transfers & Other / Other`);
  return DEFAULT_MAPPING;
}
