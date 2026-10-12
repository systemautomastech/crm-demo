export interface RecentCall {
  id?: string
  number: string

  name?: string
  direction?: string
  status?: string
  duration?: number | string

  createdAt?: string
  created_at?: string
  time?: string
  read?: boolean

  module?: string
  recordId?: string | number
}

export interface CallerExtra {
  [key: string]: unknown

  record_type?: string
  user_type?: string
  lookup_source?: string

  extension?: string
  caller_id?: string
  department?: string
  designation?: string
  branch?: string

  lead_stage?: string
  lead_subject?: string
  lead_created_at?: string
  lead_link?: string

  deal_stage?: string
  deal_link?: string
}

export interface CallerInfo {
  found: boolean
  type?: string
  id?: number | string
  name?: string
  phone?: string
  number?: string
  email?: string
  organization?: string
  extra?: CallerExtra
}

export interface CallStore {
  registered: boolean
  agentStatus: string
  callStatus: string

  caller: string
  incomingNumber: string
  currentNumber: string
  contactName: string

  module: string | null
  recordId: number | string | null

  callerInfo: CallerInfo | null

  muted: boolean
  onHold: boolean

  callStartedAt: number | null
  callDuration: string

  socketConnected: boolean
  connectionMessage: string

  callQuality: string
  latency: number | null
  packetLoss: number | null

  recentCalls: RecentCall[]
  missedCalls: RecentCall[]

  direction: 'inbound' | 'outbound' | null
}

const callStore: CallStore = {
  registered: false,
  agentStatus: 'offline',
  callStatus: 'idle',

  caller: '',
  incomingNumber: '',
  currentNumber: '',
  contactName: '',

  module: null,
  recordId: null,

  callerInfo: null,

  muted: false,
  onHold: false,

  callStartedAt: null,
  callDuration: '00:00',

  socketConnected: false,
  connectionMessage: '',

  callQuality: 'Unknown',
  latency: null,
  packetLoss: null,

  recentCalls: [],
  missedCalls: [],

  direction: null,
}

declare global {
  interface Window {
    callStore: CallStore
  }
}

window.callStore = callStore

export default callStore