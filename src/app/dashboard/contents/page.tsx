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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Loader2, Trash2, Heart, MessageCircle as MessageCircleIcon, Eye, Tag, ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch, increment, where, setDoc, Timestamp } from 'firebase/firestore';
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
type VideoSortDescriptor = { column: keyof VideoType | 'authorName'; direction: 'asc' | 'desc' };
type MessageSortDescriptor = { column: keyof ExecutiveMessage | 'authorName'; direction: 'asc' | 'desc' };

// --- Tag Management ---

function TagSelector({ availableTags, selectedTags, onSelectionChange, limit = 5, triggerPlaceholder = "タグを選択..." }: { availableTags: string[], selectedTags: string[], onSelectionChange: (tags: string[]) => void, limit?: number, triggerPlaceholder?: string }) {
  const { toast } = useToast();

  const handleCheckedChange = (tag: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedTags, tag]
      : selectedTags.filter(t => t !== tag);
    
    if (limit > 0 && newSelection.length > limit) {
        toast({ title: '上限到達', description: `タグは${limit}個までしか選択できません。`, variant: 'destructive' });
        return;
    }
    onSelectionChange(newSelection);
  };
  
  return (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto justify-start font-normal">
              <Tag className="mr-2 h-4 w-4" />
              <span className="truncate">{selectedTags.length > 0 ? `${selectedTags.length}個のタグを選択中` : triggerPlaceholder}</span>
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" onWheelCapture={(e) => e.stopPropagation()}>
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
                  const isDisabled = limit > 0 && !isChecked && selectedTags.length >= limit;

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
                        コンテンツで使用するタグを最大10個まで設定できます。
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
                       {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary"/>}
                       保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Message Section (Firestore) ---

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
        creatorId: user.uid,
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
      if (!isOpen) resetForm();
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
                        <SelectTrigger><SelectValue placeholder="発信者を選択" /></SelectTrigger>
                        <SelectContent>
                             {allUsers.filter(u => u.role === 'executive' || u.role === 'admin').map(u => (
                                <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="msg-title">タイトル</Label>
              <Input id="msg-title" value={title} onChange={e => setTitle(e.target.value)} required disabled={isLoading} maxLength={30} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="msg-priority">重要度</Label>
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
              <Label htmlFor="msg-content">内容</Label>
              <Textarea id="msg-content" value={content} onChange={e => setContent(e.target.value)} rows={10} required disabled={isLoading} maxLength={2000} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary"/>}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleEditMessage}>
          <DialogHeader><DialogTitle>メッセージを編集</DialogTitle></DialogHeader>
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
              <Label htmlFor="edit-msg-title">タイトル</Label>
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
              <Label htmlFor="edit-msg-content">内容</Label>
              <Textarea id="edit-msg-content" value={content} onChange={e => setContent(e.target.value)} rows={10} required disabled={isLoading} maxLength={2000}/>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary"/>}
              更新
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  sortDescriptor,
  onSortChange,
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
  sortDescriptor: MessageSortDescriptor;
  onSortChange: (descriptor: MessageSortDescriptor) => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const createSortHandler = (column: keyof ExecutiveMessage | 'authorName') => () => {
    const direction = sortDescriptor.column === column && sortDescriptor.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column, direction });
  };

  const SortIndicator = ({ column }: { column: keyof ExecutiveMessage | 'authorName' }) => {
    if (sortDescriptor.column === column) {
      return sortDescriptor.direction === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />;
    }
    return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
  };

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
  
  if (isLoading) return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-muted">
        <TableRow>
          <TableHead className="w-[50px]"><Checkbox checked={selected.length === messages?.length && messages.length > 0} onCheckedChange={c => onSelectedChange(c ? messages!.map(m => m.id) : [])} /></TableHead>
          <TableHead className="border-l"><Button variant="ghost" onClick={createSortHandler('title')} className="-ml-4 h-8 group">タイトル<SortIndicator column="title" /></Button></TableHead>
          <TableHead className="hidden md:table-cell border-l">タグ</TableHead>
          <TableHead className="w-[120px] border-l"><Button variant="ghost" onClick={createSortHandler('priority')} className="-ml-4 h-8 group">重要度<SortIndicator column="priority" /></Button></TableHead>
          <TableHead className="hidden sm:table-cell w-[150px] border-l"><Button variant="ghost" onClick={createSortHandler('authorName')} className="-ml-4 h-8 group">投稿者<SortIndicator column="authorName" /></Button></TableHead>
          <TableHead className="hidden sm:table-cell w-[150px] border-l"><Button variant="ghost" onClick={createSortHandler('createdAt')} className="-ml-4 h-8 group">作成日<SortIndicator column="createdAt" /></Button></TableHead>
          <TableHead className="hidden lg:table-cell border-l">Counts</TableHead>
          <TableHead className="border-l"><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages && messages.map((msg) => (
          <TableRow key={msg.id} data-state={selected.includes(msg.id) && "selected"}>
            <TableCell><Checkbox checked={selected.includes(msg.id)} onCheckedChange={c => onSelectedChange(c ? [...selected, msg.id] : selected.filter(id => id !== msg.id))} /></TableCell>
            <TableCell className="font-medium border-l">{msg.title}</TableCell>
            <TableCell className="hidden md:table-cell border-l"><div className="flex flex-wrap gap-1">{(msg.tags || []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}</div></TableCell>
            <TableCell className="border-l"><Badge variant={msg.priority === 'high' ? 'destructive' : 'secondary'}>{msg.priority === 'high' ? '高' : '通常'}</Badge></TableCell>
            <TableCell className="hidden sm:table-cell border-l"><div>{msg.authorName || '不明'}</div><div className="text-xs text-muted-foreground">作成: {allUsers.find(u => u.uid === msg.creatorId)?.displayName || '不明'}</div></TableCell>
            <TableCell className="hidden sm:table-cell border-l"><div className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</div></TableCell>
            <TableCell className="hidden lg:table-cell border-l">
              <ContentDetailsDialog contentId={msg.id} contentType="executiveMessages" contentTitle={msg.title} onAddComment={onAddComment} onDeleteComment={onDeleteComment}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  <div className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{msg.likesCount ?? 0}</div>
                  <div className="flex items-center gap-1"><MessageCircleIcon className="h-3.5 w-3.5" />{msg.commentsCount ?? 0}</div>
                  <div className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{msg.viewsCount ?? 0}</div>
                </div>
              </ContentDetailsDialog>
            </TableCell>
            <TableCell className="border-l">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <EditMessageDialog message={msg} allUsers={allUsers} currentUser={currentUser} availableTags={availableTags}><DropdownMenuItem onSelect={e => e.preventDefault()}>編集</DropdownMenuItem></EditMessageDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">削除</DropdownMenuItem></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>削除しますか？</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(msg.id)}>削除</AlertDialogAction></AlertDialogFooter>
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
    setTitle(''); setDescription(''); setSrc(''); setThumbnailUrl(''); setPriority('normal'); setTags([]);
    setAuthorId(canProxyPost ? '' : (currentUser?.uid || ''));
  };

  useEffect(() => {
    if (open) {
      setTitle(video?.title || ''); setDescription(video?.description || ''); setSrc(video?.src || '');
      setThumbnailUrl(video?.thumbnailUrl || ''); setPriority(video?.priority || 'normal');
      setAuthorId(mode === 'add' && canProxyPost ? '' : (video?.authorId || currentUser?.uid || ''));
      setTags(video?.tags || []);
    }
  }, [video, open, currentUser, mode, canProxyPost]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !authorId) {
        toast({ title: "エラー", description: "入力内容を確認してください。", variant: 'destructive' });
        return;
    }
    setIsLoading(true);
    const selectedAuthor = allUsers.find(u => u.uid === authorId);
    const videoData: Partial<VideoType> = {
      title, description, src, thumbnailUrl, priority, tags,
      authorId: authorId, authorName: selectedAuthor?.displayName || '不明な投稿者',
    };
    if(mode === 'add') videoData.creatorId = user.uid;
    onSave(videoData);
    setIsLoading(false); setOpen(false);
    if(mode === 'add') resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>{children || <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />新規ビデオ追加</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>{mode === 'add' ? '新規ビデオ追加' : 'ビデオを編集'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             {canProxyPost && (
                <div className="grid gap-2">
                    <Label htmlFor="video-author">発信者</Label>
                     <Select value={authorId} onValueChange={setAuthorId} required>
                        <SelectTrigger><SelectValue placeholder="発信者を選択" /></SelectTrigger>
                        <SelectContent>{allUsers.filter(u => u.role === 'executive' || u.role === 'admin').map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="video-title">タイトル</Label>
              <Input id="video-title" value={title} onChange={e => setTitle(e.target.value)} required maxLength={30} disabled={isLoading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-priority">重要度</Label>
              <Select value={priority} onValueChange={(v: 'normal' | 'high') => setPriority(v)} disabled={isLoading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="normal">通常</SelectItem><SelectItem value="high">高</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>タグ</Label><TagSelector availableTags={availableTags} selectedTags={tags} onSelectionChange={setTags} /></div>
            <div className="grid gap-2"><Label htmlFor="video-desc">概要</Label><Textarea id="video-desc" value={description} onChange={e => setDescription(e.target.value)} required maxLength={2000} rows={5} disabled={isLoading} /></div>
            <div className="grid gap-2"><Label htmlFor="video-url">動画URL</Label><Input id="video-url" value={src} onChange={e => setSrc(e.target.value)} required disabled={isLoading} /></div>
            <div className="grid gap-2"><Label htmlFor="video-thumb">サムネイルURL</Label><Input id="video-thumb" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} required disabled={isLoading} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary"/>}保存</Button></DialogFooter>
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

  const createSortHandler = (column: keyof VideoType | 'authorName') => () => {
    const direction = sortDescriptor.column === column && sortDescriptor.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column, direction });
  };

  const SortIndicator = ({ column }: { column: keyof VideoType | 'authorName' }) => {
    if (sortDescriptor.column === column) {
      return sortDescriptor.direction === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />;
    }
    return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
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
    return format(date, 'yyyy/MM/dd HH:mm', { locale: ja });
  };

  if (isLoading) return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-muted">
        <TableRow>
          <TableHead className="w-[50px]"><Checkbox checked={selected.length === videos?.length && (videos?.length ?? 0) > 0} onCheckedChange={c => onSelectedChange(c ? videos!.map(v => v.id) : [])} /></TableHead>
          <TableHead className="w-[120px] border-l">サムネイル</TableHead>
          <TableHead className="border-l"><Button variant="ghost" onClick={createSortHandler('title')} className="-ml-4 h-8 group">タイトル<SortIndicator column="title" /></Button></TableHead>
          <TableHead className="hidden sm:table-cell w-[180px] border-l">タグ</TableHead>
          <TableHead className="w-[100px] border-l"><Button variant="ghost" onClick={createSortHandler('priority')} className="-ml-4 h-8 group">重要度<SortIndicator column="priority" /></Button></TableHead>
          <TableHead className="hidden md:table-cell w-[150px] border-l"><Button variant="ghost" onClick={createSortHandler('authorName')} className="-ml-4 h-8 group">投稿者<SortIndicator column="authorName" /></Button></TableHead>
          <TableHead className="hidden md:table-cell w-[150px] border-l"><Button variant="ghost" onClick={createSortHandler('uploadedAt')} className="-ml-4 h-8 group">作成日<SortIndicator column="uploadedAt" /></Button></TableHead>
          <TableHead className="hidden lg:table-cell border-l">Counts</TableHead>
          <TableHead className="border-l"><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {videos && videos.map((video) => (
          <TableRow key={video.id} data-state={selected.includes(video.id) && "selected"}>
            <TableCell><Checkbox checked={selected.includes(video.id)} onCheckedChange={c => onSelectedChange(c ? [...selected, video.id] : selected.filter(id => id !== video.id))} /></TableCell>
            <TableCell className="border-l"><Image src={video.thumbnailUrl} alt={video.title} width={120} height={90} className="rounded-md object-cover" /></TableCell>
            <TableCell className="border-l"><div className="font-medium">{video.title}</div></TableCell>
            <TableCell className="hidden sm:table-cell border-l"><div className="flex flex-wrap gap-1">{(video.tags || []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}</div></TableCell>
            <TableCell className="border-l"><Badge variant={video.priority === 'high' ? 'destructive' : 'secondary'}>{video.priority === 'high' ? '高' : '通常'}</Badge></TableCell>
            <TableCell className="hidden md:table-cell border-l"><div>{video.authorName || '不明'}</div><div className="text-xs text-muted-foreground">作成: {allUsers.find(u => u.uid === video.creatorId)?.displayName || '不明'}</div></TableCell>
            <TableCell className="hidden md:table-cell border-l">{formatDate(video.uploadedAt)}</TableCell>
            <TableCell className="hidden lg:table-cell border-l">
                <ContentDetailsDialog contentId={video.id} contentType="videos" contentTitle={video.title} onAddComment={onAddComment} onDeleteComment={onDeleteComment}>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    <div className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{video.likesCount ?? 0}</div>
                    <div className="flex items-center gap-1"><MessageCircleIcon className="h-3.5 w-3.5" />{video.commentsCount ?? 0}</div>
                    <div className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{video.viewsCount ?? 0}</div>
                  </div>
                </ContentDetailsDialog>
            </TableCell>
            <TableCell className="border-l">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <VideoDialog mode="edit" video={video} onSave={d => updateDoc(doc(firestore, 'videos', video.id), { ...d, updatedAt: serverTimestamp() })} allUsers={allUsers} currentUser={currentUser} availableTags={availableTags}><DropdownMenuItem onSelect={e => e.preventDefault()}>編集</DropdownMenuItem></VideoDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">削除</DropdownMenuItem></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>削除しますか？</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(video.id)}>削除</AlertDialogAction></AlertDialogFooter>
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

function ContentsPageContent({ selectedTab }: { selectedTab: string }) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [videoSearchTerm, setVideoSearchTerm] = useState('');
  const [videoTagFilter, setVideoTagFilter] = useState<string[]>([]);
  const [videoAuthorFilter, setVideoAuthorFilter] = useState('');
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [messageTagFilter, setMessageTagFilter] = useState<string[]>([]);
  const [messageAuthorFilter, setMessageAuthorFilter] = useState('');
  const [videoCurrentPage, setVideoCurrentPage] = useState(0);
  const [videoRowsPerPage, setVideoRowsPerPage] = useState(10);
  const [messageCurrentPage, setMessageCurrentPage] = useState(0);
  const [messageRowsPerPage, setMessageRowsPerPage] = useState(10);
  const [videoSortDescriptor, setVideoSortDescriptor] = useState<VideoSortDescriptor>({ column: 'uploadedAt', direction: 'desc' });
  const [messageSortDescriptor, setMessageSortDescriptor] = useState<MessageSortDescriptor>({ column: 'createdAt', direction: 'desc' });
  
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();
  const { userPermissions, isCheckingPermissions } = usePermissions();
  
  const usersQuery = useMemoFirebase(() => (!firestore || isUserLoading || isCheckingPermissions) ? null : query(collection(firestore, 'users')), [firestore, isUserLoading, isCheckingPermissions]);
  const { data: allUsers } = useCollection<Member>(usersQuery);
  const currentUser = useMemo(() => allUsers?.find(u => u.uid === authUser?.uid) || null, [allUsers, authUser]);

  const canManageVideos = userPermissions.includes('video_management');
  const canProxyPostVideo = userPermissions.includes('proxy_post_video');
  const canManageMessages = userPermissions.includes('message_management');
  const canProxyPostMessage = userPermissions.includes('proxy_post_message');
  const canManageTags = userPermissions.includes('video_management') || userPermissions.includes('message_management');
  
  const { data: tagSettingsDoc } = useDoc<ContentTagSettings>(useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'contentTags') : null, [firestore]));
  const availableTags = useMemo(() => tagSettingsDoc?.tags || [], [tagSettingsDoc]);

  const videosQuery = useMemoFirebase(() => {
    if (isCheckingPermissions || !authUser || !firestore) return null;
    const ref = collection(firestore, 'videos');
    if (canManageVideos) return query(ref);
    if (canProxyPostVideo) return query(ref, where('creatorId', '==', authUser.uid));
    return query(ref, where('creatorId', '==', 'NONE'));
  }, [firestore, authUser, isCheckingPermissions, canManageVideos, canProxyPostVideo]);
  const { data: videos, isLoading: videosLoading } = useCollection<VideoType>(videosQuery);
  
  const messagesQuery = useMemoFirebase(() => {
    if (isCheckingPermissions || !authUser || !firestore) return null;
    const ref = collection(firestore, 'executiveMessages');
    if (canManageMessages) return query(ref);
    if (canProxyPostMessage) return query(ref, where('creatorId', '==', authUser.uid));
    return query(ref, where('creatorId', '==', 'NONE'));
  }, [firestore, authUser, isCheckingPermissions, canManageMessages, canProxyPostMessage]);
  const { data: messages, isLoading: messagesLoading } = useCollection<ExecutiveMessage>(messagesQuery);
  
  const filterAndSort = (items: any[] | null, search: string, tags: string[], author: string, sort: any) => {
    if (!items) return [];
    let filtered = items.filter(item => {
      const text = 'content' in item ? item.content : item.description;
      const sMatch = search === '' || item.title.toLowerCase().includes(search.toLowerCase()) || text.toLowerCase().includes(search.toLowerCase());
      const tMatch = tags.length === 0 || tags.every(t => (item.tags || []).includes(t));
      const aMatch = author === '' || item.authorId === author;
      return sMatch && tMatch && aMatch;
    });
    return [...filtered].sort((a, b) => {
        const key = sort.column;
        let vA = key === 'authorName' ? a.authorName : (a[key] instanceof Timestamp ? a[key].toMillis() : a[key]);
        let vB = key === 'authorName' ? b.authorName : (b[key] instanceof Timestamp ? b[key].toMillis() : b[key]);
        return sort.direction === 'asc' ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
    });
  };

  const sortedVideos = useMemo(() => filterAndSort(videos, videoSearchTerm, videoTagFilter, videoAuthorFilter, videoSortDescriptor), [videos, videoSearchTerm, videoTagFilter, videoAuthorFilter, videoSortDescriptor]);
  const sortedMessages = useMemo(() => filterAndSort(messages, messageSearchTerm, messageTagFilter, messageAuthorFilter, messageSortDescriptor), [messages, messageSearchTerm, messageTagFilter, messageAuthorFilter, messageSortDescriptor]);

  const handleBulkDelete = async (type: 'videos' | 'messages') => {
    const ids = type === 'videos' ? selectedVideos : selectedMessages;
    if (!firestore || ids.length === 0) return;
    const batch = writeBatch(firestore);
    ids.forEach(id => batch.delete(doc(firestore, type === 'videos' ? 'videos' : 'executiveMessages', id)));
    try {
      await batch.commit();
      toast({ title: '成功', description: `${ids.length}件削除しました。` });
      type === 'videos' ? setSelectedVideos([]) : setSelectedMessages([]);
    } catch (e) { toast({ title: 'エラー', variant: 'destructive' }); }
  };

  const onAddComment = useCallback(async (type: 'videos' | 'executiveMessages', id: string, data: any) => {
    if (!firestore || !authUser) return;
    const batch = writeBatch(firestore);
    batch.set(doc(collection(doc(firestore, type, id), 'comments')), { ...data, authorId: authUser.uid, authorName: authUser.displayName || '不明', authorAvatarUrl: authUser.photoURL || '', createdAt: serverTimestamp() });
    batch.update(doc(firestore, type, id), { commentsCount: increment(1) });
    try { await batch.commit(); } catch (e) { toast({ title: "エラー", variant: "destructive" }); }
  }, [firestore, authUser, toast]);

  const onDeleteComment = useCallback(async (type: 'videos' | 'executiveMessages', id: string, commentId: string) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    batch.delete(doc(firestore, `${type}/${id}/comments`, commentId));
    batch.update(doc(firestore, type, id), { commentsCount: increment(-1) });
    try { await batch.commit(); } catch (e) { toast({ title: "エラー", variant: "destructive" }); }
  }, [firestore, toast]);

  if (isUserLoading || isCheckingPermissions) return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const currentVideos = sortedVideos.slice(videoCurrentPage * videoRowsPerPage, (videoCurrentPage + 1) * videoRowsPerPage);
  const currentMessages = sortedMessages.slice(messageCurrentPage * messageRowsPerPage, (messageCurrentPage + 1) * messageRowsPerPage);

  const authors = (items: any[]) => {
    const map = new Map();
    items.forEach(i => map.set(i.authorId, i.authorName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-lg font-semibold md:text-2xl">コンテンツ管理</h1></div>
        {canManageTags && <TagManagementDialog currentTags={availableTags} onSave={async t => { await setDoc(doc(firestore!, 'settings', 'contentTags'), { tags: t, updatedAt: serverTimestamp() }, { merge: true }); toast({ title: '成功' }); }} />}
      </div>
      
      {selectedTab === 'videos' && canManageVideos && (
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="bg-muted/50 border-b space-y-4">
            <div className="flex items-start justify-between">
                <div className="grid gap-1"><CardTitle>ビデオ一覧</CardTitle><CardDescription>全社に共有するビデオコンテンツを管理します。</CardDescription></div>
                <div className="flex items-center gap-2">
                    {selectedVideos.length > 0 && <Button variant="destructive" size="sm" onClick={() => handleBulkDelete('videos')}><Trash2 className="mr-2 h-4 w-4" />削除</Button>}
                    <VideoDialog mode="add" onSave={d => addDoc(collection(firestore!, 'videos'), { ...d, uploadedAt: serverTimestamp(), updatedAt: serverTimestamp(), likesCount: 0, commentsCount: 0, viewsCount: 0 })} allUsers={allUsers || []} currentUser={currentUser} availableTags={availableTags} />
                </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2">
                <div className="relative flex-1 w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="タイトルや概要で検索..." className="pl-10" value={videoSearchTerm} onChange={e => setVideoSearchTerm(e.target.value)} /></div>
                <TagSelector availableTags={availableTags} selectedTags={videoTagFilter} onSelectionChange={setVideoTagFilter} limit={0} triggerPlaceholder="タグで絞り込み..." />
                <Select value={videoAuthorFilter} onValueChange={v => setVideoAuthorFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="すべての投稿者" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">すべての投稿者</SelectItem>{authors(videos || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative"><div className="absolute inset-0 overflow-auto"><VideosTable selected={selectedVideos} onSelectedChange={setSelectedVideos} videos={currentVideos} isLoading={videosLoading} allUsers={allUsers || []} currentUser={currentUser} availableTags={availableTags} onAddComment={onAddComment} onDeleteComment={onDeleteComment} sortDescriptor={videoSortDescriptor} onSortChange={setVideoSortDescriptor} /></div></CardContent>
          <CardFooter className="bg-muted/50 border-t"><DataTablePagination count={sortedVideos.length} rowsPerPage={videoRowsPerPage} page={videoCurrentPage} onPageChange={setVideoCurrentPage} onRowsPerPageChange={setVideoRowsPerPage} /></CardFooter>
        </Card>
      )}

      {selectedTab === 'messages' && canManageMessages && (
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="bg-muted/50 border-b space-y-4">
            <div className="flex items-start justify-between">
                <div className="grid gap-1"><CardTitle>メッセージ一覧</CardTitle><CardDescription>経営層からのメッセージを管理します。</CardDescription></div>
                <div className="flex items-center gap-2">
                    {selectedMessages.length > 0 && <Button variant="destructive" size="sm" onClick={() => handleBulkDelete('messages')}><Trash2 className="mr-2 h-4 w-4" />削除</Button>}
                    <AddMessageDialog allUsers={allUsers || []} currentUser={currentUser} availableTags={availableTags} />
                </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2">
                <div className="relative flex-1 w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="検索..." className="pl-10" value={messageSearchTerm} onChange={e => setMessageSearchTerm(e.target.value)} /></div>
                <TagSelector availableTags={availableTags} selectedTags={messageTagFilter} onSelectionChange={setMessageTagFilter} limit={0} triggerPlaceholder="タグで絞り込み..." />
                <Select value={messageAuthorFilter} onValueChange={v => setMessageAuthorFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="すべての投稿者" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">すべての投稿者</SelectItem>{authors(messages || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative"><div className="absolute inset-0 overflow-auto"><MessagesTable selected={selectedMessages} onSelectedChange={setSelectedMessages} messages={currentMessages} isLoading={messagesLoading} allUsers={allUsers || []} currentUser={currentUser} availableTags={availableTags} onAddComment={onAddComment} onDeleteComment={onDeleteComment} sortDescriptor={messageSortDescriptor} onSortChange={setMessageSortDescriptor} /></div></CardContent>
          <CardFooter className="bg-muted/50 border-t"><DataTablePagination count={sortedMessages.length} rowsPerPage={messageRowsPerPage} page={messageCurrentPage} onPageChange={setMessageCurrentPage} onRowsPerPageChange={setMessageRowsPerPage} /></CardFooter>
        </Card>
      )}
    </div>
  );
}

export default function ContentsPage() {
    const searchParams = useSearchParams();
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ContentsPageContent selectedTab={searchParams.get('tab') || 'videos'} />
        </Suspense>
    );
}