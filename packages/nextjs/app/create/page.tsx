"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { useAccount, useSignMessage } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const CreatePage: NextPage = () => {
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
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
      const sig = await signMessageAsync({ message: { raw: hash as `0x${string}` } });

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
      const msg = e instanceof Error ? e.message : "Failed to create transaction";
      notification.error(msg);
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
                <input
                  type="text"
                  placeholder="0x..."
                  className="input input-bordered w-full"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  required
                />
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

              <button type="submit" className="btn btn-primary btn-lg mt-2" disabled={submitting || !connectedAddress}>
                {submitting ? <span className="loading loading-spinner loading-sm"></span> : "🚀 Propose & Sign"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
