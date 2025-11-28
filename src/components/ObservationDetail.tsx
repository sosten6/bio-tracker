import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Calendar, Star, User, ThumbsUp, Trash2, Edit2, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  parent_review_id: string | null;
  profiles?: {
    full_name: string | null;
  };
  likeCount: number;
  isLikedByUser: boolean;
  replies?: Review[];
}

interface ObservationDetailProps {
  observation: {
    id: string;
    species: string;
    commonName: string;
    location: string;
    date: string;
    observer?: string;
    imageUrl: string;
    confidence: number;
  } | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const ObservationDetail = ({ observation, open, onClose, onUpdate }: ObservationDetailProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyComment, setReplyComment] = useState("");

  useEffect(() => {
    if (observation?.id) {
      fetchReviews();
    }
  }, [observation?.id]);

  const fetchReviews = async () => {
    if (!observation?.id) return;

    const { data: reviewsData, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('observation_id', observation.id)
      .is('parent_review_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return;
    }

    if (!reviewsData) {
      setReviews([]);
      return;
    }

    // Fetch like counts, user's like status, reviewer names, and replies for each review
    const reviewsWithLikes = await Promise.all(
      reviewsData.map(async (review) => {
        // Get like count
        const { count: likeCount } = await supabase
          .from('review_likes')
          .select('*', { count: 'exact', head: true })
          .eq('review_id', review.id);

        // Check if current user liked this review
        let isLikedByUser = false;
        if (user) {
          const { data: userLike } = await supabase
            .from('review_likes')
            .select('id')
            .eq('review_id', review.id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          isLikedByUser = !!userLike;
        }

        // Get reviewer's name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', review.user_id)
          .maybeSingle();

        // Fetch replies for this review
        const { data: repliesData } = await supabase
          .from('reviews')
          .select('*')
          .eq('parent_review_id', review.id)
          .order('created_at', { ascending: true });

        const repliesWithData = repliesData ? await Promise.all(
          repliesData.map(async (reply) => {
            const { data: replyProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', reply.user_id)
              .maybeSingle();

            const { count: replyLikeCount } = await supabase
              .from('review_likes')
              .select('*', { count: 'exact', head: true })
              .eq('review_id', reply.id);

            let isReplyLikedByUser = false;
            if (user) {
              const { data: userReplyLike } = await supabase
                .from('review_likes')
                .select('id')
                .eq('review_id', reply.id)
                .eq('user_id', user.id)
                .maybeSingle();
              
              isReplyLikedByUser = !!userReplyLike;
            }

            return {
              ...reply,
              profiles: replyProfile || { full_name: null },
              likeCount: replyLikeCount || 0,
              isLikedByUser: isReplyLikedByUser
            };
          })
        ) : [];

        return {
          ...review,
          profiles: profile || { full_name: null },
          likeCount: likeCount || 0,
          isLikedByUser,
          replies: repliesWithData
        };
      })
    );

    setReviews(reviewsWithLikes);
  };

  const handleSubmitReview = async () => {
    if (!user || !observation?.id) {
      toast.error("Please sign in to leave a review");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Please add a comment");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          observation_id: observation.id,
          user_id: user.id,
          rating: newRating,
          comment: newComment.trim()
        });

      if (error) throw error;

      toast.success("Review submitted successfully!");
      setNewComment("");
      setNewRating(5);
      fetchReviews();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Review deleted successfully!");
      fetchReviews();
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast.error("Failed to delete review");
    }
  };

  const handleStartEdit = (review: Review) => {
    setEditingReviewId(review.id);
    setEditComment(review.comment);
    setEditRating(review.rating);
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditComment("");
    setEditRating(5);
  };

  const handleUpdateReview = async (reviewId: string) => {
    if (!user || !editComment.trim()) {
      toast.error("Please add a comment");
      return;
    }

    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          rating: editRating,
          comment: editComment.trim()
        })
        .eq('id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Review updated successfully!");
      handleCancelEdit();
      fetchReviews();
    } catch (error: any) {
      console.error('Error updating review:', error);
      toast.error("Failed to update review");
    }
  };

  const handleStartReply = (reviewId: string) => {
    setReplyingToId(reviewId);
    setReplyComment("");
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyComment("");
  };

  const handleSubmitReply = async (parentReviewId: string) => {
    if (!user || !observation?.id) {
      toast.error("Please sign in to reply");
      return;
    }

    if (!replyComment.trim()) {
      toast.error("Please add a comment");
      return;
    }

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          observation_id: observation.id,
          user_id: user.id,
          rating: 5,
          comment: replyComment.trim(),
          parent_review_id: parentReviewId
        });

      if (error) throw error;

      toast.success("Reply submitted successfully!");
      handleCancelReply();
      fetchReviews();
    } catch (error: any) {
      console.error('Error submitting reply:', error);
      toast.error("Failed to submit reply");
    }
  };

  const handleToggleLike = async (reviewId: string, isCurrentlyLiked: boolean) => {
    if (!user) {
      toast.error("Please sign in to like reviews");
      return;
    }

    try {
      if (isCurrentlyLiked) {
        // Unlike
        const { error } = await supabase
          .from('review_likes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('review_likes')
          .insert({
            review_id: reviewId,
            user_id: user.id
          });

        if (error) throw error;
      }

      // Refresh reviews to update like counts
      fetchReviews();
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error("Failed to update like");
    }
  };

  if (!observation) return null;

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{observation.commonName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image */}
          <div className="aspect-video overflow-hidden rounded-lg">
            <img 
              src={observation.imageUrl} 
              alt={observation.commonName}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground italic">{observation.species}</p>
            
            <Badge variant="secondary">
              {observation.confidence}% confidence
            </Badge>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{observation.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(observation.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Average Rating */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 py-2 border-t">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}

          {/* Add Review */}
          {user && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">Leave a Review</h3>
              
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setNewRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= newRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts about this observation..."
                rows={3}
              />

              <Button 
                onClick={handleSubmitReview}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Reviews</h3>
              {reviews.map((review) => (
                <div key={review.id} className="space-y-3">
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {review.profiles?.full_name || 'Anonymous'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                        {user?.id === review.user_id && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(review)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReview(review.id)}
                              className="h-7 w-7 p-0 text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {editingReviewId === review.id ? (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setEditRating(star)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  star <= editRating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <Textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateReview(review.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                        
                        <p className="text-sm">{review.comment}</p>
                        
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleLike(review.id, review.isLikedByUser)}
                            className="gap-1 h-8"
                          >
                            <ThumbsUp 
                              className={`h-4 w-4 ${
                                review.isLikedByUser 
                                  ? 'fill-primary text-primary' 
                                  : 'text-muted-foreground'
                              }`} 
                            />
                            <span className="text-xs">{review.likeCount}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartReply(review.id)}
                            className="gap-1 h-8"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs">Reply</span>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Replies */}
                  {review.replies && review.replies.length > 0 && (
                    <div className="ml-8 space-y-2">
                      {review.replies.map((reply) => (
                        <div key={reply.id} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">
                                {reply.profiles?.full_name || 'Anonymous'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </span>
                              {user?.id === reply.user_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteReview(reply.id)}
                                  className="h-6 w-6 p-0 text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm">{reply.comment}</p>
                          
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleLike(reply.id, reply.isLikedByUser)}
                              className="gap-1 h-7"
                            >
                              <ThumbsUp 
                                className={`h-3 w-3 ${
                                  reply.isLikedByUser 
                                    ? 'fill-primary text-primary' 
                                    : 'text-muted-foreground'
                                }`} 
                              />
                              <span className="text-xs">{reply.likeCount}</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Form */}
                  {replyingToId === review.id && (
                    <div className="ml-8 space-y-2 p-3 bg-muted/30 rounded-lg">
                      <Textarea
                        value={replyComment}
                        onChange={(e) => setReplyComment(e.target.value)}
                        placeholder="Write your reply..."
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSubmitReply(review.id)}>
                          Submit Reply
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelReply}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ObservationDetail;
