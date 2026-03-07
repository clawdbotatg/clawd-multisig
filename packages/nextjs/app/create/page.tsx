"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { useAccount, useSignMessage } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

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

const CreatePage: NextPage = () => {
  const router = useRouter();
  const { address: connectedAddress, connector } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const { data: currentNonce } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
  });

  const [to, setTo] = useState("");
  const [value, setValue] = useState("");
  const [data, setData] = useState("0x");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    if (currentNonce === undefined) {
      notification.error("Could not read nonce from contract");
      return;
    }

    setSubmitting(true);

    try {
      const nonce = Number(currentNonce);
      const valueWei = value ? parseEther(value).toString() : "0";

      // Get the hash from API
      const hashRes = await fetch(
        `/api/transactions/hash?nonce=${nonce}&to=${to}&value=${valueWei}&data=${data || "0x"}`,
      );
      const { hash } = await hashRes.json();

      // Sign the hash (personal_sign / EIP-191)
      const sig = await writeAndOpen(() => signMessageAsync({ message: { raw: hash as `0x${string}` } }));

      // POST new transaction
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce,
          to,
          value: valueWei,
          data: data || "0x",
          description,
          signer: connectedAddress,
          sig,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create transaction");
      }

      notification.success("Transaction proposed!");
      router.push("/transactions");
    } catch (e: unknown) {
      notification.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5 w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-8">➕ Propose Transaction</h1>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="mb-4 p-3 bg-base-200 rounded-lg">
              <span className="font-semibold">Current Nonce:</span>{" "}
              <span className="badge badge-ghost">{currentNonce !== undefined ? currentNonce.toString() : "—"}</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">To Address</span>
                </label>
                <AddressInput value={to} onChange={setTo} placeholder="0x... or ENS name" />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Value (ETH)</span>
                </label>
                <input
                  type="text"
                  placeholder="0.0"
                  className="input input-bordered w-full"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Data (hex)</span>
                </label>
                <input
                  type="text"
                  placeholder="0x"
                  className="input input-bordered w-full"
                  value={data}
                  onChange={e => setData(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Description</span>
                </label>
                <textarea
                  placeholder="Plain english — what this tx does and why"
                  className="textarea textarea-bordered w-full h-24"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>

              {!connectedAddress ? (
                <div className="flex justify-center mt-4">
                  <RainbowKitCustomConnectButton />
                </div>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary btn-lg mt-2"
                  disabled={submitting || !connectedAddress}
                >
                  {submitting ? <span className="loading loading-spinner loading-sm"></span> : "🚀 Propose & Sign"}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
