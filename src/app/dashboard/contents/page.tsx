
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
import { MoreHorizontal, PlusCircle, Video, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

// ダミーデータ
const dummyVideos = [
  { id: 'v1', title: '2024年上期 全社会議', description: 'CEOからのメッセージと今期の戦略について。', thumbnailUrl: 'https://picsum.photos/seed/corpvideo/120/90', uploadedAt: '2024/07/01' },
  { id: 'v2', title: '新製品発表会', description: '新製品「Philos MAX」の紹介動画です。', thumbnailUrl: 'https://picsum.photos/seed/productlaunch/120/90', uploadedAt: '2024/06/15' },
];

const dummyMessages = [
  { id: 'm1', title: '従業員エンゲージメント向上に向けて', author: '山田 太郎 (CEO)', createdAt: '2024/07/20', priority: 'high' },
  { id: 'm2', title: '夏の長期休暇について', author: '佐藤 管理者', createdAt: '2024/07/18', priority: 'normal' },
];

export default function ContentsPage() {
  return (
    <div className="w-full">
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">コンテンツ管理</h1>
      </div>
      <Tabs defaultValue="videos">
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
                全社に共有するビデオコンテンツを管理します。
              </CardDescription>
              <div className="flex justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />新規ビデオ追加</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新規ビデオ追加</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="video-title">タイトル</Label>
                        <Input id="video-title" placeholder="2024年下期 方針説明会" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="video-desc">説明</Label>
                        <Textarea id="video-desc" placeholder="CEOからのメッセージと今期の目標について。" />
                      </div>
                       <div className="grid gap-2">
                        <Label htmlFor="video-url">動画URL</Label>
                        <Input id="video-url" placeholder="https://example.com/video.mp4" />
                      </div>
                       <div className="grid gap-2">
                        <Label htmlFor="video-thumb">サムネイルURL</Label>
                        <Input id="video-thumb" placeholder="https://example.com/thumbnail.jpg" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">ビデオを追加</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">サムネイル</TableHead>
                    <TableHead>タイトル</TableHead>
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
                      <TableCell className="hidden md:table-cell">{video.uploadedAt}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>編集</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">削除</DropdownMenuItem>
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
               <div className="flex justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />新規メッセージ追加</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>新規メッセージ追加</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="msg-title">タイトル</Label>
                        <Input id="msg-title" placeholder="来期の事業戦略について" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="msg-priority">重要度</Label>
                        <Select>
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
                        <Label htmlFor="msg-content">内容</Label>
                        <Textarea id="msg-content" placeholder="来期は..." rows={10} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">メッセージを追加</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead className="w-[120px]">重要度</TableHead>
                    <TableHead className="w-[200px]">作成者</TableHead>
                    <TableHead className="w-[150px] hidden md:table-cell">作成日</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dummyMessages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="font-medium">{msg.title}</TableCell>
                      <TableCell>
                        <Badge variant={msg.priority === 'high' ? 'destructive' : 'secondary'}>
                          {msg.priority === 'high' ? '高' : '通常'}
                        </Badge>
                      </TableCell>
                      <TableCell>{msg.author}</TableCell>
                      <TableCell className="hidden md:table-cell">{msg.createdAt}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>編集</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">削除</DropdownMenuItem>
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
      </Tabs>
    </div>
  );
}
