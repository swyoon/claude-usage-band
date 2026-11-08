export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Ctx = { tokens?: number; window: number; percent?: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': {
      limits: Shaped<Limit[]>
      lastResponseAt: number | null
      now: number
      ctx: Ctx | null
    }
  }
}
