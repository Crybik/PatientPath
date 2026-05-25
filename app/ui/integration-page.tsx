'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { addIntegrationEndpoint, removeIntegrationEndpoint, setLastFetch, toggleIntegrationEndpoint, updateWorkerInterval } from '@/app/actions/admin'
import { IconGlobe, IconLoader, IconPause, IconPlay, IconPlug, IconPlus, IconRefresh, IconSend, IconStop, IconTimer, IconTrash, IconUsers, IconClipboard, IconFlask, IconPill } from '@/app/ui/icons'
import { AnimatePresence, FadeInUp, motion, StaggerContainer, StaggerItem } from '@/app/ui/motion'

type Endpoint = { id: string; url: string; method: string; params: Record<string, string>; enabled: boolean; category: string }
type Settings = { endpoints: Endpoint[]; workerIntervalMs: number; lastFetch: string | null }

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-success/10 text-success border-success/20',
  POST: 'bg-info/10 text-info border-info/20',
  PUT: 'bg-warning/10 text-warning border-warning/20',
  DELETE: 'bg-danger/10 text-danger border-danger/20',
  PATCH: 'bg-purple-100 text-purple-700 border-purple-200',
}

const DURATION_PRESETS = [
  { label: '5s', ms: 5000 },
  { label: '10s', ms: 10000 },
  { label: '30s', ms: 30000 },
  { label: '1m', ms: 60000 },
  { label: '5m', ms: 300000 },
  { label: '15m', ms: 900000 },
  { label: '1h', ms: 3600000 },
  { label: '6h', ms: 21600000 },
  { label: '12h', ms: 43200000 },
  { label: '1d', ms: 86400000 },
]

const CATEGORIES = [
  { id: 'students', label: 'Students & Users', desc: 'Sync student details and academic registration data.', Icon: IconUsers },
  { id: 'clinics', label: 'Clinics & Slots', desc: 'Sync clinics, availability schedules, and appointments.', Icon: IconClipboard },
  { id: 'labs', label: 'Lab Diagnostics', desc: 'Sync laboratory test requests, results, and statuses.', Icon: IconFlask },
  { id: 'pharmacy', label: 'Pharmacy & Rx', desc: 'Sync pharmaceutical prescription data and dispensing records.', Icon: IconPill },
] as const

