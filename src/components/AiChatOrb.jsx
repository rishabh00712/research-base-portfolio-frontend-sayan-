// npm install framer-motion three
// Place at: src/components/AiChatOrb.jsx
//
// Needs: VITE_API_URL in the frontend .env (defaults to http://localhost:5000)
//
// Bottom-right AI chat launcher: a shader-driven crimson orb with tracked
// "eyes". Colors come from theme.jsx (core color: rgb(155, 28, 46)).

import { useEffect, useRef, useState, Fragment } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import * as THREE from 'three'
import theme from '../theme'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const C = theme.colors

// Chat-specific shades derived from the core crimson
const UI = {
  crimson: C.accent,            // #9B1C2E  (rgb 155, 28, 46)
  crimsonDeep: '#7A1625',
  paper: C.background,          // #F4F5F7
  blush: C.newsBg,              // #EEDDDF
  blushBorder: C.newsBorder,    // #DDB8BE
  ink: C.heading,               // #231F20
  inkSoft: C.heroTextSoft,      // #4A4044
}

const GREETINGS = [
  (name) => `Ask me anything about ${name}`,
  () => 'Click here to start chatting',
]
const GREETING_VISIBLE_MS = 4500
const GREETING_MIN_GAP_MS = 10000
const GREETING_MAX_GAP_MS = 15000

const LOADING_NOTE =
  "This can take a moment — feel free to browse the site, I'll let you know when it's ready."

// ── Shaders ──────────────────────────────────────────────────────────────
const NOISE = /* glsl */ `
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);
    const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(
              i.z+vec4(0.,i1.z,i2.z,1.))
            + i.y+vec4(0.,i1.y,i2.y,1.))
            + i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=1./7.;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.+1.;
    vec4 s1=floor(b1)*2.+1.;
    vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uActive;
  uniform vec2  uLook;
  uniform float uReduce;

  varying vec3 vLocalPos;
  varying vec3 vViewPos;

  ${NOISE}

  void main(){
    vLocalPos = position;
    vec3 pos  = position;
    float t   = uTime * uReduce;

    float ax = sin(t * 0.27) * 0.16;
    float ay = sin(t * 0.19 + 1.7) * 0.20;
    float az = sin(t * 0.23 + 3.1) * 0.12;
    pos *= vec3(1.0 + ax, 1.0 + ay, 1.0 + az);

    float nLow = snoise(pos * 0.55 + vec3( t * 0.18,  t * 0.13, -t * 0.15));
    float nMid = snoise(pos * 1.45 + vec3(-t * 0.22,  t * 0.20,  t * 0.18));

    vec3 lookDir = vec3(uLook, 0.55);
    float facing = clamp(dot(normalize(pos), normalize(lookDir)), 0.0, 1.0);
    float bulge  = pow(facing, 2.5) * (0.08 + uActive * 0.10);
    float breath = sin(t * 0.55) * 0.022;

    float amp = mix(0.20, 0.34, uActive);
    float displacement = (nLow * 0.66 + nMid * 0.34) * amp + bulge + breath;
    pos += normal * displacement;

    vec4 mv  = modelViewMatrix * vec4(pos, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  uniform vec3  uBase;
  uniform vec3  uRimA;
  uniform vec3  uRimB;
  uniform vec3  uSpeckA;
  uniform vec3  uSpeckB;
  uniform float uActive;

  varying vec3 vLocalPos;
  varying vec3 vViewPos;

  ${NOISE}

  void main(){
    vec3 dx = dFdx(vViewPos);
    vec3 dy = dFdy(vViewPos);
    vec3 n  = normalize(cross(dx, dy));
    vec3 v  = normalize(-vViewPos);

    float fres = 1.0 - clamp(dot(n, v), 0.0, 1.0);

    vec3 keyDir  = normalize(vec3(-0.45,  0.70,  0.85));
    vec3 fillDir = normalize(vec3( 0.65, -0.35,  0.55));
    float diffKey  = max(0.0, dot(n, keyDir));
    float diffFill = max(0.0, dot(n, fillDir));
    vec3 lit = uBase * (0.50 + diffKey * 0.80 + diffFill * 0.35);

    vec3 dirA = normalize(vec3(-0.70,  0.55,  0.50));
    vec3 dirB = normalize(vec3( 0.75, -0.30,  0.50));
    float wrapA = max(0.0, dot(n, dirA));
    float wrapB = max(0.0, dot(n, dirB));
    float rimCoreP = mix(2.2, 1.7, uActive);
    float rimA = pow(wrapA, 1.3) * pow(fres, rimCoreP);
    float rimB = pow(wrapB, 1.3) * pow(fres, rimCoreP);

    vec3 halfKey = normalize(keyDir + v);
    float specKey = pow(max(0.0, dot(n, halfKey)), 32.0) * 0.55;

    vec3 col = lit
             + uRimA * rimA * mix(1.10, 1.55, uActive)
             + uRimB * rimB * mix(1.00, 1.45, uActive)
             + specKey * vec3(1.00, 0.88, 0.90);

    float speckBig   = snoise(vLocalPos * 10.0);
    float speckSmall = snoise(vLocalPos * 24.0 + 1.7);
    float maskBig    = smoothstep(0.66, 0.74, speckBig);
    float maskSmall  = smoothstep(0.72, 0.78, speckSmall) * 0.40;
    float speckMask  = max(maskBig, maskSmall);
    float colorPick  = snoise(vLocalPos * 4.0 + 5.3);
    vec3  speckColor = mix(uSpeckA, uSpeckB, smoothstep(0.55, 0.75, colorPick));
    float speckBody  = 1.0 - smoothstep(0.55, 0.95, fres);
    col += speckColor * speckMask * speckBody * 0.80;

    gl_FragColor = vec4(col, 1.0);
  }
`

