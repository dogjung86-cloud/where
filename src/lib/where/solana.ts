import {
  Connection,
  ParsedInstruction,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createBurnCheckedInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";

import type { splitWhereSpend } from "@/lib/where/tiers";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

type SpendSplit = ReturnType<typeof splitWhereSpend>;

type BuildSpendTransactionOptions = {
  amount: number;
  rewardsWallet?: string;
  rpcUrl: string;
  senderWallet: string;
  spendId: string;
  split: SpendSplit;
  tokenMint: string;
  treasuryWallet: string;
  utilityKey: string;
};

type VerifySpendTransactionOptions = BuildSpendTransactionOptions & {
  txSignature: string;
};

function tokenUnits(amount: number, decimals: number) {
  return BigInt(amount) * BigInt(10) ** BigInt(decimals);
}

export function parsePublicKey(value: string, label: string) {
  if (!value) {
    throw new Error(`${label} is required`);
  }

  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`Invalid ${label}`);
  }
}

function createMemoInstruction(text: string) {
  return new TransactionInstruction({
    data: Buffer.from(text, "utf8"),
    keys: [],
    programId: MEMO_PROGRAM_ID,
  });
}

function isParsedInstruction(
  instruction: unknown,
): instruction is ParsedInstruction {
  return (
    typeof instruction === "object" &&
    instruction !== null &&
    "parsed" in instruction &&
    "program" in instruction
  );
}

function parsedTokenAmount(instruction: ParsedInstruction) {
  const parsed = instruction.parsed as {
    info?: {
      amount?: string;
      destination?: string;
      mint?: string;
      owner?: string;
      tokenAmount?: {
        amount?: string;
      };
    };
    type?: string;
  };

  return parsed.info?.tokenAmount?.amount ?? parsed.info?.amount ?? null;
}

function hasTokenInstruction(
  instructions: unknown[],
  type: "burnChecked" | "transferChecked",
  amount: bigint,
  matcher: (info: {
    destination?: string;
    mint?: string;
    owner?: string;
  }) => boolean,
) {
  return instructions.some((instruction) => {
    if (!isParsedInstruction(instruction) || instruction.program !== "spl-token") {
      return false;
    }

    const parsed = instruction.parsed as {
      info?: {
        destination?: string;
        mint?: string;
        owner?: string;
      };
      type?: string;
    };

    return (
      parsed.type === type &&
      parsedTokenAmount(instruction) === amount.toString() &&
      matcher(parsed.info ?? {})
    );
  });
}

export async function buildWhereSpendTransaction({
  amount,
  rewardsWallet,
  rpcUrl,
  senderWallet,
  spendId,
  split,
  tokenMint,
  treasuryWallet,
  utilityKey,
}: BuildSpendTransactionOptions) {
  const connection = new Connection(rpcUrl, "confirmed");
  const sender = parsePublicKey(senderWallet, "sender wallet");
  const mint = parsePublicKey(tokenMint, "WHERE_TOKEN_MINT");
  const treasuryOwner = parsePublicKey(treasuryWallet, "WHERE_TREASURY_WALLET");
  const mintInfo = await getMint(connection, mint);
  const sourceTokenAccount = getAssociatedTokenAddressSync(mint, sender);
  const treasuryTokenAccount = getAssociatedTokenAddressSync(mint, treasuryOwner);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: sender,
    recentBlockhash: blockhash,
  });

  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(
      sender,
      treasuryTokenAccount,
      treasuryOwner,
      mint,
    ),
  );

  if (split.rewardsAmount > 0) {
    const rewardsOwner = parsePublicKey(rewardsWallet ?? "", "WHERE_REWARDS_WALLET");
    const rewardsTokenAccount = getAssociatedTokenAddressSync(mint, rewardsOwner);

    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        sender,
        rewardsTokenAccount,
        rewardsOwner,
        mint,
      ),
    );
  }

  if (split.burnAmount > 0) {
    transaction.add(
      createBurnCheckedInstruction(
        sourceTokenAccount,
        mint,
        sender,
        tokenUnits(split.burnAmount, mintInfo.decimals),
        mintInfo.decimals,
      ),
    );
  }

  transaction.add(
    createTransferCheckedInstruction(
      sourceTokenAccount,
      mint,
      treasuryTokenAccount,
      sender,
      tokenUnits(split.treasuryAmount, mintInfo.decimals),
      mintInfo.decimals,
    ),
  );

  if (split.rewardsAmount > 0) {
    const rewardsOwner = parsePublicKey(rewardsWallet ?? "", "WHERE_REWARDS_WALLET");
    const rewardsTokenAccount = getAssociatedTokenAddressSync(mint, rewardsOwner);

    transaction.add(
      createTransferCheckedInstruction(
        sourceTokenAccount,
        mint,
        rewardsTokenAccount,
        sender,
        tokenUnits(split.rewardsAmount, mintInfo.decimals),
        mintInfo.decimals,
      ),
    );
  }

  transaction.add(createMemoInstruction(`SomeWhere:${spendId}:${utilityKey}:${amount}`));

  return {
    lastValidBlockHeight,
    recentBlockhash: blockhash,
    transaction: transaction
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64"),
  };
}

