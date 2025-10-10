'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';

const dummyPhilosophy = {
  mission: "テクノロジーの力で、組織と人の可能性を最大化する。",
  vision: "世界中のすべての組織が、透明性の高いコミュニケーションを通じて、一体感を持って成長できる社会を創造する。",
  values: "1. オープンであれ\n2. 常に挑戦せよ\n3. 仲間を尊敬し、助け合え"
}

export default function PhilosophyPage() {
  return (
    <div className="w-full">
       <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">理念・ビジョン管理</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>理念・ビジョン</CardTitle>
          <CardDescription>
            会社の理念、ビジョン、バリューを編集します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="mission">ミッション</Label>
              <Input id="mission" defaultValue={dummyPhilosophy.mission} />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="vision">ビジョン</Label>
              <Textarea id="vision" defaultValue={dummyPhilosophy.vision} rows={3}/>
            </div>
             <div className="grid gap-2">
              <Label htmlFor="values">バリュー</Label>
              <Textarea id="values" defaultValue={dummyPhilosophy.values} rows={5}/>
            </div>
            <div className="flex justify-end">
              <Button>
                <Save className="mr-2 h-4 w-4" />
                保存
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
