
'use client';
import { useState, useEffect, useCallback } from "react";
import { VideoPlayer } from "@/components/video-player";
import { ExecutiveMessageCard } from "@/components/executive-message-card";
import { Building2, MessageSquare, ChevronDown } from "lucide-react";
import { BoardPostForm } from "../board-post-form";
import { BoardPostCard } from "../board-post-card";
import { BoardPostReplyForm } from "../board-post-reply-form";
import type { Post } from "@/app/actions";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

const executiveMessages = [
  {
    id: 1,
    author: "田中, CEO",
    avatar: "https://picsum.photos/seed/ceo/100/100",
    title: "第4四半期の戦略",
    preview: "次の四半期の主要な施策について説明します...",
    time: "2時間前",
    priority: "high" as const,
    fullContent: "社員の皆様、こんにちは。CEOの田中です。第3四半期も皆様の尽力のおかげで、素晴らしい成果を上げることができました。誠にありがとうございます。\n\nさて、来る第4四半期に向けて、私たちは3つの主要な戦略的柱に焦点を当てます。第一に「顧客中心主義の徹底」、第二に「デジタルトランスフォーメーションの加速」、そして第三に「持続可能な成長への投資」です。各部門でこれらの戦略がどのように実行されるか、具体的な計画については来週の全社ミーティングで詳しく説明します。未来へ向けて、一丸となって挑戦し続けましょう。"
  },
  {
    id: 2,
    author: "佐藤, CTO",
    avatar: "https://picsum.photos/seed/cto/100/100",
    title: "DX推進の進捗",
    preview: "デジタルトランスフォーメーションの現状と今後の計画...",
    time: "1日前",
    priority: "medium" as const,
    fullContent: "CTOの佐藤です。現在進行中のDXプロジェクトについてご報告します。先月、新しい社内コミュニケーションツールを導入し、多くのチームで活用が進んでいます。また、データ分析基盤の構築も順調に進んでおり、年末までには第一弾のダッシュボードをリリースできる見込みです。\n\n今後は、AIを活用した業務効率化ツールの試験導入も計画しています。これらの取り組みを通じて、より創造的で生産性の高い働き方を実現していきたいと考えています。ご意見やフィードバックがあれば、ぜひお聞かせください。"
  },
  {
    id: 3,
    author: "鈴木, CFO",
    avatar: "https://picsum.photos/seed/cfo/100/100",
    title: "上半期の業績と今後の見通し",
    preview: "財務状況のご報告と、下半期に向けた計画について...",
    time: "3日前",
    priority: "medium" as const,
    fullContent: "CFOの鈴木です。2024年度上半期の業績についてご報告いたします。売上高は前年同期比で15%増と、皆様の努力の賜物であり、大変感謝しております。特に新規事業部門の成長が著しく、会社全体の収益を牽引しています。\n\n下半期に向けては、引き続きコスト効率の最適化を図りつつ、成長分野への戦略的投資を継続していきます。安定した財務基盤を維持しながら、さらなる企業価値向上を目指しますので、皆様のご協力をお願いいたします。"
  },
];

const videos = [
  {
    id: 1,
    src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: '第4四半期 全社ミーティング',
    subtitle: 'CEOからのメッセージ',
  },
  {
    id: 2,
    src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    title: 'デザインチームより',
    subtitle: '新プロダクトのコンセプト紹介',
  },
  {
    id: 3,
    src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'エンジニアチームより',
    subtitle: 'ベータ版新機能のデモ',
  },
]

type HomeTabProps = {
  isDarkMode: boolean;
};


