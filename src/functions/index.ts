
import {initializeApp} from 'firebase-admin/app';

initializeApp();

// server.ts と同じディレクトリに配置されるため、エントリポイントとしてインポートする
export * from './server';

// 今後、他のFunctionsを追加する場合はここにインポートを追加していく
export * from './batchImportUsers';
