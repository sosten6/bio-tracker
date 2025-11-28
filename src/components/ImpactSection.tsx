import { Card, CardContent } from "@/components/ui/card";
import { Target, Leaf, Users2, Globe } from "lucide-react";
import mapIllustration from "@/assets/map-illustration.png";

const sdgGoals = [
  {
    icon: Leaf,
    number: "SDG 15",
    title: "Life on Land",
    description: "Combat biodiversity loss and protect terrestrial ecosystems"
  },
  {
    icon: Users2,
    number: "SDG 17",
    title: "Partnerships",
    description: "Multi-stakeholder cooperation for global conservation"
  }
];

const ImpactSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-semibold mb-6">
              Global Impact
            </div>
            
            <h2 className="text-4xl font-bold text-foreground mb-6">
              Your Observations Drive Real Conservation
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Every photo you share contributes to vital research on ecosystem health.
species migration patterns, and biodiversity hotspots.
 Together, we're building
The world's largest citizen science database for wildlife conservation.
            </p>

            <div className="space-y-4">
              {sdgGoals.map((goal, index) => {
                const Icon = goal.icon;
                return (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardContent className="flex items-start gap-4 p-5">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-primary mb-1">{goal.number}</div>
                        <h3 className="font-bold text-foreground mb-1">{goal.title}</h3>
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="relative rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-3xl" />
            <img 
              src={mapIllustration} 
              alt="Global biodiversity map" 
              className="relative rounded-2xl shadow-[var(--shadow-card)] w-full"
            />
            <div className="absolute -bottom-6 -right-6 bg-card p-6 rounded-xl shadow-[var(--shadow-card)] border border-border">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">125+</div>
                  <div className="text-sm text-muted-foreground">Countries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImpactSection;
