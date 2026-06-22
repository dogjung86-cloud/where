export type WhereTier = {
  name: string;
  requiredBalance: number;
  inboxLimit: number;
  receiveCount: number;
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
    inboxLimit: 30,
    receiveCount: 3,
    detail:
      "A light holder tier for people who want a small batch of surprises back.",
  },
  {
    name: "Cartographer",
    requiredBalance: 50_000,
    inboxLimit: 100,
    receiveCount: 5,
    detail: "Built for collectors who want enough arrivals to fill a city passport.",
  },
  {
    name: "Voyager",
    requiredBalance: 200_000,
    inboxLimit: 300,
    receiveCount: 10,
    detail: "The heavy discovery tier for larger drops and a serious permanent archive.",
  },
];

export const WHERE_UTILITY_PRICES: WhereUtility[] = [
  {
    key: "city_reroll",
    label: "Try another city",
    detail: "Replace one arrival with a different random city without sending another photo.",
    cost: 1_000,
  },
  {
    key: "uncollected_city",
    label: "Uncollected city",
    detail: "Prioritize a city that is not in your passport yet.",
    cost: 3_000,
  },
];

export const WHERE_SPEND_SPLIT = {
  burnBps: 0,
  treasuryBps: 10_000,
  rewardsBps: 0,
} as const;

export const DEFAULT_INBOX_LIMIT = 10;

export function getTierForBalance(balance: number) {
  return [...WHERE_TIERS]
    .sort((left, right) => right.requiredBalance - left.requiredBalance)
    .find((tier) => balance >= tier.requiredBalance);
}

export function getInboxLimitForBalance(balance: number) {
  return getTierForBalance(balance)?.inboxLimit ?? DEFAULT_INBOX_LIMIT;
}

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
