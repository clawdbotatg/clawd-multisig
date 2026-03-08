"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useBalance, useReadContract } from "wagmi";

const MULTISIG_ADDRESS = "0x82858790DfFB82377d5ABc337c7f0679e6AD58e5" as const;
const BASE_CHAIN_ID = 8453;

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const CLAWD_ADDRESS = "0x297BfABE5E5e5a5153A1d44E6EE85f6f59b90B7e" as const;

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function TokenBalances() {
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [clawdPriceUsd, setClawdPriceUsd] = useState<number | null>(null);

  // Native ETH balance
  const { data: ethBalance } = useBalance({
    address: MULTISIG_ADDRESS,
    chainId: BASE_CHAIN_ID,
  });

  // USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [MULTISIG_ADDRESS],
    chainId: BASE_CHAIN_ID,
  });

  // CLAWD balance
  const { data: clawdBalance } = useReadContract({
    address: CLAWD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [MULTISIG_ADDRESS],
    chainId: BASE_CHAIN_ID,
  });

  // Fetch prices
  useEffect(() => {
    const fetchPrices = async () => {
      // Fetch ETH price
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        const data = await res.json();
        if (data?.ethereum?.usd) {
          setEthPrice(data.ethereum.usd);
        }
      } catch {
        setEthPrice(2000); // fallback
      }

      // Fetch CLAWD price from DexScreener
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CLAWD_ADDRESS}`);
        const data = await res.json();
        if (data?.pairs?.length > 0) {
          // Find the pair with the most liquidity
          const sorted = data.pairs.sort(
            (a: { liquidity?: { usd?: number } }, b: { liquidity?: { usd?: number } }) =>
              (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0),
          );
          const priceUsd = parseFloat(sorted[0].priceUsd);
          if (!isNaN(priceUsd)) {
            setClawdPriceUsd(priceUsd);
          }
        }
      } catch {
        // CLAWD price unavailable
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const ethFormatted = ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)) : 0;
  const usdcFormatted = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)) : 0;
  const clawdFormatted = clawdBalance ? parseFloat(formatUnits(clawdBalance as bigint, 18)) : 0;

  const ethUsd = ethPrice ? ethFormatted * ethPrice : null;
  const usdcUsd = usdcFormatted * 1.0; // stablecoin
  const clawdUsd = clawdPriceUsd ? clawdFormatted * clawdPriceUsd : null;

  const totalUsd = (ethUsd || 0) + usdcUsd + (clawdUsd || 0);

  const formatBalance = (val: number, decimals: number) => {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatUsd = (val: number | null) => {
    if (val === null) return "—";
    return `~$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">💰 Balances</h2>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Token</th>
                <th className="text-right">Balance</th>
                <th className="text-right">USD Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">ETH</td>
                <td className="text-right font-mono">{formatBalance(ethFormatted, 6)}</td>
                <td className="text-right font-mono text-base-content/70">{formatUsd(ethUsd)}</td>
              </tr>
              <tr>
                <td className="font-medium">USDC</td>
                <td className="text-right font-mono">{formatBalance(usdcFormatted, 6)}</td>
                <td className="text-right font-mono text-base-content/70">{formatUsd(usdcUsd)}</td>
              </tr>
              <tr>
                <td className="font-medium">CLAWD</td>
                <td className="text-right font-mono">{formatBalance(clawdFormatted, 6)}</td>
                <td className="text-right font-mono text-base-content/70">{formatUsd(clawdUsd)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td className="font-bold">Total</td>
                <td></td>
                <td className="text-right font-mono font-bold">{formatUsd(totalUsd)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
