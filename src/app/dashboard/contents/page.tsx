
'use client';

import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Video, MessageSquare, Loader2, Sparkles, Trash2, Heart, MessageCircle as MessageCircleIcon, Eye, Tag, ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch, increment, getDoc, where, getDocs, Query, setDoc, Timestamp } from 'firebase/firestore';
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
import { usePermissions } from '@/context/PermissionContext';
import { useSearchParams } from 'next/navigation';
import type { ContentTagSettings } from '@/types/content-tags';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

// --- Types ---
type VideoSortDescriptor = { column: keyof VideoType; direction: 'asc' | 'desc' };


// --- Tag Management ---

function TagSelector({ availableTags, selectedTags, onSelectionChange, limit = 5, triggerPlaceholder = "タグを選択..." }: { availableTags: string[], selectedTags: string[], onSelectionChange: (tags: string[]) => void, limit?: number, triggerPlaceholder?: string }) {
  
  const { toast } = useToast();

  const handleCheckedChange = (tag: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedTags, tag]
      : selectedTags.filter(t => t !== tag);
    
    const isLimited = limit > 0;
    if (isLimited && newSelection.length > limit) {
        toast({ title: '上限到達', description: `タグは${limit}個までしか選択できません。`, variant: 'destructive' });
        return;
    }
    onSelectionChange(newSelection);
  };
  
  return (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal">
              <Tag className="mr-2 h-4 w-4" />
              {selectedTags.length > 0 ? `${selectedTags.length}個のタグを選択中` : triggerPlaceholder}
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" onWheelCapture={(e) => e.stopPropagation()}>
            {limit > 0 && (
                <div className="p-2 text-xs text-muted-foreground border-b">
                    最大{limit}個まで選択できます。 ({selectedTags.length} / {limit})
                </div>
            )}
            <ScrollArea className="h-48">
              <div className="p-2 space-y-1">
                {(availableTags || []).map((tag, index) => {
                  const checkboxId = `tag-selector-${tag.replace(/\s+/g, '-')}-${index}`;
                  const isChecked = selectedTags.includes(tag);
                  const isLimited = limit > 0;
                  const isDisabled = isLimited && !isChecked && selectedTags.length >= limit;

                  return (
                    <div key={index} className={cn("flex items-center space-x-2", isDisabled ? "opacity-50" : "")}>
                      <Checkbox
                        id={checkboxId}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleCheckedChange(tag, !!checked)}
                        disabled={isDisabled}
                      />
                      <Label
                        htmlFor={checkboxId}
                        className={cn("text-sm font-medium leading-none flex-1 cursor-pointer py-2", isDisabled ? "cursor-not-allowed" : "")}
                      >
                        {tag}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
        </PopoverContent>
    </Popover>
  );
}


function TagManagementDialog({ currentTags, onSave }: { currentTags: string[], onSave: (tags: string[]) => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [tags, setTags] = useState<string[]>(Array(10).fill(''));
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if(open) {
            const initialTags = Array(10).fill('');
            currentTags.slice(0, 10).forEach((tag, i) => {
                initialTags[i] = tag;
            });
            setTags(initialTags);
        }
    }, [open, currentTags]);
    
    const handleTagChange = (index: number, value: string) => {
        const newTags = [...tags];
        newTags[index] = value;
        setTags(newTags);
    };

    const handleSave = async () => {
        setIsLoading(true);
        // 空のタグを除外して保存
        await onSave(tags.map(t => t.trim()).filter(t => t));
        setIsLoading(false);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Tag className="mr-2 h-4 w-4"/>タグを管理</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>コンテンツタグの管理</DialogTitle>
                    <DialogDescription>
                        コンテンツで使用するタグを最大10個まで設定できます。ここで設定したタグが選択肢として表示されます。
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    {tags.map((tag, index) => (
                        <div key={index} className="flex items-center gap-2">
                           <Label htmlFor={`tag-${index}`} className="w-12 text-right text-muted-foreground">{index + 1}.</Label>
                           <Input
                             id={`tag-${index}`}
                             value={tag}
                             onChange={(e) => handleTagChange(index, e.target.value)}
                             maxLength={20}
                             disabled={isLoading}
                           />
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={isLoading}>
                       {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                       保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Message Section (Firestore) ---

// 新規メッセージ追加用ダイアログ
function AddMessageDialog({ onMessageAdded, allUsers, currentUser, availableTags }: { onMessageAdded?: () => void, allUsers: Member[], currentUser: Member | null, availableTags: string[] }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [tags, setTags] = useState<string[]>([]);

  const { userPermissions } = usePermissions();
  const canProxyPost = userPermissions.includes('proxy_post_message');
  
  const [authorId, setAuthorId] = useState(canProxyPost ? '' : (currentUser?.uid || ''));

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('normal');
    setTags([]);
    setAuthorId(canProxyPost ? '' : (currentUser?.uid || ''));
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
        tags,
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
                     <Select value={authorId} onValueChange={setAuthorId} required>
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
              <Label>タグ</Label>
              <TagSelector availableTags={availableTags} selectedTags={tags} onSelectionChange={setTags} />
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
function EditMessageDialog({ message, onMessageUpdated, children, allUsers, currentUser, availableTags }: { message: ExecutiveMessage, onMessageUpdated?: () => void, children: React.ReactNode, allUsers: Member[], currentUser: Member | null, availableTags: string[] }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(message.title);
  const [content, setContent] = useState(message.content);
  const [priority, setPriority] = useState(message.priority);
  const [authorId, setAuthorId] = useState(message.authorId);
  const [tags, setTags] = useState(message.tags || []);

  const { userPermissions } = usePermissions();
  const canProxyPost = userPermissions.includes('proxy_post_message');

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
        tags: tags,
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
      setTags(message.tags || []);
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
                    <Select value={authorId} onValueChange={setAuthorId} required>
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
              <Label>タグ</Label>
               <TagSelector availableTags={availableTags} selectedTags={tags} onSelectionChange={setTags} />
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
  allUsers,
  currentUser,
  availableTags,
  onAddComment,
  onDeleteComment,
}: { 
  selected: string[], 
  onSelectedChange: (ids: string[]) => void,
  messages: ExecutiveMessage[] | null,
  isLoading: boolean,
  allUsers: Member[],
  currentUser: Member | null,
  availableTags: string[],
  onAddComment: (contentType: 'videos' | 'executiveMessages', contentId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorAvatarUrl'>) => Promise<void>;
  onDeleteComment: (contentType: 'videos' | 'executiveMessages', contentId: string, commentId: string) => Promise<void>;
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
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          <TableHead className="w-[50px]"><Checkbox checked={selected.length === messages?.length && messages.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
          <TableHead>タイトル</TableHead>
          <TableHead className="hidden md:table-cell">タグ</TableHead>
          <TableHead className="w-[120px]">重要度</TableHead>
          <TableHead className="hidden sm:table-cell w-[200px]">投稿者 / 作成者 / 作成日</TableHead>
          <TableHead className="hidden lg:table-cell">Counts</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages && messages.map((msg) => {
           const creator = allUsers.find(u => u.uid === msg.creatorId);
          return (
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
                <div>投稿: {msg.authorName || '不明'}</div>
                <div className="text-xs text-muted-foreground">作成: {creator?.displayName || '不明'}</div>
                <div className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <ContentDetailsDialog 
                    contentId={msg.id} 
                    contentType="executiveMessages" 
                    contentTitle={msg.title}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
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
                    <EditMessageDialog message={msg} allUsers={allUsers} currentUser={currentUser} availableTags={availableTags}>
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
          )
        })}
      </TableBody>
    </Table>
  );
}

// --- Video Section (Firestore) ---

function VideoDialog({ video, onSave, children, mode, allUsers, currentUser, availableTags }: { video?: VideoType, onSave: (video: Partial<VideoType>) => void, children?: React.ReactNode, mode: 'add' | 'edit', allUsers: Member[], currentUser: Member | null, availableTags: string[] }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');
  const [src, setSrc] = useState(video?.src || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnailUrl || '');
  const [priority, setPriority] = useState<'normal' | 'high'>(video?.priority || 'normal');
  const [tags, setTags] = useState<string[]>(video?.tags || []);
  
  const { userPermissions } = usePermissions();
  const canProxyPost = userPermissions.includes('proxy_post_video');
  
  const [authorId, setAuthorId] = useState(mode === 'add' && canProxyPost ? '' : (video?.authorId || currentUser?.uid || ''));

  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSrc('');
    setThumbnailUrl('');
    setPriority('normal');
    setTags([]);
    setAuthorId(canProxyPost ? '' : (currentUser?.uid || ''));
  };

  useEffect(() => {
    if (open) {
      setTitle(video?.title || '');
      setDescription(video?.description || '');
      setSrc(video?.src || '');
      setThumbnailUrl(video?.thumbnailUrl || '');
      setPriority(video?.priority || 'normal');
      setAuthorId(mode === 'add' && canProxyPost ? '' : (video?.authorId || currentUser?.uid || ''));
      setTags(video?.tags || []);
    }
  }, [video, open, currentUser, mode, canProxyPost]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!authorId) {
        toast({ title: "エラー", description: "発信者を選択してください。", variant: 'destructive' });
        return;
    }

    setIsLoading(true);
    
    const selectedAuthor = allUsers.find(u => u.uid === authorId);

    const videoData: Partial<VideoType> = {
      title,
      description,
      src,
      thumbnailUrl,
      priority,
      tags,
      authorId: authorId,
      authorName: selectedAuthor?.displayName || '不明な投稿者',
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
                     <Select value={authorId} onValueChange={setAuthorId} required>
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
              <Label htmlFor="video-priority">重要度</Label>
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
              <Label>タグ</Label>
              <TagSelector availableTags={availableTags} selectedTags={tags} onSelectionChange={setTags} />
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
  allUsers,
  currentUser,
  availableTags,
  onAddComment,
  onDeleteComment,
  sortDescriptor,
  onSortChange,
}: { 
  selected: string[], 
  onSelectedChange: (ids: string[]) => void, 
  videos: VideoType[] | null, 
  isLoading: boolean,
  allUsers: Member[],
  currentUser: Member | null,
  availableTags: string[],
  onAddComment: (contentType: 'videos' | 'executiveMessages', contentId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorAvatarUrl'>) => Promise<void>;
  onDeleteComment: (contentType: 'videos' | 'executiveMessages', contentId: string, commentId: string) => Promise<void>;
  sortDescriptor: VideoSortDescriptor;
  onSortChange: (descriptor: VideoSortDescriptor) => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const createSortHandler = (column: keyof VideoType) => () => {
    const direction =
      sortDescriptor.column === column && sortDescriptor.direction === 'asc'
        ? 'desc'
        : 'asc';
    onSortChange({ column, direction });
  };

  const SortIndicator = ({ column }: { column: keyof VideoType }) => {
    if (sortDescriptor.column === column) {
      return sortDescriptor.direction === 'asc' ? (
        <ChevronUp className="ml-2 h-4 w-4" />
      ) : (
        <ChevronDown className="ml-2 h-4 w-4" />
      );
    }
    return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
  };

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
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          <TableHead className="w-[50px]"><Checkbox checked={selected.length === videos?.length && (videos?.length ?? 0) > 0} onCheckedChange={handleSelectAll} /></TableHead>
          <TableHead className="w-[120px]">サムネイル</TableHead>
          <TableHead>
            <Button variant="ghost" onClick={createSortHandler('title')} className="-ml-4 h-8 group">
              タイトル
              <SortIndicator column="title" />
            </Button>
          </TableHead>
          <TableHead className="hidden sm:table-cell">タグ</TableHead>
          <TableHead className="w-[120px]">
             <Button variant="ghost" onClick={createSortHandler('priority')} className="-ml-4 h-8 group">
              重要度
              <SortIndicator column="priority" />
            </Button>
          </TableHead>
          <TableHead className="hidden md:table-cell">
            <Button variant="ghost" onClick={createSortHandler('uploadedAt')} className="-ml-4 h-8 group">
              投稿者 / 作成者 / 作成日
              <SortIndicator column="uploadedAt" />
            </Button>
          </TableHead>
          <TableHead className="hidden lg:table-cell">Counts</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {videos && videos.map((video) => {
          const creator = allUsers.find(u => u.uid === video.creatorId);
          return (
            <TableRow key={video.id} data-state={selected.includes(video.id) && "selected"}>
              <TableCell><Checkbox checked={selected.includes(video.id)} onCheckedChange={(checked) => handleSelectRow(video.id, !!checked)} /></TableCell>
              <TableCell>
                <Image src={video.thumbnailUrl} alt={video.title} width={120} height={90} className="rounded-md object-cover" />
              </TableCell>
              <TableCell>
                <div className="font-medium">{video.title}</div>
                <div className="text-sm text-muted-foreground hidden md:block max-w-md">
                   {video.description.length > 25
                    ? `${video.description.substring(0, 25)}...`
                    : video.description}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex flex-wrap gap-1">
                  {(video.tags || []).map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={video.priority === 'high' ? 'destructive' : 'secondary'}>
                  {video.priority === 'high' ? '高' : '通常'}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div>投稿: {video.authorName || '不明'}</div>
                <div className="text-xs text-muted-foreground">作成: {creator?.displayName || '不明'}</div>
                <div className="text-xs text-muted-foreground">{formatDate(video.uploadedAt)}</div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                  <ContentDetailsDialog 
                    contentId={video.id} 
                    contentType="videos" 
                    contentTitle={video.title}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                      <div className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{video.likesCount ?? 0}</div>
                      <div className="flex items-center gap-1"><MessageCircleIcon className="h-3.5 w-3.5" />{video.commentsCount ?? 0}</div>
                      <div className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{video.viewsCount ?? 0}</div>
                    </div>
                  </ContentDetailsDialog>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <VideoDialog mode="edit" video={video} onSave={(data) => handleUpdateVideo(video.id, data)} allUsers={allUsers} currentUser={currentUser} availableTags={availableTags}>
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
          )
        })}
      </TableBody>
    </Table>
  );
}

function ContentsPage() {
    const searchParams = useSearchParams();
    const [selectedTab, setSelectedTab] = useState(searchParams.get('tab') || 'videos');
  
    useEffect(() => {
      const tab = searchParams.get('tab');
      if (tab) {
        setSelectedTab(tab);
      }
    }, [searchParams]);

  return (
    <Suspense fallback={<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <ContentsPageContent selectedTab={selectedTab} />
    </Suspense>
  )
}


function ContentsPageContent({ selectedTab }: { selectedTab: string }) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  
  // Search & Filter State
  const [videoSearchTerm, setVideoSearchTerm] = useState('');
  const [videoTagFilter, setVideoTagFilter] = useState<string[]>([]);
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [messageTagFilter, setMessageTagFilter] = useState<string[]>([]);

  // Pagination State
  const [videoCurrentPage, setVideoCurrentPage] = useState(0);
  const [videoRowsPerPage, setVideoRowsPerPage] = useState(5);
  const [messageCurrentPage, setMessageCurrentPage] = useState(0);
  const [messageRowsPerPage, setMessageRowsPerPage] = useState(10);
  const [videoSortDescriptor, setVideoSortDescriptor] = useState<VideoSortDescriptor>({ column: 'uploadedAt', direction: 'desc' });
  
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();

  const { userPermissions, isCheckingPermissions } = usePermissions();
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || isCheckingPermissions) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, isUserLoading, isCheckingPermissions]);

  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<Member>(usersQuery);
  const currentUser = useMemo(() => allUsers?.find(u => u.uid === authUser?.uid) || null, [allUsers, authUser]);

  const canManageVideos = userPermissions.includes('video_management');
  const canProxyPostVideo = userPermissions.includes('proxy_post_video');
  const canManageMessages = userPermissions.includes('message_management');
  const canProxyPostMessage = userPermissions.includes('proxy_post_message');
  const canManageTags = userPermissions.includes('video_management') || userPermissions.includes('message_management');
  
  const canAccessVideoTab = canManageVideos || canProxyPostVideo;
  const canAccessMessageTab = canManageMessages || canProxyPostMessage;

  const { data: tagSettingsDoc, isLoading: isLoadingTags } = useDoc<ContentTagSettings>(useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'contentTags') : null, [firestore]));
  const availableTags = useMemo(() => tagSettingsDoc?.tags || [], [tagSettingsDoc]);

  const handleSaveTags = async (newTags: string[]) => {
      if (!firestore) return;
      const tagSettingsRef = doc(firestore, 'settings', 'contentTags');
      try {
          await setDoc(tagSettingsRef, { tags: newTags, updatedAt: serverTimestamp() }, { merge: true });
          toast({ title: '成功', description: 'タグリストを更新しました。' });
      } catch (error) {
          console.error("Error updating tags:", error);
          toast({ title: 'エラー', description: 'タグの更新に失敗しました。', variant: 'destructive' });
      }
  };


  const videosQuery = useMemoFirebase(() => {
    if (isCheckingPermissions || !authUser || !firestore) {
        return null;
    }
    
    const collectionRef = collection(firestore, 'videos');
    
    if (canManageVideos) {
        return query(collectionRef, orderBy('uploadedAt', 'desc'));
    }

    if (canProxyPostVideo) {
        return query(collectionRef, where('creatorId', '==', authUser.uid), orderBy('uploadedAt', 'desc'));
    }
    
    return query(collectionRef, where('creatorId', '==', 'NO_ONE_HAS_THIS_ID'));

  }, [firestore, authUser, isCheckingPermissions, canManageVideos, canProxyPostVideo]);
  

  const { data: videos, isLoading: videosLoading, error: videosError } = useCollection<VideoType>(videosQuery);
  
  const messagesQuery = useMemoFirebase(() => {
     if (isCheckingPermissions || !authUser || !firestore) {
        return null;
    }

    const collectionRef = collection(firestore, 'executiveMessages');
    
    if (canManageMessages) {
       return query(collectionRef, orderBy('createdAt', 'desc'));
    }

    if (canProxyPostMessage) {
       return query(collectionRef, where('creatorId', '==', authUser.uid), orderBy('createdAt', 'desc'));
    }
    
    return query(collectionRef, where('creatorId', '==', 'NO_ONE_HAS_THIS_ID'));

  }, [firestore, authUser, isCheckingPermissions, canManageMessages, canProxyPostMessage]);

  const { data: messages, isLoading: messagesLoading, error: messagesError } = useCollection<ExecutiveMessage>(messagesQuery);
  
  const sortedVideos = useMemo(() => {
    if (!videos) return [];
    
    const filtered = videos.filter(video => {
      const searchMatch = videoSearchTerm === '' ||
        video.title.toLowerCase().includes(videoSearchTerm.toLowerCase()) ||
        video.description.toLowerCase().includes(videoSearchTerm.toLowerCase());
      
      const tagMatch = videoTagFilter.length === 0 ||
        videoTagFilter.every(filterTag => (video.tags || []).includes(filterTag));
        
      return searchMatch && tagMatch;
    });

    return [...filtered].sort((a, b) => {
        const first = a[videoSortDescriptor.column];
        const second = b[videoSortDescriptor.column];

        const valA = first instanceof Timestamp ? first.toMillis() : first;
        const valB = second instanceof Timestamp ? second.toMillis() : second;

        let cmp = String(valA).localeCompare(String(valB));
        
        if (videoSortDescriptor.direction === 'desc') {
            cmp *= -1;
        }
        return cmp;
    });
  }, [videos, videoSortDescriptor, videoSearchTerm, videoTagFilter]);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter(message => {
      const searchMatch = messageSearchTerm === '' ||
        message.title.toLowerCase().includes(messageSearchTerm.toLowerCase()) ||
        message.content.toLowerCase().includes(messageSearchTerm.toLowerCase());
      
      const tagMatch = messageTagFilter.length === 0 ||
        messageTagFilter.every(filterTag => (message.tags || []).includes(filterTag));
        
      return searchMatch && tagMatch;
    });
  }, [messages, messageSearchTerm, messageTagFilter]);

  // Paginated Data
  const paginatedVideos = useMemo(() => {
    if (!sortedVideos) return [];
    const startIndex = videoCurrentPage * videoRowsPerPage;
    return sortedVideos.slice(startIndex, startIndex + videoRowsPerPage);
  }, [sortedVideos, videoCurrentPage, videoRowsPerPage]);

  const paginatedMessages = useMemo(() => {
    if (!filteredMessages) return [];
    const startIndex = messageCurrentPage * messageRowsPerPage;
    return filteredMessages.slice(startIndex, startIndex + messageRowsPerPage);
  }, [filteredMessages, messageCurrentPage, messageRowsPerPage]);


  // Reset page when filters change
  useEffect(() => {
    setVideoCurrentPage(0);
  }, [selectedTab, videoRowsPerPage, videoSortDescriptor, videoSearchTerm, videoTagFilter]);

  useEffect(() => {
    setMessageCurrentPage(0);
  }, [selectedTab, messageRowsPerPage, messageSearchTerm, messageTagFilter]);


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

  const onAddComment = useCallback(async (
    contentType: 'videos' | 'executiveMessages',
    contentId: string,
    commentData: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorAvatarUrl'>
  ) => {
    if (!firestore || !authUser) return;

    const contentRef = doc(firestore, contentType, contentId);
    const commentsColRef = collection(contentRef, 'comments');
    
    const batch = writeBatch(firestore);
    batch.set(doc(commentsColRef), {
      ...commentData,
      authorId: authUser.uid,
      authorName: authUser.displayName || '不明',
      authorAvatarUrl: authUser.photoURL || '',
      createdAt: serverTimestamp()
    });
    batch.update(contentRef, { commentsCount: increment(1) });
    
    try {
      await batch.commit();
    } catch (error) {
      console.error("Error adding comment: ", error);
      toast({ title: "エラー", description: "コメントの追加に失敗しました。", variant: "destructive" });
    }
  }, [firestore, authUser, toast]);

  const onDeleteComment = useCallback(async (
    contentType: 'videos' | 'executiveMessages',
    contentId: string, 
    commentId: string
  ) => {
    if (!firestore) return;
    
    const contentRef = doc(firestore, contentType, contentId);
    const commentsColRef = collection(contentRef, 'comments');

    const allIdsToDelete = [commentId];
    
    try {
        const batch = writeBatch(firestore);
        allIdsToDelete.forEach(id => {
            batch.delete(doc(commentsColRef, id));
        });
        batch.update(contentRef, { commentsCount: increment(-allIdsToDelete.length) });
        await batch.commit();
    } catch (error) {
      console.error("Error deleting comment and its children: ", error);
      toast({ title: "エラー", description: "コメントの削除に失敗しました。", variant: "destructive" });
    }
  }, [firestore, toast]);


  const isLoading = isUserLoading || isCheckingPermissions || isLoadingUsers || isLoadingTags;
  
  const defaultTab = useMemo(() => {
    if (selectedTab === 'videos' && canAccessVideoTab) return 'videos';
    if (selectedTab === 'messages' && canAccessMessageTab) return 'messages';
    if (canAccessVideoTab) return 'videos';
    if (canAccessMessageTab) return 'messages';
    return '';
  }, [selectedTab, canAccessVideoTab, canAccessMessageTab]);

  const pageSubTitle = useMemo(() => {
    if (defaultTab === 'videos') return 'ビデオ管理';
    if (defaultTab === 'messages') return 'メッセージ管理';
    if (canManageTags && !canAccessVideoTab && !canAccessMessageTab) return 'タグ管理';
    return '';
  }, [defaultTab, canManageTags, canAccessVideoTab, canAccessMessageTab]);

  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!canAccessVideoTab && !canAccessMessageTab && !canManageTags) {
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
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col gap-6">
      <div className="flex items-center">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">コンテンツ管理</h1>
          {pageSubTitle && <p className="text-sm text-muted-foreground">{pageSubTitle}</p>}
        </div>
         <div className="ml-auto">
            {canManageTags && (
              <TagManagementDialog currentTags={availableTags} onSave={handleSaveTags} />
            )}
        </div>
      </div>
      
      {canAccessVideoTab && defaultTab === 'videos' && (
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>ビデオ一覧</CardTitle>
            <CardDescription>
              全社に共有するビデオコンテンツを管理します。
            </CardDescription>
             <div className="flex items-center gap-2 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="タイトルや概要で検索..."
                  className="pl-10"
                  value={videoSearchTerm}
                  onChange={e => setVideoSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full max-w-sm">
                <TagSelector 
                  availableTags={availableTags} 
                  selectedTags={videoTagFilter} 
                  onSelectionChange={setVideoTagFilter} 
                  limit={0}
                  triggerPlaceholder="タグで絞り込み..."
                />
              </div>
            </div>
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
              {(canManageVideos || canProxyPostVideo) && <VideoDialog mode="add" onSave={handleAddVideo} allUsers={allUsers || []} currentUser={currentUser} availableTags={availableTags} />}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative">
            <div className="absolute inset-0 overflow-auto">
              <VideosTable 
                  selected={selectedVideos} 
                  onSelectedChange={setSelectedVideos} 
                  videos={paginatedVideos} 
                  isLoading={videosLoading} 
                  allUsers={allUsers || []}
                  currentUser={currentUser}
                  availableTags={availableTags}
                  onAddComment={onAddComment}
                  onDeleteComment={onDeleteComment}
                  sortDescriptor={videoSortDescriptor}
                  onSortChange={setVideoSortDescriptor}
              />
            </div>
          </CardContent>
           <CardFooter className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t">
              <DataTablePagination
                count={sortedVideos?.length || 0}
                rowsPerPage={videoRowsPerPage}
                page={videoCurrentPage}
                onPageChange={setVideoCurrentPage}
                onRowsPerPageChange={setVideoRowsPerPage}
              />
          </CardFooter>
        </Card>
      )}

      {canAccessMessageTab && defaultTab === 'messages' && (
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>メッセージ一覧</CardTitle>
            <CardDescription>経営層からのメッセージを管理します。</CardDescription>
            <div className="flex items-center gap-2 pt-4">
               <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="タイトルや内容で検索..."
                  className="pl-10"
                  value={messageSearchTerm}
                  onChange={e => setMessageSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full max-w-sm">
                <TagSelector 
                  availableTags={availableTags} 
                  selectedTags={messageTagFilter} 
                  onSelectionChange={setMessageTagFilter}
                  limit={0}
                  triggerPlaceholder="タグで絞り込み..."
                />
              </div>
            </div>
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
              {(canManageMessages || canProxyPostMessage) && <AddMessageDialog allUsers={allUsers || []} currentUser={currentUser} availableTags={availableTags} />}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative">
            <div className="absolute inset-0 overflow-auto">
              <MessagesTable 
                selected={selectedMessages} 
                onSelectedChange={setSelectedMessages}
                messages={paginatedMessages}
                isLoading={messagesLoading}
                allUsers={allUsers || []}
                currentUser={currentUser}
                availableTags={availableTags}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
              />
            </div>
          </CardContent>
           <CardFooter className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t">
            <DataTablePagination
              count={filteredMessages?.length || 0}
              rowsPerPage={messageRowsPerPage}
              page={messageCurrentPage}
              onPageChange={setMessageCurrentPage}
              onRowsPerPageChange={setMessageRowsPerPage}
            />
          </CardFooter>
        </Card>
      )}
      
      {!canAccessVideoTab && !canAccessMessageTab && canManageTags && (
         <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>表示できるコンテンツはありません。</p>
            <p className="text-sm">コンテンツを閲覧・編集するには、ビデオ管理またはメッセージ管理の権限が必要です。</p>
        </div>
      )}
    </div>
  );
}

export default ContentsPage;
