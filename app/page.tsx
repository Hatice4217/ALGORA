import { Footer } from '../components/Footer';
import { LandingHeader } from './components/landing/LandingHeader';
import { HeroSection } from './components/landing/HeroSection';
import { FeaturesSection } from './components/landing/FeaturesSection';
import { HowItWorksSection } from './components/landing/HowItWorksSection';
import { PricingSection } from './components/landing/PricingSection';

// Server-side rendered landing page for optimal LCP
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Interactive Header - Client Component */}
      <LandingHeader />

      <main>
        {/* Hero Section - Server Component */}
        <HeroSection />

        {/* Features Section - Server Component */}
        <FeaturesSection />

        {/* How It Works Section - Server Component */}
        <HowItWorksSection />

        {/* Pricing Section - Client Component for interactivity */}
        <PricingSection />
      </main>

      {/* Footer - Server Component */}
      <Footer />
    </div>
  );
}
