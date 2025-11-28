import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Loader2, Users, Search, Home, BookOpen, FileText, UploadCloud, User, LogOut, Menu, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ObservationDetail from "@/components/ObservationDetail";

interface Observation {
  id: string;
  species: string;
  commonName: string;
  location: string;
  date: string;
  imageUrl: string;
  primaryImageUrl: string | null;
  confidence: number;
}

interface SpeciesGroup {
  species: string;
  commonName: string;
  primaryImageUrl: string;
  observationCount: number;
  observations: Observation[];
  averageConfidence: number;
}

const ObservationsGrouped = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [speciesGroups, setSpeciesGroups] = useState<SpeciesGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<SpeciesGroup | null>(null);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchObservations();
  }, []);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchObservations = async () => {
    try {
      const { data, error } = await supabase
        .from('observations')
        .select('id, species_name, common_name, location, observation_date, image_url, primary_image_url, ai_confidence, is_public')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedObservations = data?.map((obs: any) => ({
        id: obs.id,
        species: obs.species_name,
        commonName: obs.common_name,
        location: obs.location,
        date: obs.observation_date,
        imageUrl: obs.image_url,
        primaryImageUrl: obs.primary_image_url,
        confidence: obs.ai_confidence || 0
      })) || [];

      // Group observations by species
      const grouped = formattedObservations.reduce((acc: { [key: string]: SpeciesGroup }, obs) => {
        const key = `${obs.species}-${obs.commonName}`;
        
        if (!acc[key]) {
          acc[key] = {
            species: obs.species,
            commonName: obs.commonName,
            primaryImageUrl: obs.primaryImageUrl || obs.imageUrl,
            observationCount: 0,
            observations: [],
            averageConfidence: 0
          };
        }
        
        acc[key].observations.push(obs);
        acc[key].observationCount++;
        
        return acc;
      }, {});

      // Calculate average confidence for each group
      const groupsArray = Object.values(grouped).map(group => ({
        ...group,
        averageConfidence: Math.round(
          group.observations.reduce((sum, obs) => sum + obs.confidence, 0) / group.observations.length
        )
      }));

      setSpeciesGroups(groupsArray);
    } catch (error) {
      console.error('Error fetching observations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpeciesGroups = speciesGroups.filter(group => 
    group.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.species.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const handleUserMenuClick = () => {
    if (isDesktop) {
      setIsUserMenuOpen(prev => !prev);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b border-border bg-card overflow-x-hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent" />
              <span className="text-2xl font-bold text-foreground">BioTracker</span>
            </Link>
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex gap-6 relative right-10">
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
                <Link to="/observations" className="text-foreground font-medium">
                  Observations
                </Link>
                {user && (
                  <Link to="/my-observations" className="text-muted-foreground hover:text-foreground transition-colors">
                    My Observations
                  </Link>
                )}
                <Link to="/upload" className="text-muted-foreground hover:text-foreground transition-colors">
                  Upload
                </Link>
              </nav>
              {user ? (
                <div ref={userMenuRef} className="absolute right-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-left-11 -top-5 h-8 w-8 rounded-full p-0"
                    onClick={handleUserMenuClick}
                  >
                    {isDesktop ? (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                        {getInitials(user.email || "U")}
                      </div>
                    ) : (
                      <Menu className="h-5 w-5 text-foreground" />
                    )}
                  </Button>
                  {isDesktop && isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-md shadow-lg z-50 flex flex-col">
                      
                      <div className="border-t border-border">
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          Account Settings
                        </Link>
                        <Button
                          variant="ghost"
                          className="w-full justify-start px-4 py-2 text-sm hover:bg-destructive"
                          onClick={() => {
                            handleSignOut();
                            setIsUserMenuOpen(false);
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="sm">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {!isDesktop && isOpen && (
        <div className="fixed inset-0 z-50 overflow-x-hidden">
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
            className="absolute top-0 right-0 h-full w-64 bg-background border-l shadow-xl transition-transform duration-300 ease-out overflow-x-hidden"
            style={{ transform: 'translateX(0)' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="pt-16 px-4 pb-4 border-b relative overflow-x-hidden">
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
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                  {getInitials(user.email || "U")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
              </div>
            </div>
            <nav className="px-2 space-y-1 overflow-y-auto h-[calc(100%-8rem)] overflow-x-hidden">
              <button
                onClick={() => {
                  navigate("/");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors"
              >
                <Home className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Home</span>
              </button>
              <button
                onClick={() => {
                  navigate("/observations");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors"
              >
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">View Observations</span>
              </button>
              <button
                onClick={() => {
                  navigate("/upload");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors"
              >
                <UploadCloud className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Upload Observation</span>
              </button>
              {user && (
                <button
                  onClick={() => {
                    navigate("/my-observations");
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors"
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">My Observations</span>
                </button>
              )}
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
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
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

      <main className="container mx-auto px-4 py-12 overflow-x-hidden">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 overflow-x-hidden">
          <div className="text-center md:text-left md:w-1/2 overflow-x-hidden observationsheader">
            <h1 className="text-4xl font-bold text-foreground mb-3">Community Observations</h1>
            <p className="text-lg text-muted-foreground">
              Explore wildlife sightings from citizen scientists around the world
            </p>
          </div>
          
          <div className="flex gap-2 md:w-auto overflow-x-hidden">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by animal name or species..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={() => setSearchQuery(searchQuery)}
              className="bg-primary hover:bg-primary/90 font-bold min-w-0"
            >
              <Search className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate font-bold">Search</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSpeciesGroups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? `No observations found matching "${searchQuery}"` : "No observations yet. Be the first to contribute!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 overflow-x-hidden">
            {filteredSpeciesGroups.map((group) => (
              <Card 
                key={`${group.species}-${group.commonName}`}
                className="overflow-hidden hover:shadow-[var(--shadow-hover)] transition-shadow duration-300 cursor-pointer overflow-x-hidden"
                onClick={() => setSelectedGroup(group)}
              >
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={group.primaryImageUrl} 
                    alt={group.commonName}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <CardContent className="p-5 overflow-x-hidden">
                  <div className="mb-3 overflow-x-hidden">
                    <h3 className="font-bold text-lg text-foreground mb-1 truncate">{group.commonName}</h3>
                    <p className="text-sm text-muted-foreground italic truncate">{group.species}</p>
                  </div>
                  
                  <div className="flex gap-2 mb-3 overflow-x-hidden confidence">
                    <Badge variant="secondary" className="truncate confidence">
                      {group.averageConfidence}% confidence
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1 truncate observations">
                      <Users className="h-3 w-3" />
                      {group.observationCount} {group.observationCount === 1 ? 'observation' : 'observations'}
                    </Badge>
                  </div>

                  <Button variant="outline" className="w-full truncate viewallbutton" onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroup(group);
                  }}>
                    View All Observations
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 text-center overflow-x-hidden">
          {user ? (
            <Link to="/upload">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity min-w-0">
                <span className="truncate">Contribute Your Observation</span>
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity min-w-0">
                <span className="truncate">Sign In to Contribute</span>
              </Button>
            </Link>
          )}
        </div>
      </main>

      {/* Species Group Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-x-hidden" onClick={() => setSelectedGroup(null)}>
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border sticky top-0 bg-card z-10 overflow-x-hidden">
              <h2 className="text-2xl font-bold text-foreground truncate">{selectedGroup.commonName}</h2>
              <p className="text-muted-foreground italic truncate">{selectedGroup.species}</p>
              <p className="text-sm text-muted-foreground mt-2 truncate">
                {selectedGroup.observationCount} {selectedGroup.observationCount === 1 ? 'observation' : 'observations'} from the community
              </p>
            </div>
            
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 overflow-x-hidden">
              {selectedGroup.observations.map((obs) => (
                <Card 
                  key={obs.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer overflow-x-hidden"
                  onClick={() => {
                    setSelectedObservation(obs);
                    setSelectedGroup(null);
                  }}
                >
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={obs.imageUrl} 
                      alt={obs.commonName}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4 overflow-x-hidden">
                    <Badge variant="secondary" className="mb-2 truncate">
                      {obs.confidence}% confidence
                    </Badge>
                    <div className="space-y-1 text-sm text-muted-foreground overflow-x-hidden">
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{obs.location}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{new Date(obs.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="p-6 border-t border-border sticky bottom-0 bg-card overflow-x-hidden">
              <Button variant="outline" className="w-full truncate" onClick={() => setSelectedGroup(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <ObservationDetail 
        observation={selectedObservation}
        open={!!selectedObservation}
        onClose={() => setSelectedObservation(null)}
      />
    </div>
  );
};

export default ObservationsGrouped;