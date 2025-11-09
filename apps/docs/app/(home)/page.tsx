import { HeroSection } from "./components/hero-section";
import { FeaturesSection } from "./components/features-section";
import { DecorativePanel } from "./components/decorative-panel";
import { TestimonialsSection } from "./components/testimonials-section";
import { CTASection } from "./components/cta-section";

export default function HomePage() {
  return (
    <div className="flex flex-1 min-h-0">
      <DecorativePanel variant="left" />
      <div className="flex flex-col w-full max-w-6xl mx-auto">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
      </div>
      <DecorativePanel variant="right" />
    </div>
  );
}
