// ============================================================
// Revolut CSV parser (HU export formátum)
// Fejléc: Típus,Termék,Kezdés dátuma,Teljesítés dátuma,Leírás,Összeg,Díj,Pénznem,State,Egyenleg
// ============================================================

export interface RevolutRow {
  type: string;        // Típus (pl. Kártyás fizetés, Feltöltés, Átutalás)
  product: string;     // Termék (pl. Folyószámla)
  startDate: string;   // Kezdés dátuma (YYYY-MM-DD HH:mm:ss)
  completedDate: string; // Teljesítés dátuma
  description: string; // Leírás (merchant neve)
  amount: number;      // Összeg (negatív = kiadás)
  fee: number;         // Díj
  currency: string;    // Pénznem
  state: string;       // State (ELVÉGEZVE / VISSZAUTASÍTVA stb.)
  balance: number;     // Egyenleg
}

export interface ParsedRevolutTx {
  description: string;
  date: string;        // YYYY-MM-DD
  amount: number;      // abszolút érték
  moneyType: "income" | "expense";
  currency: string;
  revolType: string;   // eredeti típus
  suggestedCategory?: string; // kategória név javaslat
}

/** Revolut CSV string → ParsedRevolutTx[] */
export function parseRevolutCsv(csvText: string): ParsedRevolutTx[] {
  const lines = csvText
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  // Fejléc ellenőrzés (engedékeny)
  const header = lines[0].split(",").map(h => h.trim());
  const col = (name: string) => header.findIndex(h => h.includes(name));

  const iDesc     = col("Leírás");
  const iCompleted = col("Teljesítés");
  const iAmount   = col("Összeg");
  const iFee      = col("Díj");
  const iCurrency = col("Pénznem");
  const iState    = col("State");
  const iType     = col("Típus");

  if (iDesc < 0 || iAmount < 0 || iCompleted < 0) {
    throw new Error("Nem Revolut formátumú CSV — hiányzó oszlopok.");
  }

  const results: ParsedRevolutTx[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length < 5) continue;

    const state    = iState >= 0 ? cells[iState]?.trim() : "ELVÉGEZVE";
    if (state && state !== "ELVÉGEZVE" && state !== "COMPLETED") continue;

    const amountStr = cells[iAmount]?.replace(",", ".").trim() ?? "0";
    const feeStr    = cells[iFee]?.replace(",", ".").trim()    ?? "0";
    const amount    = parseFloat(amountStr) || 0;
    const fee       = parseFloat(feeStr)    || 0;
    if (amount === 0) continue;

    const netAmount = amount - fee; // díjat levonjuk
    const desc      = cells[iDesc]?.trim()     ?? "";
    const completed = cells[iCompleted]?.trim() ?? "";
    const currency  = iCurrency >= 0 ? (cells[iCurrency]?.trim() ?? "HUF") : "HUF";
    const revolType = iType >= 0 ? (cells[iType]?.trim() ?? "") : "";

    const date = completed.slice(0, 10); // YYYY-MM-DD
    if (!date || date.length < 10) continue;

    results.push({
      description: desc,
      date,
      amount: Math.abs(netAmount),
      moneyType: netAmount > 0 ? "income" : "expense",
      currency,
      revolType,
      suggestedCategory: suggestCategory(desc, netAmount > 0),
    });
  }

  return results;
}

/** Vesszővel tagolt sor split, idézőjeles mezőket is kezeli */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/** Merchant névből kategória javaslat */
function suggestCategory(name: string, isIncome: boolean): string {
  const n = name.toLowerCase();

  if (isIncome) {
    if (n.includes("feltöltés") || n.includes("topup")) return "Munkabér";
    if (n.includes("átutalás tőle") || n.includes("transfer from")) return "Egyéb bevétel";
    if (n.includes("visszatér") || n.includes("refund")) return "Visszatérítés";
    return "Egyéb bevétel";
  }

  // Élelmiszer
  if (/tesco|lidl|aldi|spar|auchan|cba|rossmann|dm |penny|ecofamily|real |billa/i.test(n))
    return "Élelmiszer & háztartás 🛒";

  // Étterem
  if (/mcdonald|burger|pizza|kfc|subway|starbucks|wolt|foodpanda|bellozzo|étterem|resto|café|kávé/i.test(n))
    return "Étkezésen kívül 🍽️";

  // Közlekedés
  if (/bkk|mav|volán|taxi|uber|bolt (ride|taxi)|parking|parkolás/i.test(n))
    return "Közlekedés 🚗";

  // Üzemanyag
  if (/mol |shell|bp |eni |lukoil|benzin|tankolás|omv/i.test(n))
    return "Közlekedés 🚗";

  // Online vásárlás / ruha
  if (/temu|amazon|aliexpress|takko|zara|h&m|c&a|primark|pepco/i.test(n))
    return "Ruházat & személyes 👕";

  // Szórakozás
  if (/netflix|spotify|apple|google play|steam|cinema|mozi/i.test(n))
    return "Előfizetések & digitális 🧩";

  // Átutalás
  if (/átutalás/i.test(n)) return "Egyéb / váratlan 🧯";

  return "Egyéb / váratlan 🧯";
}
