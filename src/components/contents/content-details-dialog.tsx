
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Eye, Loader2, User, CornerDownRight } from 'lucide-react';
import { useSubCollection, WithId } from '@/firebase/firestore/use-sub-collection';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Like } from '@/types/like';
import type { Comment } from '@/types/comment';
import type { Member } from '@/types/member';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ScrollArea } from '../ui/scroll-area';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';

interface ContentDetailsDialogProps {
  contentId: string;
  contentType: 'executiveMessages' | 'videos';
  contentTitle: string;
  children: React.ReactNode;
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

const CommentItem = ({ comment }: { comment: WithId<Comment> }) => (
    <div className="flex items-start gap-3">
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
        </div>
    </div>
);

function CommentsList({ contentId, contentType }: Pick<ContentDetailsDialogProps, 'contentId' | 'contentType'>) {
  const { data: comments, isLoading } = useSubCollection<Comment>(contentType, contentId, 'comments');
  
  const { topLevelComments, repliesMap } = useMemo(() => {
    if (!comments) {
      return { topLevelComments: [], repliesMap: new Map() };
    }
    const topLevelComments = comments.filter(c => !c.parentCommentId);
    const repliesMap = new Map<string, WithId<Comment>[]>();
    comments.forEach(c => {
      if (c.parentCommentId) {
        if (!repliesMap.has(c.parentCommentId)) {
          repliesMap.set(c.parentCommentId, []);
        }
        repliesMap.get(c.parentCommentId)?.push(c);
      }
    });
    return { topLevelComments, repliesMap };
  }, [comments]);


  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  if (!comments || comments.length === 0) {
    return <p className="text-sm text-muted-foreground p-8 text-center">まだコメントはありません。</p>;
  }


  return (
    <ScrollArea className="h-72">
        <div className="space-y-4 p-4">
            {topLevelComments.map(comment => (
                <div key={comment.id}>
                    <CommentItem comment={comment} />
                    {repliesMap.has(comment.id) && (
                        <div className="ml-8 mt-3 space-y-3 pl-4 border-l-2">
                            {repliesMap.get(comment.id)?.map(reply => (
                                <div key={reply.id}>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                      <CornerDownRight className="h-3 w-3" />
                                      <span>@{comment.authorName || '不明'}への返信</span>
                                  </div>
                                  <CommentItem comment={reply} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    </ScrollArea>
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
}: ContentDetailsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">「{contentTitle}」の詳細</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="comments" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comments"><MessageCircle className="mr-2 h-4 w-4" />コメント</TabsTrigger>
            <TabsTrigger value="likes"><Heart className="mr-2 h-4 w-4" />いいね</TabsTrigger>
            <TabsTrigger value="views"><Eye className="mr-2 h-4 w-4" />既読</TabsTrigger>
          </TabsList>
          <TabsContent value="comments">
            <CommentsList contentId={contentId} contentType={contentType} />
          </TabsContent>
          <TabsContent value="likes">
            <LikesList contentId={contentId} contentType={contentType} />
          </TabsContent>
          <TabsContent value="views">
            <ViewsList />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
