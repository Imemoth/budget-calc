import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Category = { id: string; name: string; type: "income" | "expense" };

type ParseResult = {
  name: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  date: string;
  notes: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, categories, today } = await req.json() as {
      text: string;
      categories: Category[];
      today: string; // YYYY-MM-DD
    };

    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ error: "Hiányzó szöveg" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const categoryList = categories
      .map(c => `${c.id} | ${c.name} | ${c.type}`)
      .join("\n");

    const systemPrompt = `Te egy magyar háztartási költségvetés alkalmazás AI asszisztense vagy.
A felhasználó szöveges leírásából kell strukturált tranzakció adatot kinyerni.

Elérhető kategóriák (id | név | típus):
${categoryList}

Mai dátum: ${today}

Mindig JSON-t adj vissza pontosan ebben a formátumban:
{
  "name": "string (rövid, tömör megnevezés)",
  "amount": number (csak pozitív szám, Ft-ban),
  "type": "income" | "expense",
  "categoryId": "string | null (csak az elérhető kategóriák id-jából válassz, ha egyik sem illik: null)",
  "date": "YYYY-MM-DD (ha nem mondja, mai nap)",
  "notes": "string (extra kontextus, ha van; egyébként üres string)"
}

Szabályok:
- "vettem", "fizettem", "kiadás", "vásárlás" → expense
- "kaptam", "fizetést", "bevétel", "visszatérítés" → income
- Ha valuta nincs megadva, Ft-ban értelmezd
- Ha összeg nincs megadva, amount = 0
- Csak valid JSON-t adj vissza, semmi mást`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();

    // JSON kinyerés (ha esetleg markdown code block-ba teszi)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Nem sikerült értelmezni a választ" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: ParseResult = JSON.parse(jsonMatch[0]);

    // Validáció: categoryId csak akkor marad, ha valóban létezik
    const validCatIds = new Set(categories.map(c => c.id));
    if (result.categoryId && !validCatIds.has(result.categoryId)) {
      result.categoryId = null;
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
