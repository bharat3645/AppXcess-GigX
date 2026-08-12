"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";
import { useWallet } from "@/context/WalletContext";
import { ArrowLeft, MapPin } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

// Field order here MUST match the JobDetail struct in contracts/Job.sol —
// ethers decodes the getter's return data positionally against this list.
const CONTRACT_ABI = [
  "function jobCounter() view returns (uint256)",
  "function jobs(uint256) view returns (address client, string description, uint256 budget, bool isOpen, address freelancer, bool fundsReleased, uint256 acceptedAt, bool isCancelled)",
  "function DELIVERY_WINDOW() view returns (uint256)",
  "function acceptJob(uint256 _jobId) external",
  "function releaseFunds(uint256 _jobId) external",
  "function cancelJob(uint256 _jobId) external",
  "function reclaimExpiredFunds(uint256 _jobId) external",
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/// Turns thrown wallet/RPC errors into a short, human-readable message
/// instead of dumping a raw error object on the user.
function describeError(err) {
  if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
    return "Transaction rejected in wallet.";
  }
  const reason = err?.reason || err?.data?.message || err?.error?.message || err?.message;
  if (reason) {
    // Strip ethers' verbose "execution reverted: <message>" wrapper down to
    // the actual require() message, which is what the user needs to see.
    const match = /execution reverted:?\s*"?([^"]+)"?/i.exec(reason);
    return match ? match[1] : reason;
  }
  return "Transaction failed. Please try again.";
}

