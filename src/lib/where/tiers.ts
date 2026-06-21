export type WhereTier = {
  name: string;
  requiredBalance: number;
  receiveCount: number;
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
  },
  {
    name: "Cartographer",
    requiredBalance: 50_000,
    receiveCount: 5,
  },
  {
    name: "Voyager",
    requiredBalance: 200_000,
    receiveCount: 10,
  },
];

export const WHERE_UTILITY_PRICES: WhereUtility[] = [
  {
    key: "extra_3",
    label: "Receive 3 moments",
    detail: "Extra random arrivals",
    cost: 100,
  },
  {
    key: "extra_5",
    label: "Receive 5 moments",
    detail: "Bigger exchange batch",
    cost: 250,
  },
  {
    key: "city_reroll",
    label: "City reroll",
    detail: "Try another random city",
    cost: 50,
  },
  {
    key: "uncollected_city",
    label: "Uncollected city",
    detail: "Prioritize a new stamp",
    cost: 300,
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
