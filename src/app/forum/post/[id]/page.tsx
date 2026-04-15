'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import Link from 'next/link';
import supabase from '@/lib/db/supabase';

interface TopicTag {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  likes_count: number;
  created_at: string;
  author?: {
    name: string;
    avatar?: string;
  };
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  user_id: string;
  topic_tag_id?: string;
  likes_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    name: string;
    avatar?: string;
  };
  topic_tag?: TopicTag;
}

function ForumPostContent() {
  const params = useParams();
  const { user } = useAuth();
  const postId = params.id as string;

  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  type ForumCommentQueryResult = Comment & {
    users?: Comment['author'];
  };

  const fetchPost = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          *,
          users:user_id(name, avatar),
          topic_tags:topic_tag_id(*)
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;

      const formattedPost = {
        ...data,
        author: data.users,
        topic_tag: data.topic_tags,
      };

      setPost(formattedPost);

      // Check if user liked this post
      if (user?.id) {
        const { data: likeData } = await supabase
          .from('forum_post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .single();

        setIsLiked(!!likeData);
      }

      // Increment view count
      await supabase
        .from('forum_posts')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', postId);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  }, [postId, user?.id]);

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .select(`
          *,
          users:user_id(name, avatar)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedComments = ((data || []) as ForumCommentQueryResult[]).map((comment) => ({
        ...comment,
        author: comment.users,
      }));

      setComments(formattedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId, fetchPost, fetchComments]);

  const handleLikePost = async () => {
    if (!user?.id || !post) return;

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('forum_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        setPost({
          ...post,
          likes_count: Math.max(0, (post.likes_count || 0) - 1),
        });
        setIsLiked(false);
      } else {
        // Like
        await supabase.from('forum_post_likes').insert({
          post_id: postId,
          user_id: user.id,
        });

        setPost({
          ...post,
          likes_count: (post.likes_count || 0) + 1,
        });
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: commentData, error } = await supabase
        .from('forum_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment,
        })
        .select(`
          *,
          users:user_id(name, avatar)
        `)
        .single();

      if (error) throw error;

      const formattedComment = {
        ...commentData,
        author: commentData.users,
      };

      setComments([formattedComment, ...comments]);
      setNewComment('');

      // Update comment count
      if (post) {
        await supabase
          .from('forum_posts')
          .update({ comment_count: (post.comment_count || 0) + 1 })
          .eq('id', postId);

        setPost({
          ...post,
          comment_count: (post.comment_count || 0) + 1,
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Bài viết không tìm thấy</p>
          <Link href="/forum" className="text-green-600 hover:text-green-700 font-medium">
            ← Quay lại diễn đàn
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/forum" className="text-green-600 hover:text-green-700 font-medium mb-4 inline-block">
            ← Quay lại diễn đàn
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">{post.title}</h1>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
            <span>👤 {post.author?.name || 'Ẩn danh'}</span>
            <span>📅 {formatDate(post.created_at)}</span>
            {post.topic_tag && (
              <span
                className="px-3 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: post.topic_tag.color + '20',
                  color: post.topic_tag.color,
                }}
              >
                {post.topic_tag.icon} {post.topic_tag.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Post Content */}
        <div className="bg-white rounded-lg p-8 mb-6 shadow-sm">
          <p className="text-gray-700 text-lg leading-relaxed mb-6 whitespace-pre-wrap">
            {post.content}
          </p>

          {/* Post Stats & Actions */}
          <div className="flex flex-wrap gap-6 border-t pt-6 text-gray-600">
            <div className="flex items-center gap-2">
              <span>👁️ {post.view_count || 0} lượt xem</span>
            </div>
            <button
              onClick={handleLikePost}
              className={`flex items-center gap-2 transition ${
                isLiked ? 'text-red-500 font-bold' : 'hover:text-red-500'
              }`}
            >
              <span>{isLiked ? '❤️' : '🤍'} {post.likes_count || 0}</span>
            </button>
            <div className="flex items-center gap-2">
              <span>💬 {post.comment_count || 0} bình luận</span>
            </div>
          </div>
        </div>

        {/* Add Comment Form */}
        {user && (
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">💬 Viết bình luận</h3>
            <form onSubmit={handleAddComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Chia sẻ ý kiến của bạn..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                rows={4}
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
              >
                {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
              </button>
            </form>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 mb-4">
            💬 Bình luận ({comments.length})
          </h3>
          {comments.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg">
              <p className="text-gray-500">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {comment.author?.name || 'Ẩn danh'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                  {comment.content}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <button className="hover:text-red-500 transition">
                    {comment.likes_count > 0 ? '❤️' : '🤍'} {comment.likes_count || 0}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForumPostPage() {
  return (
    <ProtectedPageWrapper>
      <ForumPostContent />
    </ProtectedPageWrapper>
  );
}
