import React from "react";
import { Navbar } from "../components/landing/Navbar";
import { HeroSection } from "../components/landing/HeroSection";
import { StatsStrip } from "../components/landing/StatsStrip";
import { LivePreviewSnippet } from "../components/landing/LivePreviewSnippet";
import { OrderDependencyDemo } from "../components/landing/OrderDependencyDemo";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { Footer } from "../components/landing/Footer";

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <StatsStrip />
        <LivePreviewSnippet />
        <OrderDependencyDemo />
        <HowItWorksSection />
      </main>
      <Footer />
    </div>
  );
};
