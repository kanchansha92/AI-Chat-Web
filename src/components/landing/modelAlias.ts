/* The landing page never shows a provider's model name. Each model in the
   public catalogue is shown under a plain alias instead, ranked by what it
   costs per reply (cheapest first). The id and cost still come from the
   server, so the aliases stay in step as models are added or removed; only
   the label is swapped. Signed-in screens keep the real names. */

const ALIASES = ["Swift", "Nimble", "Balanced", "Thoughtful", "Deep", "Deepest"];

export interface MaskedModel {
    id: string;
    label: string;
    cost: number;
}

export function maskModels(models: { id: string; label: string; cost: number }[]): MaskedModel[] {
    return [...models]
        .sort((a, b) => a.cost - b.cost)
        .map((m, i) => ({ id: m.id, cost: m.cost, label: ALIASES[i] ?? `Model ${i + 1}` }));
}
