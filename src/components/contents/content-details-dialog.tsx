
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Eye, Loader2, User, CornerDownRight, Send, Trash2, Reply } from 'lucide-react';
import { useSubCollection, WithId } from '@/firebase/firestore/use-sub-collection';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Like } from '@/types/like';
import type { View } from '@/types/view';
import type { Comment } from '@/types/comment';
import type { Member } from '@/types/member';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ScrollArea } from '../ui/scroll-area';
import { doc, collection, addDoc, serverTimestamp, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { ExecutiveMessage } from '@/types/executive-message';
import type { Video } from '@/types/video';

type ContentType = 'executiveMessages' | 'videos';

interface ContentDetailsDialogProps {
  contentId: string;
  contentType: ContentType;
  contentTitle: string;
  children: React.ReactNode;
  onAddComment: (contentType: ContentType, contentId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorAvatarUrl'>) => Promise<void>;
  onDeleteComment: (contentType: ContentType, contentId: string, commentId: string) => Promise<void>;
}

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '無効な日付';
    return formatDistanceToNow(date, { addSuffix: true, locale: ja });
  };


function LikesList({ contentId, contentType }: Pick<ContentDetailsDialogProps, 'contentId' | 'contentType'>) {
  const { data: likes, isLoading } = useSubCollection<Like>(contentType, contentId, 'likes');

  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  if (!likes || likes.length === 0) {
    return <p className="text-sm text-muted-foreground p-8 text-center">まだ「いいね！」はありません。</p>;
  }

  return (
    <ScrollArea className="h-72">
      <ul className="space-y-3 p-4">
        {likes.map((like) => (
          <li key={like.id} className="flex items-center gap-3">
             <UserItem userId={like.id} />
             <span className="text-xs text-muted-foreground ml-auto">
                {formatDate(like.likedAt)}
            </span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

function ViewsList({ contentId, contentType }: Pick<ContentDetailsDialogProps, 'contentId' | 'contentType'>) {
  const { data: views, isLoading } = useSubCollection<View>(contentType, contentId, 'views');

  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  if (!views || views.length === 0) {
    return <p className="text-sm text-muted-foreground p-8 text-center">まだ既読ユーザーはいません。</p>;
  }

  return (
    <ScrollArea className="h-72">
      <ul className="space-y-3 p-4">
        {views.map((view) => (
          <li key={view.id} className="flex items-center gap-3">
             <UserItem userId={view.id} />
             <span className="text-xs text-muted-foreground ml-auto">
                {formatDate(view.viewedAt)}
            </span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

function UserItem({ userId }: { userId: string}) {
    const firestore = useFirestore();
    const userRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);
    
    const { data: user, isLoading } = useDoc<Member>(userRef);

    if (isLoading) {
        return (
            <>
                <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded-md animate-pulse" />
            </>
        );
    }

    if (!user) {
         return (
            <>
                <Avatar className="h-8 w-8">
                    <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">不明なユーザー</span>
            </>
         );
    }

    return (
        <>
            <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{user.displayName}</span>
        </>
    );
}

const CommentItem = ({ 
  comment, 
  currentUserId,
  onDelete,
  onReply,
  canReply
}: { 
  comment: WithId<Comment>, 
  currentUserId: string | undefined,
  onDelete: () => void,
  onReply: (comment: WithId<Comment>) => void,
  canReply: boolean
}) => (
    <div className="flex items-start gap-3 group">
        <Avatar className="h-8 w-8">
            <AvatarImage src={comment.authorAvatarUrl} />
            <AvatarFallback>{comment.authorName ? comment.authorName.charAt(0) : '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <div className="flex items-baseline justify-between">
                <p className="font-semibold text-sm">{comment.authorName || '不明なユーザー'}</p>
                <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
            </div>
            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
            <div className="flex items-center gap-2 mt-1 invisible group-hover:visible">
              {canReply && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onReply(comment)}>
                  <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              {comment.authorId === currentUserId && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                          このコメントを削除します。この操作は元に戻せません。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete}>削除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              )}
            </div>
        </div>
    </div>
);


interface CommentFormProps {
  contentType: ContentType;
  contentId: string;
  replyToComment: WithId<Comment> | null;
  onCommentPosted: () => void;
  onAddComment: ContentDetailsDialogProps['onAddComment'];
  canPost: boolean;
}

function CommentForm({ contentType, contentId, replyToComment, onCommentPosted, onAddComment, canPost }: CommentFormProps) {
  const [commentText, setCommentText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setIsPosting(true);

    const commentData = {
      content: commentText,
      parentCommentId: replyToComment?.id || null,
    };
    
    await onAddComment(contentType, contentId, commentData);
    
    setCommentText('');
    onCommentPosted();
    setIsPosting(false);
  };
  
  if (!canPost) {
    return null; // Or some read-only message
  }


  return (
    <div className="p-4 border-t">
      {replyToComment && (
        <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted rounded-md flex justify-between items-center">
          <span>@{replyToComment.authorName}への返信</span>
          <Button variant="ghost" size="sm" onClick={onCommentPosted} className="h-auto px-1 py-0">×</Button>
        </div>
      )}
      <div className="flex items-start gap-2">
        <Textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={replyToComment ? '返信を入力...' : 'コメントを追加...'}
          rows={2}
          className="flex-1"
          disabled={isPosting}
        />
        <Button onClick={handlePostComment} disabled={isPosting || !commentText.trim()}>
          {isPosting ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </div>
  );
}

// Recursive component to render a comment and its children
const CommentThread = ({
  comment,
  repliesMap,
  currentUserId,
  onDelete,
  onReply,
  canReply
}: {
  comment: WithId<Comment>;
  repliesMap: Map<string, WithId<Comment>[]>;
  currentUserId: string | undefined;
  onDelete: (commentId: string) => void;
  onReply: (comment: WithId<Comment>) => void;
  canReply: boolean;
}) => {
  const replies = repliesMap.get(comment.id) || [];

  return (
    <div className="space-y-3">
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        onDelete={() => onDelete(comment.id)}
        onReply={onReply}
        canReply={canReply}
      />
      {replies.length > 0 && (
        <div className="ml-8 pl-4 border-l-2 space-y-3">
          {replies.map(reply => (
            <CommentThread
              key={reply.id}
              comment={reply}
              repliesMap={repliesMap}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReply={onReply}
              canReply={canReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};


function CommentsList({ 
  contentId, 
  contentType, 
  onAddComment, 
  onDeleteComment,
  parentContent,
  userPermissions
}: Pick<ContentDetailsDialogProps, 'contentId' | 'contentType' | 'onAddComment' | 'onDeleteComment'> & { parentContent: ExecutiveMessage | Video | null, userPermissions: string[] }) {
  const { user } = useUser();
  const { data: comments, isLoading } = useSubCollection<Comment>(contentType, contentId, 'comments');
  const [replyToComment, setReplyToComment] = useState<WithId<Comment> | null>(null);

  const canReply = useMemo(() => {
    if (!user || !parentContent) return false;
    
    // Admins and executives can always reply.
    if (userPermissions.includes('admin_equivalent_all_access_DONT_USE') || userPermissions.includes('executive')) { // This is a stand-in for checking role.
      return true;
    }
    
    // Check if the user is the author of the parent content.
    const contentAuthorId = 'authorId' in parentContent ? parentContent.authorId : ('uploaderId' in parentContent ? parentContent.uploaderId : undefined);
    if (user.uid === contentAuthorId) {
      if (contentType === 'videos' && userPermissions.includes('video_management')) {
        return true;
      }
      if (contentType === 'executiveMessages' && userPermissions.includes('message_management')) {
        return true;
      }
    }
    
    return false;
  }, [user, parentContent, contentType, userPermissions]);

  const { topLevelComments, repliesMap } = useMemo(() => {
    if (!comments) {
      return { topLevelComments: [], repliesMap: new Map() };
    }
    const repliesMap = new Map<string, WithId<Comment>[]>();
    const topLevelComments: WithId<Comment>[] = [];
    
    comments.forEach(c => {
      if (c.parentCommentId) {
        if (!repliesMap.has(c.parentCommentId)) {
          repliesMap.set(c.parentCommentId, []);
        }
        repliesMap.get(c.parentCommentId)!.push(c);
      } else {
        topLevelComments.push(c);
      }
    });

    topLevelComments.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    repliesMap.forEach(replies => replies.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)));
    
    return { topLevelComments, repliesMap };
  }, [comments]);


  const handleDelete = (commentId: string) => {
    onDeleteComment(contentType, contentId, commentId);
  };


  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  if (!comments || comments.length === 0) {
    return (
      <div>
        <p className="text-sm text-muted-foreground p-8 text-center">まだコメントはありません。</p>
        <CommentForm 
          contentType={contentType}
          contentId={contentId} 
          replyToComment={null} 
          onCommentPosted={() => setReplyToComment(null)}
          onAddComment={onAddComment}
          canPost={true}
        />
      </div>
    );
  }


  return (
    <>
      <ScrollArea className="h-72">
          <div className="space-y-4 p-4">
              {topLevelComments.map(comment => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    repliesMap={repliesMap}
                    currentUserId={user?.uid}
                    onDelete={handleDelete}
                    onReply={setReplyToComment}
                    canReply={canReply}
                  />
              ))}
          </div>
      </ScrollArea>
       <CommentForm 
          contentType={contentType}
          contentId={contentId}
          replyToComment={replyToComment} 
          onCommentPosted={() => setReplyToComment(null)}
          onAddComment={onAddComment}
          canPost={!replyToComment || canReply}
      />
    </>
  );
}

export function ContentDetailsDialog({
  contentId,
  contentType,
  contentTitle,
  children,
  onAddComment,
  onDeleteComment
}: ContentDetailsDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch the parent content document to get the authorId
  const contentDocRef = useMemoFirebase(() => {
    if (!firestore || !contentId || !contentType || !isOpen) return null;
    return doc(firestore, contentType, contentId);
  }, [firestore, contentType, contentId, isOpen]);
  const { data: parentContent } = useDoc<ExecutiveMessage | Video>(contentDocRef);
  
  // Fetch current user's full document to check role
  const currentUserDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !isOpen) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid, isOpen]);
  const { data: currentUserMember } = useDoc<Member>(currentUserDocRef);
  
  // This is a simplified permission check. A real app would use a more robust system.
  const userPermissions = useMemo(() => {
    if (!currentUserMember) return [];
    // This is a placeholder for a real permission system.
    // In a real app, you would fetch permissions from `roles` or `user_permissions`.
    const perms = [];
    if (currentUserMember.role === 'admin') perms.push('admin_equivalent_all_access_DONT_USE');
    if (currentUserMember.role === 'executive') perms.push('executive');
    
    // In a real app, you'd fetch this from a permissions hook.
    // For this change, we'll simulate it based on existing page logic.
    if(contentType === 'videos') perms.push('video_management');
    if(contentType === 'executiveMessages') perms.push('message_management');

    return perms;
  }, [currentUserMember, contentType]);


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="truncate pr-8">「{contentTitle}」の詳細</DialogTitle>
        </DialogHeader>
        {isOpen && ( // Only render tabs and their content when the dialog is open
          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="grid w-full grid-cols-3 border-b rounded-none px-0">
              <TabsTrigger value="comments" className="rounded-none"><MessageCircle className="mr-2 h-4 w-4" />コメント</TabsTrigger>
              <TabsTrigger value="likes" className="rounded-none"><Heart className="mr-2 h-4 w-4" />いいね</TabsTrigger>
              <TabsTrigger value="views" className="rounded-none"><Eye className="mr-2 h-4 w-4" />既読</TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="m-0">
              <CommentsList 
                contentId={contentId} 
                contentType={contentType} 
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                parentContent={parentContent}
                userPermissions={userPermissions}
              />
            </TabsContent>
            <TabsContent value="likes" className="m-0">
              <LikesList contentId={contentId} contentType={contentType} />
            </TabsContent>
            <TabsContent value="views" className="m-0">
              <ViewsList contentId={contentId} contentType={contentType} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
