export const BUDGET_CATEGORIES = [
  "General Government",
  "Public Safety",
  "Public Works",
  "Health & Human Services",
  "Culture & Recreation",
  "Education",
  "Debt Service",
  "Capital Improvements",
  "Insurance & Benefits",
  "Transfers & Other",
] as const;

export const SUBCATEGORIES: Record<string, string[]> = {
  "General Government": [
    "Selectboard / Town Manager",
    "Town Clerk",
    "Finance / Treasurer",
    "Assessor",
    "Planning & Zoning",
    "Legal Services",
    "General Administration",
  ],
  "Public Safety": [
    "Police",
    "Fire Department",
    "Emergency Medical Services",
    "Emergency Management",
    "Animal Control",
    "Building Inspection",
  ],
  "Public Works": [
    "Highway Department",
    "Winter Maintenance",
    "Street Lighting",
    "Solid Waste / Recycling",
    "Water / Sewer",
    "Stormwater",
    "Fleet Maintenance",
  ],
  "Health & Human Services": [
    "Health Department",
    "Social Services",
    "Senior Services",
    "Mental Health",
    "Housing",
  ],
  "Culture & Recreation": [
    "Library",
    "Parks & Recreation",
    "Arts & Culture",
    "Conservation",
    "Cemetery",
  ],
  "Education": [
    "K-12 Education",
    "Special Education",
    "School Transportation",
    "School Facilities",
  ],
  "Debt Service": [
    "Principal",
    "Interest",
    "Short-term Borrowing",
  ],
  "Capital Improvements": [
    "Roads & Bridges",
    "Buildings",
    "Equipment",
    "Technology",
  ],
  "Insurance & Benefits": [
    "Employee Benefits",
    "Property & Casualty Insurance",
    "Workers Compensation",
    "Retirement / Pension",
  ],
  "Transfers & Other": [
    "Reserve Fund",
    "Contingency",
    "Regional Assessments",
    "County Tax",
    "Other",
  ],
};

export const METRIC_LABELS: Record<string, string> = {
  absolute: "Total ($)",
  per_capita: "Per Capita ($)",
  per_road_mile: "Per Road Mile ($)",
  per_valuation: "Per $1K Valuation ($)",
};
