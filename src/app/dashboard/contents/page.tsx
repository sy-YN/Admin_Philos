
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Video, MessageSquare, Loader2, Sparkles, Trash2, Heart, MessageCircle as MessageCircleIcon, Eye } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch, increment, getDoc, where } from 'firebase/firestore';
import type { ExecutiveMessage } from '@/types/executive-message';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Video as VideoType } from '@/types/video';
import { ContentDetailsDialog } from '@/components/contents/content-details-dialog';
import type { Comment } from '@/types/comment';
import type { Member } from '@/types/member';
import type { Role } from '@/types/role';
import type { UserPermission } from '@/types/user-permission';


// --- Message Section (Firestore) ---

// 新規メッセージ追加用ダイアログ
function AddMessageDialog({ onMessageAdded, allUsers, currentUser }: { onMessageAdded?: () => void, allUsers: Member[], currentUser: Member | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [tags, setTags] = useState<string[]>(Array(5).fill(''));
  const [authorId, setAuthorId] = useState(currentUser?.uid || '');

  const canProxyPost = useMemo(() => {
    if (!currentUser) return false;
    const userRole = currentUser.role;
    // This is a simplified check. A full implementation would use the permissions system.
    return userRole === 'admin' || userRole === 'executive';
  }, [currentUser]);


  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('normal');
    setTags(Array(5).fill(''));
    setAuthorId(currentUser?.uid || '');
  }

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsLoading(true);
    
    const selectedAuthor = allUsers.find(u => u.uid === authorId);

    try {
      await addDoc(collection(firestore, 'executiveMessages'), {
        title,
        content,
        priority,
        tags: tags.map(tag => tag.trim()).filter(tag => tag),
        authorId: authorId,
        authorName: selectedAuthor?.displayName || '不明な作成者',
        creatorId: user.uid, // Always log who actually created it
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
      });

      toast({ title: "成功", description: "新しいメッセージを追加しました。" });
      onMessageAdded?.();
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ title: "エラー", description: "メッセージの追加に失敗しました。", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />新規メッセージ追加</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleAddMessage}>
          <DialogHeader>
            <DialogTitle>新規メッセージ追加</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {canProxyPost && (
                <div className="grid gap-2">
                    <Label htmlFor="msg-author">発信者</Label>
                     <Select value={authorId} onValueChange={setAuthorId}>
                        <SelectTrigger>
                            <SelectValue placeholder="発信者を選択" />
                        </SelectTrigger>
                        <SelectContent>
                             {allUsers.filter(u => u.role === 'executive' || u.role === 'admin').map(u => (
                                <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="msg-title">タイトル (30文字以内)</Label>
              <Input id="msg-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="来期の事業戦略について" required disabled={isLoading} maxLength={30} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="msg-priority">重要度</Label>
              <Select value={priority} onValueChange={(v: 'normal' | 'high') => setPriority(v)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="重要度を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">通常</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>タグ (最大5個)</Label>
              <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
                {tags.map((tag, index) => (
                    <Input 
                      key={index}
                      value={tag}
                      onChange={e => handleTagChange(index, e.target.value)}
                      placeholder={`タグ ${index + 1}`} 
                      disabled={isLoading}
                      maxLength={20}
                    />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="msg-content">内容 (2000文字以内)</Label>
              <Textarea id="msg-content" value={content} onChange={e => setContent(e.target.value)} placeholder="来期は..." rows={10} required disabled={isLoading} maxLength={2000} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {isLoading ? '追加中...' : 'メッセージを追加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 既存メッセージ編集用ダイアログ
function EditMessageDialog({ message, onMessageUpdated, children, allUsers, currentUser }: { message: ExecutiveMessage, onMessageUpdated?: () => void, children: React.ReactNode, allUsers: Member[], currentUser: Member | null }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(message.title);
  const [content, setContent] = useState(message.content);
  const [priority, setPriority] = useState(message.priority);
  const [authorId, setAuthorId] = useState(message.authorId);

  const canProxyPost = useMemo(() => {
    if (!currentUser) return false;
    const userRole = currentUser.role;
    return userRole === 'admin' || userRole === 'executive';
  }, [currentUser]);

  
  const initialTags = Array(5).fill('');
  if (message.tags) {
    for(let i = 0; i < Math.min(message.tags.length, 5); i++) {
      initialTags[i] = message.tags[i];
    }
  }
  const [tags, setTags] = useState<string[]>(initialTags);

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };


  const handleEditMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsLoading(true);

    const messageRef = doc(firestore, 'executiveMessages', message.id);
    const selectedAuthor = allUsers.find(u => u.uid === authorId);

    try {
      await updateDoc(messageRef, {
        title,
        content,
        priority,
        authorId,
        authorName: selectedAuthor?.displayName || message.authorName,
        tags: tags.map(tag => tag.trim()).filter(tag => tag),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "成功", description: "メッセージを更新しました。" });
      onMessageUpdated?.();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: "エラー", description: "メッセージの更新に失敗しました。", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if(open) {
      setTitle(message.title);
      setContent(message.content);
      setPriority(message.priority);
      setAuthorId(message.authorId);
       const newInitialTags = Array(5).fill('');
      if (message.tags) {
        for (let i = 0; i < Math.min(message.tags.length, 5); i++) {
          newInitialTags[i] = message.tags[i];
        }
      }
      setTags(newInitialTags);
    }
  }, [open, message])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleEditMessage}>
          <DialogHeader>
            <DialogTitle>メッセージを編集</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {canProxyPost && (
                <div className="grid gap-2">
                    <Label htmlFor="edit-msg-author">発信者</Label>
                    <Select value={authorId} onValueChange={setAuthorId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {allUsers.filter(u => u.role === 'executive' || u.role === 'admin').map(u => (
                                <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-msg-title">タイトル (30文字以内)</Label>
              <Input id="edit-msg-title" value={title} onChange={e => setTitle(e.target.value)} required disabled={isLoading} maxLength={30} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-msg-priority">重要度</Label>
              <Select value={priority} onValueChange={(v: 'normal' | 'high') => setPriority(v)} disabled={isLoading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">通常</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="grid gap-2">
              <Label>タグ (最大5個)</Label>
              <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
                {tags.map((tag, index) => (
                    <Input 
                      key={index}
                      value={tag}
                      onChange={e => handleTagChange(index, e.target.value)}
                      placeholder={`タグ ${index + 1}`} 
                      disabled={isLoading}
                      maxLength={20}
                    />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-msg-content">内容 (2000文字以内)</Label>
              <Textarea id="edit-msg-content" value={content} onChange={e => setContent(e.target.value)} rows={10} required disabled={isLoading} maxLength={2000}/>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {isLoading ? '更新中...' : 'メッセージを更新'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// メッセージ一覧テーブル
function MessagesTable({ 
  selected, 
  onSelectedChange,
  messages,
  isLoading,
  onAddComment,
  onDeleteComment,
  allUsers,
  currentUser,
}: { 
  selected: string[], 
  onSelectedChange: (ids: string[]) => void,
  messages: ExecutiveMessage[] | null,
  isLoading: boolean,
  onAddComment: (contentId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorAvatarUrl'>) => Promise<void>,
  onDeleteComment: (contentId: string, commentId: string) => Promise<void>,
  allUsers: Member[],
  currentUser: Member | null,
}) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'executiveMessages', id));
      toast({ title: "成功", description: "メッセージを削除しました。" });
    } catch (error) {
      console.error(error);
      toast({ title: "エラー", description: "メッセージの削除に失敗しました。", variant: 'destructive' });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '無効な日付';
    return format(date, 'yyyy/MM/dd HH:mm', { locale: ja });
  };
  
  const handleSelectAll = (checked: boolean) => {
    onSelectedChange(checked && messages ? messages.map(m => m.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectedChange([...selected, id]);
    } else {
      onSelectedChange(selected.filter(rowId => rowId !== id));
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"><Checkbox checked={selected.length === messages?.length && messages.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
          <TableHead>タイトル</TableHead>
          <TableHead className="hidden md:table-cell">タグ</TableHead>
          <TableHead className="w-[120px]">重要度</TableHead>
          <TableHead className="hidden sm:table-cell w-[200px]">作成者 / 作成日</TableHead>
          <TableHead className="hidden lg:table-cell">Counts</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages && messages.map((msg) => (
          <TableRow key={msg.id} data-state={selected.includes(msg.id) && "selected"}>
            <TableCell><Checkbox checked={selected.includes(msg.id)} onCheckedChange={(checked) => handleSelectRow(msg.id, !!checked)} /></TableCell>
            <TableCell className="font-medium">{msg.title}</TableCell>
            <TableCell className="hidden md:table-cell">
              <div className="flex flex-wrap gap-1">
                {(msg.tags || []).map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={msg.priority === 'high' ? 'destructive' : 'secondary'}>
                {msg.priority === 'high' ? '高' : '通常'}
              </Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <div>{msg.authorName || '不明'}</div>
              <div className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</div>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
               <ContentDetailsDialog 
                  contentId={msg.id} 
                  contentType='executiveMessages' 
                  contentTitle={msg.title}
                  onAddComment={onAddComment}
                  onDeleteComment={onDeleteComment}
                >
                <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-primary">
                  <div className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{msg.likesCount ?? 0}</div>
                  <div className="flex items-center gap-1"><MessageCircleIcon className="h-3.5 w-3.5" />{msg.commentsCount ?? 0}</div>
                  <div className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{msg.viewsCount ?? 0}</div>
                </div>
              </ContentDetailsDialog>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <EditMessageDialog message={msg} allUsers={allUsers} currentUser={currentUser}>
                     <DropdownMenuItem onSelect={e => e.preventDefault()}>編集</DropdownMenuItem>
                  </EditMessageDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                        削除
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                          メッセージ「{msg.title}」を削除します。この操作は元に戻せません。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(msg.id)}>削除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// サンプルメッセージ生成コンポーネント
function SeedMessagesButton({ allUsers }: { allUsers: Member[] }) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSeedData = async () => {
    if (!firestore || !user) {
      toast({ title: "エラー", description: "ユーザー情報が見つかりません。", variant: 'destructive' });
      return;
    }
    setIsSeeding(true);

    const executive = allUsers.find(u => u.role === 'executive');
    const author = executive || user;

    const sampleMessages = [
      {
        title: "2024年下期 事業戦略について",
        content: "CEOの山田です。2024年下期の全社事業戦略についてご説明します。今期は「顧客中心主義の徹底」と「データ駆動型経営へのシフト」を二本柱とし、全社一丸となって取り組みます...",
        priority: 'high',
        tags: ['全社', '経営方針', '戦略'],
        authorId: author.uid,
        authorName: author.displayName,
      },
      {
        title: "新技術スタック導入に関する技術戦略説明会",
        content: "CTOの佐藤です。来月より、開発部門全体で新しい技術スタックを導入します。この変更は、我々の開発速度とプロダクト品質を飛躍的に向上させるものです。詳細は添付資料をご確認ください。",
        priority: 'normal',
        tags: ['開発部', '技術', 'DX'],
        authorId: author.uid,
        authorName: author.displayName,
      },
      {
        title: "新しい人事評価制度の導入について",
        content: "人事部長の鈴木です。従業員の皆様の成長と公正な評価を実現するため、来期より新しい人事評価制度を導入いたします。新制度の目的は、透明性の高い評価プロセスと、個人の目標達成への手厚いサポートです。",
        priority: 'normal',
        tags: ['人事', '制度', '全社'],
        authorId: author.uid,
        authorName: author.displayName,
      },
    ];

    try {
      const batch = writeBatch(firestore);
      const messagesCollection = collection(firestore, "executiveMessages");

      sampleMessages.forEach(msg => {
        const docRef = doc(messagesCollection); 
        batch.set(docRef, {
          ...msg,
          creatorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          likesCount: Math.floor(Math.random() * 50),
          commentsCount: Math.floor(Math.random() * 20),
          viewsCount: Math.floor(Math.random() * 200),
        });
      });

      await batch.commit();
      
      toast({ title: "成功", description: "3件のサンプルメッセージを生成しました。" });
      setIsDone(true);
    } catch (error) {
      console.error("サンプルデータの生成に失敗しました:", error);
      toast({ title: "エラー", description: "サンプルデータの生成に失敗しました。", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  if (isDone) {
    return null; 
  }

  return (
    <Button onClick={handleSeedData} disabled={isSeeding} variant="outline" size="sm">
      {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {isSeeding ? '生成中...' : 'サンプルメッセージ生成'}
    </Button>
  );
}


// --- Video Section (Firestore) ---

function VideoDialog({ video, onSave, children, mode, allUsers, currentUser }: { video?: VideoType, onSave: (video: Partial<VideoType>) => void, children?: React.ReactNode, mode: 'add' | 'edit', allUsers: Member[], currentUser: Member | null }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');
  const [src, setSrc] = useState(video?.src || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnailUrl || '');
  const [authorId, setAuthorId] = useState(video?.authorId || currentUser?.uid || '');

  const canProxyPost = useMemo(() => {
    if (!currentUser) return false;
    const userRole = currentUser.role;
    return userRole === 'admin' || userRole === 'executive';
  }, [currentUser]);
  
  const initialTags = Array(5).fill('');
  if (video?.tags) {
    for (let i = 0; i < Math.min(video.tags.length, 5); i++) {
      initialTags[i] = video.tags[i];
    }
  }
  const [tags, setTags] = useState<string[]>(initialTags);

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSrc('');
    setThumbnailUrl('');
    setTags(Array(5).fill(''));
    setAuthorId(currentUser?.uid || '');
  };

  useEffect(() => {
    if (open) {
      setTitle(video?.title || '');
      setDescription(video?.description || '');
      setSrc(video?.src || '');
      setThumbnailUrl(video?.thumbnailUrl || '');
      setAuthorId(video?.authorId || currentUser?.uid || '');
      
      const newInitialTags = Array(5).fill('');
      if (video?.tags) {
        for (let i = 0; i < Math.min(video.tags.length, 5); i++) {
          newInitialTags[i] = video.tags[i];
        }
      }
      setTags(newInitialTags);
    }
  }, [video, open, currentUser]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    
    const selectedAuthor = allUsers.find(u => u.uid === authorId);

    const videoData: Partial<VideoType> = {
      title,
      description,
      src,
      thumbnailUrl,
      tags: tags.map(tag => tag.trim()).filter(tag => tag),
      authorId: authorId,
      // authorName is not a field on the Video type, but we should handle it gracefully
    };
    
    if(mode === 'add') {
      videoData.creatorId = user.uid;
    }

    onSave(videoData);

    setIsLoading(false);
    setOpen(false);
    if(mode === 'add') {
      resetForm();
    }
  };

  const dialogTitle = mode === 'add' ? '新規ビデオ追加' : 'ビデオを編集';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {children || <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />新規ビデオ追加</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {canProxyPost && (
                <div className="grid gap-2">
                    <Label htmlFor="video-author">発信者</Label>
                     <Select value={authorId} onValueChange={setAuthorId}>
                        <SelectTrigger>
                            <SelectValue placeholder="発信者を選択" />
                        </SelectTrigger>
                        <SelectContent>
                            {allUsers.filter(u => u.role === 'executive' || u.role === 'admin').map(u => (
                                <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="video-title">タイトル (30文字以内)</Label>
              <Input id="video-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={30} disabled={isLoading} />
            </div>
            <div className="grid gap-2">
              <Label>タグ (最大5個)</Label>
              <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
                {tags.map((tag, index) => (
                    <Input 
                      key={index}
                      value={tag}
                      onChange={e => handleTagChange(index, e.target.value)}
                      placeholder={`タグ ${index + 1}`} 
                      maxLength={20}
                      disabled={isLoading}
                    />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-desc">概要 (500文字以内)</Label>
              <Textarea id="video-desc" value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={500} rows={5} disabled={isLoading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-url">動画URL</Label>
              <Input id="video-url" value={src} onChange={(e) => setSrc(e.target.value)} placeholder="https://example.com/video.mp4" required disabled={isLoading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-thumb">サムネイルURL</Label>
              <Input id="video-thumb" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://example.com/thumbnail.jpg" required disabled={isLoading} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {isLoading ? (mode === 'add' ? '追加中...' : '更新中...') : (mode === 'add' ? 'ビデオを追加' : 'ビデオを更新')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VideosTable({ 
  selected, 
  onSelectedChange, 
  videos, 
  isLoading,
  onAddComment,
  onDeleteComment,
  allUsers,
  currentUser
}: { 
  selected: string[], 
  onSelectedChange: (ids: string[]) => void, 
  videos: VideoType[] | null, 
  isLoading: boolean,
  onAddComment: (contentId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorAvatarUrl'>) => Promise<void>,
  onDeleteComment: (contentId: string, commentId: string) => Promise<void>,
  allUsers: Member[],
  currentUser: Member | null,
}) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUpdateVideo = async (videoId: string, videoData: Partial<VideoType>) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'videos', videoId), {
        ...videoData,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "成功", description: "ビデオ情報を更新しました。" });
    } catch (error) {
      console.error(error);
      toast({ title: "エラー", description: "ビデオ情報の更新に失敗しました。", variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'videos', id));
      toast({ title: "成功", description: "ビデオを削除しました。" });
    } catch (error) {
      console.error(error);
      toast({ title: "エラー", description: "ビデオの削除に失敗しました。", variant: 'destructive' });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '無効な日付';
    return format(date, 'yyyy/MM/dd', { locale: ja });
  };
  
  const handleSelectAll = (checked: boolean) => {
    onSelectedChange(checked && videos ? videos.map(v => v.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectedChange([...selected, id]);
    } else {
      onSelectedChange(selected.filter(rowId => rowId !== id));
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"><Checkbox checked={selected.length === videos?.length && (videos?.length ?? 0) > 0} onCheckedChange={handleSelectAll} /></TableHead>
          <TableHead className="w-[120px]">サムネイル</TableHead>
          <TableHead>タイトル</TableHead>
          <TableHead className="hidden sm:table-cell">タグ</TableHead>
          <TableHead className="hidden lg:table-cell">Counts</TableHead>
          <TableHead className="hidden md:table-cell">アップロード日</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {videos && videos.map((video) => (
          <TableRow key={video.id} data-state={selected.includes(video.id) && "selected"}>
            <TableCell><Checkbox checked={selected.includes(video.id)} onCheckedChange={(checked) => handleSelectRow(video.id, !!checked)} /></TableCell>
            <TableCell>
              <Image src={video.thumbnailUrl} alt={video.title} width={120} height={90} className="rounded-md object-cover" />
            </TableCell>
            <TableCell>
              <div className="font-medium">{video.title}</div>
              <div className="text-sm text-muted-foreground hidden md:inline">{video.description}</div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <div className="flex flex-wrap gap-1">
                {video.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </div>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
               <ContentDetailsDialog 
                  contentId={video.id} 
                  contentType='videos' 
                  contentTitle={video.title}
                  onAddComment={onAddComment}
                  onDeleteComment={onDeleteComment}
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-primary">
                    <div className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{video.likesCount ?? 0}</div>
                    <div className="flex items-center gap-1"><MessageCircleIcon className="h-3.5 w-3.5" />{video.commentsCount ?? 0}</div>
                    <div className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{video.viewsCount ?? 0}</div>
                  </div>
              </ContentDetailsDialog>
            </TableCell>
            <TableCell className="hidden md:table-cell">{formatDate(video.uploadedAt)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <VideoDialog mode="edit" video={video} onSave={(data) => handleUpdateVideo(video.id, data)} allUsers={allUsers} currentUser={currentUser}>
                    <DropdownMenuItem onSelect={e => e.preventDefault()}>編集</DropdownMenuItem>
                  </VideoDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                        削除
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                          ビデオ「{video.title}」を削除します。この操作は元に戻せません。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(video.id)}>削除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// 初期ビデオデータ登録ボタン
function SeedInitialVideosButton({ onSeeded }: { onSeeded: () => void }) {
  const [isSeeding, setIsSeeding] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSeedData = async () => {
    if (!firestore || !user) return;
    setIsSeeding(true);

    const sampleVideos = [
      {
        src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: '第4四半期 全社ミーティング',
        description: 'CEOからのメッセージ',
        thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
        tags: ['全社', '戦略'],
      },
      {
        src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        title: 'デザインチームより',
        description: '新プロダクトのコンセプト紹介',
        thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
        tags: ['新製品', 'デザイン'],
      },
      {
        src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        title: 'エンジニアチームより',
        description: 'ベータ版新機能のデモ',
        thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
        tags: ['開発', 'デモ'],
      },
    ];

    try {
      const batch = writeBatch(firestore);
      const videosCollection = collection(firestore, "videos");

      sampleVideos.forEach(video => {
        const docRef = doc(videosCollection);
        batch.set(docRef, {
          ...video,
          authorId: user.uid,
          creatorId: user.uid,
          uploadedAt: serverTimestamp(),
          likesCount: Math.floor(Math.random() * 50),
          commentsCount: Math.floor(Math.random() * 20),
          viewsCount: Math.floor(Math.random() * 200),
        });
      });

      await batch.commit();
      
      toast({ title: "成功", description: `${sampleVideos.length}件の初期ビデオを登録しました。` });
      onSeeded();
    } catch (error) {
      console.error("初期ビデオデータの登録に失敗しました:", error);
      toast({ title: "エラー", description: "初期ビデオデータの登録に失敗しました。", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Button onClick={handleSeedData} disabled={isSeeding} variant="outline" size="sm">
      {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {isSeeding ? '登録中...' : '初期ビデオデータを登録'}
    </Button>
  );
}


export default function ContentsPage() {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();
  const [initialVideosSeeded, setInitialVideosSeeded] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<Member>(useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]));
  const currentUser = useMemo(() => allUsers?.find(u => u.uid === authUser?.uid) || null, [allUsers, authUser]);

  const memoizedUserPermissions = useMemo(() => userPermissions, [userPermissions]);

  const canManageVideos = memoizedUserPermissions.includes('video_management');
  const canProxyPostVideo = memoizedUserPermissions.includes('proxy_post_video');
  const canManageMessages = memoizedUserPermissions.includes('message_management');
  const canProxyPostMessage = memoizedUserPermissions.includes('proxy_post_message');

  const fetchUserPermissions = useCallback(async (userUid: string): Promise<string[]> => {
    if (!firestore) return [];
    try {
      const userDocRef = doc(firestore, 'users', userUid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) return [];
      
      const userData = userDoc.data() as Member;
      const userPermsDocRef = doc(firestore, 'user_permissions', userUid);
      const userPermsDoc = await getDoc(userPermsDocRef);

      if (userPermsDoc.exists()) {
        const individualPerms = userPermsDoc.data() as UserPermission;
        return individualPerms.permissions || [];
      }

      const roleDocRef = doc(firestore, 'roles', userData.role);
      const roleDoc = await getDoc(roleDocRef);
      
      return roleDoc.exists() ? (roleDoc.data() as Role).permissions : [];
    } catch (error) {
      console.error("Error fetching permissions:", error);
      return [];
    }
  }, [firestore]);
  
  useEffect(() => {
    if (isUserLoading) return;
    if (authUser) {
      setIsCheckingPermissions(true);
      fetchUserPermissions(authUser.uid).then(perms => {
        setUserPermissions(perms);
        setIsCheckingPermissions(false);
      });
    } else {
      setIsCheckingPermissions(false);
    }
  }, [authUser, isUserLoading, fetchUserPermissions]);


  const videosQuery = useMemoFirebase(() => {
    if (isCheckingPermissions || !authUser || !firestore) return null;
    
    const collectionRef = collection(firestore, 'videos');
    if (canManageVideos) {
      return query(collectionRef, orderBy('uploadedAt', 'desc'));
    }
    if (canProxyPostVideo) {
      return query(collectionRef, where('creatorId', '==', authUser.uid), orderBy('uploadedAt', 'desc'));
    }
    return null;
  }, [firestore, authUser, isCheckingPermissions, canManageVideos, canProxyPostVideo]);
  

  const { data: videos, isLoading: videosLoading } = useCollection<VideoType>(videosQuery);
  
  const messagesQuery = useMemoFirebase(() => {
    if (isCheckingPermissions || !authUser || !firestore) return null;
    
    const collectionRef = collection(firestore, 'executiveMessages');
    if (canManageMessages) {
        return query(collectionRef, orderBy('createdAt', 'desc'));
    }
    if (canProxyPostMessage) {
        return query(collectionRef, where('creatorId', '==', authUser.uid), orderBy('createdAt', 'desc'));
    }
    return null;
  }, [firestore, authUser, isCheckingPermissions, canManageMessages, canProxyPostMessage]);

  const { data: messages, isLoading: messagesLoading } = useCollection<ExecutiveMessage>(messagesQuery);


  const handleAddVideo = async (videoData: Partial<VideoType>) => {
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, 'videos'), {
        ...videoData,
        uploadedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
      });
      toast({ title: "成功", description: "新規ビデオを追加しました。" });
    } catch (error) {
      console.error(error);
      toast({ title: "エラー", description: "ビデオの追加に失敗しました。", variant: 'destructive' });
    }
  };
  
  const handleAddComment = async (
    contentType: 'videos' | 'executiveMessages',
    contentId: string,
    commentData: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorAvatarUrl'>
  ) => {
    if (!firestore || !authUser) {
      toast({ title: "エラー", description: "コメントするにはログインが必要です。", variant: "destructive" });
      return;
    }

    try {
      const commentsCollectionRef = collection(firestore, contentType, contentId, 'comments');
      await addDoc(commentsCollectionRef, {
        ...commentData,
        authorId: authUser.uid,
        authorName: authUser.displayName || '匿名ユーザー',
        authorAvatarUrl: authUser.photoURL || `https://picsum.photos/seed/${authUser.uid}/100/100`,
        createdAt: serverTimestamp(),
      });

      const contentRef = doc(firestore, contentType, contentId);
      await updateDoc(contentRef, {
        commentsCount: increment(1)
      });

      toast({ title: "成功", description: "コメントを投稿しました。" });

    } catch (error) {
      console.error("コメントの投稿に失敗しました:", error);
      toast({ title: "エラー", description: "コメントの投稿に失敗しました。", variant: "destructive" });
    }
  };
  
  const handleDeleteComment = async (contentType: 'videos' | 'executiveMessages', contentId: string, commentId: string) => {
    if (!firestore) return;
    try {
      const commentRef = doc(firestore, contentType, contentId, 'comments', commentId);
      await deleteDoc(commentRef);

      const contentRef = doc(firestore, contentType, contentId);
      await updateDoc(contentRef, {
        commentsCount: increment(-1)
      });
      
      toast({ title: '成功', description: 'コメントを削除しました。' });
    } catch (error) {
      console.error("コメントの削除に失敗しました:", error);
      toast({ title: 'エラー', description: 'コメントの削除に失敗しました。', variant: 'destructive' });
    }
  };


  const handleBulkDelete = async (type: 'videos' | 'messages') => {
    let collectionName: string;
    let selectedIds: string[];
    let itemLabel: string;
    let setSelected: (ids: string[]) => void;

    if (type === 'videos') {
      collectionName = 'videos';
      selectedIds = selectedVideos;
      itemLabel = 'ビデオ';
      setSelected = setSelectedVideos;
    } else {
      collectionName = 'executiveMessages';
      selectedIds = selectedMessages;
      itemLabel = 'メッセージ';
      setSelected = setSelectedMessages;
    }

    if (!firestore || selectedIds.length === 0) return;
    
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      batch.delete(doc(firestore, collectionName, id));
    });

    try {
      await batch.commit();
      toast({ title: '成功', description: `${selectedIds.length}件の${itemLabel}を削除しました。` });
      setSelected([]);
    } catch (error) {
      console.error(`一括削除エラー (${collectionName}):`, error);
      toast({ title: 'エラー', description: `${itemLabel}の一括削除に失敗しました。`, variant: 'destructive' });
    }
  };

  const isLoading = isUserLoading || isCheckingPermissions || isLoadingUsers;

  const showSeedButton = !videosLoading && (!videos || videos.length === 0) && !initialVideosSeeded;
  
  const canAccessVideoTab = canManageVideos || canProxyPostVideo;
  const canAccessMessageTab = canManageMessages || canProxyPostMessage;

  const getDefaultTab = () => {
    if (canAccessVideoTab) return 'videos';
    if (canAccessMessageTab) return 'messages';
    return '';
  }

  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  const defaultTab = getDefaultTab();

  if (!defaultTab) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <h1 className="text-lg font-semibold md:text-2xl">コンテンツ管理</h1>
        </div>
        <p>コンテンツを管理する権限がありません。</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">コンテンツ管理</h1>
      </div>
      <Tabs defaultValue={defaultTab}>
        {(canAccessVideoTab && canAccessMessageTab) && (
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            {canAccessVideoTab && <TabsTrigger value="videos"><Video className="mr-2 h-4 w-4" />ビデオ管理</TabsTrigger>}
            {canAccessMessageTab && <TabsTrigger value="messages"><MessageSquare className="mr-2 h-4 w-4" />メッセージ管理</TabsTrigger>}
          </TabsList>
        )}

        {/* ビデオ管理タブ */}
        {canAccessVideoTab && (
          <TabsContent value="videos">
            <Card>
              <CardHeader>
                <CardTitle>ビデオ一覧</CardTitle>
                <CardDescription>
                  全社に共有するビデオコンテンツを管理します。
                </CardDescription>
                <div className="flex justify-end items-center gap-2">
                  {selectedVideos.length > 0 && canManageVideos && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />選択した{selectedVideos.length}件を削除</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            選択した{selectedVideos.length}件のビデオを削除します。この操作は元に戻せません。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleBulkDelete('videos')}>削除</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {showSeedButton && canManageVideos && <SeedInitialVideosButton onSeeded={() => setInitialVideosSeeded(true)} />}
                  {(canManageVideos || canProxyPostVideo) && <VideoDialog mode="add" onSave={handleAddVideo} allUsers={allUsers || []} currentUser={currentUser}/>}
                </div>
              </CardHeader>
              <CardContent>
                <VideosTable 
                    selected={selectedVideos} 
                    onSelectedChange={setSelectedVideos} 
                    videos={videos} 
                    isLoading={videosLoading} 
                    onAddComment={(contentId, commentData) => handleAddComment('videos', contentId, commentData)}
                    onDeleteComment={(contentId, commentId) => handleDeleteComment('videos', contentId, commentId)}
                    allUsers={allUsers || []}
                    currentUser={currentUser}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* メッセージ管理タブ */}
        {canAccessMessageTab && (
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>メッセージ一覧</CardTitle>
                <CardDescription>経営層からのメッセージを管理します。</CardDescription>
                <div className="flex justify-end items-center gap-2">
                  {selectedMessages.length > 0 && canManageMessages && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />選択した{selectedMessages.length}件を削除</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                            <AlertDialogDescription>
                              選択した{selectedMessages.length}件のメッセージを削除します。この操作は元に戻せません。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleBulkDelete('messages')}>削除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  {canManageMessages && <SeedMessagesButton allUsers={allUsers || []} />}
                  {(canManageMessages || canProxyPostMessage) && <AddMessageDialog allUsers={allUsers || []} currentUser={currentUser} />}
                </div>
              </CardHeader>
              <CardContent>
                 <MessagesTable 
                    selected={selectedMessages} 
                    onSelectedChange={setSelectedMessages}
                    messages={messages}
                    isLoading={messagesLoading}
                    onAddComment={(contentId, commentData) => handleAddComment('executiveMessages', contentId, commentData)}
                    onDeleteComment={(contentId, commentId) => handleDeleteComment('executiveMessages', contentId, commentId)}
                    allUsers={allUsers || []}
                    currentUser={currentUser}
                  />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
