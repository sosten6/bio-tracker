import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Loader2, Edit, Trash2, Eye, EyeOff, Home, BookOpen, FileText, UploadCloud, User, LogOut, Menu, X, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ObservationDetail from "@/components/ObservationDetail";

interface Observation {
  id: string;
  species: string;
  commonName: string;
  location: string;
  date: string;
  observer: string;
  imageUrl: string;
  primaryImageUrl: string | null;
  confidence: number;
  isPublic: boolean;
}

const MyObservations = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchMyObservations();
    }
  }, [user]);

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

  const fetchMyObservations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('observations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedObservations = data?.map((obs: any) => ({
        id: obs.id,
        species: obs.species_name,
        commonName: obs.common_name,
        location: obs.location,
        date: obs.observation_date,
        observer: obs.user_id,
        imageUrl: obs.image_url,
        primaryImageUrl: obs.primary_image_url,
        confidence: obs.ai_confidence || 0,
        isPublic: obs.is_public
      })) || [];

      setObservations(formattedObservations);
    } catch (error) {
      console.error('Error fetching observations:', error);
      toast.error("Failed to load your observations");
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (id: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('observations')
        .update({ is_public: !currentVisibility })
        .eq('id', id);

      if (error) throw error;

      toast.success(currentVisibility ? "Observation hidden" : "Observation made public");
      fetchMyObservations();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error("Failed to update visibility");
    }
  };

  const deleteObservation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this observation?")) return;

    try {
      const { error } = await supabase
        .from('observations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Observation deleted successfully");
      fetchMyObservations();
    } catch (error) {
      console.error('Error deleting observation:', error);
      toast.error("Failed to delete observation");
    }
  };

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card overflow-x-hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between w-full">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0" />
              <span className="text-xl font-bold text-foreground hidden xs:block">BioTracker</span>
            </Link>
            <div className="flex items-center gap-4 flex-1 justify-end">
              <nav className="hidden md:flex gap-6 relative right-20">
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
                <Link to="/observations" className="text-muted-foreground hover:text-foreground transition-colors">
                  Observations
                </Link>
                <Link to="/my-observations" className="text-foreground font-medium">
                  My Observations
                </Link>
                <Link to="/upload" className="text-muted-foreground hover:text-foreground transition-colors">
                  Upload
                </Link>
              </nav>
              {user ? (
                <div ref={userMenuRef} className="absolute right-3 ">
                  <Button
                    variant="ghost"
                    className="-left-11 -top-5  p-2 rounded-full"
                    onClick={handleUserMenuClick}
                  >
                    {isDesktop ? (
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-base">
                        {getInitials(user.email || "U")}
                      </div>
                    ) : (
                      <Menu className="h-5 w-5 text-foreground" />
                    )}
                  </Button>
                  {isDesktop && isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-md shadow-lg z-0 flex flex-col">
                      <div className="border-t border-border">
                        <Link
                          to="/my-observations"
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          My Observations
                        </Link>
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50">
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
            style={{ transform: 'translateX(0)' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="pt-16 px-4 pb-4 border-b relative">
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
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {getInitials(user.email || "U")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
              </div>
            </div>
            <nav className="px-2 space-y-1 overflow-y-auto h-[calc(100%-8rem)]">
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

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">My Observations</h1>
          <p className="text-lg text-muted-foreground">
            Manage your wildlife observations
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : observations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">You haven't submitted any observations yet.</p>
            <Link to="/upload">
              <Button>Upload Your First Observation</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {observations.map((obs) => (
              <Card 
                key={obs.id} 
                className="overflow-hidden hover:shadow-[var(--shadow-hover)] transition-shadow duration-300"
              >
                <div className="aspect-square overflow-hidden cursor-pointer" onClick={() => setSelectedObservation(obs)}>
                  <img 
                    src={obs.primaryImageUrl || obs.imageUrl} 
                    alt={obs.commonName}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <CardContent className="p-5">
                  <div className="mb-3">
                    <h3 className="font-bold text-lg text-foreground mb-1">{obs.commonName}</h3>
                    <p className="text-sm text-muted-foreground italic">{obs.species}</p>
                  </div>
                  
                  <div className="flex gap-2 mb-3">
                    <Badge variant="secondary" className="confidencemy">
                      {obs.confidence}%confident
                    </Badge>
                    <Badge variant={obs.isPublic ? "default" : "outline"}>
                      {obs.isPublic ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                      {obs.isPublic ? "Public" : "Hidden"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2 location">
                      <MapPin className="h-4 w-4" />
                      <span>{obs.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(obs.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleVisibility(obs.id, obs.isPublic)}
                      className="flex-1"
                    >
                      {obs.isPublic ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                      {obs.isPublic ? "Hide" : "Show"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteObservation(obs.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ObservationDetail 
        observation={selectedObservation}
        open={!!selectedObservation}
        onClose={() => setSelectedObservation(null)}
        onUpdate={fetchMyObservations}
      />
    </div>
  );
};

export default MyObservations;