import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
// import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY as string,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.REACT_APP_FIREBASE_APP_ID as string,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// App Check (Recaptcha v3) disabled for faster Firebase initialization
