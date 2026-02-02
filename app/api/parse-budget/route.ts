import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractTextFromPdf } from "@/lib/pdf";
import { parseBudgetText } from "@/lib/claude";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const townId = formData.get("town_id") as string | null;
  const fiscalYear = formData.get("fiscal_year") as string | null;

  if (!file || !townId || !fiscalYear) {
    return NextResponse.json(
      { error: "file, town_id, and fiscal_year are required" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rawText = await extractTextFromPdf(buffer);

  // Store the document
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      town_id: townId,
      filename: file.name,
      fiscal_year: parseInt(fiscalYear),
      raw_text: rawText,
    })
    .select()
    .single();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  // Parse with Claude
  const parsedItems = await parseBudgetText(rawText);

  // Insert budget line items
  const lineItems = parsedItems.map((item) => ({
    town_id: townId,
    document_id: doc.id,
    fiscal_year: parseInt(fiscalYear),
    category: item.category,
    subcategory: item.subcategory,
    line_item: item.line_item,
    amount: item.amount,
  }));

  const { error: insertError } = await supabase
    .from("budget_line_items")
    .insert(lineItems);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    document_id: doc.id,
    items_parsed: lineItems.length,
  });
}
