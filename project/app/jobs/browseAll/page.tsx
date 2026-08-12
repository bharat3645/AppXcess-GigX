"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import {
  ArrowUpRight,
  Clock,
  DollarSign,
  LockKeyhole,
  LockKeyholeOpen,
  LockOpen,
  MapPin,
} from "lucide-react";
import Link from "next/link";

interface Job {
  id: number;
  client: string;
  description: string;
  budget: string;
  isOpen: boolean;
  freelancer: string;
  fundsReleased: boolean;
  isCancelled: boolean;
}

// Field order here MUST match the JobDetail struct in contracts/Job.sol —
// ethers decodes the getter's return data positionally against this list.
const CONTRACT_ABI = [
  "function jobCounter() view returns (uint256)",
  "function jobs(uint256) view returns (address client, string description, uint256 budget, bool isOpen, address freelancer, bool fundsReleased, uint256 acceptedAt, bool isCancelled)",
];

function jobStatus(job: Job): { label: string; className: string } {
  if (job.isCancelled) return { label: "Cancelled", className: "bg-gray-400" };
  if (job.fundsReleased) return { label: "Completed", className: "bg-blue-400" };
  if (job.isOpen) return { label: "Open", className: "bg-green-400" };
  return { label: "In Progress", className: "bg-yellow-500" };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { account, signer, connectWallet } = useWallet();
  const providerUrl = process.env.NEXT_PUBLIC_PROVIDER_URL;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const contractAbi = CONTRACT_ABI;

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      if (!providerUrl) {
        console.error("NEXT_PUBLIC_PROVIDER_URL is not set");
        setLoading(false);
        return;
      }
      if (!contractAddress) {
        console.error("Contract address not set");
        setLoading(false);
        return;
      }
      try {
        const provider = new ethers.providers.JsonRpcProvider(providerUrl);
        const contract = new ethers.Contract(contractAddress, contractAbi, provider);
        const jobCountBN = await contract.jobCounter();
        const jobCount = jobCountBN.toNumber();
        const tempJobs: Job[] = [];
        for (let i = 1; i <= jobCount; i++) {
          try {
            const jobData = await contract.jobs(i);
            tempJobs.push({
              id: i,
              client: jobData.client,
              description: jobData.description,
              budget: ethers.utils.formatEther(jobData.budget),
              isOpen: jobData.isOpen,
              freelancer: jobData.freelancer,
              fundsReleased: jobData.fundsReleased,
              isCancelled: jobData.isCancelled,
            });
          } catch (err) {
            console.warn(`Error fetching job ${i}:`, err);
          }
        }
        setJobs(tempJobs);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20"
    >
      <h1 className="text-2xl font-bold mb-4">Available Jobs</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : jobs.length > 0 ? (
          jobs.map((gig: Job) => (
            <div
              key={gig.id}
              className="group relative bg-card rounded-lg overflow-hidden border border-[hsl(var(--border))] p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-semibold text-card-foreground group-hover:text-primary transition-colors">
                    {gig.description}
                  </h3>
                  <ArrowUpRight
                    className="text-muted-foreground group-hover:text-primary transition-colors"
                    size={20}
                  />
                </div>

                <div className="pt-4 space-y-3 border-t border-[hsl(var(--border))]">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-card-foreground text-xs">
                      Posted by: {gig.client}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-card-foreground">
                      {gig.budget} ETH
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin size={18} />
                    <span>Remote</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {gig?.isOpen ? (
                      <LockKeyholeOpen size={18} />
                    ) : (
                      <LockKeyhole size={18} />
                    )}
                    <span
                      className={`${jobStatus(gig).className} px-4 rounded-xl text-xs text-[#FFFFFF]`}
                    >
                      {jobStatus(gig).label}
                    </span>
                  </div>
                </div>
                <Link href={`/jobs/${gig.id}`}>
                  <button
                    className={`w-full mt-4 py-2 px-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground ${
                      !gig.isOpen && "cursor-not-allowed disabled:opacity-50"
                    }`}
                  >
                    View Details
                  </button>
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground">No jobs available.</p>
        )}
      </div>
    </motion.div>
  );
}
