-- Add visibility field to observations
ALTER TABLE public.observations 
ADD COLUMN is_public boolean NOT NULL DEFAULT true;

-- Create index for faster queries on species grouping
CREATE INDEX idx_observations_species ON public.observations(species_name, common_name);

-- Create index for user's observations
CREATE INDEX idx_observations_user_id ON public.observations(user_id);

-- Add primary_image_url field for AI-generated clear species images
ALTER TABLE public.observations
ADD COLUMN primary_image_url text;