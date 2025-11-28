-- Add parent_review_id to reviews table for replies
ALTER TABLE public.reviews ADD COLUMN parent_review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE;

-- Update the notification trigger to handle review replies
CREATE OR REPLACE FUNCTION public.create_review_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  observation_owner_id UUID;
  reviewer_full_name TEXT;
  parent_review_owner_id UUID;
  notification_message TEXT;
BEGIN
  -- Get reviewer's name
  SELECT COALESCE(full_name, split_part(email, '@', 1))
  INTO reviewer_full_name
  FROM auth.users
  LEFT JOIN public.profiles ON auth.users.id = public.profiles.id
  WHERE auth.users.id = NEW.user_id;
  
  -- Check if this is a reply to another review
  IF NEW.parent_review_id IS NOT NULL THEN
    -- Get the parent review's owner
    SELECT user_id INTO parent_review_owner_id
    FROM public.reviews
    WHERE id = NEW.parent_review_id;
    
    -- Don't create notification if user is replying to their own review
    IF parent_review_owner_id != NEW.user_id THEN
      -- Create notification for the parent review owner
      INSERT INTO public.notifications (
        user_id,
        observation_id,
        review_id,
        reviewer_name,
        type,
        message
      )
      VALUES (
        parent_review_owner_id,
        NEW.observation_id,
        NEW.id,
        COALESCE(reviewer_full_name, 'Someone'),
        'reply',
        COALESCE(reviewer_full_name, 'Someone') || ' replied to your review'
      );
    END IF;
  ELSE
    -- This is a regular review, not a reply
    -- Get the observation owner
    SELECT user_id INTO observation_owner_id
    FROM public.observations
    WHERE id = NEW.observation_id;
    
    -- Don't create notification if user is reviewing their own observation
    IF observation_owner_id != NEW.user_id THEN
      -- Create notification for the observation owner
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
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;