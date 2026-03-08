"use client";

import { formatUnits } from "viem";
import { useReadContract } from "wagmi";

const MULTISIG_ADDRESS = "0x82858790DfFB82377d5ABc337c7f0679e6AD58e5" as const;

const VAULTS = [
  {
    name: "Moonwell Flagship USDC",
    address: "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca" as const,
    underlyingDecimals: 6,
    underlyingSymbol: "USDC",
    apy: "3.78",
  },
];

const ERC4626_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "convertToAssets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function VaultRow({ vault }: { vault: (typeof VAULTS)[0] }) {
  const { data: shares, isLoading: sharesLoading } = useReadContract({
    address: vault.address,
    abi: ERC4626_ABI,
    functionName: "balanceOf",
    args: [MULTISIG_ADDRESS],
    chainId: 8453,
  });

  const { data: assets, isLoading: assetsLoading } = useReadContract({
    address: vault.address,
    abi: ERC4626_ABI,
    functionName: "convertToAssets",
    args: [shares ?? 0n],
    chainId: 8453,
    query: {
      enabled: !!shares && shares > 0n,
    },
  });

  const isLoading = sharesLoading || (!!shares && shares > 0n && assetsLoading);
  const hasPosition = shares !== undefined && shares > 0n;

  const formattedAssets = assets !== undefined ? formatUnits(assets, vault.underlyingDecimals) : "0";

  // Ensure we always show 6 decimal places
  const displayValue = hasPosition ? Number(formattedAssets).toFixed(6) : "0.000000";

  return (
    <div className="flex items-center justify-between py-3 px-4">
      <div className="flex flex-col">
        <span className="font-semibold text-base">{vault.name}</span>
        <span className="text-xs text-base-content/50">{vault.apy}% APY</span>
      </div>
      <div className="text-right">
        {isLoading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : hasPosition ? (
          <div className="flex flex-col items-end">
            <span className="font-mono font-bold text-success text-lg">
              {displayValue} {vault.underlyingSymbol}
            </span>
            <span className="text-xs text-base-content/40 font-mono">{formatUnits(shares, 18)} shares</span>
          </div>
        ) : (
          <span className="text-base-content/30 text-sm">No position</span>
        )}
      </div>
    </div>
  );
}

export function VaultPositions() {
  return (
    <div className="card bg-base-100 shadow-xl mb-8">
      <div className="card-body p-0">
        <div className="px-4 pt-4 pb-2">
          <h2 className="card-title text-lg">🏦 Vault Positions</h2>
        </div>
        <div className="divider my-0"></div>
        {VAULTS.map(vault => (
          <VaultRow key={vault.address} vault={vault} />
        ))}
        <div className="px-4 pb-3 pt-1">
          <p className="text-xs text-base-content/30">
            ERC4626 vault positions held by the multisig · Values update live
          </p>
        </div>
      </div>
    </div>
  );
}
