import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ObservationDetail from "@/components/ObservationDetail";
import { UserMenu } from "@/components/UserMenu";

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

const Observations = () => {
  const { user } = useAuth();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchObservations();
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

      setObservations(formattedObservations);
    } catch (error) {
      console.error('Error fetching observations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredObservations = observations.filter(obs => 
    obs.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    obs.species.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent" />
              <span className="text-2xl font-bold text-foreground">BioTracker</span>
            </Link>
            <div className="flex items-center gap-6">
              <nav className="flex gap-6">
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
                <Link to="/observations" className="text-foreground font-medium">
                  Observations
                </Link>
                <Link to="/upload" className="text-muted-foreground hover:text-foreground transition-colors">
                  Upload
                </Link>
              </nav>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">Community</h1>
          <p className="text-lg text-muted-foreground">
            Explore wildlife sightings from citizen scientists 
          </p>
          
          <div className="flex gap-2 mt-6 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by animal name species..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={() => setSearchQuery(searchQuery)}
              className="bg-primary hover:bg-primary/90 font-bold"
            >
              <Search className="h-4 w-4 mr-2" />
              <span className="font-bold">Search</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredObservations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? `No observations found matching "${searchQuery}"` : "No observations yet. Be the first to contribute!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-3 gap-6">
            {filteredObservations.map((obs) => (
              <Card 
                key={obs.id} 
                className="overflow-hidden hover:shadow-[var(--shadow-hover)] transition-shadow duration-300 cursor-pointer"
                onClick={() => setSelectedObservation(obs)}
              >
                <div className="aspect-square overflow-hidden">
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
                  
                  <Badge variant="secondary" className="mb-3">
                    {obs.confidence}% confident
                  </Badge>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{obs.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(obs.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          {user ? (
            <Link to="/upload">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                Contribute Your Observation
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                Sign In to Contribute
              </Button>
            </Link>
          )}
        </div>
      </main>

      <ObservationDetail 
        observation={selectedObservation}
        open={!!selectedObservation}
        onClose={() => setSelectedObservation(null)}
      />
    </div>
  );
};

export default Observations;
