
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

// --- Color Conversion Utilities ---

function hslToHex(hslString: string): string {
  if (!hslString || !/^\d{1,3}(\.\d+)?\s\d{1,3}(\.\d+)?%\s\d{1,3}(\.\d+)?%$/.test(hslString)) {
    return '#000000';
  }
  const [h, s, l] = hslString.replace(/%/g, '').split(' ').map(Number);
  const sDecimal = s / 100;
  const lDecimal = l / 100;
  
  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lDecimal - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { [r,g,b] = [c,x,0]; }
  else if (h >= 60 && h < 120) { [r,g,b] = [x,c,0]; }
  else if (h >= 120 && h < 180) { [r,g,b] = [0,c,x]; }
  else if (h >= 180 && h < 240) { [r,g,b] = [0,x,c]; }
  else if (h >= 240 && h < 300) { [r,g,b] = [x,0,c]; }
  else if (h >= 300 && h < 360) { [r,g,b] = [c,0,x]; }

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDeg = (h * 360).toFixed(1);
  const sPct = (s * 100).toFixed(1);
  const lPct = (l * 100).toFixed(1);

  return `${hDeg} ${sPct}% ${lPct}%`;
}


export default function AppearancePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userPermissions, isCheckingPermissions } = usePermissions();
  const { settings: currentSettings, isLoading: isLoadingBranding } = useBranding();

  const [appName, setAppName] = useState('');
  const [logoIcon, setLogoIcon] = useState('Building2');
  const [primaryColorHsl, setPrimaryColorHsl] = useState('');
  const [primaryColorHex, setPrimaryColorHex] = useState('#000000');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setAppName(currentSettings.appName);
      setLogoIcon(currentSettings.logoIcon);
      setPrimaryColorHsl(currentSettings.primaryColor);
      try {
        setPrimaryColorHex(hslToHex(currentSettings.primaryColor));
      } catch (e) {
        setPrimaryColorHex('#000000');
      }
    }
  }, [currentSettings]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setPrimaryColorHex(newHex);
    // Live update CSS variable for preview
    try {
        if (/^#[0-9A-F]{6}$/i.test(newHex)) {
            const newHsl = hexToHsl(newHex);
            setPrimaryColorHsl(newHsl);
            document.documentElement.style.setProperty('--primary', newHsl);
        }
    } catch (e) {
        console.error("Failed to convert HEX to HSL", e);
    }
  };


  const handleSave = async () => {
    if (!firestore || !user) return;
    setIsSaving(true);
    
    if (!/^#[0-9A-F]{6}$/i.test(primaryColorHex)) {
      toast({
        title: '色の形式エラー',
        description: "有効なHEXカラーコードを入力してください。 (例: #RRGGBB)",
        variant: 'destructive',
      });
      setIsSaving(false);
      return;
    }

    const finalHsl = hexToHsl(primaryColorHex);

    const settingsRef = doc(firestore, 'settings', 'branding');
    try {
      await setDoc(settingsRef, {
        appName,
        logoIcon,
        primaryColor: finalHsl,
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
            <Label htmlFor="primary-color">プライマリーカラー</Label>
            <div className="flex items-center gap-2">
              <Input
                id="primary-color-picker"
                type="color"
                value={primaryColorHex}
                onChange={handleColorChange}
                className="w-12 h-10 p-1 cursor-pointer"
                aria-label="カラーピッカー"
              />
              <Input
                id="primary-color-hex"
                value={primaryColorHex}
                onChange={handleColorChange}
                className="flex-1 font-mono"
                placeholder="#70C1B3"
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 rounded-lg border p-6 bg-muted/50">
            <Button style={{ backgroundColor: `hsl(${primaryColorHsl})` }}>プライマリーボタン</Button>
            <div className="flex items-center gap-2">
                <DynamicIcon name={logoIcon} className="h-6 w-6" style={{ color: `hsl(${primaryColorHsl})` }} />
                <span className="font-semibold" style={{ color: `hsl(${primaryColorHsl})` }}>{appName}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