// Crimson palette built around rgb(155, 28, 46) = [0.608, 0.110, 0.180]
const PALETTE = {
  base: [0.61, 0.11, 0.18],
  rimA: [0.90, 0.28, 0.38],
  rimB: [0.96, 0.84, 0.86],
  speckA: [0.80, 0.22, 0.32],
  speckB: [0.96, 0.88, 0.90],
  eye: 'rgba(244, 245, 247, 0.96)',
  eyeGlow: 'rgba(255, 190, 200, 0.55)',
}

const LOOK_SEQUENCE = [
  { x: -0.65, y: 0.0, dur: 2400 },
  { x: 0.32, y: 0.0, dur: 2800 },
  { x: -0.24, y: 0.0, dur: 2200 },
  { x: 0.0, y: -0.55, dur: 2800 },
  { x: 0.0, y: 0.0, dur: 2600 },
]

// ── Inline message formatting ────────────────────────────────────────────
//   **words** -> bold, ##words## -> underline, URLs -> short clickable labels,
//   [text](url) -> clickable text, emails / phones -> mailto: / tel:
function GithubIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <path d="M12 .5C5.73.5.98 5.25.98 11.52c0 4.94 3.2 9.13 7.65 10.61.56.1.76-.24.76-.54v-1.9c-3.11.68-3.77-1.5-3.77-1.5-.51-1.3-1.24-1.64-1.24-1.64-1.02-.7.08-.69.08-.69 1.12.08 1.71 1.15 1.71 1.15 1 1.71 2.62 1.22 3.26.93.1-.72.39-1.22.71-1.5-2.48-.28-5.1-1.24-5.1-5.53 0-1.22.44-2.22 1.15-3-.11-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.54.22 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.3-2.63 5.24-5.13 5.52.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54 4.44-1.48 7.64-5.67 7.64-10.61C23.02 5.25 18.27.5 12 .5z" />
    </svg>
  )
}

function ExternalIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ flexShrink: 0 }}>
      <path d="M7 17L17 7M8 7h9v9" />
    </svg>
  )
}

// Short readable name for a URL
function labelForUrl(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return 'Open link'
  }
  const host = u.hostname.replace(/^www\./, '').toLowerCase()
  const path = u.pathname.toLowerCase()

  if (host.endsWith('github.com')) return 'GitHub'
  if (host.endsWith('linkedin.com')) return 'LinkedIn'
  if (host === 'scholar.google.com') return 'Google Scholar'
  if (host.endsWith('orcid.org')) return 'ORCID'
  if (host.endsWith('researchgate.net')) return 'ResearchGate'
  if (host.endsWith('youtube.com') || host === 'youtu.be') return 'YouTube'
  if (host === 'x.com' || host.endsWith('twitter.com')) return 'X (Twitter)'
  if (host.endsWith('instagram.com')) return 'Instagram'
  if (host.endsWith('facebook.com')) return 'Facebook'
  if (host === 'arxiv.org') return 'arXiv'
  if (host.endsWith('doi.org')) return 'Paper (DOI)'
  if (path.endsWith('.pdf')) return 'PDF'

  // Pages of this same website, e.g. /research -> "Research page"
  if (typeof window !== 'undefined' && u.origin === window.location.origin) {
    const seg = path.split('/').filter(Boolean)[0]
    if (!seg) return 'Home page'
    const nice = seg.replace(/[-_]+/g, ' ')
    return nice.charAt(0).toUpperCase() + nice.slice(1) + ' page'
  }

  return host
}

