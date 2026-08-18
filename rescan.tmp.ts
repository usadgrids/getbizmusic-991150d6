import { runKnowledgeScan } from "./src/lib/kg-scan.server";
const targets = [
  { businessName: "1800 Anytyme Plumbing, Heating & Air", city: "Vista", state: "CA" },
  { businessName: "Vazquez Cervantes & Co", city: "Chula Vista", state: "CA" },
];
for (const t of targets) {
  const r: any = await runKnowledgeScan(t);
  console.log("=== " + t.businessName);
  console.log(JSON.stringify({ score: r.score, priceRange: (r.schema?.localBusiness as any)?.priceRange ?? null,
    notes: r.schema?.notes, qa: r.qa.map((q: any) => ({ a: q.answered, ans: q.answer?.slice(0,120) })) }, null, 1));
}
