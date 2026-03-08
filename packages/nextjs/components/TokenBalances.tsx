"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useBalance, useReadContract } from "wagmi";

const MULTISIG = "0x82858790DfFB82377d5ABc337c7f0679e6AD58e5" as const;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function useCLAWDPrice() {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    fetch("https://api.dexscreener.com/latest/dex/tokens/0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07")
      .then(r => r.json())
      .then(d => setPrice(parseFloat(d.pairs?.[0]?.priceUsd ?? "0")))
      .catch(() => setPrice(null));
  }, []);
  return price;
}

function useETHPrice() {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then(r => r.json())
      .then(d => setPrice(d.ethereum?.usd ?? null))
      .catch(() => setPrice(null));
  }, []);
  return price;
}

function usd(amount: number, price: number | null) {
  if (price === null) return "…";
  const val = amount * price;
  if (val < 0.01) return `~$${val.toFixed(6)}`;
  return `~$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TokenBalances() {
  const ethPrice = useETHPrice();
  const clawdPrice = useCLAWDPrice();

  const { data: ethBalance } = useBalance({ address: MULTISIG, chainId: 8453 });

  const { data: usdcRaw } = useReadContract({
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [MULTISIG],
    chainId: 8453,
  });

  const { data: clawdRaw } = useReadContract({
    address: "0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07",
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [MULTISIG],
    chainId: 8453,
  });

  const ethAmt = ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)) : 0;
  const usdcAmt = usdcRaw ? parseFloat(formatUnits(usdcRaw, 6)) : 0;
  const clawdAmt = clawdRaw ? parseFloat(formatUnits(clawdRaw, 18)) : 0;

  const rows = [
    { symbol: "ETH", amount: ethAmt, decimals: 6, price: ethPrice },
    { symbol: "USDC", amount: usdcAmt, decimals: 6, price: 1 },
    { symbol: "CLAWD", amount: clawdAmt, decimals: 2, price: clawdPrice },
  ];

  return (
    <div className="card bg-base-100 shadow-xl mb-6">
      <div className="card-body p-0">
        <div className="px-4 pt-4 pb-2">
          <h2 className="card-title text-lg">💰 Balances</h2>
        </div>
        <div className="divider my-0" />
        {rows.map(({ symbol, amount, decimals, price }) => (
          <div key={symbol} className="flex items-center justify-between py-3 px-4">
            <span className="font-semibold">{symbol}</span>
            <div className="text-right">
              <span className="font-mono font-bold">
                {amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
              </span>
              <span className="text-xs text-base-content/40 ml-2">{usd(amount, price)}</span>
            </div>
          </div>
        ))}
        <div className="px-4 pb-3 pt-1">
          <p className="text-xs text-base-content/30">Multisig treasury · Prices from DexScreener & CoinGecko</p>
        </div>
      </div>
    </div>
  );
}
