import Navbar from "@/components/public/Navbar";
import Hero from "@/components/public/Hero";
import Stats from "@/components/home/Stats";
import AppPurpose from "@/components/home/AppPurpose";
import PopularServices from "@/components/home/PopularServices";
import SupportedCountries from "@/components/home/SupportedCountries";
import ApiPreview from "@/components/home/ApiPreview";
import Features from "@/components/public/Features";
import HowItWorks from "@/components/public/HowItWorks";
import FAQ from "@/components/home/FAQ";
import CTA from "@/components/home/CTA";
import Footer from "@/components/public/Footer";

export default function Home() {
  return (
    <main
      id="top"
      className="overflow-x-clip"
    >
      <Navbar />
      <Hero />
      <Stats />
      <AppPurpose />
      <PopularServices />
      <SupportedCountries />
      <ApiPreview />
      <Features />
      <HowItWorks />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
