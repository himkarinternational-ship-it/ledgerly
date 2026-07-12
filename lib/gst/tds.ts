/**
 * Common TDS sections under the Income Tax Act, 1961, relevant to a
 * services/trading partnership firm. Rates shown are standard rates for
 * payments to residents with valid PAN — always confirm against current
 * rules before filing, as rates and thresholds do change.
 */
export const TDS_SECTIONS: Record<string, { label: string; rate: number }> = {
  "194C": { label: "194C — Contractor payment", rate: 1 },
  "194H": { label: "194H — Commission/brokerage", rate: 5 },
  "194I": { label: "194I — Rent", rate: 10 },
  "194J": { label: "194J — Professional/technical fees", rate: 10 },
  "194Q": { label: "194Q — Purchase of goods", rate: 0.1 },
  "194R": { label: "194R — Benefits/perquisites", rate: 10 },
};

export const TDS_SECTION_LIST = Object.entries(TDS_SECTIONS).map(([code, v]) => ({
  code,
  ...v,
}));
