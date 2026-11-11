export const SOLANA_DEVNET_RPC_URL = "/api/solana/rpc";

export const ZOLIUS_SOLANA_PROGRAMS = {
  lock:
    process.env.NEXT_PUBLIC_SOLANA_LOCK_PROGRAM_ID ||
    "AJok8ztWjxcbeFDLAWRmY11fCvp8mJJpbrvpUs3UmoZP",
  swap:
    process.env.NEXT_PUBLIC_SOLANA_SWAP_PROGRAM_ID ||
    "HQioSDqtsHSz2LzdHZXYShA8Jgi19Sxxh92M2rKVMC7u",
} as const;

export type ZoliusProgramName = keyof typeof ZOLIUS_SOLANA_PROGRAMS;

export interface SolanaProgramStatus {
  programId: string;
  executable: boolean;
  owner: string;
}

const UPGRADEABLE_LOADER_ID = "BPFLoaderUpgradeab1e11111111111111111111111";

export async function getZoliusProgramStatus(
  program: ZoliusProgramName,
  signal?: AbortSignal,
): Promise<SolanaProgramStatus> {
  const programId = ZOLIUS_SOLANA_PROGRAMS[program];
  const response = await fetch(SOLANA_DEVNET_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `zolius-${program}-status`,
      method: "getAccountInfo",
      params: [
        programId,
        { encoding: "base64", commitment: "confirmed", dataSlice: { offset: 0, length: 0 } },
      ],
    }),
    signal,
  });

  if (!response.ok) throw new Error(`Devnet RPC returned HTTP ${response.status}`);
  const result = (await response.json()) as {
    error?: { message?: string };
    result?: {
      value?: {
        executable?: boolean;
        owner?: string;
      } | null;
    };
  };
  if (result.error) throw new Error(result.error.message || "Devnet RPC request failed");

  const account = result.result?.value;
  if (!account) throw new Error(`${program} program was not found on Devnet`);
  if (account.owner !== UPGRADEABLE_LOADER_ID || !account.executable) {
    throw new Error(`${program} address is not an executable Zolius program on Devnet`);
  }

  return {
    programId,
    executable: account.executable,
    owner: account.owner,
  };
}
