'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Palette, Save } from 'lucide-react';
import { usePermissions } from '@/context/PermissionContext';
import { useBranding } from '@/context/BrandingProvider';
import { IconPicker } from '@/components/philosophy/icon-picker';
import { DynamicIcon } from '@/components/philosophy/dynamic-icon';

export default function AppearancePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userPermissions, isCheckingPermissions } = usePermissions();
  const { settings: currentSettings, isLoading: isLoadingBranding } = useBranding();

  const [appName, setAppName] = useState('');
  const [logoIcon, setLogoIcon] = useState('Building2');
  const [primaryColor, setPrimaryColor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setAppName(currentSettings.appName);
      setLogoIcon(currentSettings.logoIcon);
      setPrimaryColor(currentSettings.primaryColor);
    }
  }, [currentSettings]);

  const handleSave = async () => {
    if (!firestore || !user) return;
    setIsSaving(true);
    
    // Basic HSL validation
    const hslRegex = /^\d{1,3}(\.\d+)?\s\d{1,3}(\.\d+)?%\s\d{1,3}(\.\d+)?%$/;
    if (!hslRegex.test(primaryColor)) {
      toast({
        title: '色の形式エラー',
        description: "色の値は 'H S% L%' の形式で入力してください。例: '142.1 76.2% 36.3%'",
        variant: 'destructive',
      });
      setIsSaving(false);
      return;
    }

    const settingsRef = doc(firestore, 'settings', 'branding');
    try {
      await setDoc(settingsRef, {
        appName,
        logoIcon,
        primaryColor,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      }, { merge: true });
      toast({ title: '成功', description: '外観設定を保存しました。' });
    } catch (error) {
      console.error("Error saving appearance settings:", error);
      toast({ title: 'エラー', description: '設定の保存に失敗しました。', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const canManageAppearance = userPermissions.includes('appearance_management');

  if (isCheckingPermissions || isLoadingBranding) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageAppearance) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <h1 className="text-lg font-semibold md:text-2xl mb-4">外観設定</h1>
        <p>このページを管理する権限がありません。</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">外観設定</h1>
          <p className="text-sm text-muted-foreground">アプリケーションのロゴ、名前、テーマカラーをカスタマイズします。</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          保存
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ブランディング</CardTitle>
          <CardDescription>アプリ全体のロゴと名前を設定します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app-name">アプリケーション名</Label>
            <Input id="app-name" value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ロゴアイコン</Label>
            <IconPicker currentIcon={logoIcon} onIconChange={setLogoIcon} />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>テーマカラー</CardTitle>
          <CardDescription>アプリのプライマリーカラーを設定します。変更はリアルタイムでプレビューされます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary-color">プライマリーカラー (HSL形式)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="primary-color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="例: 142.1 76.2% 36.3%"
              />
              <div
                className="h-10 w-10 rounded-md border"
                style={{ backgroundColor: `hsl(${primaryColor})` }}
              />
            </div>
             <p className="text-xs text-muted-foreground">
               HSLの値をスペース区切りで入力してください (例: <code>224 71.4% 4.1%</code>)。
             </p>
          </div>
          <div className="flex items-center justify-center gap-4 rounded-lg border p-6 bg-muted/50">
            <Button style={{ backgroundColor: `hsl(${primaryColor})` }}>プライマリーボタン</Button>
            <div className="flex items-center gap-2">
                <DynamicIcon name={logoIcon} className="h-6 w-6" style={{ color: `hsl(${primaryColor})` }} />
                <span className="font-semibold" style={{ color: `hsl(${primaryColor})` }}>{appName}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
