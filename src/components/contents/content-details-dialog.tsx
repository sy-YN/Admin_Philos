
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
import type { Comment } from '@/types/comment';
import type { Member } from '@/types/member';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ScrollArea } from '../ui/scroll-area';
import { doc, collection, addDoc, serverTimestamp, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type ContentType = 'executiveMessages' | 'videos';

interface ContentDetailsDialogProps {
  contentId: string;
  contentType: ContentType;
  contentTitle: string;
  children: React.ReactNode;
  onAddComment: (contentId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorAvatarUrl'>) => Promise<void>;
  onDeleteComment: (contentId: string, commentId: string) => Promise<void>;
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
  contentId: string;
  replyToComment: WithId<Comment> | null;
  onCommentPosted: () => void;
  onAddComment: ContentDetailsDialogProps['onAddComment'];
  canPost: boolean;
}

function CommentForm({ contentId, replyToComment, onCommentPosted, onAddComment, canPost }: CommentFormProps) {
  const [commentText, setCommentText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setIsPosting(true);

    const commentData = {
      content: commentText,
      parentCommentId: replyToComment?.id || null,
    };
    
    await onAddComment(contentId, commentData);
    
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


function CommentsList({ 
  contentId, 
  contentType, 
  onAddComment, 
  onDeleteComment 
}: Pick<ContentDetailsDialogProps, 'contentId' | 'contentType' | 'onAddComment' | 'onDeleteComment'>) {
  const { user } = useUser();
  const { data: comments, isLoading } = useSubCollection<Comment>(contentType, contentId, 'comments');
  const [replyToComment, setReplyToComment] = useState<WithId<Comment> | null>(null);

  const firestore = useFirestore();
  const currentUserDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: currentUserMember } = useDoc<Member>(currentUserDocRef);
  
  const canReply = useMemo(() => {
    if (!currentUserMember) return false;
    return currentUserMember.role === 'admin' || currentUserMember.role === 'executive';
  }, [currentUserMember]);
  
  const { topLevelComments, repliesMap } = useMemo(() => {
    if (!comments) {
      return { topLevelComments: [], repliesMap: new Map() };
    }
    const topLevelComments = comments.filter(c => !c.parentCommentId).sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    const repliesMap = new Map<string, WithId<Comment>[]>();
    comments.forEach(c => {
      if (c.parentCommentId) {
        if (!repliesMap.has(c.parentCommentId)) {
          repliesMap.set(c.parentCommentId, []);
        }
        repliesMap.get(c.parentCommentId)?.push(c);
      }
    });
     // Sort replies within each parent
    repliesMap.forEach(replies => replies.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis()));
    
    return { topLevelComments, repliesMap };
  }, [comments]);


  const handleDelete = (commentId: string) => {
    onDeleteComment(contentId, commentId);
  };


  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  if (!comments || comments.length === 0) {
    return (
      <div>
        <p className="text-sm text-muted-foreground p-8 text-center">まだコメントはありません。</p>
        <CommentForm 
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
                  <div key={comment.id}>
                      <CommentItem 
                        comment={comment} 
                        currentUserId={user?.uid} 
                        onDelete={() => handleDelete(comment.id)} 
                        onReply={setReplyToComment}
                        canReply={canReply}
                      />
                      {repliesMap.has(comment.id) && (
                          <div className="ml-8 mt-3 space-y-3 pl-4 border-l-2">
                              {repliesMap.get(comment.id)?.map(reply => (
                                  <div key={reply.id}>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                        <CornerDownRight className="h-3 w-3" />
                                        <span>@{comment.authorName || '不明'}への返信</span>
                                    </div>
                                    <CommentItem 
                                      comment={reply} 
                                      currentUserId={user?.uid} 
                                      onDelete={() => handleDelete(reply.id)} 
                                      onReply={setReplyToComment}
                                      canReply={canReply}
                                    />
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              ))}
          </div>
      </ScrollArea>
       <CommentForm 
          contentId={contentId}
          replyToComment={replyToComment} 
          onCommentPosted={() => setReplyToComment(null)}
          onAddComment={onAddComment}
          canPost={!replyToComment || canReply}
      />
    </>
  );
}

function ViewsList() {
    // This is a placeholder as the feature is not implemented yet.
    return (
        <div className="flex flex-col items-center justify-center h-72">
            <Eye className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">この機能は現在準備中です。</p>
        </div>
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
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="truncate pr-8">「{contentTitle}」の詳細</DialogTitle>
        </DialogHeader>
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
            />
          </TabsContent>
          <TabsContent value="likes" className="m-0">
            <LikesList contentId={contentId} contentType={contentType} />
          </TabsContent>
          <TabsContent value="views" className="m-0">
            <ViewsList />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
