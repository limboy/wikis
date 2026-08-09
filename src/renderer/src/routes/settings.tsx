import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState, type JSX } from 'react'
import { FolderOpen, Loader2, Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { applyAppearance } from '@/lib/theme'
import type { AppearanceMode, AppSettings } from '../../../shared/types'

export const Route = createFileRoute('/settings')({
  component: SettingsPage
})

const THEME_OPTIONS: { value: AppearanceMode; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon }
]

function SettingsSection({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({
  label,
  description,
  children
}: {
  label: string
  description?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function SettingsPage(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [pendingDir, setPendingDir] = useState<string | null>(null)
  const [pendingHasExistingDb, setPendingHasExistingDb] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    void window.api.settings.get().then(setSettings)
  }, [])

  useEffect(() => {
    if (!successMessage) return
    const timer = setTimeout(() => setSuccessMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [successMessage])

  const handleAppearanceChange = useCallback((mode: AppearanceMode) => {
    applyAppearance(mode)
    setSettings((prev) => (prev ? { ...prev, appearance: mode } : prev))
    void window.api.settings.setAppearance(mode).catch((err) => {
      console.error('[Settings] Failed to save appearance:', err)
    })
  }, [])

  const handleChooseDirectory = useCallback(async () => {
    setError(null)
    setSuccessMessage(null)
    const dir = await window.api.settings.chooseDataDirectory()
    if (dir && dir !== settings?.dataDir) {
      setPendingDir(dir)
      setPendingHasExistingDb(await window.api.settings.dirHasDatabase(dir))
    }
  }, [settings?.dataDir])

  const handleResetToDefault = useCallback(async () => {
    if (!settings) return
    setError(null)
    setSuccessMessage(null)
    setPendingDir(settings.defaultDataDir)
    setPendingHasExistingDb(await window.api.settings.dirHasDatabase(settings.defaultDataDir))
  }, [settings])

  const handleCancelPending = useCallback(() => {
    setPendingDir(null)
    setPendingHasExistingDb(null)
    setError(null)
  }, [])

  const handleConfirmDataLocation = useCallback(async () => {
    if (!pendingDir) return
    setBusy(true)
    setError(null)
    try {
      const result = await window.api.settings.setDataLocation(pendingDir)
      if (result.ok) {
        setSettings(await window.api.settings.get())
        setPendingDir(null)
        setPendingHasExistingDb(null)
        setSuccessMessage('已切换到新位置')
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }, [pendingDir])

  return (
    <div
      className="flex h-screen w-screen flex-col gap-6 overflow-y-auto bg-background px-6 pt-[52px] pb-6"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div
        className="flex flex-col gap-6"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <SettingsSection title="外观">
          <SettingsRow label="主题">
            <div className="flex gap-1.5 rounded-lg bg-muted p-1">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAppearanceChange(value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    settings?.appearance === value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="数据存储位置">
          <div className="flex flex-col gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm">当前位置</p>
              <p className="truncate text-xs text-muted-foreground" title={settings?.dataDir}>
                {successMessage ?? settings?.dataDir ?? '加载中…'}
              </p>
            </div>
            {!pendingDir && (
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => void handleChooseDirectory()}>
                  <FolderOpen data-icon="inline-start" />
                  更改…
                </Button>
                {settings && !settings.isDefaultDataDir && (
                  <Button variant="ghost" size="sm" onClick={() => void handleResetToDefault()}>
                    恢复默认
                  </Button>
                )}
              </div>
            )}
          </div>

          {pendingDir && (
            <div className="flex flex-col gap-3 px-4 py-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm">新位置</p>
                <p className="truncate font-mono text-xs text-muted-foreground" title={pendingDir}>
                  {pendingDir}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                {pendingHasExistingDb === null
                  ? '检测中…'
                  : pendingHasExistingDb
                    ? '该目录中已有一个知识库，切换后将直接使用它，当前数据保留在原处'
                    : '该目录中还没有知识库，当前数据将移动到这里'}
              </p>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancelPending} disabled={busy}>
                  取消
                </Button>
                <Button size="sm" onClick={() => void handleConfirmDataLocation()} disabled={busy}>
                  {busy && <Loader2 className="size-3.5 animate-spin" />}
                  {busy ? '切换中…' : '确认'}
                </Button>
              </div>
            </div>
          )}
        </SettingsSection>
      </div>
    </div>
  )
}