export function IntegrationPage({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings)
  const [isPending, startTransition] = useTransition()
  const [workerRunning, setWorkerRunning] = useState(false)
  const [fetchCount, setFetchCount] = useState(0)
  const workerRef = useRef<NodeJS.Timeout | null>(null)

  // Active Category Tab
  const [activeCategory, setActiveCategory] = useState<'students' | 'clinics' | 'labs' | 'pharmacy'>('students')

  // Live Console Logs
  const [logs, setLogs] = useState<{ time: string; type: 'info' | 'success' | 'error'; text: string }[]>([])

  const addLog = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString(undefined, { hour12: false })
    setLogs((prev) => [{ time, type, text }, ...prev].slice(0, 100))
  }, [])

  // Endpoint tester state
  const [testMethod, setTestMethod] = useState('GET')
  const [testUrl, setTestUrl] = useState('/api/integration/students')
  const [testParams, setTestParams] = useState('count=100')
  const [testBody, setTestBody] = useState('')
  const [testHeaders, setTestHeaders] = useState('Content-Type: application/json')
  const [testResponse, setTestResponse] = useState<{ status: number; time: number; data: any; headers: Record<string, string> } | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params')
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body')

  // New endpoint form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newMethod, setNewMethod] = useState('GET')
  const [newParams, setNewParams] = useState('')

  // Worker
  const runWorker = useCallback(async () => {
    addLog('Starting integration fetch round...', 'info')
    let successCount = 0
    let enabledCount = 0

    // Fetch all enabled endpoints across all categories
    for (const ep of settings.endpoints) {
      if (!ep.enabled) continue
      enabledCount++
      const startTime = performance.now()
      try {
        const url = new URL(ep.url, window.location.origin)
        Object.entries(ep.params).forEach(([k, v]) => url.searchParams.set(k, v))
        
        addLog(`Fetching [${ep.category?.toUpperCase() || 'STUDENTS'}] ${ep.method} ${ep.url}...`, 'info')
        
        const res = await fetch(url.toString(), { method: ep.method, cache: 'no-store' })
        const duration = Math.round(performance.now() - startTime)
        
        if (res.ok) {
          addLog(`SUCCESS: [${ep.category?.toUpperCase() || 'STUDENTS'}] ${ep.method} ${ep.url} -> Status ${res.status} (${duration}ms)`, 'success')
          successCount++
        } else {
          addLog(`FAILED: [${ep.category?.toUpperCase() || 'STUDENTS'}] ${ep.method} ${ep.url} -> Status ${res.status} (${duration}ms)`, 'error')
        }
        
        setFetchCount((c) => c + 1)
        await setLastFetch()
        // Update local state so UI updates the "Last Fetch" timestamp immediately
        setSettings((s) => ({ ...s, lastFetch: new Date().toISOString() }))
      } catch (err: any) {
        addLog(`ERROR: [${ep.category?.toUpperCase() || 'STUDENTS'}] ${ep.method} ${ep.url} failed: ${err.message || err}`, 'error')
      }
    }
    
    if (enabledCount === 0) {
      addLog('No integration endpoints are currently enabled.', 'info')
    } else {
      addLog(`Integration fetch round completed. Successful: ${successCount}/${enabledCount}`, successCount === enabledCount ? 'success' : 'info')
    }
  }, [settings.endpoints, addLog])

  function startWorker() {
    if (workerRef.current) clearInterval(workerRef.current)
    addLog(`Background worker started (Interval: ${settings.workerIntervalMs / 1000}s)`, 'success')
    void runWorker()
    workerRef.current = setInterval(() => void runWorker(), settings.workerIntervalMs)
    setWorkerRunning(true)
  }

  function stopWorker() {
    if (workerRef.current) clearInterval(workerRef.current)
    workerRef.current = null
    setWorkerRunning(false)
    addLog('Background worker stopped.', 'info')
  }

  useEffect(() => {
    return () => { if (workerRef.current) clearInterval(workerRef.current) }
  }, [])

  useEffect(() => {
    if (workerRunning) {
      if (workerRef.current) clearInterval(workerRef.current)
      workerRef.current = setInterval(() => void runWorker(), settings.workerIntervalMs)
    }
  }, [settings.workerIntervalMs, workerRunning, runWorker])

  function handleIntervalChange(ms: number) {
    setSettings((s) => ({ ...s, workerIntervalMs: ms }))
    startTransition(async () => { 
      await updateWorkerInterval(ms)
      addLog(`Worker interval updated to ${ms / 1000}s`, 'info')
    })
  }

  function handleAddEndpoint() {
    if (!newUrl) return
    const params: Record<string, string> = {}
    if (newParams) {
      newParams.split('&').forEach((p) => {
        const [k, v] = p.split('=')
        if (k) params[k.trim()] = v?.trim() ?? ''
      })
    }
    startTransition(async () => {
      await addIntegrationEndpoint({ url: newUrl, method: newMethod, params, category: activeCategory })
      setSettings((s) => ({
        ...s,
        endpoints: [...s.endpoints, { id: `ep-${Date.now()}`, url: newUrl, method: newMethod, params, enabled: true, category: activeCategory }],
      }))
      addLog(`Configured new endpoint: [${activeCategory.toUpperCase()}] ${newMethod} ${newUrl}`, 'success')
      setNewUrl('')
      setNewParams('')
      setShowAddForm(false)
    })
  }

  function handleRemove(id: string) {
    const ep = settings.endpoints.find(e => e.id === id)
    startTransition(async () => {
      await removeIntegrationEndpoint(id)
      setSettings((s) => ({ ...s, endpoints: s.endpoints.filter((e) => e.id !== id) }))
      if (ep) addLog(`Removed endpoint: [${(ep.category || 'students').toUpperCase()}] ${ep.method} ${ep.url}`, 'info')
    })
  }

  function handleToggle(id: string) {
    const ep = settings.endpoints.find(e => e.id === id)
    startTransition(async () => {
      await toggleIntegrationEndpoint(id)
      setSettings((s) => ({
        ...s,
        endpoints: s.endpoints.map((e) => e.id === id ? { ...e, enabled: !e.enabled } : e),
      }))
      if (ep) addLog(`${ep.enabled ? 'Disabled' : 'Enabled'} endpoint: [${(ep.category || 'students').toUpperCase()}] ${ep.method} ${ep.url}`, 'info')
    })
  }

  // Postman-like tester
  async function sendTestRequest() {
    setTestLoading(true)
    setTestResponse(null)
    const start = performance.now()
    addLog(`API Tester: Sending manual request ${testMethod} ${testUrl}...`, 'info')
    try {
      const url = new URL(testUrl, window.location.origin)
      if (testParams && testMethod === 'GET') {
        testParams.split('&').forEach((p) => {
          const [k, v] = p.split('=')
          if (k) url.searchParams.set(k.trim(), v?.trim() ?? '')
        })
      }

      const headers: Record<string, string> = {}
      testHeaders.split('\n').forEach((line) => {
        const [k, ...v] = line.split(':')
        if (k?.trim()) headers[k.trim()] = v.join(':').trim()
      })

      const options: RequestInit = { method: testMethod, headers, cache: 'no-store' }
      if (testBody && testMethod !== 'GET') {
        options.body = testBody
      }

      const res = await fetch(url.toString(), options)
      const time = Math.round(performance.now() - start)
      const resHeaders: Record<string, string> = {}
      res.headers.forEach((v, k) => { resHeaders[k] = v })

      let data: any
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('json')) {
        data = await res.json()
      } else {
        data = await res.text()
      }

      setTestResponse({ status: res.status, time, data, headers: resHeaders })
      if (res.ok) {
        addLog(`API Tester SUCCESS: ${testMethod} ${testUrl} -> Status ${res.status} (${time}ms)`, 'success')
      } else {
        addLog(`API Tester FAILED: ${testMethod} ${testUrl} -> Status ${res.status} (${time}ms)`, 'error')
      }
    } catch (err: any) {
      const time = Math.round(performance.now() - start)
      setTestResponse({ status: 0, time, data: { error: err.message }, headers: {} })
      addLog(`API Tester ERROR: ${testMethod} ${testUrl} failed: ${err.message || err} (${time}ms)`, 'error')
    } finally {
      setTestLoading(false)
    }
  }

  // Filter endpoints for the current active tab
  const filteredEndpoints = settings.endpoints.filter((ep) => {
    const cat = ep.category || 'students'
    return cat === activeCategory
  })

  return (
    <div className="space-y-8">
      <FadeInUp>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-accent to-accent-bright p-3.5 shadow-lg shadow-accent/20">
            <IconPlug className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Integrations</h1>
            <p className="text-sm text-muted">API endpoints, background worker, and endpoint tester</p>
          </div>
        </div>
      </FadeInUp>

      {/* ─── Endpoint Tester (Postman-like) ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden"
      >
        <div className="border-b border-border bg-surface-elevated px-5 py-4 flex items-center gap-2.5">
          <IconSend className="w-5 h-5 text-accent font-bold" />
          <h2 className="text-sm font-semibold text-primary">API Tester</h2>
        </div>

        <div className="p-5">
          {/* URL bar */}
          <div className="flex gap-2">
            <select value={testMethod} onChange={(e) => setTestMethod(e.target.value)} className={`rounded-lg border px-3 py-2.5 text-xs font-bold ${METHOD_COLORS[testMethod] ?? 'border-border'}`}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
            </select>
            <input
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="Enter request URL"
              className="flex-1 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm font-mono text-primary outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={sendTestRequest}
              disabled={testLoading || !testUrl}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/20 transition-all hover:shadow-accent/30 disabled:opacity-50"
            >
              {testLoading ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconSend className="w-5 h-5" />}
              Send
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 border-b border-border">
            {(['params', 'headers', 'body'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-3">
            {activeTab === 'params' && (
              <input value={testParams} onChange={(e) => setTestParams(e.target.value)} placeholder="key=value&key2=value2" className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-mono outline-none focus:border-accent" />
            )}
            {activeTab === 'headers' && (
              <textarea value={testHeaders} onChange={(e) => setTestHeaders(e.target.value)} rows={3} placeholder="Header-Name: value" className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-mono outline-none focus:border-accent resize-y" />
            )}
            {activeTab === 'body' && (
              <textarea value={testBody} onChange={(e) => setTestBody(e.target.value)} rows={5} placeholder='{"key": "value"}' className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-mono outline-none focus:border-accent resize-y" />
            )}
          </div>
        </div>

        {/* Response */}
        <AnimatePresence>
          {testResponse && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border overflow-hidden"
            >
              <div className="flex items-center gap-3 bg-surface-elevated px-5 py-2.5 border-b border-border">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${testResponse.status >= 200 && testResponse.status < 300 ? 'bg-success/10 text-success' : testResponse.status >= 400 ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                  {testResponse.status || 'ERR'}
                </span>
                <span className="text-xs text-muted">{testResponse.time}ms</span>
                <div className="ml-auto flex gap-1">
                  {(['body', 'headers'] as const).map((tab) => (
                    <button key={tab} onClick={() => setResponseTab(tab)} className={`px-3 py-1 text-xs font-medium rounded ${responseTab === tab ? 'bg-accent/10 text-accent' : 'text-muted hover:text-primary'}`}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-72 overflow-auto p-4">
                {responseTab === 'body' ? (
                  <pre className="text-xs font-mono text-primary-soft whitespace-pre-wrap">
                    {typeof testResponse.data === 'string' ? testResponse.data : JSON.stringify(testResponse.data, null, 2)}
                  </pre>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(testResponse.headers).map(([k, v]) => (
                      <div key={k} className="text-xs"><span className="font-semibold text-primary">{k}:</span> <span className="text-muted">{v}</span></div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Background Worker ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-surface p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <IconTimer className="w-5 h-5 text-accent font-bold" />
            <h2 className="text-sm font-semibold text-primary">Background Worker</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {settings.lastFetch && (
              <span className="text-xs text-muted">
                Last fetch: <strong className="text-primary-soft">{new Date(settings.lastFetch).toLocaleTimeString()}</strong>
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${workerRunning ? 'bg-success animate-pulse' : 'bg-muted'}`} />
              <span className="text-xs font-medium text-muted">{workerRunning ? 'Running' : 'Stopped'}</span>
              {fetchCount > 0 && <span className="text-xs text-accent font-mono">({fetchCount} fetches)</span>}
            </div>
          </div>
        </div>

        {/* Interval */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted mb-2">Fetch Interval</p>
          <div className="flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((p) => (
              <button key={p.ms} onClick={() => handleIntervalChange(p.ms)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${settings.workerIntervalMs === p.ms ? 'bg-accent text-white shadow-sm shadow-accent/20' : 'border border-border text-muted hover:text-primary hover:border-accent/40'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={startWorker} disabled={workerRunning} className="flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition-all hover:bg-success-dark">
            <IconPlay className="w-4 h-4" /> Start
          </button>
          <button onClick={stopWorker} disabled={!workerRunning} className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition-all hover:bg-danger-dark">
            <IconStop className="w-4 h-4" /> Stop
          </button>
          <button onClick={runWorker} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-medium text-muted hover:text-primary hover:border-accent/40 transition-all">
            <IconRefresh className="w-4 h-4" /> Fetch Now
          </button>
        </div>

        {/* Live Terminal Console */}
        <div className="mt-5 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider text-muted-soft uppercase flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${workerRunning ? 'bg-success animate-pulse' : 'bg-muted'}`} />
              Live Terminal Output
            </span>
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-muted hover:text-primary transition-colors hover:underline"
              >
                Clear Console
              </button>
            )}
          </div>
          
          <div className="h-44 rounded-lg bg-neutral-955 p-3 font-mono text-[11px] overflow-y-auto space-y-1.5 border border-neutral-900 shadow-inner scrollbar-thin">
            {logs.length > 0 ? (
              logs.map((log, idx) => (
                <div key={idx} className="flex gap-2 leading-relaxed">
                  <span className="text-neutral-500 select-none">[{log.time}]</span>
                  <span className={
                    log.type === 'success' ? 'text-emerald-400' :
                    log.type === 'error' ? 'text-rose-400 font-semibold' : 'text-neutral-300'
                  }>
                    {log.text}
                  </span>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-600 select-none">
                Console idle. Start worker or click "Fetch Now" to see live activity.
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Configured Endpoints ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-border bg-surface p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <IconGlobe className="w-5 h-5 text-accent font-bold" />
            <h2 className="text-sm font-semibold text-primary">Configured Endpoints</h2>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${showAddForm ? 'bg-accent text-white' : 'border border-border text-muted hover:text-primary hover:border-accent/40'}`}>
            <IconPlus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-border pb-5">
          {CATEGORIES.map((cat) => {
            const CatIcon = cat.Icon
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  // Also prefill the API Tester URL with the default URL for that category
                  const defaultUrls: Record<string, string> = {
                    students: '/api/integration/students',
                    clinics: '/api/integration/clinics',
                    labs: '/api/integration/lab-tests',
                    pharmacy: '/api/integration/prescriptions',
                  }
                  setTestUrl(defaultUrls[cat.id] || '/api/integration/students')
                }}
                className={`rounded-xl p-4 text-left transition-all border flex flex-col gap-3 ${
                  activeCategory === cat.id
                    ? 'bg-accent/10 border-accent/40 text-accent shadow-sm shadow-accent/5'
                    : 'bg-surface-elevated/40 border-border/40 text-muted hover:text-primary hover:border-accent/20'
                }`}
              >
                <div className={`rounded-lg p-2.5 w-fit ${
                  activeCategory === cat.id ? 'bg-accent/20 text-accent' : 'bg-surface-elevated text-muted-soft'
                }`}>
                  <CatIcon className="w-5.5 h-5.5 font-bold" />
                </div>
                <div>
                  <div className="text-xs font-semibold">{cat.label}</div>
                  <div className="text-[10px] text-muted-soft mt-1 leading-normal">{cat.desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        <StaggerContainer className="space-y-2 mb-4">
          {filteredEndpoints.length > 0 ? (
            filteredEndpoints.map((ep) => (
              <StaggerItem key={ep.id}>
                <div className={`flex items-center justify-between rounded-lg border p-3 transition-all ${ep.enabled ? 'border-border bg-surface-elevated' : 'border-border/50 bg-background opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${METHOD_COLORS[ep.method] ?? 'border-border text-muted'}`}>
                      {ep.method}
                    </span>
                    <div>
                      <span className="text-sm font-mono text-primary">{ep.url}</span>
                      {Object.keys(ep.params).length > 0 && (
                        <p className="text-[11px] text-muted mt-0.5">Params: {Object.entries(ep.params).map(([k, v]) => `${k}=${v}`).join(', ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleToggle(ep.id)} className="rounded-lg border border-border p-2 text-muted hover:text-primary transition-colors" title={ep.enabled ? 'Pause' : 'Resume'}>
                      {ep.enabled ? <IconPause className="w-4.5 h-4.5" /> : <IconPlay className="w-4.5 h-4.5" />}
                    </button>
                    <button onClick={() => handleRemove(ep.id)} className="rounded-lg border border-danger/20 p-2 text-danger hover:bg-danger/5 transition-colors" title="Remove">
                      <IconTrash className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              </StaggerItem>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-muted border border-dashed border-border rounded-lg bg-surface-elevated/20">
              No custom endpoints configured for this category.
            </div>
          )}
        </StaggerContainer>

        {/* Add endpoint form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border pt-4"
            >
              <div className="flex flex-wrap gap-2">
                <select value={newMethod} onChange={(e) => setNewMethod(e.target.value)} className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-bold">
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => <option key={m}>{m}</option>)}
                </select>
                <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder={`URL path (e.g. /api/integration/${activeCategory})`} className="flex-1 min-w-[200px] rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-mono outline-none focus:border-accent" />
                <input value={newParams} onChange={(e) => setNewParams(e.target.value)} placeholder="count=100&type=new" className="flex-1 min-w-[150px] rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs outline-none focus:border-accent" />
                <button onClick={handleAddEndpoint} disabled={!newUrl || isPending} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-accent/20 disabled:opacity-50">
                  <IconPlus className="w-4 h-4" /> Add Endpoint
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
