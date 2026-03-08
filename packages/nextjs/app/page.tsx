"use client";

import Link from "next/link";
import { Address, Balance } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { TokenBalances } from "~~/components/TokenBalances";
import { VaultPositions } from "~~/components/VaultPositions";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth/useDeployedContractInfo";

const SIGNERS = [
  { role: "🤖 AI Agent (ClawdGut)", address: "0x09defC9E6ffc5e41F42e0D50512EEf9354523E0E" as const },
  { role: "🔥 Hot wallet (atg.eth)", address: "0x34aA3F359A9D614239015126635CE7732c18fDF3" as const },
  { role: "🧊 Cold wallet", address: "0x90eF2A9211A3E7CE788561E5af54C76B0Fa3aEd0" as const },
];

const Home: NextPage = () => {
  const { targetNetwork } = useTargetNetwork();
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "MetaMultiSigWallet" });

  const { data: signaturesRequired } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "signaturesRequired",
  });

  const { data: nonce } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
  });

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5 w-full max-w-3xl">
        <h1 className="text-center">
          <span className="block text-2xl mb-2">🔐</span>
          <span className="block text-4xl font-bold">clawd-multisig</span>
          <span className="block text-lg mt-2 text-base-content/70">AI-agent-powered 2/3 multisig on Base</span>
        </h1>

        {/* Contract Info */}
        <div className="card bg-base-100 shadow-xl mt-8">
          <div className="card-body">
            <h2 className="card-title">📋 Contract Info</h2>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Address:</span>
                {contractInfo?.address ? (
                  <Address address={contractInfo.address} chain={targetNetwork} />
                ) : (
                  <span className="text-base-content/50">Not deployed yet</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Balance:</span>
                {contractInfo?.address ? (
                  <Balance address={contractInfo.address} chain={targetNetwork} />
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Signatures Required:</span>
                <span className="badge badge-primary">
                  {signaturesRequired !== undefined ? signaturesRequired.toString() : "—"} of 3
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Current Nonce:</span>
                <span className="badge badge-ghost">{nonce !== undefined ? nonce.toString() : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signers */}
        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <h2 className="card-title">👥 Signers</h2>
            <div className="flex flex-col gap-3">
              {SIGNERS.map(signer => (
                <div key={signer.address} className="flex items-center gap-3 p-2 bg-base-200 rounded-lg">
                  <span className="text-sm font-medium min-w-[180px]">{signer.role}</span>
                  <Address address={signer.address} chain={targetNetwork} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mt-8 mb-8">
          <Link href="/transactions" className="btn btn-primary btn-lg">
            📋 Transactions
          </Link>
          <Link href="/create" className="btn btn-secondary btn-lg">
            ➕ Create TX
          </Link>
          <Link href="/skill.md" className="btn btn-outline btn-lg" target="_blank">
            📖 SKILL.md
          </Link>
        </div>

        {/* Token Balances */}
        <div className="mt-2">
          <TokenBalances />
        </div>

        {/* Vault Positions */}
        <div className="mt-6 mb-12">
          <VaultPositions />
        </div>
      </div>
    </div>
  );
};

export default Home;
