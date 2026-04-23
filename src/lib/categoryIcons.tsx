import React from "react";

type IconDef = { emoji: string; bg: string };

const EXPENSE_RULES: { keys: string[]; def: IconDef }[] = [
  { keys: ["élelmiszer","bevásárlás","auchan","lidl","tesco","spar","aldi","market","élelmis"], def: { emoji: "🛒", bg: "var(--color-positive)22" } },
  { keys: ["étterem","kávé","coffee","starbucks","wolt","mcdonald","pizza","burger","étkezé","pad"], def: { emoji: "🍽️", bg: "#F9731622" } },
  { keys: ["közlekedés","bkk","bérlet","metró","busz","tram","vonat","mav","taxi","uber"], def: { emoji: "🚌", bg: "#3B82F622" } },
  { keys: ["üzemanyag","mol","shell","bp","benzin","tankolás","diesel"], def: { emoji: "⛽", bg: "#EA580C22" } },
  { keys: ["előfizetés","netflix","spotify","apple","youtube","adobe","digitális","subscri"], def: { emoji: "🎵", bg: "#8B5CF622" } },
  { keys: ["lakhatás","lakbér","albérlet","bérleti","hitel","törlesztő","lakás 🏠","lakb"], def: { emoji: "🏠", bg: "#0EA5E922" } },
  { keys: ["rezsi","villany","gáz","víz","internet","mobil","e.on","mvm","t-mobile","mol energia"], def: { emoji: "⚡", bg: "#EAB30822" } },
  { keys: ["egészség","orvos","gyógyszer","kórház","fogászat","patika","egészs","orvosi"], def: { emoji: "🏥", bg: "#EF444422" } },
  { keys: ["szórakozás","mozi","cinema","játék","game","hobbi","sport","edzés","fitness","szórak"], def: { emoji: "🎮", bg: "#8B5CF622" } },
  { keys: ["ruházat","ruha","cipő","öltözék","divat","zara","h&m","ruház"], def: { emoji: "👕", bg: "#EC489922" } },
  { keys: ["utazás","repülő","hotel","szállás","airbnb","booking","nyaralás","travel"], def: { emoji: "✈️", bg: "#0EA5E922" } },
  { keys: ["ajándék","jótékony","charity","aján"], def: { emoji: "🎁", bg: "#EF444422" } },
  { keys: ["biztosítás","insurance","biztosít"], def: { emoji: "🛡️", bg: "#6B728022" } },
  { keys: ["adó","díj","illeték","bírság","csekk","adók"], def: { emoji: "📋", bg: "#6B728022" } },
  { keys: ["megtakarítás","savings","keret"], def: { emoji: "🐖", bg: "var(--color-warning)22" } },
  { keys: ["család","gyerek","baba","iskola","óvoda","csala"], def: { emoji: "👶", bg: "#EC489922" } },
];

const INCOME_RULES: { keys: string[]; def: IconDef }[] = [
  { keys: ["munkabér","fizetés","nettó","bónusz","prémium","cafeteria","jövedelem","salary","munka"], def: { emoji: "💼", bg: "var(--color-positive)22" } },
  { keys: ["vállalkozás","mellékes","freelance","szabadúszás","projekt","online bevétel"], def: { emoji: "💻", bg: "var(--color-positive)22" } },
  { keys: ["kamat","osztalék","befektetés","árfolyam","hozam"], def: { emoji: "📈", bg: "var(--color-positive)22" } },
  { keys: ["visszatérítés","visszatér","refund"], def: { emoji: "↩️", bg: "var(--color-positive)22" } },
  { keys: ["eladás","bevétel","egyéb"], def: { emoji: "💰", bg: "var(--color-positive)22" } },
  { keys: ["támogatás","ellátás","nyugdíj","ösztöndíj","segély"], def: { emoji: "🏛️", bg: "var(--color-positive)22" } },
];

function matchRules(name: string, rules: { keys: string[]; def: IconDef }[]): IconDef | null {
  const lower = name.toLowerCase();
  for (const rule of rules) {
    if (rule.keys.some(k => lower.includes(k))) return rule.def;
  }
  return null;
}

export function getCategoryIcon(
  categoryName: string,
  type: "income" | "expense"
): React.ReactNode {
  const rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;
  const match = matchRules(categoryName, rules) ?? (
    type === "income"
      ? { emoji: "💰", bg: "var(--color-positive)22" }
      : { emoji: "💸", bg: "var(--color-negative)22" }
  );

  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
      style={{ background: match.bg }}
    >
      {match.emoji}
    </div>
  );
}
