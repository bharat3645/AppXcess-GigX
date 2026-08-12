"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { z } from "zod";
import { toast } from "sonner";
import { useWallet } from "@/context/WalletContext";

// Keep validation rules in one place so the error messages shown to the
// user and the constraints enforced actually match.
const jobSchema = z.object({
  jobName: z.string().trim().min(3, "Job name must be at least 3 characters."),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters so freelancers know what they're bidding on."),
  budget: z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, "Budget must be a positive number, e.g. 0.5")
    .refine((val) => Number(val) > 0, "Budget must be greater than zero.")
    .refine((val) => Number(val) <= 1000, "Budget looks unreasonably large — double check the ETH amount."),
});

/// Turns thrown wallet/RPC errors into a short, human-readable message
/// instead of dumping a raw error object on the user.
function describeError(err) {
  if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
    return "Transaction rejected in wallet.";
  }
  if (err?.code === "INSUFFICIENT_FUNDS") {
    return "Wallet does not have enough ETH to cover the budget and gas.";
  }
  return err?.reason || err?.data?.message || err?.message || "Transaction failed. Please try again.";
}

export default function PostJobPage() {
  const [jobName, setJobName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { account, signer, connectWallet } = useWallet();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!signer) {
      toast.error("Connect your wallet before posting a job.");
      return;
    }

    const result = jobSchema.safeParse({ jobName, description, budget });
    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0]] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
      toast.error("Contract address is not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS.");
      setIsSubmitting(false);
      return;
    }

    try {
      const contractAbi = [
        "function postJob(string calldata _description, uint256 _budget) external payable",
      ];
      const contract = new ethers.Contract(contractAddress, contractAbi, signer);
      const budgetWei = ethers.utils.parseEther(result.data.budget);

      const tx = await contract.postJob(result.data.description, budgetWei, { value: budgetWei });
      toast.info("Transaction submitted — waiting for confirmation...");
      await tx.wait();

      toast.success("Job posted on-chain and funds escrowed!");
      setJobName("");
      setDescription("");
      setBudget("");
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error submitting job:", err);
      toast.error(describeError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 pt-20">
      <h1 className="text-2xl font-bold mb-4">Post a Job</h1>
      {!account ? (
        <>
          <button onClick={connectWallet} className="bg-blue-500 text-white p-2 rounded">
            Connect Wallet
          </button>
          <p>Connect your wallet to post a job.</p>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mb-4 space-y-4">
          <div>
            <label className="block font-medium">Job Name:</label>
            <input
              type="text"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="border p-2 rounded w-full"
              required
            />
            {errors.jobName && <p className="text-red-500 text-sm mt-1">{errors.jobName}</p>}
          </div>
          <div>
            <label className="block font-medium">Job Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border p-2 rounded w-full"
              required
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>
          <div>
            <label className="block font-medium">Budget (ETH):</label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.5"
              className="border p-2 rounded w-full"
              required
            />
            {errors.budget && <p className="text-red-500 text-sm mt-1">{errors.budget}</p>}
            <p className="text-muted-foreground text-xs mt-1">
              This amount is escrowed in the contract when you submit and is only released to the
              freelancer once you approve the work (or refunded to you if the job is cancelled or
              never delivered).
            </p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-500 text-white p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Posting..." : "Post Job"}
          </button>
        </form>
      )}
      {isSubmitted && <p className="text-green-500">Job successfully submitted!</p>}
    </div>
  );
}
