import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, MapPin, Users, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Species Identification",
    description: "Upload photos and get instant species identification powered by machine learning models trained on millions of wildlife images."
  },
  {
    icon: MapPin,
    title: "Community Map",
    description: "Visualize biodiversity hotspots and track species distribution patterns across your region and around the world."
  },
  {
    icon: Users,
    title: "Citizen Science Network",
    description: "Join a global community of nature enthusiasts and scientists working together to monitor ecosystem health."
  },
  {
    icon: TrendingUp,
    title: "Impact Tracking",
    description: "See how your contributions support conservation research and help protect endangered species and habitats."
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Science Made Simple
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools to help you document, identify, and share wildlife observations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="hover:shadow-[var(--shadow-hover)] transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
