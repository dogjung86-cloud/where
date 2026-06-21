export type WhereTier = {
  name: string;
  requiredBalance: number;
  receiveCount: number;
  vaultSlots: number;
  detail: string;
};

export type WhereUtility = {
  key: string;
  label: string;
  detail: string;
  cost: number;
};

export const WHERE_TIERS: WhereTier[] = [
  {
    name: "Drifter",
    requiredBalance: 10_000,
    receiveCount: 3,
    vaultSlots: 30,
    detail:
      "A light holder tier for people who want a small batch of surprises back.",
  },
  {
    name: "Cartographer",
    requiredBalance: 50_000,
    receiveCount: 5,
    vaultSlots: 100,
    detail: "Built for collectors who want enough arrivals to fill a city passport.",
  },
  {
    name: "Voyager",
    requiredBalance: 200_000,
    receiveCount: 10,
    vaultSlots: 300,
    detail: "The heavy discovery tier for larger drops and a serious permanent archive.",
  },
];

export const WHERE_UTILITY_PRICES: WhereUtility[] = [
  {
    key: "extra_3",
    label: "Receive 3 moments",
    detail: "Open a small batch after sending your own photo.",
    cost: 100,
  },
  {
    key: "extra_5",
    label: "Receive 5 moments",
    detail: "A bigger batch of strangers' everyday snapshots.",
    cost: 250,
  },
  {
    key: "city_reroll",
    label: "City reroll",
    detail: "Try another city after your own photo lands.",
    cost: 50,
  },
  {
    key: "uncollected_city",
    label: "Uncollected city",
    detail: "Prioritize a city that is not in your passport yet.",
    cost: 300,
  },
  {
    key: "vault_25",
    label: "Permanent vault +25",
    detail: "Keep more received photos forever instead of letting them expire.",
    cost: 150,
  },
  {
    key: "vault_100",
    label: "Permanent vault +100",
    detail: "Expand your saved-photo inventory for long-term collecting.",
    cost: 500,
  },
];

export const WHERE_SPEND_SPLIT = {
  burnBps: 6_000,
  treasuryBps: 3_000,
  rewardsBps: 1_000,
} as const;

export function getUtilityPrice(key: string) {
  return WHERE_UTILITY_PRICES.find((utility) => utility.key === key);
}

export function splitWhereSpend(amount: number) {
  const burnAmount = Math.floor((amount * WHERE_SPEND_SPLIT.burnBps) / 10_000);
  const treasuryAmount = Math.floor(
    (amount * WHERE_SPEND_SPLIT.treasuryBps) / 10_000,
  );
  const rewardsAmount = amount - burnAmount - treasuryAmount;

  return {
    burnAmount,
    treasuryAmount,
    rewardsAmount,
  };
}
