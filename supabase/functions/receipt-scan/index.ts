const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

interface Category {
  id: string;
  name: string;
  type: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY nincs beállítva a Supabase secrets-ben");
    }

    const { image, mimeType, categories } = await req.json() as {
      image: string;
      mimeType: string;
      categories: Category[];
    };

    if (!image || !mimeType) {
      throw new Error("Hiányzó paraméterek: image, mimeType");
    }

    const expenseCategories = (categories ?? []).filter((c) => c.type === "expense");
    const categoryList = expenseCategories.map((c) => `${c.id}: ${c.name}`).join("\n");

    const prompt = `Elemezd ezt a magyar bolti blokkot (nyugtát). Nyerd ki a következő adatokat:
1. Az üzlet neve (csak a bolt neve, pl. "ALDI", "COOP", "Tesco" — nem a cím)
2. A vásárlás dátuma YYYY-MM-DD formátumban
3. A fizetett végösszeg (csak a szám, HUF-ban, tizedesvessző nélkül)
4. A legmegfelelőbb kategória ID az alábbi listából (amelyik legjobban illik a bolthoz/vásárláshoz):

${categoryList || "(nincs kategória)"}

Válaszolj KIZÁRÓLAG érvényes JSON-nal, semmi más szöveget ne írj:
{"storeName": "...", "date": "YYYY-MM-DD", "amount": 12345, "categoryId": "uuid-vagy-null"}

Ha valamit nem tudsz kiolvasni, használj ésszerű alapértékeket (dátumnál mai napot, összegnél 0-t).`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mimeType, data: image },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Claude API hiba (${anthropicRes.status}): ${errText.slice(0, 200)}`);
    }

    const anthropicData = await anthropicRes.json();
    const rawText = (anthropicData.content?.[0]?.text ?? "").trim();

    // Extract JSON even if there's surrounding text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Nem sikerült JSON-t kiolvasni a válaszból");

    const result = JSON.parse(jsonMatch[0]);

    // Sanity-check the result
    const safe = {
      storeName: typeof result.storeName === "string" ? result.storeName : "Ismeretlen üzlet",
      date: /^\d{4}-\d{2}-\d{2}$/.test(result.date)
        ? result.date
        : new Date().toISOString().slice(0, 10),
      amount: Number.isFinite(Number(result.amount)) ? Math.round(Number(result.amount)) : 0,
      categoryId: typeof result.categoryId === "string" && result.categoryId !== "null"
        ? result.categoryId
        : null,
    };

    return new Response(JSON.stringify(safe), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
