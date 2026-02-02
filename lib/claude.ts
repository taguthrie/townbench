import Anthropic from "@anthropic-ai/sdk";
import { BUDGET_CATEGORIES, SUBCATEGORIES } from "./taxonomy";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ParsedBudgetItem {
  category: string;
  subcategory: string;
  line_item: string;
  amount: number;
}

const SYSTEM_PROMPT = `You are a municipal budget parsing assistant. You will receive raw text extracted from a town budget PDF document.

Your job is to extract every budget line item and classify it into the following taxonomy:

Categories: ${BUDGET_CATEGORIES.join(", ")}

Subcategories by category:
${Object.entries(SUBCATEGORIES)
  .map(([cat, subs]) => `${cat}: ${subs.join(", ")}`)
  .join("\n")}

For each line item found, return a JSON array of objects with:
- "category": one of the categories above
- "subcategory": one of the subcategories for that category
- "line_item": the specific line item name from the budget
- "amount": the dollar amount as a number (no commas, no dollar signs)

If a line item doesn't clearly fit, use the closest match. Use "Transfers & Other" / "Other" as a last resort.

Return ONLY valid JSON — no markdown, no explanation. Just the array.`;

export async function parseBudgetText(
  text: string
): Promise<ParsedBudgetItem[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `Parse the following budget document text and extract all line items:\n\n${text}`,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return JSON.parse(content.text) as ParsedBudgetItem[];
}
