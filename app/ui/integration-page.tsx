'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { addIntegrationEndpoint, removeIntegrationEndpoint, setLastFetch, toggleIntegrationEndpoint, updateWorkerInterval } from '@/app/actions/admin'
import { IconActivity, IconClose, IconGlobe, IconLoader, IconPause, IconPlay, IconPlug, IconPlus, IconRefresh, IconSend, IconStop, IconTimer, IconTrash, IconZap } from '@/app/ui/icons'
import { AnimatePresence, FadeInUp, motion, StaggerContainer, StaggerItem } from '@/app/ui/motion'

type Endpoint = { id: string; url: string; method: string; params: Record<string, string>; enabled: boolean }
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

export function IntegrationPage({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings)
  const [isPending, startTransition] = useTransition()
  const [workerRunning, setWorkerRunning] = useState(false)
  const [fetchCount, setFetchCount] = useState(0)
  const workerRef = useRef<NodeJS.Timeout | null>(null)

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
    for (const ep of settings.endpoints) {
      if (!ep.enabled) continue
      try {
        const url = new URL(ep.url, window.location.origin)
        Object.entries(ep.params).forEach(([k, v]) => url.searchParams.set(k, v))
        await fetch(url.toString(), { method: ep.method, cache: 'no-store' })
        setFetchCount((c) => c + 1)
        await setLastFetch()
      } catch { /* silent */ }
    }
  }, [settings.endpoints])

  function startWorker() {
    if (workerRef.current) clearInterval(workerRef.current)
    void runWorker()
    workerRef.current = setInterval(() => void runWorker(), settings.workerIntervalMs)
    setWorkerRunning(true)
  }

  function stopWorker() {
    if (workerRef.current) clearInterval(workerRef.current)
    workerRef.current = null
    setWorkerRunning(false)
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
    startTransition(async () => { await updateWorkerInterval(ms) })
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
      await addIntegrationEndpoint({ url: newUrl, method: newMethod, params })
      setSettings((s) => ({
        ...s,
        endpoints: [...s.endpoints, { id: `ep-${Date.now()}`, url: newUrl, method: newMethod, params, enabled: true }],
      }))
      setNewUrl('')
      setNewParams('')
      setShowAddForm(false)
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeIntegrationEndpoint(id)
      setSettings((s) => ({ ...s, endpoints: s.endpoints.filter((e) => e.id !== id) }))
    })
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleIntegrationEndpoint(id)
      setSettings((s) => ({
        ...s,
        endpoints: s.endpoints.map((e) => e.id === id ? { ...e, enabled: !e.enabled } : e),
      }))
    })
  }

  // Postman-like tester
  async function sendTestRequest() {
    setTestLoading(true)
    setTestResponse(null)
    const start = performance.now()
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
    } catch (err: any) {
      setTestResponse({ status: 0, time: Math.round(performance.now() - start), data: { error: err.message }, headers: {} })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <FadeInUp>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-accent to-accent-bright p-2.5 shadow-lg shadow-accent/20">
            <IconPlug className="w-5 h-5 text-white" />
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
        <div className="border-b border-border bg-surface-elevated px-5 py-3 flex items-center gap-2">
          <IconSend className="w-4 h-4 text-accent" />
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
              {testLoading ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconSend className="w-4 h-4" />}
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
          <div className="flex items-center gap-2">
            <IconTimer className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-primary">Background Worker</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${workerRunning ? 'bg-success animate-pulse' : 'bg-muted'}`} />
            <span className="text-xs font-medium text-muted">{workerRunning ? 'Running' : 'Stopped'}</span>
            {fetchCount > 0 && <span className="text-xs text-accent font-mono">({fetchCount} fetches)</span>}
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
          <button onClick={startWorker} disabled={workerRunning} className="flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition-all">
            <IconPlay className="w-3.5 h-3.5" /> Start
          </button>
          <button onClick={stopWorker} disabled={!workerRunning} className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition-all">
            <IconStop className="w-3.5 h-3.5" /> Stop
          </button>
          <button onClick={runWorker} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted hover:text-primary hover:border-accent/40 transition-all">
            <IconRefresh className="w-3.5 h-3.5" /> Fetch Now
          </button>
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
          <div className="flex items-center gap-2">
            <IconGlobe className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-primary">Configured Endpoints</h2>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${showAddForm ? 'bg-accent text-white' : 'border border-border text-muted hover:text-primary hover:border-accent/40'}`}>
            <IconPlus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        <StaggerContainer className="space-y-2 mb-4">
          {settings.endpoints.map((ep) => (
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
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggle(ep.id)} className="rounded-lg border border-border p-1.5 text-muted hover:text-primary transition-colors" title={ep.enabled ? 'Pause' : 'Resume'}>
                    {ep.enabled ? <IconPause className="w-3.5 h-3.5" /> : <IconPlay className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleRemove(ep.id)} className="rounded-lg border border-danger/20 p-1.5 text-danger hover:bg-danger/5 transition-colors" title="Remove">
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </StaggerItem>
          ))}
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
                <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL path (e.g. /api/integration/students)" className="flex-1 min-w-[200px] rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-mono outline-none focus:border-accent" />
                <input value={newParams} onChange={(e) => setNewParams(e.target.value)} placeholder="count=100&type=new" className="flex-1 min-w-[150px] rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs outline-none focus:border-accent" />
                <button onClick={handleAddEndpoint} disabled={!newUrl || isPending} className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-accent/20 disabled:opacity-50">
                  <IconPlus className="w-3.5 h-3.5" /> Add Endpoint
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