export async function verifyWhereSpendTransaction({
  amount,
  rewardsWallet,
  rpcUrl,
  senderWallet,
  spendId,
  split,
  tokenMint,
  treasuryWallet,
  txSignature,
  utilityKey,
}: VerifySpendTransactionOptions) {
  const connection = new Connection(rpcUrl, "confirmed");
  const sender = parsePublicKey(senderWallet, "sender wallet");
  const mint = parsePublicKey(tokenMint, "WHERE_TOKEN_MINT");
  const treasuryOwner = parsePublicKey(treasuryWallet, "WHERE_TREASURY_WALLET");
  const mintInfo = await getMint(connection, mint);
  const treasuryTokenAccount = getAssociatedTokenAddressSync(mint, treasuryOwner);
  const transaction = await connection.getParsedTransaction(txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!transaction) {
    return {
      confirmed: false,
      reason: "Transaction is not confirmed yet.",
    };
  }

  if (transaction.meta?.err) {
    return {
      confirmed: false,
      reason: "Transaction failed on-chain.",
    };
  }

  const accountKeys = transaction.transaction.message.accountKeys;
  const hasSenderSignature = accountKeys.some(
    (account) => account.signer && account.pubkey.equals(sender),
  );

  if (!hasSenderSignature) {
    return {
      confirmed: false,
      reason: "Transaction was not signed by the selected wallet.",
    };
  }

  const instructions = transaction.transaction.message.instructions;
  const expectedMemo = `SomeWhere:${spendId}:${utilityKey}:${amount}`;
  const hasMemo = instructions.some(
    (instruction) =>
      "programId" in instruction &&
      instruction.programId.equals(MEMO_PROGRAM_ID) &&
      "parsed" in instruction &&
      instruction.parsed === expectedMemo,
  );
  const hasBurn =
    split.burnAmount === 0 ||
    hasTokenInstruction(
      instructions,
      "burnChecked",
      tokenUnits(split.burnAmount, mintInfo.decimals),
      (info) =>
        info.mint === mint.toBase58() && info.owner === sender.toBase58(),
    );
  const hasTreasuryTransfer = hasTokenInstruction(
    instructions,
    "transferChecked",
    tokenUnits(split.treasuryAmount, mintInfo.decimals),
    (info) =>
      info.mint === mint.toBase58() &&
      info.owner === sender.toBase58() &&
      info.destination === treasuryTokenAccount.toBase58(),
  );
  const hasRewardsTransfer =
    split.rewardsAmount === 0 ||
    (() => {
      const rewardsOwner = parsePublicKey(
        rewardsWallet ?? "",
        "WHERE_REWARDS_WALLET",
      );
      const rewardsTokenAccount = getAssociatedTokenAddressSync(
        mint,
        rewardsOwner,
      );

      return hasTokenInstruction(
        instructions,
        "transferChecked",
        tokenUnits(split.rewardsAmount, mintInfo.decimals),
        (info) =>
          info.mint === mint.toBase58() &&
          info.owner === sender.toBase58() &&
          info.destination === rewardsTokenAccount.toBase58(),
      );
    })();

  if (!hasMemo || !hasBurn || !hasTreasuryTransfer || !hasRewardsTransfer) {
    return {
      confirmed: false,
      reason: "Transaction does not match the quoted $WHERE payment.",
    };
  }

  return {
    confirmed: true,
  };
}