function GigDetails() {
  const { id } = useParams();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deliveryWindowSecs, setDeliveryWindowSecs] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const { account, signer, connectWallet } = useWallet();

  const providerUrl =
    process.env.NEXT_PUBLIC_PROVIDER_URL ??
    `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  const readProvider = useMemo(() => {
    if (!providerUrl) return null;
    return new ethers.providers.JsonRpcProvider(providerUrl);
  }, [providerUrl]);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!readProvider || !contractAddress) {
        console.error("Provider or contract address not available");
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, readProvider);
      try {
        const [jobCounter, deliveryWindow] = await Promise.all([
          contract.jobCounter(),
          contract.DELIVERY_WINDOW(),
        ]);
        setDeliveryWindowSecs(deliveryWindow.toNumber());

        const fetched = [];
        for (let i = 1; i <= jobCounter; i++) {
          const jobData = await contract.jobs(i);
          fetched.push({
            id: i,
            client: jobData.client,
            description: jobData.description,
            budget: ethers.utils.formatEther(jobData.budget),
            isOpen: jobData.isOpen,
            freelancer: jobData.freelancer,
            fundsReleased: jobData.fundsReleased,
            acceptedAt: jobData.acceptedAt.toNumber(),
            isCancelled: jobData.isCancelled,
          });
        }

        setJobs(fetched);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
        toast.error("Could not load job data from the contract.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [readProvider, contractAddress]);

  const gig = jobs.find((g) => g.id === Number(id));

  const runAction = async (actionName, method, ...args) => {
    if (!signer) {
      toast.error("Connect your wallet first.");
      return;
    }
    setPendingAction(actionName);
    try {
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
      const tx = await contract[method](...args);
      toast.info("Transaction submitted — waiting for confirmation...");
      await tx.wait();
      return true;
    } catch (err) {
      console.error(`Failed to ${actionName}:`, err);
      toast.error(describeError(err));
      return false;
    } finally {
      setPendingAction(null);
    }
  };

  const handleAcceptJob = async () => {
    const ok = await runAction("accept job", "acceptJob", Number(id));
    if (ok) {
      toast.success("Job accepted!");
      router.push("/jobs/browseAll");
    }
  };

  const handleReleaseFunds = async () => {
    const ok = await runAction("release funds", "releaseFunds", Number(id));
    if (ok) {
      toast.success("Funds released to the freelancer.");
      router.push("/jobs/browseAll");
    }
  };

  const handleCancelJob = async () => {
    const ok = await runAction("cancel job", "cancelJob", Number(id));
    if (ok) {
      toast.success("Job cancelled and budget refunded to you.");
      router.push("/jobs/browseAll");
    }
  };

  const handleReclaimFunds = async () => {
    const ok = await runAction("reclaim funds", "reclaimExpiredFunds", Number(id));
    if (ok) {
      toast.success("Funds reclaimed — the freelancer missed the delivery window.");
      router.push("/jobs/browseAll");
    }
  };

  if (loading || !gig) {
    return (
      <div className="max-w-7xl pt-20 mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            {loading ? "Loading..." : "Job not found"}
          </h2>
          <button
            onClick={() => router.push("/jobs/browseAll")}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Gigs
          </button>
        </div>
      </div>
    );
  }

  const isClient = account?.toLowerCase() === gig.client?.toLowerCase();
  const isAssignedFreelancer =
    gig.freelancer !== ZERO_ADDRESS && account?.toLowerCase() === gig.freelancer?.toLowerCase();

  const deadline =
    deliveryWindowSecs != null && gig.acceptedAt > 0 ? gig.acceptedAt + deliveryWindowSecs : null;
  const deadlinePassed = deadline != null && Date.now() / 1000 >= deadline;

  let statusLabel = "Open";
  let statusClass = "bg-green-400";
  if (gig.isCancelled) {
    statusLabel = "Cancelled";
    statusClass = "bg-gray-400";
  } else if (gig.fundsReleased) {
    statusLabel = "Completed & Paid";
    statusClass = "bg-blue-400";
  } else if (!gig.isOpen) {
    statusLabel = `In Progress — Accepted by: ${gig.freelancer}`;
    statusClass = "bg-yellow-500";
  }

  return (
    <div className="pt-20 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <button
        onClick={() => router.push("/jobs/browseAll")}
        className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors mb-8"
      >
        <ArrowLeft size={20} />
        Back to Gigs
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card rounded-lg p-6 border border-[hsl(var(--border))]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-card-foreground mb-2">
                  {gig.description}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-card-foreground mb-1">
                  {gig.budget} ETH
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-card-foreground text-xs">
                    Posted by: {gig.client}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-y-3 justify-center ">
              <div className="flex items-center gap-2 text-muted-foreground">
                <p className="font-bold">Job Location: </p>
                <span className="font-bold">Remote</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <p className="font-bold">Status: </p>
                <span className={`${statusClass} px-4 rounded-xl text-[#FFFFFF]`}>
                  {statusLabel}
                </span>
              </div>

              {!account && (
                <button
                  type="button"
                  onClick={connectWallet}
                  className="bg-primary text-primary-foreground p-2 rounded-lg self-center"
                >
                  Connect Wallet
                </button>
              )}

              {gig.isOpen && !isClient && account && (
                <div className="flex items-center self-center gap-2 text-muted-foreground">
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    className="bg-primary text-primary-foreground p-2 rounded-lg disabled:opacity-50"
                    onClick={handleAcceptJob}
                  >
                    {pendingAction === "accept job" ? "Accepting..." : "Accept Job"}
                  </button>
                </div>
              )}

              {gig.isOpen && isClient && (
                <div className="flex flex-col items-center self-center gap-2 text-muted-foreground">
                  <p className="text-xs">
                    No freelancer has accepted this job yet — you can cancel it and get the
                    escrowed budget refunded.
                  </p>
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    className="bg-destructive text-destructive-foreground p-2 rounded-lg disabled:opacity-50"
                    onClick={handleCancelJob}
                  >
                    {pendingAction === "cancel job" ? "Cancelling..." : "Cancel Job & Refund"}
                  </button>
                </div>
              )}

              {isAssignedFreelancer && !gig.fundsReleased && (
                <div className="flex items-center self-center gap-2 text-muted-foreground">
                  <input
                    type="text"
                    className="w-full p-2 rounded-lg"
                    placeholder="Your project link..."
                  />
                  <button
                    type="button"
                    className="bg-primary text-primary-foreground p-2 rounded-lg"
                  >
                    Submit for review
                  </button>
                </div>
              )}

              {!gig.isOpen && !gig.fundsReleased && !gig.isCancelled && isClient && (
                <div className="flex flex-col items-center self-center gap-2 text-muted-foreground w-full">
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    className="bg-primary text-primary-foreground p-2 rounded-lg w-full disabled:opacity-50"
                    onClick={handleReleaseFunds}
                  >
                    {pendingAction === "release funds" ? "Releasing..." : "Release Funds"}
                  </button>

                  {deadline != null && (
                    <div className="text-xs text-center">
                      {deadlinePassed ? (
                        <button
                          type="button"
                          disabled={pendingAction !== null}
                          className="bg-destructive text-destructive-foreground p-2 rounded-lg mt-2 disabled:opacity-50"
                          onClick={handleReclaimFunds}
                        >
                          {pendingAction === "reclaim funds"
                            ? "Reclaiming..."
                            : "Freelancer missed the delivery window — Reclaim Funds"}
                        </button>
                      ) : (
                        <p>
                          Freelancer has until{" "}
                          {new Date(deadline * 1000).toLocaleString()} to deliver. If they don&apos;t,
                          you&apos;ll be able to reclaim the escrowed funds automatically.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GigDetails;
