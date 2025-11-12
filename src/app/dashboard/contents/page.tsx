
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
import { MoreHorizontal, PlusCircle, Video, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { ExecutiveMessage } from '@/types/executive-message';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// --- Video Section (Dummy Data) ---
type DummyVideo = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  url: string;
  uploadedAt: string;
  tags: string[];
};

const initialDummyVideos: DummyVideo[] = [
  { id: 'v1', title: '2024年上期 全社会議', description: 'CEOからのメッセージと今期の戦略について。', thumbnailUrl: 'https://picsum.photos/seed/corpvideo/120/90', url: '#', uploadedAt: '2024/07/01', tags: ['全社', '戦略'] },
  { id: 'v2', title: '新製品発表会', description: '新製品「Philos MAX」の紹介動画です。', thumbnailUrl: 'https://picsum.photos/seed/productlaunch/120/90', url: '#', uploadedAt: '2024/06/15', tags: ['新製品', 'マーケティング'] },
];

// --- Message Section (Firestore) ---

// 新規メッセージ追加用ダイアログ
function AddMessageDialog({ onMessageAdded }: { onMessageAdded?: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [tags, setTags] = useState<string[]>(Array(5).fill(''));

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
  }

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsLoading(true);

    try {
      await addDoc(collection(firestore, 'executiveMessages'), {
        title,
        content,
        priority,
        tags: tags.map(tag => tag.trim()).filter(tag => tag),
        authorId: user.uid,
        authorName: user.displayName || '不明な作成者',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
function EditMessageDialog({ message, onMessageUpdated, children }: { message: ExecutiveMessage, onMessageUpdated?: () => void, children: React.ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(message.title);
  const [content, setContent] = useState(message.content);
  const [priority, setPriority] = useState(message.priority);
  
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

    try {
      await updateDoc(messageRef, {
        title,
        content,
        priority,
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
function MessagesTable() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'executiveMessages'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: messages, isLoading } = useCollection<ExecutiveMessage>(messagesQuery);
  
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
  
  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>タイトル</TableHead>
          <TableHead className="hidden md:table-cell">タグ</TableHead>
          <TableHead className="w-[120px]">重要度</TableHead>
          <TableHead className="w-[200px] hidden sm:table-cell">作成者</TableHead>
          <TableHead className="w-[150px] hidden md:table-cell">作成日</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages && messages.map((msg) => (
          <TableRow key={msg.id}>
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
            <TableCell className="hidden sm:table-cell">{msg.authorName || '不明'}</TableCell>
            <TableCell className="hidden md:table-cell">{formatDate(msg.createdAt)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <EditMessageDialog message={msg}>
                     <DropdownMenuItem onSelect={e => e.preventDefault()}>編集</DropdownMenuItem>
                  </EditMessageDialog>
                  <DropdownMenuItem onClick={() => handleDelete(msg.id)} className="text-destructive">削除</DropdownMenuItem>
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
function SeedDataButton() {
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

    const sampleMessages = [
      {
        title: "2024年下期 事業戦略について",
        content: "CEOの山田です。2024年下期の全社事業戦略についてご説明します。今期は「顧客中心主義の徹底」と「データ駆動型経営へのシフト」を二本柱とし、全社一丸となって取り組みます...",
        priority: 'high',
        tags: ['全社', '経営方針', '戦略'],
        authorName: "山田 太郎 (CEO)",
      },
      {
        title: "新技術スタック導入に関する技術戦略説明会",
        content: "CTOの佐藤です。来月より、開発部門全体で新しい技術スタックを導入します。この変更は、我々の開発速度とプロダクト品質を飛躍的に向上させるものです。詳細は添付資料をご確認ください。",
        priority: 'normal',
        tags: ['開発部', '技術', 'DX'],
        authorName: "佐藤 花子 (CTO)",
      },
      {
        title: "新しい人事評価制度の導入について",
        content: "人事部長の鈴木です。従業員の皆様の成長と公正な評価を実現するため、来期より新しい人事評価制度を導入いたします。新制度の目的は、透明性の高い評価プロセスと、個人の目標達成への手厚いサポートです。",
        priority: 'normal',
        tags: ['人事', '制度', '全社'],
        authorName: "鈴木 一郎 (人事部長)",
      },
    ];

    try {
      const batch = writeBatch(firestore);
      const messagesCollection = collection(firestore, "executiveMessages");

      sampleMessages.forEach(msg => {
        const docRef = doc(messagesCollection); 
        batch.set(docRef, {
          ...msg,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
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
      {isSeeding ? '生成中...' : 'サンプルデータ生成'}
    </Button>
  );
}

// --- Video CRUD (Dummy) ---

function VideoDialog({ video, onSave, children, mode }: { video?: DummyVideo, onSave: (video: DummyVideo) => void, children?: React.ReactNode, mode: 'add' | 'edit' }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');
  const [url, setUrl] = useState(video?.url || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnailUrl || '');

  const initialTags = Array(5).fill('');
  if (video?.tags) {
    for (let i = 0; i < Math.min(video.tags.length, 5); i++) {
      initialTags[i] = video.tags[i];
    }
  }
  const [tags, setTags] = useState<string[]>(initialTags);

  useEffect(() => {
    if (open) {
      setTitle(video?.title || '');
      setDescription(video?.description || '');
      setUrl(video?.url || '');
      setThumbnailUrl(video?.thumbnailUrl || '');
      const newInitialTags = Array(5).fill('');
      if (video?.tags) {
        for (let i = 0; i < Math.min(video.tags.length, 5); i++) {
          newInitialTags[i] = video.tags[i];
        }
      }
      setTags(newInitialTags);
    }
  }, [video, open]);

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const savedVideo: DummyVideo = {
      id: video?.id || `v${Date.now()}`,
      title,
      description,
      url,
      thumbnailUrl,
      tags: tags.map(tag => tag.trim()).filter(tag => tag),
      uploadedAt: video?.uploadedAt || new Date().toISOString().split('T')[0].replace(/-/g, '/'),
    };
    onSave(savedVideo);
    toast({ title: "成功", description: `ビデオを${mode === 'add' ? '追加' : '更新'}しました。` });
    setOpen(false);
  };

  const dialogTitle = mode === 'add' ? '新規ビデオ追加' : 'ビデオを編集';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
       <DialogTrigger asChild>
        {children || <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />新規ビデオ追加</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="video-title">タイトル (30文字以内)</Label>
              <Input id="video-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={30} />
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
                    />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-desc">説明 (500文字以内)</Label>
              <Textarea id="video-desc" value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={500} rows={5} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-url">動画URL</Label>
              <Input id="video-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/video.mp4" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-thumb">サムネイルURL</Label>
              <Input id="video-thumb" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://example.com/thumbnail.jpg" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">{mode === 'add' ? 'ビデオを追加' : 'ビデオを更新'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function ContentsPage() {
  const [dummyVideos, setDummyVideos] = useState<DummyVideo[]>(initialDummyVideos);
  const { toast } = useToast();

  const handleAddVideo = (newVideo: DummyVideo) => {
    setDummyVideos(prev => [newVideo, ...prev]);
  };

  const handleUpdateVideo = (updatedVideo: DummyVideo) => {
    setDummyVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
  };
  
  const handleDeleteVideo = (videoId: string) => {
    setDummyVideos(prev => prev.filter(v => v.id !== videoId));
    toast({ title: '成功', description: 'ダミービデオを削除しました。' });
  };

  return (
    <div className="w-full">
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">コンテンツ管理</h1>
      </div>
      <Tabs defaultValue="messages">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="videos"><Video className="mr-2 h-4 w-4" />ビデオ管理</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="mr-2 h-4 w-4" />メッセージ管理</TabsTrigger>
        </TabsList>

        {/* ビデオ管理タブ */}
        <TabsContent value="videos">
          <Card>
            <CardHeader>
              <CardTitle>ビデオ一覧</CardTitle>
              <CardDescription>
                全社に共有するビデオコンテンツを管理します。（現在ダミー表示）
              </CardDescription>
              <div className="flex justify-end">
                <VideoDialog mode="add" onSave={handleAddVideo} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">サムネイル</TableHead>
                    <TableHead>タイトル</TableHead>
                    <TableHead className="hidden sm:table-cell">タグ</TableHead>
                    <TableHead className="hidden md:table-cell">アップロード日</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dummyVideos.map((video) => (
                    <TableRow key={video.id}>
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
                      <TableCell className="hidden md:table-cell">{video.uploadedAt}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <VideoDialog mode="edit" video={video} onSave={handleUpdateVideo}>
                              <DropdownMenuItem onSelect={e => e.preventDefault()}>編集</DropdownMenuItem>
                            </VideoDialog>
                            <DropdownMenuItem onClick={() => handleDeleteVideo(video.id)} className="text-destructive">削除</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* メッセージ管理タブ */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>メッセージ一覧</CardTitle>
              <CardDescription>経営層からのメッセージを管理します。</CardDescription>
               <div className="flex justify-end items-center gap-2">
                <SeedDataButton />
                <AddMessageDialog />
              </div>
            </CardHeader>
            <CardContent>
              <MessagesTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    