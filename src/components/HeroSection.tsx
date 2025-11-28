import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Camera, User, Settings, Map, LogOut, User as UserIcon, Upload, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import heroImage from "@/assets/hero-wildlife.jpg";

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return isDesktop;
};

const HeroSection = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [isOpen, setIsOpen] = useState(false);
  const [observationsCount, setObservationsCount] = useState(0);
  const [speciesCount, setSpeciesCount] = useState(0);
  const [contributorsCount, setContributorsCount] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarTransform, setSidebarTransform] = useState('translateX(100%)');

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch observations count
      const { count: obsCount } = await supabase
        .from("observations")
        .select("*", { count: "exact", head: true });
    
      if (obsCount !== null) setObservationsCount(obsCount);
      // Fetch distinct species count
      const { data: speciesData } = await supabase
        .from("observations")
        .select("species_name");
    
      if (speciesData) {
        const uniqueSpecies = new Set(speciesData.map(obs => obs.species_name));
        setSpeciesCount(uniqueSpecies.size);
      }
      // Fetch distinct contributors count
      const { data: contributorsData } = await supabase
        .from("observations")
        .select("user_id");
    
      if (contributorsData) {
        const uniqueContributors = new Set(contributorsData.map(obs => obs.user_id));
        setContributorsCount(uniqueContributors.size);
      }
    };
    fetchStats();
    // Subscribe to real-time changes
    const channel = supabase
      .channel("observations-stats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "observations",
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };

  }, []);
  useEffect(() => {
  if (isOpen) {
    // Start off-screen, then animate in after a tick (to allow transition to apply)
    setSidebarTransform('translateX(100%)');
    requestAnimationFrame(() => {
      setSidebarTransform('translateX(0)');
    });
  } else {
    setSidebarTransform('translateX(100%)');
  }
}, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX;
    setTouchCurrentX(currentX);
    if (sidebarRef.current && deltaX > 0) {
      const width = sidebarRef.current.offsetWidth;
      const clampedDelta = Math.min(width, Math.max(0, deltaX));
      sidebarRef.current.style.transform = `translateX(${clampedDelta}px)`;
    }
  };

  const handleTouchEnd = () => {
    const deltaX = touchCurrentX - touchStartX;
    const snapThreshold = sidebarRef.current ? sidebarRef.current.offsetWidth * 0.3 : 100;
    if (deltaX > snapThreshold) {
      // Swipe right to close
      if (sidebarRef.current) {
        sidebarRef.current.style.transition = 'transform 0.3s ease-out';
        sidebarRef.current.style.transform = `translateX(100%)`;
        setTimeout(() => {
          setIsOpen(false);
          if (sidebarRef.current) {
            sidebarRef.current.style.transform = '';
            sidebarRef.current.style.transition = '';
          }
        }, 300);
      }
    } else {
      // Snap back to open position
      if (sidebarRef.current) {
        sidebarRef.current.style.transition = 'transform 0.3s ease-out';
        sidebarRef.current.style.transform = 'translateX(0)';
        setTimeout(() => {
          sidebarRef.current!.style.transition = '';
        }, 300);
      }
    }
    setTouchStartX(0);
    setTouchCurrentX(0);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div
        className="absolute inset-0 z-0 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 30, 10, 0.7), rgba(20, 10, 40, 0.8)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
     
      {/* User menu in top right */}
      {user && (
        <>
          <div className="absolute top-6 right-6 z-20">
            {isDesktop ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 lg:w-72" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium truncate max-w-40">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                 
                  <DropdownMenuItem onClick={() => navigate("/my-observations")}>
                    <User className="mr-2 h-4 w-4" />
                    My Observations
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                className="h-10 w-10 p-2 rounded-full bg-white/20 backdrop-blur-sm border-white/20"
                onClick={() => setIsOpen(true)}
              >
                <Menu className="h-5 w-5 text-white" />
              </Button>
            )}
          </div>

          {/* Mobile Sidebar */}
          {!isDesktop && isOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden">
              {/* Overlay */}
              <div
                className="absolute inset-0 bg-black/50 transition-opacity duration-300"
                onClick={() => {
                  if (sidebarRef.current) {
                    sidebarRef.current.style.transition = 'transform 0.3s ease-out';
                    sidebarRef.current.style.transform = `translateX(100%)`;
                    setTimeout(() => {
                      setIsOpen(false);
                      if (sidebarRef.current) {
                        sidebarRef.current.style.transform = '';
                        sidebarRef.current.style.transition = '';
                      }
                    }, 300);
                  }
                }}
              />
              {/* Sidebar */}
              <div
                ref={sidebarRef}
                className="absolute top-0 right-0 h-full w-64 bg-background border-l shadow-xl transition-transform duration-300 ease-out"
               style={{ 
    transform: sidebarTransform,  // Dynamic transform
    transition: 'transform 0.3s ease-out'  // Slow slide-in (0.4s for "slow"; adjust as needed)
  }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="pt-16 px-4 pb-4 border-b relative overflow-hidden">
                  <button
                    onClick={() => {
                      if (sidebarRef.current) {
                        sidebarRef.current.style.transition = 'transform 0.3s ease-out';
                        sidebarRef.current.style.transform = `translateX(100%)`;
                        setTimeout(() => {
                          setIsOpen(false);
                          if (sidebarRef.current) {
                            sidebarRef.current.style.transform = '';
                            sidebarRef.current.style.transition = '';
                          }
                        }, 300);
                      }
                    }}
                    className="absolute top-4 left-4 z-10 p-1 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
                <nav className="px-2 space-y-1 overflow-y-auto h-[calc(100%-8rem)] overflow-x-hidden">
                  <button
                    onClick={() => {
                      navigate("/observations");
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors"
                  >
                    <Map className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">View Observations</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/upload");
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors"
                  >
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Upload Observation</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/my-observations");
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors"
                  >
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">My Observations</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/profile");
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors"
                  >
                    <Settings className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Account Settings</span>
                  </button>
                  <div className="border-t pt-2 mt-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors text-destructive"
                    >
                      <LogOut className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Sign Out</span>
                    </button>
                  </div>
                </nav>
              </div>
            </div>
          )}
        </>
      )}
     
      <div className="container mx-auto px-4 z-10 relative overflow-x-hidden">
        <div className="max-w-3xl text-white hero-design overflow-x-hidden">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in">
            Track Biodiversity,
            <br />
            <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              Protect Our Planet.
            </span>
          </h1>
        
          <p className="text-xl md:text-2xl mb-8 text-gray-100 leading-relaxed">
            Join thousands of citizen scientists documenting wildlife.
            Upload photos, get AI-powered species identification, and contribute to global conservation efforts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-12 overflow-x-hidden">
            {user ? (
              <>
                <Link to="/upload">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all min-w-0"
                  >
                    <Camera className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Upload Sighting</span>
                  </Button>
                </Link>
                <Link to="/observations">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-2 border-white text-primary hover:bg-white hover:text-primary text-lg px-8 py-6 min-w-0"
                  >
                    <Map className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Explore</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all min-w-0"
                  >
                    <UserIcon className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Sign in/Sign Up</span>
                  </Button>
                </Link>
                <Link to="/observations">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-2 border-white text-green-500 hover:bg-white hover:text-primary text-lg px-8 py-6 min-w-0"
                  >
                    <Map className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Explore </span>
                  </Button>
                </Link>
              </>
            )}
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-xl overflow-x-hidden">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{observationsCount.toLocaleString()}+</div>
              <div className="text-sm text-gray-200">Observations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{speciesCount.toLocaleString()}+</div>
              <div className="text-sm text-gray-200">Species</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{contributorsCount.toLocaleString()}+</div>
              <div className="text-sm text-gray-200">Contributors</div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;