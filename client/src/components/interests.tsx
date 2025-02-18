"use client";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

import { ArrowRight } from "lucide-react";

import { useState } from "react";
import AnimatedPage from "./animated/animated-page";

const INTERESTS = [
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "DevOps",
  "AWS",
  "GraphQL",
  "Docker",
  "Kubernetes",
  "Next.js",
  "Vue.js",
  "Go",
  "Rust",
  "Machine Learning",
  "Web3",
] as const;

const Interests = () => {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <AnimatedPage className="min-h-screen flex flex-col p-4">
      <Logo />
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full animate-in">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            What are you interested in?
          </h1>
          <p className="text-sm text-muted-foreground">
            Select your interests to find developers who share them.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full mb-8">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              onClick={() =>
                setSelected((prev) =>
                  prev.includes(interest)
                    ? prev.filter((i) => i !== interest)
                    : [...prev, interest]
                )
              }
              className={cn(
                "p-4 rounded-lg text-sm font-medium transition-colors text-left",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected.includes(interest)
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-card-foreground"
              )}
            >
              {interest}
            </button>
          ))}
        </div>
        <Button
          size="lg"
          className="w-full max-w-xs group"
          disabled={selected.length === 0}
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </AnimatedPage>
  );
};

export default Interests;
