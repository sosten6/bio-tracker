import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Bell, Star, Eye, Home, BookOpen, FileText, UploadCloud, User, LogOut, ArrowLeft, Menu, X, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface Notification {
  id: string;
  observation_id: string;
  review_id: string;
  reviewer_name: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, bio")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setFullName(data.full_name || "");
        setBio(data.bio || "");
      }
    };

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    };

    fetchProfile();
    fetchNotifications();

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            toast.success("New notification received!");
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
            );
            if ((payload.new as Notification).read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        bio: bio,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update profile");
      console.error("Error updating profile:", error);
      return;
    }

    toast.success("Profile updated successfully!");
  };

  const handleMarkAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleViewObservation = (observationId: string, notificationId: string) => {
    handleMarkAsRead(notificationId);
    navigate(`/observations`);
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b border-border bg-card overflow-x-hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0" />
              <span className="text-2xl font-bold text-foreground truncate">BioTracker</span>
            </Link>
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex gap-6 flex-wrap">
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                  Home
                </Link>
                <Link to="/observations" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                  Observations
                </Link>
                {user && (
                  <Link to="/my-observations" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                    My Observations
                  </Link>
                )}
                <Link to="/upload" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                  Upload
                </Link>
              </nav>
              {/* Notifications Bell - Integrated here for both desktop and mobile */}
              <div className="relative flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 p-2 rounded-full"
                  onClick={() => navigate('/profile')} // Or open notifications modal if you add one
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </div>
              <div ref={userMenuRef} className="relative">
                <Button
                  variant="ghost"
                  className="h-10 w-10 p-2 rounded-full flex-shrink-0"
                  onClick={handleUserMenuClick}
                >
                  {isDesktop ? (
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-base flex-shrink-0">
                      {getInitials(user.email || "U")}
                    </div>
                  ) : (
                    <Menu className="h-5 w-5 text-foreground flex-shrink-0" />
                  )}
                </Button>
                {isDesktop && isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-md shadow-lg z-50 flex flex-col">
                    <div className="py-1">
                      <Link
                        to="/"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Home className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">Home</span>
                      </Link>
                      <Link
                        to="/observations"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <BookOpen className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">View Observations</span>
                      </Link>
                      <Link
                        to="/my-observations"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">My Observations</span>
                      </Link>
                      <Link
                        to="/upload"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <UploadCloud className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">Upload</span>
                      </Link>
                    </div>
                    <div className="border-t border-border">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">Account Settings</span>
                      </Link>
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-4 py-2 text-sm text-muted-foreground hover:bg-destructive"
                        onClick={() => {
                          handleSignOut();
                          setIsUserMenuOpen(false);
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Sign Out</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
                className="absolute top-4 left-4 z-10 p-1 text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 overflow-x-hidden">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                  {getInitials(user.email || "U")}
                </div>
                <div className="min-w-0 flex-1">
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
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors overflow-x-hidden"
              >
                <Home className="h-4 w-4 flex-shrink-0" />
                <span className="truncate min-w-0">Home</span>
              </button>
              <button
                onClick={() => {
                  navigate("/observations");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors overflow-x-hidden"
              >
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span className="truncate min-w-0">View Observations</span>
              </button>
              <button
                onClick={() => {
                  navigate("/upload");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors overflow-x-hidden"
              >
                <UploadCloud className="h-4 w-4 flex-shrink-0" />
                <span className="truncate min-w-0">Upload Observation</span>
              </button>
              <button
                onClick={() => {
                  navigate("/my-observations");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors overflow-x-hidden"
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate min-w-0">My Observations</span>
              </button>
              <button
                onClick={() => {
                  navigate("/profile");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors overflow-x-hidden"
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="truncate min-w-0">Account Settings</span>
              </button>
              <div className="border-t pt-2 mt-2 overflow-x-hidden">
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/10 transition-colors text-destructive overflow-x-hidden"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate min-w-0">Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      <main className="container max-w-2xl py-8 space-y-6 overflow-x-hidden">
        {/* Notifications Section */}
        <Card className="overflow-x-hidden">
          <CardHeader className="overflow-x-hidden">
            <div className="flex items-center justify-between overflow-x-hidden">
              <CardTitle className="flex items-center gap-2 overflow-x-hidden">
                <Bell className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">Notifications</span>
              </CardTitle>
              {unreadCount > 0 && (
                <Badge variant="default" className="flex-shrink-0">{unreadCount} new</Badge>
              )}
            </div>
            <CardDescription className="truncate">
              Reviews and updates on your observations
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-hidden">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 truncate">
                No notifications yet
              </p>
            ) : (
              <div className="space-y-3 overflow-x-hidden">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border relative overflow-hidden ${
                      !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-muted'
                    }`}
                  >
                    <div className="pr-10 overflow-hidden">
                      <div className="space-y-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{notification.message}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {new Date(notification.created_at).toLocaleDateString()} at{' '}
                          {new Date(notification.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-3 right-3 flex-shrink-0"
                      onClick={() => handleViewObservation(notification.observation_id, notification.id)}
                    >
                      <Eye className="h-4 w-4 flex-shrink-0" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Information Section */}
        <Card className="overflow-x-hidden">
          <CardHeader className="overflow-x-hidden">
            <CardTitle className="truncate">Profile Information</CardTitle>
            <CardDescription className="truncate">
              Update your account details and personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-hidden">
            <form onSubmit={handleUpdateProfile} className="space-y-6 overflow-x-hidden">
              <div className="space-y-2 overflow-x-hidden">
                <Label htmlFor="email" className="truncate">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted truncate"
                />
                <p className="text-xs text-muted-foreground truncate">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2 overflow-x-hidden">
                <Label htmlFor="fullName" className="truncate">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="truncate"
                />
              </div>

              <div className="space-y-2 overflow-x-hidden">
                <Label htmlFor="bio" className="truncate">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="overflow-x-hidden resize-vertical"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full overflow-x-hidden">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />}
                <span className="truncate">Save Changes</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}