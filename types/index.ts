export interface Town {
  id: string;
  name: string;
  state: string;
  population: number;
  road_miles: number;
  grand_list_valuation: number;
  fiscal_year: number;
  county?: string;
  source_id?: string;
  created_at?: string;
  population_year?: number;
  road_miles_year?: number;
  valuation_year?: number;
}

export interface Document {
  id: string;
  town_id: string;
  filename: string;
  fiscal_year: number;
  uploaded_at?: string;
  raw_text?: string;
}

export interface BudgetLineItem {
  id: string;
  town_id: string;
  document_id?: string;
  fiscal_year: number;
  category: string;
  subcategory: string;
  line_item: string;
  amount: number;
  source_id?: string;
  created_at?: string;
}

export interface DataSource {
  id: string;
  source_key: string;
  source_name: string;
  source_url?: string;
  source_type: string;
  state?: string;
  fiscal_year?: number;
  fetched_at: string;
  row_count: number;
}

export interface TownFinancial {
  id: string;
  town_id: string;
  fiscal_year: number;
  metric_key: string;
  metric_value: number;
  source_id?: string;
  created_at?: string;
}

export type MetricType = "absolute" | "per_capita" | "per_road_mile" | "per_valuation";

export interface BudgetRow {
  category: string;
  subcategory: string;
  line_item: string;
  amount: number;
  perCapita?: number;
  perRoadMile?: number;
  perValuation?: number;
}

export interface ComparisonRow {
  category: string;
  subcategory: string;
  line_item: string;
  amounts: Record<string, number>; // townId -> amount
}
