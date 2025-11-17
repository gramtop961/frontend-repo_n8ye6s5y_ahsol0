import React, { useEffect, useMemo, useState } from 'react'
import { auth, db, storage, googleProvider } from './lib/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInWithPopup, updateProfile } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, CalendarCheck2, Newspaper, LogOut, Settings, Image as ImageIcon, Moon, Sun, ChevronRight } from 'lucide-react'

const t = {
  hjem: 'Hjem',
  booking: 'Booking',
  nyheder: 'Nyheder',
  hej: 'Hej',
  book: 'Book rengøring',
  sendBooking: 'Send booking',
  takBooking: 'Tak! Din booking er sendt.',
  name: 'Navn',
  address: 'Adresse',
  phone: 'Telefon',
  date: 'Foretrukken dato',
  hoursQuestion: 'Hvor mange timer ønsker du rengøring? ',
  timer: 'timer',
  settings: 'Indstillinger',
  language: 'Sprog',
  darkMode: 'Mørk tilstand',
  light: 'Lys',
  dark: 'Mørk',
  logout: 'Log ud',
  login: 'Log ind',
  email: 'Email',
  password: 'Adgangskode',
  or: 'eller',
  google: 'Fortsæt med Google',
  upload: 'Upload billede',
  save: 'Gem',
  latestBooking: 'Seneste booking',
  upcoming: 'Kommende aftaler',
}

function useUserProfile(user) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function run() {
      setError('')
      if (!user) { setProfile(null); setLoading(false); return }
      try {
        const refDoc = doc(db, 'users', user.uid)
        const snap = await getDoc(refDoc)
        if (cancelled) return
        if (snap.exists()) {
          setProfile(snap.data())
        } else {
          const base = { name: user.displayName || '', address: '', phone: '', language: 'Dansk', photoURL: user.photoURL || '', darkMode: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
          try {
            await setDoc(refDoc, base)
            if (cancelled) return
            setProfile(base)
          } catch (e) {
            // If we cannot write (rules), still let the app continue with a local profile
            setError('Kunne ikke gemme profiloplysninger (tilladelser).')
            setProfile({ ...base, createdAt: null, updatedAt: null })
          }
        }
      } catch (e) {
        // If we cannot read (rules), continue with a minimal local profile
        setError('Kunne ikke hente profil (tilladelser).')
        setProfile({ name: user.displayName || '', address: '', phone: '', language: 'Dansk', photoURL: user.photoURL || '', darkMode: false })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [user])

  async function save(updates) {
    if (!user) return
    const refDoc = doc(db, 'users', user.uid)
    const next = { ...profile, ...updates, updatedAt: serverTimestamp() }
    try {
      await setDoc(refDoc, next, { merge: true })
      setProfile((p) => ({ ...p, ...updates }))
    } catch (e) {
      // keep local state even if remote write fails
      setProfile((p) => ({ ...p, ...updates }))
    }
  }

  return { profile, loading, save, error }
}

function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setInitializing(false)
    })
    return () => unsub()
  }, [])

  if (initializing) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <div className="animate-pulse text-neutral-300">Indlæser…</div>
    </div>
  )

  if (!user) return <AuthScreen />

  return <AppShell user={user}>{children}</AppShell>
}

function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)

  async function handleEmailAuth(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: email.split('@')[0] })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-2xl font-semibold">Junior Cleaning</div>
          <div className="text-neutral-400 mt-1">{mode === 'login' ? 'Log ind' : 'Opret konto'}</div>
        </div>
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" type="email" className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/50" />
          <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Adgangskode" type="password" className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/50" />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button disabled={busy} className="w-full py-3 rounded-2xl bg-white text-black font-medium active:scale-[.99] transition">{mode==='login'?'Log ind':'Opret konto'}</button>
        </form>
        <div className="flex items-center gap-2 my-4 text-neutral-400">
          <div className="h-px flex-1 bg-white/10" />
          <span>eller</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <button onClick={handleGoogle} className="w-full py-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 transition flex items-center justify-center gap-2">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" />
          <span>Fortsæt med Google</span>
        </button>
        <div className="text-center text-sm text-neutral-400 mt-4">
          <button onClick={()=>setMode(mode==='login'?'signup':'login')} className="underline underline-offset-4">
            {mode==='login'?'Har du ikke en konto? Opret':'Har du allerede en konto? Log ind'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function AppShell({ user }) {
  const { profile, loading, save, error } = useUserProfile(user)
  const [tab, setTab] = useState('home')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isDark = profile?.darkMode ?? true
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDark])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white">Indlæser…</div>
  )

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors">
      <TopBar onProfile={()=>setSettingsOpen(true)} photoURL={profile?.photoURL} />
      {error && (
        <div className="max-w-md mx-auto mt-3 px-4">
          <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">{error}</div>
        </div>
      )}
      <main className="pb-24">
        <AnimatePresence mode="wait">
          {tab==='home' && <motion.div key="home" initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}} transition={{duration:.35, ease:'easeOut'}}>
            <HomePage profile={profile} onBook={()=>setTab('booking')} />
          </motion.div>}
          {tab==='booking' && <motion.div key="booking" initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}} transition={{duration:.35, ease:'easeOut'}}>
            <BookingPage user={user} profile={profile} save={save} />
          </motion.div>}
          {tab==='news' && <motion.div key="news" initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}} transition={{duration:.35, ease:'easeOut'}}>
            <NewsPage />
          </motion.div>}
        </AnimatePresence>
      </main>
      <BottomNav tab={tab} setTab={setTab} />
      <SettingsModal open={settingsOpen} onClose={()=>setSettingsOpen(false)} profile={profile} save={save} user={user} />
    </div>
  )
}