export function HomeTab({ isDarkMode }: HomeTabProps) {
  const [showAnimatedContent, setShowAnimatedContent] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
  const [replyingToPostId, setReplyingToPostId] = useState<string | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const isExecutive = true; // TODO: Replace with real authentication logic

  const onSelect = useCallback((api: CarouselApi) => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!carouselApi) {
      return
    }
    onSelect(carouselApi);
    setScrollSnaps(carouselApi.scrollSnapList())
    carouselApi.on('select', onSelect)
    
    return () => {
      carouselApi.off('select', onSelect)
    }
  }, [carouselApi, onSelect])

  const scrollTo = (index: number) => {
    carouselApi?.scrollTo(index)
  }


  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt) {
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt);
          const replies = (data.replies || []).map((reply: any) => ({
            ...reply,
            id: reply.id,
            createdAt: reply.createdAt instanceof Timestamp ? reply.createdAt.toDate() : new Date(reply.createdAt)
          }));

          postsData.push({
            id: doc.id,
            author: data.author,
            avatar: data.avatar,
            content: data.content,
            likes: data.likes,
            likedBy: data.likedBy || [],
            analysis: data.analysis,
            createdAt: createdAt.toISOString(),
            time: createdAt.toISOString(),
            replies,
          });
        }
      });
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching posts:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimatedContent(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePostUpdateSuccess = () => {
    // onSnapshot already handles real-time updates, so no explicit re-fetch needed here.
    console.log("Post updated, onSnapshot will handle UI refresh.");
  };

  const handlePostDeleteSuccess = () => {
    // onSnapshot already handles real-time updates, so no explicit re-fetch needed here.
    console.log("Post deleted, onSnapshot will handle UI refresh.");
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div
        className={`transition-all duration-700 ${showAnimatedContent ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
      >
        <Carousel setApi={setCarouselApi} className="group">
          <CarouselContent>
            {videos.map(video => (
              <CarouselItem key={video.id}>
                <div className="h-[240px] w-full">
                  <VideoPlayer 
                    src={video.src}
                    title={video.title}
                    subtitle={video.subtitle}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {canScrollPrev && (
            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 bg-black/30 text-white border-none rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="m15 18-6-6 6-6"/></svg>
            </CarouselPrevious>
          )}
          {canScrollNext && (
            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 bg-black/30 text-white border-none rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="m9 18 6-6-6-6"/></svg>
            </CarouselNext>
          )}
        </Carousel>
        <div className="flex justify-center gap-2 mt-3">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "h-1 w-6 rounded-full transition-all",
                selectedIndex === index ? "bg-primary" : "bg-gray-500"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <section>
        <BoardPostForm />
      </section>

      <section>
        <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex justify-between items-center cursor-pointer p-2 -mx-2 rounded-md hover:bg-accent/50">
                <h2 className="text-base font-medium flex items-center gap-2 text-foreground">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <span>コメント ({posts.length})</span>
                </h2>
                <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-300">
                    <span>{isCommentsOpen ? "閉じる" : "すべて表示"}</span>
                    <ChevronDown className={cn("h-5 w-5 transition-transform", isCommentsOpen && "rotate-180")} />
                </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent
            className="overflow-y-auto max-h-[25vh] mt-2"
          >
            <div className="space-y-3 pr-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))
              ) : posts.length > 0 ? (
                  posts.map(post => (
                    <div key={post.id}>
                      <BoardPostCard 
                        post={post} 
                        isExecutive={isExecutive}
                        onReplyClick={() => setReplyingToPostId(replyingToPostId === post.id ? null : post.id)}
                        isReplying={replyingToPostId === post.id}
                        onUpdateSuccess={handlePostUpdateSuccess}
                        onDeleteSuccess={handlePostDeleteSuccess}
                      />
                      {replyingToPostId === post.id && (
                        <div className="pl-12 pt-2">
                          <BoardPostReplyForm 
                            postId={post.id}
                            onReplySuccess={() => setReplyingToPostId(null)}
                          />
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>まだコメントがありません。</p>
                  <p className="text-sm">最初のコメントを投稿しましょう！</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>
      
      <section
        className={`flex-1 min-h-0 flex flex-col transition-all duration-700 delay-300 ${showAnimatedContent ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 shrink-0">
          <Building2 className="h-5 w-5 text-primary" />
          経営層からのメッセージ
        </h2>
        <ScrollArea className="w-full whitespace-nowrap" orientation="horizontal">
          <div className="flex w-max space-x-4 pb-4">
            {executiveMessages.map((message) => (
              <Dialog key={message.id}>
                <DialogTrigger asChild>
                  <div className="w-80">
                    <ExecutiveMessageCard message={message} />
                  </div>
                </DialogTrigger>
                <DialogContent className={cn("max-w-md", isDarkMode && 'dark')}>
                  <DialogHeader>
                    <div className="flex items-start gap-4 mb-4">
                      <Image
                        src={message.avatar}
                        alt={message.author}
                        width={48}
                        height={48}
                        className="rounded-full"
                        data-ai-hint="person portrait"
                      />
                      <div>
                        <DialogTitle className="mb-1 dark:text-white">{message.title}</DialogTitle>
                        <DialogDescription asChild>
                           <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
                            <span>{message.author}</span>
                            <Badge variant={message.priority === "high" ? "destructive" : "secondary"}>
                              {message.priority === "high" ? "重要" : "更新"}
                            </Badge>
                            <span>{message.time}</span>
                          </div>
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="text-sm text-muted-foreground dark:text-gray-300 max-h-[60vh] overflow-y-auto whitespace-pre-wrap">
                    {message.fullContent}
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
    </div>
  );
}
