
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Papa from 'papaparse';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import type { NewUserPayload, UserImportResult, BatchImportUsersResponse } from '@/types/functions';

// CSVで必須のヘッダーを定義
const REQUIRED_HEADERS: (keyof NewUserPayload)[] = ['email', 'password', 'displayName', 'role'];
// オプションのヘッダーを定義
const OPTIONAL_HEADERS: (keyof NewUserPayload)[] = ['employeeId', 'organizationId'];
const ALL_VALID_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
const VALID_ROLES = ['admin', 'executive', 'manager', 'employee'];

export function ImportMembersDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<NewUserPayload[]>([]);

  const resetState = () => {
    setFile(null);
    setFileError(null);
    setParsedData([]);
    setIsLoading(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== 'text/csv') {
      setFileError('CSVファイルを選択してください。');
      return;
    }

    setFile(selectedFile);

    Papa.parse<NewUserPayload>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const csvHeaders = results.meta.fields || [];
        const missingHeaders = REQUIRED_HEADERS.filter(header => !csvHeaders.includes(header));

        if (missingHeaders.length > 0) {
          setFileError(`必須の列が見つかりません: ${missingHeaders.join(', ')}`);
          setParsedData([]);
          return;
        }

        // 余分な空行などを除外
        const validData = results.data.filter(row => row.email && row.displayName);
        setParsedData(validData);
        setFileError(null);
      },
      error: (error) => {
        setFileError(`CSVの解析に失敗しました: ${error.message}`);
        setParsedData([]);
      }
    });
  };

  const handleImport = async () => {
    if (!parsedData.length || fileError) {
      toast({
        title: 'インポートエラー',
        description: 'インポートする有効なデータがありません。',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    // バックエンドに送る前に、定義されたヘッダーのキーを持つデータのみに整形する
    const sanitizedUsers = parsedData.map(row => {
      const sanitizedRow: Partial<NewUserPayload> = {};
      for (const key of ALL_VALID_HEADERS) {
        // rowにキーが存在する場合のみ、新しいオブジェクトにコピーする
        if (row[key as keyof NewUserPayload] !== undefined && row[key as keyof NewUserPayload] !== null) {
          sanitizedRow[key as keyof NewUserPayload] = row[key as keyof NewUserPayload];
        }
      }
      return sanitizedRow as NewUserPayload;
    });

    try {
      const response = await fetch('/api/batchImportUsers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: sanitizedUsers }),
      });

      const result: BatchImportUsersResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.results[0]?.error || '不明なサーバーエラーが発生しました。');
      }

      toast({
        title: 'インポート処理完了',
        description: `成功: ${result.successCount}件, 失敗: ${result.errorCount}件。`,
        variant: result.errorCount > 0 ? 'destructive' : 'default',
        duration: 9000,
      });

      if (result.errorCount > 0) {
        console.error('失敗したユーザーリスト:', result.results.filter(r => !r.success));
      }

      setOpen(false);
      resetState();

    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'インポート処理中に不明なエラーが発生しました。';
       toast({
        title: 'インポート失敗',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Import failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <Upload className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">インポート</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>メンバーをCSVで一括登録</DialogTitle>
          <DialogDescription>
            CSVファイルをアップロードして、複数のメンバーを一度に登録します。文字コードはUTF-8を想定しています。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Alert variant="default" className="bg-amber-50 border-amber-200">
             <AlertTriangle className="h-4 w-4 !text-amber-600" />
            <AlertTitle className="text-amber-800">CSVファイルの形式</AlertTitle>
            <AlertDescription className="text-amber-700">
              <p className="mb-2">
                1行目はヘッダー行とし、以下の列名を**英語で正確に**含めてください。
              </p>
              <p className="font-mono text-xs bg-amber-100 p-2 rounded-sm text-amber-900">
                <span className="font-bold">必須:</span> {REQUIRED_HEADERS.join(', ')} <br/>
                <span className="font-bold">任意:</span> {OPTIONAL_HEADERS.join(', ')}
              </p>
               <p className="mt-2">
                `role`には `{VALID_ROLES.join(', ')}` のいずれかを指定してください。`organizationId` は組織管理ページからエクスポートしたIDを使用してください。
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="csv-file">CSVファイル</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
             {fileError && <p className="text-sm text-destructive">{fileError}</p>}
          </div>

          {parsedData.length > 0 && !fileError && (
            <div>
              <h4 className="text-sm font-medium mb-2">インポートプレビュー（最初の5件）</h4>
              <ScrollArea className="h-60 w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {ALL_VALID_HEADERS.map(key => (
                         parsedData[0].hasOwnProperty(key) && <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {ALL_VALID_HEADERS.map(key => (
                           row.hasOwnProperty(key) && (
                            <TableCell key={key} className="text-xs whitespace-nowrap">
                              {key === 'password' && row[key] ? '******' : row[key as keyof NewUserPayload]}
                            </TableCell>
                           )
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-2">{parsedData.length}件の有効なレコードが検出されました。</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || parsedData.length === 0 || !!fileError}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'インポート中...' : `${parsedData.length}件をインポート`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
