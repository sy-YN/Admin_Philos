
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Building2, Loader2 } from 'lucide-react';
import { AddMemberDialog } from '@/components/members/add-member-dialog';
import { Separator } from '@/components/ui/separator';
import { doc, getDoc } from 'firebase/firestore';
import type { Member } from '@/types/member';
import type { Role } from '@/types/role';


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  const fetchUserPermissions = useCallback(async (userUid: string): Promise<string[]> => {
    if (!firestore) return [];

    try {
      const userDocRef = doc(firestore, 'users', userUid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error("User document not found.");
        return [];
      }
      
      const userData = userDoc.data() as Member;
      const userRole = userData.role;

      const roleDocRef = doc(firestore, 'roles', userRole);
      const userPermsDocRef = doc(firestore, 'user_permissions', userUid);

      const [roleDoc, userPermsDoc] = await Promise.all([
        getDoc(roleDocRef),
        getDoc(userPermsDocRef),
      ]);
      
      const rolePermissions = roleDoc.exists() ? (roleDoc.data() as Role).permissions : [];
      const individualPermissions = userPermsDoc.exists() ? userPermsDoc.data().permissions : [];
      
      return [...new Set([...rolePermissions, ...individualPermissions])];

    } catch (error) {
      console.error("Error fetching permissions:", error);
      return [];
    }
  }, [firestore]);


  useEffect(() => {
    // This effect handles redirection based on auth state.
    const checkUserAndRedirect = async () => {
      if (isUserLoading) {
        return; // Wait until auth state is confirmed
      }

      if (!user) {
        setIsCheckingRole(false); // No user, stop checking and show login form
        return;
      }
      
      // User is authenticated, redirect to dashboard.
      // Temporarily disabled permission check.
      router.replace('/dashboard');

    };

    checkUserAndRedirect();
  }, [user, isUserLoading, router, auth, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email || !password || !firestore || !auth) {
      toast({
        title: '入力エラー',
        description: 'メールアドレスとパスワードを入力してください。',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // Temporarily disabled permission check.
      // The useEffect will handle the redirection.
      toast({
        title: 'ログイン成功',
        description: 'ダッシュボードへようこそ！',
      });

    } catch (error: any) {
      console.error('Login Error:', error);
      let description = 'ログイン中にエラーが発生しました。';
      if (error.code === 'auth/invalid-credential') {
        description = 'メールアドレスまたはパスワードが正しくありません。';
      }
      toast({
        title: 'ログインエラー',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show a loading spinner while checking auth state or role
  if (isUserLoading || isCheckingRole) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Philos</h1>
          </div>
          <CardTitle className="text-2xl">管理者ログイン</CardTitle>
          <CardDescription>管理用アカウントでログインしてください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@philos.co"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">パスワード</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
            <div className='flex items-center w-full gap-2'>
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">最初のユーザーですか？</span>
                <Separator className="flex-1" />
            </div>
            <div className='w-full'>
                <p className="text-xs text-muted-foreground mb-2">
                    まだ管理者がいない場合は、ここから最初の管理者アカウントを作成してください。
                </p>
                 <AddMemberDialog />
            </div>
        </CardFooter>
      </Card>
    </main>
  );
}
