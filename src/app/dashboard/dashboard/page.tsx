'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Target, DollarSign } from 'lucide-react';

export default function DashboardSettingsPage() {
  return (
    <div className="w-full">
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">ダッシュボード設定</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {/* 目標設定カード */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Target className="mr-2" />目標設定</CardTitle>
            <CardDescription>チームまたは個人の目標を設定します。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-period">対象期間</Label>
                <Select>
                  <SelectTrigger id="goal-period">
                    <SelectValue placeholder="期間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="q3_2024">2024年 第3四半期</SelectItem>
                    <SelectItem value="q4_2024">2024年 第4四半期</SelectItem>
                    <SelectItem value="fy_2024">2024年度通期</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-target">対象</Label>
                 <Select>
                  <SelectTrigger id="goal-target">
                    <SelectValue placeholder="対象を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全社</SelectItem>
                    <SelectItem value="sales">営業部</SelectItem>
                    <SelectItem value="dev">開発部</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-value">目標エンゲージメントスコア (%)</Label>
                <Input id="goal-value" type="number" placeholder="85" />
              </div>
              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  目標を保存
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 売上設定カード */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><DollarSign className="mr-2" />売上設定</CardTitle>
            <CardDescription>部門ごとの売上目標や実績を登録します。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="sales-period">対象期間</Label>
                <Select>
                  <SelectTrigger id="sales-period">
                    <SelectValue placeholder="期間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jul_2024">2024年 7月</SelectItem>
                    <SelectItem value="aug_2024">2024年 8月</SelectItem>
                    <SelectItem value="sep_2024">2024年 9月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-department">部門</Label>
                <Select>
                  <SelectTrigger id="sales-department">
                    <SelectValue placeholder="部門を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales-1">営業1課</SelectItem>
                    <SelectItem value="sales-2">営業2課</SelectItem>
                    <SelectItem value="biz-dev">事業開発部</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="space-y-2">
                <Label htmlFor="sales-goal">売上目標 (円)</Label>
                <Input id="sales-goal" type="number" placeholder="50000000" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="sales-actual">売上実績 (円)</Label>
                <Input id="sales-actual" type="number" placeholder="55000000" />
              </div>
              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  売上を保存
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
