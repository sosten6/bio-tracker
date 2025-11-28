import { Link } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import ImpactSection from "@/components/ImpactSection";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faPhone } from '@fortawesome/free-solid-svg-icons';

const Index = () => {
  return (
    <div className="min-h-screen">
      <header className="absolute top-0 left-0 right-20 z-20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-secondary shadow-lg" />
              <span className="text-2xl font-bold text-white">BioTracker</span>
            </Link>
            <nav className="hidden md:flex gap-8">
              <Link to="/" className="text-white hover:text-accent transition-colors font-medium">
                Home
              </Link>
              <Link to="/observations" className="text-white hover:text-accent transition-colors font-medium">
                Observations
              </Link>
              <Link to="/upload" className="text-white hover:text-accent transition-colors font-medium">
                Upload
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <HeroSection />
      <FeaturesSection />
      <ImpactSection />

      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4">
          {/* Mobile layout */}
          <div className="md:hidden">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent" />
                <span className="text-xl font-bold text-foreground">BioTracker</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Empowering citizen scientists to protect biodiversity worldwide.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Left column: Platform + Resources + Partnerships stacked */}
              <div className="flex flex-col space-y-8">
                <div>
                  <h4 className="font-semibold text-foreground mb-4">Platform</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link to="/observations" className="hover:text-foreground transition-colors">Explore Data</Link></li>
                    <li><Link to="/upload" className="hover:text-foreground transition-colors">Submit Sighting</Link></li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-4">Resources</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="#" className="hover:text-foreground transition-colors">Species Guide</a></li>
                    <li><a href="https://www.citynaturechallenge.org/press-and-publications" className="hover:text-foreground transition-colors">Research Papers</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-4">Partnerships</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="#" className="hover:text-foreground transition-colors">Partner NGOs</a></li>
                  </ul>
                </div>
              </div>
              
              {/* Right column: Connect + Contact Us stacked */}
              <div className="flex flex-col space-y-8">
                <div>
                  <h4 className="font-semibold text-foreground mb-4">Connect</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="#" className="hover:text-foreground transition-colors">Community Forum</a></li>
                    <li><a href="https://scistarter.org/newsletter" className="hover:text-foreground transition-colors">Newsletter</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-4">Contact Us</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faTwitter} className="h-4 w-4" />
                      <a href="https://x.com/gunner6235" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">X (Twitter)</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faWhatsapp} className="h-4 w-4" />
                      <a href="https://wa.me/+254796412410?text=Hello%20BioTracker%20team!" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">WhatsApp</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faPhone} className="h-4 w-4" />
                      <a href="tel:+254796412410" className="hover:text-foreground transition-colors">Call Us</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop layout - 6 columns */}
          <div className="hidden md:grid md:grid-cols-6 md:gap-8">
            {/* Column 1: BioTracker */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent" />
                <span className="text-xl font-bold text-foreground">BioTracker</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Empowering citizen scientists to protect biodiversity worldwide.
              </p>
            </div>
            
            {/* Column 2: Platform */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/observations" className="hover:text-foreground transition-colors">Explore Data</Link></li>
                <li><Link to="/upload" className="hover:text-foreground transition-colors">Submit Sighting</Link></li>
              </ul>
            </div>
            
            {/* Column 3: Resources */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://www.inaturalist.org/guides" className="hover:text-foreground transition-colors">Species Guide</a></li>
                <li><a href="https://www.citynaturechallenge.org/press-and-publications" className="hover:text-foreground transition-colors">Research Papers</a></li>
              </ul>
            </div>

            {/* Column 4: Partnerships */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Partnerships</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Partner NGOs</a></li>
              </ul>
            </div>

            {/* Column 5: Connect */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Community Forum</a></li>
                <li><a href="https://scistarter.org/newsletter" className="hover:text-foreground transition-colors">Newsletter</a></li>
              </ul>
            </div>

            {/* Column 6: Contact Us */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Contact Us</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faTwitter} className="h-4 w-4" />
                  <a href="https://x.com/gunner6235" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">X (Twitter)</a>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faWhatsapp} className="h-4 w-4" />
                  <a href="https://wa.me/+254796412410?text=Hello%20BioTracker%20team!" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">WhatsApp</a>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faPhone} className="h-4 w-4" />
                  <a href="tel:+254796412410" className="hover:text-foreground transition-colors">Call Us</a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2025 BioTracker. Contributing to SDG 15 & 17. Built for conservation.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;