
import { CollectionReference, DocumentData, Query } from "firebase/firestore";

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * Extracts the path string from a Firestore query or collection reference.
 * This is a workaround for the lack of a public `path` property on Query objects.
 * @param refOrQuery The CollectionReference or Query object.
 * @returns The path string.
 */
export function getPathFromQuery(refOrQuery: CollectionReference | Query): string {
    if (refOrQuery.type === 'collection') {
        return (refOrQuery as CollectionReference).path;
    }
    // The path is stored on a private property of the query object.
    // This is not ideal but it is the only way to get the path for error reporting.
    return (refOrQuery as unknown as InternalQuery)._query.path.canonicalString();
}
