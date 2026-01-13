
'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getPathFromQuery } from './get-path-from-query';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    const queryPath = memoizedTargetRefOrQuery ? getPathFromQuery(memoizedTargetRefOrQuery) : 'null';
    console.log(`[useCollection] useEffect triggered for path: ${queryPath}`, { hasQuery: !!memoizedTargetRefOrQuery });
    
    if (memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
      throw new Error('useCollection query must be memoized with useMemoFirebase');
    }

    if (!memoizedTargetRefOrQuery) {
      console.log(`[useCollection] No query provided for path: ${queryPath}. Resetting state.`);
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    console.log(`[useCollection] Query provided. Setting up listener for path: ${queryPath}`);
    setIsLoading(true);
    setError(null);

    // Directly use memoizedTargetRefOrQuery as it's assumed to be the final query
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        console.log(`[useCollection] onSnapshot: SUCCESS for path: ${queryPath}. Received ${snapshot.size} documents.`);
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error(`[useCollection] onSnapshot: ERROR for path: ${queryPath}`, error);
        // This logic extracts the path from either a ref or a query
        const path = getPathFromQuery(memoizedTargetRefOrQuery);

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        // trigger global error propagation
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => {
      console.log(`[useCollection] Unsubscribing from path: ${queryPath}`);
      unsubscribe();
    }
  }, [memoizedTargetRefOrQuery]); // Re-run if the target query/reference changes.
  
  return { data, isLoading, error };
}
