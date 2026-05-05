import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getDb, isFirebaseConfigured } from './firebase'

/** Persist a completed review for dashboards (optional; requires Firestore rules). */
export async function saveReviewRecord(uid: string, payload: { language: string; score: number; issueCount: number }) {
  if (!isFirebaseConfigured()) return
  try {
    const db = getDb()
    await addDoc(collection(db, 'reviews'), {
      uid,
      language: payload.language,
      score: payload.score,
      issueCount: payload.issueCount,
      createdAt: serverTimestamp(),
    })
  } catch {
    /* Rules / offline — non-fatal */
  }
}
