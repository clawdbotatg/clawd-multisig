"use client";

import { useCallback, useEffect, useState } from "react";
import { Address } from "@scaffold-ui/components";
import { useFetchNativeCurrencyPrice } from "@scaffold-ui/hooks";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type Signature = {
  signer: string;
  sig: string;
};

type Transaction = {
  id: number;
  nonce: number;
  to_address: string;
  value: string;
  data: string;
  description: string;
  signatures: Signature[];
  status: string;
  created_at: string;
};

const getErrorMessage = (e: unknown): string => {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Not Self")) return "Only the multisig itself can call this";
  if (msg.includes("not owner")) return "You are not an owner of this multisig";
  if (msg.includes("not enough valid signatures")) return "Not enough valid signatures (need 2 of 3)";
  if (msg.includes("duplicate or unordered")) return "Duplicate or out-of-order signatures";
  if (msg.includes("tx failed")) return "Transaction execution failed on-chain";
  if (msg.includes("User rejected")) return "Transaction rejected in wallet";
  return msg.length > 100 ? "Transaction failed — check console for details" : msg;
};

const TransactionsPage: NextPage = () => {
  const { targetNetwork } = useTargetNetwork();
  const { address: connectedAddress, connector } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: metaMultiSigWallet } = useScaffoldContract({
    contractName: "MetaMultiSigWallet",
    walletClient,
  });
  const { writeContractAsync, isPending } = useScaffoldWriteContract("MetaMultiSigWallet");
  const { price: nativeCurrencyPrice } = useFetchNativeCurrencyPrice();

  const { data: signaturesRequired } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "signaturesRequired",
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const openWallet = useCallback(() => {
    if (typeof window === "undefined") return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile || window.ethereum) return;
    const allIds = [connector?.id, connector?.name, localStorage.getItem("wagmi.recentConnectorId")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const schemes: [string[], string][] = [
      [["rainbow"], "rainbow://"],
      [["metamask"], "metamask://"],
      [["coinbase", "cbwallet"], "cbwallet://"],
      [["trust"], "trust://"],
      [["phantom"], "phantom://"],
    ];
    for (const [keywords, scheme] of schemes) {
      if (keywords.some(k => allIds.includes(k))) {
        window.location.href = scheme;
        return;
      }
    }
  }, [connector]);

  const writeAndOpen = useCallback(
    <T,>(writeFn: () => Promise<T>): Promise<T> => {
      const promise = writeFn();
      setTimeout(openWallet, 2000);
      return promise;
    },
    [openWallet],
  );

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (e) {
      console.error("Failed to fetch transactions:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSign = async (tx: Transaction) => {
    if (!connectedAddress || !walletClient || !metaMultiSigWallet) {
      notification.error("Please connect your wallet");
      return;
    }

    try {
      // Get hash directly from contract — no API, no mismatch possible
      const hash = (await metaMultiSigWallet.read.getTransactionHash([
        BigInt(tx.nonce),
        tx.to_address as `0x${string}`,
        BigInt(tx.value),
        tx.data as `0x${string}`,
      ])) as `0x${string}`;

      const sig = await writeAndOpen(() => walletClient.signMessage({ message: { raw: hash } }));

      // Verify on-chain before storing
      const signer = (await metaMultiSigWallet.read.recover([hash, sig])) as `0x${string}`;
      const isOwner = (await metaMultiSigWallet.read.isOwner([signer])) as boolean;
      if (!isOwner) {
        notification.error("Signature invalid — signer is not an owner");
        return;
      }

      const res = await fetch(`/api/transactions/${tx.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signer, sig }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to sign");
      }

      notification.success("Signature added!");
      fetchTransactions();
    } catch (e: unknown) {
      notification.error(getErrorMessage(e));
    }
  };

  const handleExecute = async (tx: Transaction) => {
    if (!metaMultiSigWallet) return;

    try {
      const hash = (await metaMultiSigWallet.read.getTransactionHash([
        BigInt(tx.nonce),
        tx.to_address as `0x${string}`,
        BigInt(tx.value),
        tx.data as `0x${string}`,
      ])) as `0x${string}`;

      // Sort sigs by recovered address ascending (matches contract duplicate guard)
      const signerSigPairs: { signer: string; sig: string }[] = [];
      for (const s of tx.signatures) {
        const recovered = (await metaMultiSigWallet.read.recover([hash, s.sig as `0x${string}`])) as string;
        signerSigPairs.push({ signer: recovered.toLowerCase(), sig: s.sig });
      }
      signerSigPairs.sort((a, b) => (a.signer < b.signer ? -1 : 1));
      const sortedSigs = signerSigPairs.map(p => p.sig as `0x${string}`);

      await writeAndOpen(() =>
        writeContractAsync({
          functionName: "executeTransaction",
          args: [tx.to_address as `0x${string}`, BigInt(tx.value), tx.data as `0x${string}`, sortedSigs],
        }),
      );

      await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
      notification.success("Transaction executed!");
      fetchTransactions();
    } catch (e: unknown) {
      notification.error(getErrorMessage(e));
    }
  };

  const requiredSigs = signaturesRequired ? Number(signaturesRequired) : 2;

  const formatUsd = (valueWei: string) => {
    if (!nativeCurrencyPrice || nativeCurrencyPrice <= 0) return "";
    const ethValue = parseFloat(formatEther(BigInt(valueWei)));
    return ` (~$${(ethValue * nativeCurrencyPrice).toFixed(2)})`;
  };

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5 w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-8">📋 Pending Transactions</h1>

        {loading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center text-base-content/50 text-lg">No pending transactions</div>
        ) : (
          <div className="flex flex-col gap-4">
            {transactions.map(tx => (
              <div key={tx.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title text-lg">{tx.description}</h3>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">To:</span>
                      <Address address={tx.to_address as `0x${string}`} chain={targetNetwork} />
                    </div>
                    <div>
                      <span className="font-semibold">Value:</span> {formatEther(BigInt(tx.value))} ETH
                      {formatUsd(tx.value)}
                    </div>
                    <div>
                      <span className="font-semibold">Nonce:</span> {tx.nonce}
                    </div>
                    <div>
                      <span className="font-semibold">Data:</span>{" "}
                      <code className="text-xs bg-base-200 px-1 rounded">{tx.data}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Signatures:</span>
                      <span
                        className={`badge ${tx.signatures.length >= requiredSigs ? "badge-success" : "badge-warning"}`}
                      >
                        {tx.signatures.length} / {requiredSigs}
                      </span>
                    </div>
                    {tx.signatures.length > 0 && (
                      <div className="mt-1">
                        <span className="font-semibold text-xs">Signed by:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tx.signatures.map((s, i) => (
                            <div key={i} className="badge badge-outline badge-sm">
                              <Address address={s.signer as `0x${string}`} chain={targetNetwork} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card-actions justify-end mt-4">
                    {!connectedAddress ? (
                      <div className="flex justify-center mt-4">
                        <RainbowKitCustomConnectButton />
                      </div>
                    ) : (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => handleSign(tx)}>
                          ✍️ Sign
                        </button>
                        {tx.signatures.length >= requiredSigs && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleExecute(tx)}
                            disabled={isPending}
                          >
                            {isPending ? <span className="loading loading-spinner loading-xs"></span> : "🚀 Execute"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
