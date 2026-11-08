export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': {
      limits: Shaped<Limit[]>
      lastResponseAt: number | null
      now: number
    }
  }
}
