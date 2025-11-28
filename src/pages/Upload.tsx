import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload as UploadIcon, Camera, Loader2, Star, MapPin, Info, AlertCircle, Home, BookOpen, FileText, UploadCloud, User, LogOut, Menu, X, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const Upload = () => {
  const { user, signOut } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<any>(null);
  const [formData, setFormData] = useState<any>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to upload observations");
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      // No specific fetch needed for upload
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

  // Request user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lon);
          
          // Reverse geocode to get location name
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
            );
            const data = await response.json();
            setLocation(data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          } catch (error) {
            setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          }
        },
        (error) => {
          console.log("Location access denied or unavailable:", error);
          toast.info("Location access optional - you can enter it manually");
        }
      );
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user || !selectedFile) {
      toast.error("Please select an image");
      return;
    }

    // Capture form values before async operations
    const form = e.currentTarget;
    const locationValue = (form.elements.namedItem('location') as HTMLInputElement)?.value;
    const observationDate = (form.elements.namedItem('date') as HTMLInputElement)?.value;
    const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement)?.value;

    if (!locationValue || !observationDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Upload image to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('observations')
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload image');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('observations')
        .getPublicUrl(fileName);

      // Call AI identification
      const { data: identificationData, error: functionError } = await supabase.functions.invoke(
        'identify-animal',
        { body: { imageUrl: publicUrl } }
      );

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(functionError.message || 'Failed to identify animal');
      }

      // Check if content is wildlife
      if (identificationData.is_wildlife === false) {
        setIdentificationResult(identificationData);
        setIsAnalyzing(false);
        setShowRejectionDialog(true);
        return;
      }

      // Get visibility preference
      const isPublic = (form.elements.namedItem('visibility') as HTMLInputElement)?.checked ?? true;

      // Store form data and identification result
      setFormData({
        locationValue,
        observationDate,
        notes,
        publicUrl,
        isPublic,
      });
      setIdentificationResult(identificationData);
      setIsAnalyzing(false);
      setShowResultDialog(true);
    } catch (error) {
      console.error('Submission error:', error);
      setIsAnalyzing(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit observation';
      toast.error(errorMessage);
    }
  };

  const handleConfirmSubmission = async () => {
    if (!user || !identificationResult || !formData) return;

    try {
      // Save observation with optional user rating
      const notesWithRating = userRating > 0 
        ? `${formData.notes || ''}\n\nUser AI Rating: ${userRating}/5 stars`.trim()
        : formData.notes || null;

      const { error: insertError } = await supabase
        .from('observations')
        .insert({
          user_id: user.id,
          species_name: identificationResult.species_name,
          common_name: identificationResult.common_name,
          ai_confidence: identificationResult.confidence,
          location: formData.locationValue,
          observation_date: formData.observationDate,
          notes: notesWithRating,
          image_url: formData.publicUrl,
          primary_image_url: identificationResult.primary_image_url,
          latitude,
          longitude,
          is_public: formData.isPublic,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to save observation');
      }

      toast.success("Observation submitted successfully!", {
        description: `Identified as ${identificationResult.common_name} (${identificationResult.confidence}% confidence)`
      });
      navigate("/observations");
    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit observation';
      toast.error(errorMessage);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600";
    if (confidence >= 70) return "text-yellow-600";
    return "text-orange-600";
  };

  const getStarRating = (confidence: number) => {
    return Math.round((confidence / 100) * 5);
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b border-border bg-card overflow-x-hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent" />
              <span className="text-2xl font-bold text-foreground">BioTracker</span>
            </Link>
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex gap-6 relative right-20">
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
                <Link to="/observations" className="text-muted-foreground hover:text-foreground transition-colors">
                  Observations
                </Link>
                <Link to="/my-observations" className="text-muted-foreground hover:text-foreground transition-colors">
                  My Observations
                </Link>
                <Link to="/upload" className="text-foreground font-medium">
                  Upload
                </Link>
              </nav>
              {user ? (
                <div ref={userMenuRef} className="absolute right-3">
                  <Button
                    variant="ghost"
                    className=" p-2 rounded-full"
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
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-md shadow-lg z-50 flex flex-col desktopside">
                      <div className="py-1">
                        
                       
                        <Link
                          to="/my-observations"
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <FileText className="h-4 w-4" />
                          My Observations
                        </Link>
                        
                      </div>
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

      <main className="container mx-auto px-4 py-12 max-w-2xl overflow-x-hidden">
        <div className="mb-8 text-center overflow-x-hidden">
          <h1 className="text-4xl font-bold text-foreground mb-3 truncate">Submit Observation</h1>
          <p className="text-lg text-muted-foreground truncate">
            Share your wildlife sighting and help monitor biodiversity
          </p>
        </div>

        <Card className="shadow-[var(--shadow-card)] overflow-x-hidden">
          <CardHeader>
            <CardTitle>New Wildlife Observation</CardTitle>
            <CardDescription>
              Upload a photo and our AI will help identify the species
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6 overflow-x-hidden">
              <div className="space-y-2 overflow-x-hidden">
                <Label htmlFor="image">Photo Upload</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer overflow-x-hidden">
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    required
                  />
                  <label htmlFor="image" className="cursor-pointer overflow-x-hidden">
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-64 mx-auto rounded-lg mb-4 overflow-x-hidden"
                      />
                    ) : (
                      <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    )}
                    <p className="text-muted-foreground mb-2 truncate">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      PNG, JPG up to 10MB
                    </p>
                  </label>
                </div>
              </div>

              <div className="space-y-2 overflow-x-hidden">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  name="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Tsavo National Park, Kenya"
                  required
                  className="truncate"
                />
                <p className="text-xs text-muted-foreground truncate">
                  {latitude && longitude ? "Location detected automatically. You can edit it." : "Enter location manually"}
                </p>
              </div>

              <div className="space-y-2 overflow-x-hidden">
                <Label htmlFor="date">Date Observed *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                <p className="text-xs text-muted-foreground truncate">
                  Automatically set to today. You can edit it if needed.
                </p>
              </div>

              <div className="space-y-2 overflow-x-hidden">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Behavior, habitat details, or other observations..."
                  rows={4}
                />
              </div>

              <div className="space-y-2 overflow-x-hidden">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="visibility"
                    name="visibility"
                    defaultChecked={true}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="visibility" className="text-sm font-normal cursor-pointer truncate">
                    Make this observation visible to the community
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  You can change this later from your observations page
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 truncate"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />
                    <span className="truncate">Analyzing Image...</span>
                  </>
                ) : (
                  <>
                    <UploadIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Submit Observation</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 p-6 bg-muted rounded-lg overflow-x-hidden">
          <h3 className="font-semibold text-foreground mb-2 truncate">Tips for Better Identification</h3>
          <ul className="space-y-1 text-sm text-muted-foreground overflow-x-hidden">
            <li className="truncate">• Take clear, well-lit photos</li>
            <li className="truncate">• Capture multiple angles when possible</li>
            <li className="truncate">• Include habitat context</li>
            <li className="truncate">• Note distinctive features or behaviors</li>
          </ul>
        </div>
      </main>

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl truncate">Identification Results</DialogTitle>
            <DialogDescription>
              Review the AI analysis of your wildlife observation
            </DialogDescription>
          </DialogHeader>

          {identificationResult && (
            <div className="space-y-6 py-4 overflow-x-hidden">
              {/* Animal Name */}
              <div className="space-y-2 overflow-x-hidden">
                <h3 className="text-xl font-bold text-foreground truncate">
                  {identificationResult.common_name}
                </h3>
                <p className="text-sm italic text-muted-foreground truncate">
                  Scientific name: {identificationResult.species_name}
                </p>
              </div>

              {/* AI Confidence Rating */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg overflow-x-hidden">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1 truncate">AI Confidence</p>
                  <div className="flex items-center gap-2 overflow-x-hidden">
                    <span className={`text-2xl font-bold ${getConfidenceColor(identificationResult.confidence)} truncate`}>
                      {identificationResult.confidence}%
                    </span>
                    <div className="flex gap-1 flex-shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < getStarRating(identificationResult.confidence)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Image */}
              {identificationResult.primary_image_url && (
                <div className="space-y-2 overflow-x-hidden">
                  <p className="text-sm font-medium text-muted-foreground truncate">Reference Image</p>
                  <img
                    src={identificationResult.primary_image_url}
                    alt={identificationResult.common_name}
                    className="w-full h-48 object-cover rounded-lg overflow-x-hidden"
                  />
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-3 overflow-x-hidden">
                <h4 className="font-semibold text-foreground flex items-center gap-2 truncate">
                  <Info className="h-5 w-5 flex-shrink-0" />
                  Quick Facts
                </h4>
                <div className="grid gap-3 text-sm overflow-x-hidden">
                  <div className="flex items-start gap-2 p-3 bg-muted rounded overflow-x-hidden">
                    <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">Habitat</p>
                      <p className="text-muted-foreground truncate">
                        This species is commonly found in various habitats. Specific habitat information may vary by region.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-muted rounded overflow-x-hidden">
                    <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">Characteristics</p>
                      <p className="text-muted-foreground truncate">
                        Distinctive features and behaviors vary by species. Your observation helps track population and distribution patterns.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Info */}
              {formData?.locationValue && (
                <div className="p-3 bg-primary/10 rounded-lg overflow-x-hidden">
                  <p className="text-sm font-medium text-foreground truncate">Observation Location</p>
                  <p className="text-sm text-muted-foreground truncate">{formData.locationValue}</p>
                </div>
              )}

              {/* User Rating (Optional) */}
              <div className="space-y-2 pt-4 border-t overflow-x-hidden">
                <p className="text-sm font-medium text-foreground truncate">Rate AI Analysis (Optional)</p>
                <p className="text-xs text-muted-foreground mb-2 truncate">How accurate was the AI identification?</p>
                <div className="flex gap-2 overflow-x-hidden">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setUserRating(i + 1)}
                      className="transition-transform hover:scale-110 flex-shrink-0"
                    >
                      <Star
                        className={`h-8 w-8 cursor-pointer ${
                          i < userRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {userRating > 0 && (
                  <p className="text-xs text-muted-foreground truncate">You rated: {userRating}/5 stars</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 overflow-x-hidden">
            <Button
              variant="outline"
              onClick={() => {
                setShowResultDialog(false);
                setIdentificationResult(null);
                setFormData(null);
                setUserRating(0);
              }}
              className="min-w-0"
            >
              <span className="truncate">Cancel</span>
            </Button>
            <Button
              onClick={handleConfirmSubmission}
              className="bg-gradient-to-r from-primary to-accent min-w-0"
            >
              <span className="truncate">Confirm & Save Observation</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog for Non-Wildlife Content */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-md overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive truncate">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Upload Not Allowed</span>
            </DialogTitle>
            <DialogDescription>
              This content cannot be displayed in the community observations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-x-hidden">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 overflow-x-hidden">
              <p className="text-sm text-foreground font-medium mb-2 truncate">
                Not Wildlife Content
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {identificationResult?.rejection_reason || "The uploaded content does not appear to be wildlife. Please upload images of wild animals in their natural habitats."}
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground overflow-x-hidden">
              <p className="font-medium text-foreground truncate">Accepted Content:</p>
              <ul className="space-y-1 ml-4 overflow-x-hidden">
                <li className="truncate">• Wild animals in natural habitats</li>
                <li className="truncate">• Birds, mammals, reptiles, amphibians</li>
                <li className="truncate">• Marine life and insects</li>
              </ul>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground overflow-x-hidden">
              <p className="font-medium text-foreground truncate">Not Accepted:</p>
              <ul className="space-y-1 ml-4 overflow-x-hidden">
                <li className="truncate">• Pets or domestic animals</li>
                <li className="truncate">• Humans or people</li>
                <li className="truncate">• Objects or non-living things</li>
                <li className="truncate">• Inappropriate or offensive content</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowRejectionDialog(false);
                setIdentificationResult(null);
                setImagePreview(null);
                setSelectedFile(null);
              }}
              className="w-full min-w-0"
            >
              <span className="truncate">Try Another Image</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Upload;