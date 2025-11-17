import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyBk-ZrM3Mb2HYOm7uOHQeyZDG0qzol29RQ",
  authDomain: "juniorcleaningapp.firebaseapp.com",
  projectId: "juniorcleaningapp",
  storageBucket: "juniorcleaningapp.firebasestorage.app",
  messagingSenderId: "568333173218",
  appId: "1:568333173218:web:af557b51845c3e7119f9bb",
  measurementId: "G-9BZ73Q2JB1"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export const storage = getStorage(app)
