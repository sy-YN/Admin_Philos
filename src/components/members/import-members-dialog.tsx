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
import { NewUserPayload } from '@/types/functions';

// The exact headers required in the CSV file. Case-sensitive.
const REQUIRED_HEADERS: (keyof NewUserPayload)[] = ['email', 'password', 'displayName', 'employeeId', 'company', 'role'];
const OPTIONAL_HEADERS: (keyof NewUserPayload)[] = ['department'];
const ALL_VALID_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];


export function ImportMembersDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<NewUserPayload[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      setFileError(null);
      setParsedData([]);
      return;
    }

    if (selectedFile.type !== 'text/csv') {
      setFile(null);
      setFileError('CSVファイルを選択してください。');
      setParsedData([]);
      return;
    }

    setFile(selectedFile);
    setFileError(null);

    Papa.parse<NewUserPayload>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const csvHeaders = results.meta.fields || [];

        // Check if all required headers are present.
        const missingHeaders = REQUIRED_HEADERS.filter(header => !csvHeaders.includes(header));

        if (missingHeaders.length > 0) {
          setFileError(`必須の列が見つかりません: ${missingHeaders.join(', ')}`);
          setParsedData([]);
          return;
        }
        
        // Data is parsed with the correct keys directly from the header.
        // No need for re-mapping if the headers are correct.
        setParsedData(results.data);
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

    // CRITICAL FIX: Sanitize the data before sending it to the backend.
    // Ensure only known properties from NewUserPayload are sent.
    const sanitizedUsers = parsedData.map(row => {
        const sanitizedRow: Partial<NewUserPayload> = {};
        for (const key of ALL_VALID_HEADERS) {
            if (row[key] !== undefined) {
                sanitizedRow[key] = row[key];
            }
        }
        return sanitizedRow as NewUserPayload;
    });
    
    try {
      const response = await fetch('/api/batchImportUsers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: sanitizedUsers }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result?.error || response.statusText || '不明なサーバーエラーが発生しました。';
        throw new Error(`サーバーエラー: ${errorMessage}`);
      }

      toast({
        title: 'インポート処理完了',
        description: `成功: ${result.successCount}件, 失敗: ${result.errorCount}件。詳細はデベロッパーコンソールを確認してください。`,
        variant: result.errorCount > 0 ? 'destructive' : 'default',
        duration: 9000,
      });

      console.log('インポート結果:', result);
      if(result.errorCount > 0) {
        console.error('失敗したユーザーリスト:', result.results.filter((r:any) => !r.success));
      }

      setOpen(false);
      setFile(null);
      setParsedData([]);

    } catch (error) {
       let errorMessage = 'インポート処理中に不明なエラーが発生しました。';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
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
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            インポート
          </span>
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
                1行目はヘッダー行とし、以下の列名を**英語で正確に**含めてください:
                <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">email</code>,
                <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">password</code>,
                <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">displayName</code>,
                <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">employeeId</code>,
                <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">company</code>,
                <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">role</code>.
              </p>
              <p className="mb-2">
                `role`には `admin`, `executive`, `manager`, `employee` のいずれかを指定してください。
              </p>
              <p>
                オプションで <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">department</code> を含めることもできます。
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
                      {Object.keys(parsedData[0]).map(key => <TableHead key={key}>{key}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {Object.entries(row).map(([key, value]) => (
                          <TableCell key={key} className="text-xs whitespace-nowrap">{key === 'password' && value ? '******' : value}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-2">{parsedData.length}件のレコードが検出されました。</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || parsedData.length === 0 || !!fileError}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'インポート中...' : `${parsedData.length}件をインポート`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
