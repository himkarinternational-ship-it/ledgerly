import { money, round2 } from "@/lib/accounting/money";

export interface RemunerationInput {
  netProfitAsPerPL: number;
  addBackRemuneration: number;   // remuneration already debited to P&L, added back
  addBackPartnerInterest: number; // partner interest already debited, added back
  addBackDisallowedExpenses: number;
}

export interface RemunerationResult {
  bookProfit: number;
  tierOneLimit: number;   // on first 3,00,000: higher of 1,50,000 or 90%
  tierOneAmount: number;
  tierTwoAmount: number;  // on balance book profit: 60%
  maxAllowableRemuneration: number;
  breakdown: {
    step: string;
    amount: number;
  }[];
}

/**
 * Computes the maximum allowable partner remuneration deduction under
 * Section 40(b) of the Income Tax Act, 1961, as applicable for the vast
 * majority of partnership firms:
 *
 *   Book Profit = Net Profit (per P&L) + remuneration/interest already
 *                 debited to P&L + any disallowed expenses added back
 *
 *   On first ₹3,00,000 of Book Profit: higher of ₹1,50,000 or 90% of Book Profit
 *   On the balance Book Profit: 60%
 *
 * If Book Profit is negative or zero, the allowable amount is a flat
 * ₹1,50,000 per the statute's minimum-guarantee clause.
 *
 * This computes the LIMIT only. Actual remuneration paid must still not
 * exceed what the partnership deed authorizes — that check is the caller's
 * responsibility (compare against the deed's stated formula/cap).
 */
export function calculateSection40bLimit(input: RemunerationInput): RemunerationResult {
  const bookProfit = round2(
    money(input.netProfitAsPerPL)
      .plus(input.addBackRemuneration)
      .plus(input.addBackPartnerInterest)
      .plus(input.addBackDisallowedExpenses)
  );

  const breakdown: RemunerationResult["breakdown"] = [
    { step: "Net Profit as per Profit & Loss Account", amount: round2(input.netProfitAsPerPL) },
    { step: "Add: Partner remuneration debited to P&L", amount: round2(input.addBackRemuneration) },
    { step: "Add: Partner interest debited to P&L", amount: round2(input.addBackPartnerInterest) },
    { step: "Add: Other disallowed expenses", amount: round2(input.addBackDisallowedExpenses) },
    { step: "Book Profit", amount: bookProfit },
  ];

  if (bookProfit <= 0) {
    const flatLimit = 150000;
    breakdown.push({
      step: "Book Profit is nil/negative — flat statutory minimum applies",
      amount: flatLimit,
    });
    return {
      bookProfit,
      tierOneLimit: flatLimit,
      tierOneAmount: flatLimit,
      tierTwoAmount: 0,
      maxAllowableRemuneration: flatLimit,
      breakdown,
    };
  }

  const tierOneThreshold = 300000;
  const tierOneBase = Math.min(bookProfit, tierOneThreshold);
  const ninetyPercent = round2(money(tierOneBase).times(0.9));
  const tierOneAmount = Math.max(150000, ninetyPercent);

  breakdown.push({
    step: `On first ₹3,00,000 of Book Profit: higher of ₹1,50,000 or 90% (₹${ninetyPercent.toLocaleString("en-IN")})`,
    amount: tierOneAmount,
  });

  const balanceBookProfit = Math.max(0, round2(money(bookProfit).minus(tierOneThreshold)));
  const tierTwoAmount = round2(money(balanceBookProfit).times(0.6));

  if (balanceBookProfit > 0) {
    breakdown.push({
      step: `On balance Book Profit of ₹${balanceBookProfit.toLocaleString("en-IN")}: 60%`,
      amount: tierTwoAmount,
    });
  }

  const maxAllowableRemuneration = round2(money(tierOneAmount).plus(tierTwoAmount));

  breakdown.push({
    step: "Maximum Allowable Remuneration under Section 40(b)",
    amount: maxAllowableRemuneration,
  });

  return {
    bookProfit,
    tierOneLimit: tierOneThreshold,
    tierOneAmount,
    tierTwoAmount,
    maxAllowableRemuneration,
    breakdown,
  };
}

export interface PartnerShare {
  partnerId: string;
  partnerName: string;
  profitSharePercent: number;
  isWorkingPartner: boolean;
}

/**
 * Distributes the approved remuneration amount among working partners.
 * Default: equal split among working partners (can be overridden per the deed).
 */
export function distributeRemuneration(
  totalRemuneration: number,
  partners: PartnerShare[],
  method: "equal" | "profit_share" = "equal"
): { partnerId: string; partnerName: string; amount: number }[] {
  const workingPartners = partners.filter((p) => p.isWorkingPartner);
  if (workingPartners.length === 0) return [];

  if (method === "equal") {
    const share = round2(money(totalRemuneration).dividedBy(workingPartners.length));
    const results = workingPartners.map((p) => ({
      partnerId: p.partnerId,
      partnerName: p.partnerName,
      amount: share,
    }));
    // Adjust last partner for rounding remainder
    const distributed = results.reduce((sum, r) => sum + r.amount, 0);
    const diff = round2(money(totalRemuneration).minus(distributed));
    if (diff !== 0 && results.length > 0) {
      results[results.length - 1].amount = round2(money(results[results.length - 1].amount).plus(diff));
    }
    return results;
  }

  // profit_share method
  const totalShare = workingPartners.reduce((sum, p) => sum + p.profitSharePercent, 0);
  const results = workingPartners.map((p) => ({
    partnerId: p.partnerId,
    partnerName: p.partnerName,
    amount: round2(money(totalRemuneration).times(p.profitSharePercent).dividedBy(totalShare || 1)),
  }));
  const distributed = results.reduce((sum, r) => sum + r.amount, 0);
  const diff = round2(money(totalRemuneration).minus(distributed));
  if (diff !== 0 && results.length > 0) {
    results[results.length - 1].amount = round2(money(results[results.length - 1].amount).plus(diff));
  }
  return results;
}
