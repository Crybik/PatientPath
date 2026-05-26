'use client'

import { useState, useTransition } from 'react'
import { getDbTableData } from '@/app/actions/admin'
import { IconChevronLeft, IconChevronRight, IconDatabase, IconLoader } from '@/app/ui/icons'
import { FadeInUp, motion } from '@/app/ui/motion'

type TableInfo = { name: string; model: string; count: number }
type TableRow = Record<string, unknown>

export function DbBrowser({ initialTables }: { initialTables: TableInfo[] }) {
  const [tables] = useState(initialTables)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string>('')
  const [tableData, setTableData] = useState<TableRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  function loadTable(model: string, name: string, p: number = 1) {
    setSelectedTable(model)
    setSelectedName(name)
    setPage(p)
    startTransition(async () => {
      const result = await getDbTableData(model, p, 20)
      setTableData(result.data)
      setTotal(result.total)
    })
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <FadeInUp>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-primary to-primary-soft p-2.5 shadow-lg shadow-primary/10">
            <IconDatabase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Database Browser</h1>
            <p className="text-sm text-muted">Browse and inspect database tables ({tables.reduce((a, t) => a + t.count, 0)} total rows)</p>
          </div>
        </div>
      </FadeInUp>

      {/* Table grid */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.map((t) => (
          <button
            key={t.model}
            onClick={() => loadTable(t.model, t.name)}
            className={`group rounded-xl border p-4 text-left transition-all ${
              selectedTable === t.model
                ? 'border-accent bg-accent/5 shadow-sm shadow-accent/10'
                : 'border-border bg-surface hover:border-accent/40 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2">
              <IconDatabase className={`w-3.5 h-3.5 ${selectedTable === t.model ? 'text-accent' : 'text-muted group-hover:text-accent'} transition-colors`} />
              <h3 className="text-xs font-semibold text-primary font-mono">{t.name}</h3>
            </div>
            <p className="mt-1.5 text-lg font-bold text-primary">{t.count}</p>
            <p className="text-[11px] text-muted">rows</p>
          </button>
        ))}
      </div>

      {/* Table data */}
      {selectedTable && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-5 py-3">
            <div className="flex items-center gap-2">
              <IconDatabase className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold text-primary font-mono">{selectedName}</h2>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted">{total} rows</p>
              {isPending && <IconLoader className="w-4 h-4 text-accent animate-spin" />}
            </div>
          </div>

          {tableData.length === 0 && !isPending ? (
            <div className="p-12 text-center text-sm text-muted">No data in this table.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-elevated/50">
                    {tableData[0] && Object.keys(tableData[0]).map((key) => (
                      <th key={key} className="px-3 py-2.5 text-left font-semibold text-muted whitespace-nowrap uppercase tracking-wider text-[10px]">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i} className="border-b border-border-subtle hover:bg-surface-elevated/30 transition-colors">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-primary-soft whitespace-nowrap max-w-[200px] truncate font-mono">
                          {val === null ? <span className="text-muted/50 italic">null</span> : val === true ? <span className="text-success">true</span> : val === false ? <span className="text-danger">false</span> : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <button
                onClick={() => loadTable(selectedTable, selectedName, page - 1)}
                disabled={page <= 1 || isPending}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-primary disabled:opacity-30 transition-all"
              >
                <IconChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="text-xs text-muted">Page {page} of {totalPages}</span>
              <button
                onClick={() => loadTable(selectedTable, selectedName, page + 1)}
                disabled={page >= totalPages || isPending}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-primary disabled:opacity-30 transition-all"
              >
                Next <IconChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
