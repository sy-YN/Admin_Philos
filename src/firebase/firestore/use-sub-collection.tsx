
'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  orderBy
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { getPathFromQuery } from './get-path-from-query';

export type WithId<T> = T & { id: string };

export interface UseSubCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/**
 * React hook to subscribe to a Firestore sub-collection in real-time.
 * It is built on top of `useCollection` but simplifies path construction.
 *
 * @template T Optional type for document data.
 * @param parentCollectionName The name of the parent collection (e.g., 'videos').
 * @param parentDocId The ID of the document containing the sub-collection.
 * @param subCollectionName The name of the sub-collection (e.g., 'comments').
 * @returns {UseSubCollectionResult<T>} Object with data, isLoading, error.
 */
export function useSubCollection<T = any>(
  parentCollectionName: string,
  parentDocId: string | undefined | null,
  subCollectionName: string,
): UseSubCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const firestore = useFirestore();
  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const subCollectionQuery = useMemoFirebase(() => {
    if (!firestore || !parentDocId) return null;
    const path = `${parentCollectionName}/${parentDocId}/${subCollectionName}`;
    // By default, order by 'createdAt' if it exists. For 'likes' it might fail, so we handle it.
    // A more robust solution might pass the orderBy field as an argument.
    if (subCollectionName === 'comments') {
        return query(collection(firestore, path), orderBy('createdAt', 'desc'));
    }
    return query(collection(firestore, path));
  }, [firestore, parentCollectionName, parentDocId, subCollectionName]);

  useEffect(() => {
    if (subCollectionQuery && !subCollectionQuery.__memo) {
      throw new Error('subCollectionQuery must be memoized with useMemoFirebase');
    }

    if (!subCollectionQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      subCollectionQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        const path = getPathFromQuery(subCollectionQuery);
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [subCollectionQuery]);

  return { data, isLoading, error };
}