function LinkChip({ href, label, variant }) {
  const color = variant === 'user' ? '#FFFFFF' : UI.crimson
  const isGithub = /github\.com/i.test(href)
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      style={{
        color,
        fontWeight: 600,
        textDecoration: 'underline',
        textUnderlineOffset: 2,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {isGithub && <GithubIcon />}
      {label}
      <ExternalIcon />
    </a>
  )
}

// Splits trailing punctuation (".", ",", ")" ...) off a matched URL
function splitTrailing(url) {
  const m = url.match(/[.,;:!?)\]]+$/)
  if (!m) return { clean: url, trail: '' }
  return { clean: url.slice(0, -m[0].length), trail: m[0] }
}

const TOKEN_REGEX =
  /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*[^*]+\*\*)|(##[^#]+##)|(https?:\/\/[^\s]+)|([\w.+-]+@[\w-]+\.[\w.-]+)|(\+?\d[\d\s().-]{7,}\d)/g

function parseInline(str, keyPrefix, variant) {
  const nodes = []
  const regex = new RegExp(TOKEN_REGEX.source, 'g')
  const linkColor = variant === 'user' ? '#FFFFFF' : UI.crimson
  let lastIndex = 0
  let match
  let key = 0

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) nodes.push(str.slice(lastIndex, match.index))
    const token = match[0]
    const k = `${keyPrefix}-${key++}`

    if (match[1]) {
      // [text](url)
      const text = match[2]
      const url = match[3]
      const label = /^https?:\/\//i.test(text) ? labelForUrl(url) : text
      nodes.push(<LinkChip key={k} href={url} label={label} variant={variant} />)
    } else if (match[4]) {
      // **bold**
      nodes.push(<strong key={k}>{parseInline(token.slice(2, -2), k, variant)}</strong>)
    } else if (match[5]) {
      // ##underline##
      nodes.push(
        <span key={k} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {parseInline(token.slice(2, -2), k, variant)}
        </span>
      )
    } else if (match[6]) {
      // plain URL -> short clickable label
      const { clean, trail } = splitTrailing(token)
      nodes.push(<LinkChip key={k} href={clean} label={labelForUrl(clean)} variant={variant} />)
      if (trail) nodes.push(trail)
    } else if (match[7]) {
      nodes.push(
        <a key={k} href={`mailto:${token}`}
          style={{ color: linkColor, textDecoration: 'underline', textUnderlineOffset: 2 }}>
          {token}
        </a>
      )
    } else if (match[8]) {
      nodes.push(
        <a key={k} href={`tel:${token.replace(/[^\d+]/g, '')}`}
          style={{ color: linkColor, textDecoration: 'underline', textUnderlineOffset: 2 }}>
          {token}
        </a>
      )
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < str.length) nodes.push(str.slice(lastIndex))
  return nodes
}

// variant: 'assistant' (default) or 'user' (white links on the crimson bubble)
function FormattedMessage({ text, variant = 'assistant' }) {
  const lines = String(text ?? '').split('\n')
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {parseInline(line, `l${i}`, variant)}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  )
}

