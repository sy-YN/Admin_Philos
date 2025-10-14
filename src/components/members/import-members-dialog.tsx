
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
import { Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import Papa from 'papaparse';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const REQUIRED_COLUMNS = ['email', 'password', 'displayName', 'role'];

export function ImportMembersDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);

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

    // Parse CSV file
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
          setFileError(`必須の列が見つかりません: ${missingColumns.join(', ')}`);
          setParsedData([]);
        } else {
          setParsedData(results.data);
        }
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
    // TODO: Implement the actual import logic by calling a Firebase Function
    console.log('Importing data:', parsedData);

    // Simulate an async operation
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({
      title: 'インポート処理を開始しました',
      description: 'バックグラウンドで処理が実行されます。完了時に通知されます。',
    });

    setIsLoading(false);
    setOpen(false);
    setFile(null);
    setParsedData([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <Upload className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Import
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>メンバーをCSVで一括登録</DialogTitle>
          <DialogDescription>
            CSVファイルをアップロードして、複数のメンバーを一度に登録します。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Alert variant="default" className="bg-amber-50 border-amber-200">
             <ExclamationTriangleIcon className="h-4 w-4 !text-amber-600" />
            <AlertTitle className="text-amber-800">CSVファイルの形式</AlertTitle>
            <AlertDescription className="text-amber-700">
              <p className="mb-2">
                1行目はヘッダー行にしてください。以下の列が**必須**です:
                <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">email</code>,
                <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">password</code>,
                <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">displayName</code>,
                <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">role</code>.
              </p>
              <p>
                オプションで <code className="font-mono bg-amber-100 p-1 rounded-sm text-amber-900 mx-1">department</code> を含めることもできます。
                `role` には `admin`, `executive`, `manager`, `employee` のいずれかを指定してください。
              </p>
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
            <Label htmlFor="csv-file">CSVファイル</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
             {fileError && <p className="text-sm text-destructive">{fileError}</p>}
          </div>

          {parsedData.length > 0 && !fileError && (
            <div>
              <h4 className="text-sm font-medium mb-2">インポートプレビュー（最初の5件）</h4>
              <div className="max-h-60 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(parsedData[0]).map(key => <TableHead key={key}>{key}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((val: any, j: number) => (
                          <TableCell key={j} className="text-xs">{val}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
