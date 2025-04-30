"use client"

import { ArrowLeft, Search, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

export default function SkillsPage() {
  // This would typically come from your API/database
  const skills = [
    {
      category: "Smart Contract Development",
      skills: ["Solidity", "Vyper", "Rust", "Smart Contract Security", "Contract Testing"],
    },
    {
      category: "Frontend Development",
      skills: ["React", "Web3.js", "Ethers.js", "DApp Development", "Wallet Integration"],
    },
    {
      category: "Blockchain Platforms",
      skills: ["Ethereum", "Binance Smart Chain", "Polygon", "Solana", "Avalanche"],
    },
    // Add more categories as needed
  ]

  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const allSkills = skills.flatMap((cat) => cat.skills);

  return (
    <main className="min-h-screen  p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-white">Browse by Skills</h1>
          <p className="mt-2 text-gray-400">Search freelancers by specific skills and expertise</p>
        </div>

        <div className="mb-8 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search skills..."
            className="bg-gray-900 border-gray-800 pl-10 text-white placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              const match = allSkills.find((s) => s.toLowerCase() === val.toLowerCase());
              setSelectedSkill(match ?? null);
            }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedSkill(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid gap-8">
          {skills.map((category) => (
            <Card key={category.category} className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6">
                <h2 className="mb-4 text-xl font-semibold text-white">{category.category}</h2>
                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill) => (
                    <Button
                      key={skill}
                      variant={selectedSkill === skill ? "default" : "outline"}
                      onClick={() => setSelectedSkill(skill)}
                      className="border-gray-700 hover:bg-gray-800 hover:text-white"
                    >
                      {skill}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {/* Dummy Freelancer Flashcards */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-white mb-4">Freelancers by Skill</h2>
        <div className="grid gap-8">
          {selectedSkill ? (
            [1, 2].map((i) => (
              <Card key={i} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="text-white font-semibold mb-2">Freelancer {i}</div>
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-gray-800 text-gray-200">{selectedSkill}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            skills.map((category) => (
              <div key={category.category} className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">{category.category}</h3>
                {category.skills.map((skill) => (
                  <div key={skill} className="mb-6">
                    <h4 className="text-lg font-medium text-white mb-2">{skill}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2].map((i) => (
                        <Card key={`${skill}-${i}`} className="bg-gray-900 border-gray-800">
                          <CardContent className="p-4">
                            <div className="text-white font-semibold mb-2">Freelancer {i}</div>
                            <div className="flex flex-wrap gap-1">
                              <Badge className="bg-gray-800 text-gray-200">{skill}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}