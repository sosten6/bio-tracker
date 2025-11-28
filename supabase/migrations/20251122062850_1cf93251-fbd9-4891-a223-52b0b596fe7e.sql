-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  observation_id UUID NOT NULL REFERENCES public.observations(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'review',
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create review_likes table
CREATE TABLE public.review_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Enable RLS on review_likes
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_likes
CREATE POLICY "Anyone can view review likes"
ON public.review_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can create likes"
ON public.review_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON public.review_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Function to create notification when review is added
CREATE OR REPLACE FUNCTION public.create_review_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  observation_owner_id UUID;
  reviewer_full_name TEXT;
BEGIN
  -- Get the observation owner
  SELECT user_id INTO observation_owner_id
  FROM public.observations
  WHERE id = NEW.observation_id;
  
  -- Don't create notification if user is reviewing their own observation
  IF observation_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get reviewer's name
  SELECT COALESCE(full_name, split_part(email, '@', 1))
  INTO reviewer_full_name
  FROM auth.users
  LEFT JOIN public.profiles ON auth.users.id = public.profiles.id
  WHERE auth.users.id = NEW.user_id;
  
  -- Create notification
  INSERT INTO public.notifications (
    user_id,
    observation_id,
    review_id,
    reviewer_name,
    type,
    message
  )
  VALUES (
    observation_owner_id,
    NEW.observation_id,
    NEW.id,
    COALESCE(reviewer_full_name, 'Someone'),
    'review',
    COALESCE(reviewer_full_name, 'Someone') || ' reviewed your observation with ' || NEW.rating || ' stars'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create notification on new review
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.create_review_notification();

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_review_likes_review_id ON public.review_likes(review_id);
CREATE INDEX idx_review_likes_user_id ON public.review_likes(user_id);