function TopBar({ onProfile, photoURL }) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur-2xl bg-white/70 dark:bg-black/30 border-b border-black/5 dark:border-white/10">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">Junior Cleaning</div>
        <button onClick={onProfile} className="w-9 h-9 rounded-full bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
          {photoURL ? <img src={photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-neutral-400"><Settings size={18} /></div>}
        </button>
      </div>
    </div>
  )
}

function BottomNav({ tab, setTab }) {
  const items = [
    { key: 'home', label: t.hjem, icon: Home },
    { key: 'booking', label: t.booking, icon: CalendarCheck2 },
    { key: 'news', label: t.nyheder, icon: Newspaper },
  ]
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-md mx-auto m-3 p-2 rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-black/30 border border-black/5 dark:border-white/10 shadow-2xl">
        <div className="grid grid-cols-3 gap-1">
          {items.map(Item => (
            <button key={Item.key} onClick={()=>setTab(Item.key)} className={`flex flex-col items-center gap-1 py-2 rounded-2xl transition ${tab===Item.key? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <Item.icon size={20} />
              <span className="text-xs">{Item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function HomePage({ profile, onBook }) {
  return (
    <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
      <motion.h1 initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} transition={{delay:.05}} className="text-2xl font-semibold">Hej, {profile?.name || 'ven'} 👋</motion.h1>

      <motion.button initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} transition={{delay:.1}} onClick={onBook} className="w-full py-4 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black font-medium flex items-center justify-between px-4 active:scale-[.99]">
        <span>Book rengøring</span>
        <ChevronRight />
      </motion.button>

      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} transition={{delay:.15}} className="rounded-2xl p-4 backdrop-blur-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Seneste booking</div>
        <div className="mt-2">Ingen bookinger endnu</div>
      </motion.div>

      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} transition={{delay:.2}} className="rounded-2xl p-4 backdrop-blur-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Kommende aftaler</div>
        <div className="mt-2">Ingen planlagt</div>
      </motion.div>
    </div>
  )
}

function BookingPage({ user, profile, save }) {
  const [setupDone, setSetupDone] = useState(() => Boolean(profile?.name && profile?.address && profile?.phone))
  const [name, setName] = useState(profile?.name || '')
  const [address, setAddress] = useState(profile?.address || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [date, setDate] = useState('')
  const [hours, setHours] = useState(2)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(()=>{
    setSetupDone(Boolean(profile?.name && profile?.address && profile?.phone))
    setName(profile?.name || '')
    setAddress(profile?.address || '')
    setPhone(profile?.phone || '')
  }, [profile])

  async function handleSetup(e) {
    e.preventDefault()
    await save({ name, address, phone })
    setSetupDone(true)
  }

  async function sendBooking() {
    setSending(true)
    try {
      const body = {
        name: profile?.name,
        address: profile?.address,
        phone: profile?.phone,
        hours: String(hours),
        date,
        userId: user.uid,
      }
      await fetch('https://hook.eu2.make.com/wlrvmxwpe8f9junjaqw6622pmtn3t7vi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      setDone(true)
    } finally {
      setSending(false)
    }
  }

  if (!setupDone) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="rounded-2xl p-4 backdrop-blur-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10">
          <div className="font-medium mb-3">Lad os starte</div>
          <form onSubmit={handleSetup} className="space-y-3">
            <Input value={name} onChange={setName} placeholder="Navn" />
            <Input value={address} onChange={setAddress} placeholder="Adresse" />
            <Input value={phone} onChange={setPhone} placeholder="Telefon" />
            <Input value={date} onChange={setDate} type="date" placeholder="Dato" />
            <button className="w-full py-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black">Gem</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
      <div className="rounded-2xl p-4 backdrop-blur-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10">
        <div className="mb-4">Hvor mange timer ønsker du rengøring?</div>
        <input type="range" min="1" max="8" value={hours} onChange={(e)=>setHours(Number(e.target.value))} className="w-full" />
        <div className="text-center mt-2"><span className="text-2xl font-semibold">{hours}</span> timer</div>
        <button disabled={!date || sending} onClick={sendBooking} className="mt-4 w-full py-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black disabled:opacity-60">Send booking</button>
      </div>
      <Input value={date} onChange={setDate} type="date" placeholder="Dato" />

      <AnimatePresence>
        {done && (
          <motion.div initial={{opacity:0, scale:.98}} animate={{opacity:1, scale:1}} exit={{opacity:0}} className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            Tak! Din booking er sendt.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NewsPage() {
  const [items, setItems] = useState([])
  useEffect(()=>{
    async function run(){
      try{
        const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'))
        const snap = await getDocs(q)
        setItems(snap.docs.map(d=>({ id:d.id, ...d.data() })))
      }catch(e){
        // ignore
      }
    }
    run()
  }, [])

  return (
    <div className="max-w-md mx-auto px-4 pt-6 space-y-3">
      {items.map((n, i)=> (
        <motion.div key={n.id} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{delay:i*0.05}} className="overflow-hidden rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10">
          {n.image && <img src={n.image} className="w-full h-40 object-cover"/ >}
          <div className="p-4">
            <div className="font-medium">{n.title}</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{n.description}</div>
            {n.createdAt?.seconds && (
              <div className="text-xs text-neutral-500 mt-2">{new Date(n.createdAt.seconds*1000).toLocaleDateString('da-DK')}</div>
            )}
          </div>
        </motion.div>
      ))}
      {items.length===0 && (
        <div className="text-neutral-500 text-center">Ingen nyheder endnu</div>
      )}
    </div>
  )
}

function SettingsModal({ open, onClose, profile, save, user }) {
  const [uploading, setUploading] = useState(false)
  const [local, setLocal] = useState(profile)
  useEffect(()=>setLocal(profile), [profile])

  async function handleUpload(e){
    const file = e.target.files?.[0]
    if(!file) return
    setUploading(true)
    try {
      const key = `avatars/${user.uid}`
      const r = ref(storage, key)
      await uploadBytes(r, file)
      const url = await getDownloadURL(r)
      await save({ photoURL: url })
    } finally {
      setUploading(false)
    }
  }

  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y:0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type:'spring', stiffness: 300, damping: 30 }} className="relative w-full sm:w-[480px] max-w-[480px] mx-auto bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-t-3xl sm:rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div className="font-medium">Indstillinger</div>
          <button onClick={onClose} className="text-sm text-neutral-500">Luk</button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
              {profile?.photoURL ? <img src={profile.photoURL} className="w-full h-full object-cover"/> : <ImageIcon size={20} className="text-neutral-400" />}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <span>{uploading? 'Uploader…' : 'Skift billede'}</span>
              </label>
            </div>
          </div>

          <Field label="Navn">
            <Input value={local?.name||''} onChange={(v)=>setLocal(p=>({...p, name:v}))} placeholder="Navn"/>
          </Field>
          <Field label="Adresse">
            <Input value={local?.address||''} onChange={(v)=>setLocal(p=>({...p, address:v}))} placeholder="Adresse"/>
          </Field>
          <Field label="Telefon">
            <Input value={local?.phone||''} onChange={(v)=>setLocal(p=>({...p, phone:v}))} placeholder="Telefon"/>
          </Field>
          <Field label="Sprog">
            <div className="px-4 py-3 rounded-xl bg-white/10 border border-white/10">Dansk</div>
          </Field>
          <Field label="Tema">
            <div className="flex items-center gap-2">
              <Toggle checked={local?.darkMode??false} onChange={(v)=>setLocal(p=>({...p, darkMode:v}))} />
              <span>{(local?.darkMode??false)? 'Mørk' : 'Lys'}</span>
            </div>
          </Field>

          <div className="flex gap-3">
            <button onClick={async()=>{ await save(local); onClose() }} className="flex-1 py-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black">Gem</button>
            <button onClick={()=>signOut(auth)} className="px-4 py-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">Log ud</button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function Field({ label, children }){
  return (
    <div className="space-y-1">
      <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type='text' }){
  return (
    <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-white/50" />
  )
}

function Toggle({ checked, onChange }){
  return (
    <button onClick={()=>onChange(!checked)} className={`w-12 h-7 rounded-full relative transition ${checked? 'bg-neutral-900 dark:bg-white' : 'bg-white/20 border border-white/20'}`}>
      <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white dark:bg-black transition-transform ${checked? 'translate-x-5' : ''}`}></span>
    </button>
  )
}

export default function App(){
  return <AuthGate />
}