// ── Component ────────────────────────────────────────────────────────────
export default function AiChatOrb({ personName: personNameProp } = {}) {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const sizeRef = useRef({ w: 96, h: 96 })

  const lookTargetRef = useRef({ x: 0, y: 0 })
  const lookCurrentRef = useRef({ x: 0, y: 0 })
  const hoverActiveRef = useRef(false)
  const idleTimeoutRef = useRef(null)

  const activeRef = useRef(0)
  const targetRef = useRef(0)

  const eyeX = useMotionValue(0)
  const eyeY = useMotionValue(0)
  const sx = useSpring(eyeX, { stiffness: 200, damping: 22, mass: 0.4 })
  const sy = useSpring(eyeY, { stiffness: 200, damping: 22, mass: 0.4 })

  const [blinkAt, setBlinkAt] = useState(0)
  const [open, setOpen] = useState(0.85)
  const [orbHovered, setOrbHovered] = useState(false)

  // ── Identity ────────────────────────────────────────────────────────────
  const [personName, setPersonName] = useState(personNameProp || '')

  useEffect(() => {
    if (personNameProp) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/profile`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data?.name) setPersonName(data.name)
      } catch {
        // fall back to generic wording
      }
    })()
    return () => {
      cancelled = true
    }
  }, [personNameProp])

  const displayName = personName || 'this person'

  // ── Chat state ──────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false)
  const chatOpenRef = useRef(false)
  useEffect(() => {
    chatOpenRef.current = chatOpen
  }, [chatOpen])

  const [showGreeting, setShowGreeting] = useState(false)
  const [greetingIndex, setGreetingIndex] = useState(0)
  const [notification, setNotification] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const greetedRef = useRef(false)

  function openChat() {
    setChatOpen(true)
    setNotification(null)
  }

  useEffect(() => {
    if (!chatOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setChatOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chatOpen])

  // First open: a single intro message.
  useEffect(() => {
    if (!chatOpen || greetedRef.current) return
    greetedRef.current = true
    const t = setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: `Hi, my name is XA — ${displayName}'s AI assistant. How can I help you?`,
        },
      ])
    }, 350)
    return () => clearTimeout(t)
  }, [chatOpen, displayName])

  // Idle greeting bubble every 10–15s while closed.
  useEffect(() => {
    if (chatOpen || notification) {
      setShowGreeting(false)
      return
    }
    let showTimer
    let hideTimer
    function scheduleNext() {
      const gap = GREETING_MIN_GAP_MS + Math.random() * (GREETING_MAX_GAP_MS - GREETING_MIN_GAP_MS)
      showTimer = window.setTimeout(() => {
        setGreetingIndex((i) => (i + 1) % GREETINGS.length)
        setShowGreeting(true)
        hideTimer = window.setTimeout(() => {
          setShowGreeting(false)
          scheduleNext()
        }, GREETING_VISIBLE_MS)
      }, gap)
    }
    scheduleNext()
    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [chatOpen, notification])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, chatOpen])

  async function handleSend(e) {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || loading) return

    setMessages((m) => [...m, { role: 'user', text }])
    setInputValue('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      const reply = data?.reply ?? data?.response ?? data?.message ?? '...'
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Something went wrong, please try again.' }])
    } finally {
      setLoading(false)
      if (!chatOpenRef.current) setNotification("Here's your response!")
    }
  }

  // ── Orb shader setup ────────────────────────────────────────────────────
  useEffect(() => {
    const host = canvasRef.current
    if (!host) return

    const W = host.clientWidth || 96
    const H = host.clientHeight || 96
    sizeRef.current = { w: W, h: H }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100)
    camera.position.z = 4.4

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const geo = new THREE.IcosahedronGeometry(1, 32)

    const uniforms = {
      uTime: { value: 0 },
      uActive: { value: 0 },
      uLook: { value: new THREE.Vector2(0, 0) },
      uReduce: { value: 1 },
      uBase: { value: new THREE.Color(...PALETTE.base) },
      uRimA: { value: new THREE.Color(...PALETTE.rimA) },
      uRimB: { value: new THREE.Color(...PALETTE.rimB) },
      uSpeckA: { value: new THREE.Color(...PALETTE.speckA) },
      uSpeckB: { value: new THREE.Color(...PALETTE.speckB) },
    }

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
    })

    const mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const applyMotion = () => {
      uniforms.uReduce.value = mql.matches ? 0 : 1
    }
    applyMotion()
    mql.addEventListener('change', applyMotion)

    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (!r) return
      const nw = Math.max(1, Math.floor(r.width))
      const nh = Math.max(1, Math.floor(r.height))
      sizeRef.current = { w: nw, h: nh }
      renderer.setSize(nw, nh)
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
    })
    ro.observe(host)

    let raf = 0
    const clock = new THREE.Clock()

    function tick() {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(clock.getDelta(), 0.05)
      uniforms.uTime.value += dt

      const ka = 1 - Math.exp(-dt * 6)
      activeRef.current += (targetRef.current - activeRef.current) * ka
      uniforms.uActive.value = activeRef.current

      const speed = hoverActiveRef.current ? 7 : 2.2
      const kl = 1 - Math.exp(-dt * speed)
      const lc = lookCurrentRef.current
      const lt = lookTargetRef.current
      lc.x += (lt.x - lc.x) * kl
      lc.y += (lt.y - lc.y) * kl

      uniforms.uLook.value.set(lc.x, -lc.y)

      const lean = 0.12 + activeRef.current * 0.06
      mesh.position.x += (lc.x * lean - mesh.position.x) * kl
      mesh.position.y += (-lc.y * lean - mesh.position.y) * kl

      const range = sizeRef.current.w * 0.18
      eyeX.set(lc.x * range)
      eyeY.set(lc.y * range)

      mesh.rotation.y += dt * 0.04
      mesh.rotation.x += dt * 0.015

      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      mql.removeEventListener('change', applyMotion)
      ro.disconnect()
      geo.dispose()
      mat.dispose()
      try {
        renderer.forceContextLoss()
      } catch {}
      renderer.dispose()
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement)
    }
  }, [eyeX, eyeY])

  // ── Global pointer-driven eye tracking ──────────────────────────────────
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    function update(clientX, clientY) {
      const rect = stage.getBoundingClientRect()
      const radius = rect.width / 2
      const nx = Math.max(-1, Math.min(1, (clientX - (rect.left + radius)) / radius))
      const ny = Math.max(-1, Math.min(1, (clientY - (rect.top + rect.height / 2)) / radius))
      const onOrb = Math.sqrt(nx * nx + ny * ny) < 0.62
      setOrbHovered(onOrb)

      if (onOrb) {
        targetRef.current = 1
        lookTargetRef.current = { x: nx, y: ny }
        setOpen(0.32)
      } else {
        targetRef.current = 0.35
        lookTargetRef.current = { x: nx * 0.4, y: ny * 0.4 }
        setOpen(0.7)
      }
    }

    function onMove(e) {
      hoverActiveRef.current = true
      update(e.clientX, e.clientY)
      window.clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = window.setTimeout(() => {
        hoverActiveRef.current = false
        targetRef.current = 0
        setOpen(0.85)
        setOrbHovered(false)
      }, 1200)
    }

    function onDown(e) {
      update(e.clientX, e.clientY)
      setBlinkAt((v) => v + 1)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.clearTimeout(idleTimeoutRef.current)
    }
  }, [])

  // Idle gaze pattern
  useEffect(() => {
    let idx = 0
    let timer
    function step() {
      const s = LOOK_SEQUENCE[idx]
      if (!hoverActiveRef.current) lookTargetRef.current = { x: s.x, y: s.y }
      idx = (idx + 1) % LOOK_SEQUENCE.length
      timer = window.setTimeout(step, s.dur)
    }
    step()
    return () => window.clearTimeout(timer)
  }, [])

  // Idle blink
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let t
    function schedule() {
      t = window.setTimeout(() => {
        setBlinkAt((v) => v + 1)
        schedule()
      }, 3800 + Math.random() * 3200)
    }
    schedule()
    return () => window.clearTimeout(t)
  }, [])

  const bubbleText = notification || (showGreeting ? GREETINGS[greetingIndex](displayName) : null)

  return (
    <div
      ref={containerRef}
      // Margin from the screen edges: 20px on phones, 32px on larger screens,
      // plus the device safe area (notches / home indicator).
      className={`fixed flex flex-col items-end gap-3 ${chatOpen ? 'z-[70]' : 'z-50'}`}
      style={{
        right: 'max(20px, env(safe-area-inset-right))',
        bottom: 'max(20px, env(safe-area-inset-bottom))',
        fontFamily: theme.fonts.body,
      }}
    >
      {/* Backdrop */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setChatOpen(false)}
            aria-hidden="true"
            className="fixed inset-0"
            style={{
              backgroundColor: 'rgba(35, 31, 32, 0.28)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative z-10 w-[min(calc(100vw-40px),480px)] h-[min(78vh,600px)] rounded-2xl shadow-2xl flex flex-col overflow-hidden border"
            style={{ backgroundColor: UI.paper, borderColor: UI.blushBorder }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
              style={{ backgroundColor: UI.blush, borderColor: UI.blushBorder }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: UI.crimson, boxShadow: '0 0 6px 2px rgba(155,28,46,0.45)' }}
                />
                <span
                  className="text-base"
                  style={{ color: UI.crimson, fontFamily: theme.fonts.heading, fontWeight: 600 }}
                >
                  {displayName}'s AI assistant
                </span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
                className="text-sm opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: UI.crimson }}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2"
              style={{ backgroundColor: UI.paper }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-snug ${
                    m.role === 'user' ? 'self-end' : 'self-start'
                  }`}
                  style={
                    m.role === 'user'
                      ? { backgroundColor: UI.crimson, color: C.textSelection }
                      : { backgroundColor: UI.blush, color: UI.ink, border: `1px solid ${UI.blushBorder}` }
                  }
                >
                  <FormattedMessage text={m.text} variant={m.role} />
                </div>
              ))}

              {loading && (
                <div
                  className="self-start w-full px-3 py-2 rounded-xl text-xs flex items-center gap-2"
                  style={{
                    backgroundColor: UI.blush,
                    color: UI.inkSoft,
                    border: `1px solid ${UI.blushBorder}`,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={LOADING_NOTE}
                >
                  <span
                    className="inline-block rounded-full flex-shrink-0"
                    style={{
                      width: 8,
                      height: 8,
                      backgroundColor: UI.crimson,
                      animation: 'ai-orb-pulse 1s ease-in-out infinite',
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{LOADING_NOTE}</span>
                  <style>{`@keyframes ai-orb-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }`}</style>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 px-3 py-3 border-t flex-shrink-0"
              style={{ backgroundColor: UI.blush, borderColor: UI.blushBorder }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 text-sm rounded-lg px-3 py-2 outline-none focus-visible:ring-2"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: UI.ink,
                  border: `1px solid ${UI.blushBorder}`,
                  '--tw-ring-color': UI.crimson,
                }}
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="text-sm font-medium rounded-lg px-3 py-2 disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: UI.crimson, color: C.textSelection }}
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble above the orb */}
      <AnimatePresence>
        {!chatOpen && bubbleText && (
          <motion.div
            key={notification ? 'notification' : `greeting-${greetingIndex}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 px-3 py-2 rounded-xl text-xs shadow-lg cursor-pointer select-none"
            style={{
              backgroundColor: notification ? UI.crimson : UI.paper,
              color: notification ? C.textSelection : UI.ink,
              border: notification ? 'none' : `1px solid ${UI.blushBorder}`,
              fontWeight: notification ? 600 : 400,
            }}
            onClick={openChat}
          >
            {bubbleText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orb launcher */}
      <motion.div
        ref={stageRef}
        onClick={() => (chatOpen ? setChatOpen(false) : openChat())}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            chatOpen ? setChatOpen(false) : openChat()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={chatOpen ? 'Close AI chat assistant' : 'Open AI chat assistant'}
        className="relative z-10 cursor-pointer select-none touch-none rounded-full"
        style={{
          width: 'clamp(64px, 15vw, 100px)',
          height: 'clamp(64px, 15vw, 100px)',
          boxShadow: '0 0 18px 4px rgba(155,28,46,0.30), 0 0 44px 12px rgba(155,28,46,0.14)',
        }}
        animate={{ scale: orbHovered ? 1.3 : 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <div ref={canvasRef} className="absolute inset-0 rounded-full overflow-hidden" />

        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-between"
          style={{ x: sx, y: sy, width: '11%', height: '15%' }}
        >
          <Eye open={open} blinkKey={blinkAt} />
          <Eye open={open} blinkKey={blinkAt} />
        </motion.div>
      </motion.div>
    </div>
  )
}

function Eye({ open, blinkKey }) {
  return (
    <motion.div
      style={{
        width: '32%',
        height: '100%',
        background: PALETTE.eye,
        borderRadius: 9999,
        boxShadow: `0 0 4px 0 ${PALETTE.eye}, 0 0 14px 1px ${PALETTE.eyeGlow}, 0 0 28px 4px ${PALETTE.eyeGlow}`,
        originY: 0.5,
      }}
      animate={{ scaleY: open }}
      transition={{ type: 'spring', stiffness: 240, damping: 22, mass: 0.4 }}
    >
      <motion.div
        key={blinkKey}
        className="h-full w-full"
        style={{ background: PALETTE.eye, borderRadius: 9999 }}
        initial={{ scaleY: 1 }}
        animate={{ scaleY: [1, 0.05, 1] }}
        transition={{ duration: 0.18, times: [0, 0.45, 1], ease: 'easeInOut' }}
      />
    </motion.div>
  )
}