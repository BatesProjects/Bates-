export type JobStatus = 'active' | 'scheduled' | 'complete'

export interface Job {
  id: string
  name: string
  client: string
  status: JobStatus
  value: number
  startDate: string
  endDate: string
  color: string
  notes?: string
}

export interface GmailMessage {
  id: string
  sender: string
  senderInitials: string
  subject: string
  snippet: string
  time: string
  urgent: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  type: 'job' | 'personal' | 'meeting'
  color?: string
}

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    name: 'Surry Hills Renovation',
    client: 'Smith Family',
    status: 'active',
    value: 285000,
    startDate: '2026-03-10',
    endDate: '2026-05-20',
    color: '#4A7C59',
  },
  {
    id: 'j2',
    name: 'Paddington Extension',
    client: 'Chen Residence',
    status: 'active',
    value: 145000,
    startDate: '2026-04-01',
    endDate: '2026-06-15',
    color: '#6B8A4A',
  },
  {
    id: 'j3',
    name: 'Bondi Apartment Fitout',
    client: 'Coastal Living Co.',
    status: 'active',
    value: 89000,
    startDate: '2026-04-14',
    endDate: '2026-05-30',
    color: '#4A6E7C',
  },
  {
    id: 'j4',
    name: 'Newtown Heritage Restore',
    client: 'Heritage NSW',
    status: 'scheduled',
    value: 520000,
    startDate: '2026-06-01',
    endDate: '2026-10-30',
    color: '#4A6B8A',
  },
  {
    id: 'j5',
    name: 'Glebe Commercial Fitout',
    client: 'Anchor Group',
    status: 'scheduled',
    value: 210000,
    startDate: '2026-05-19',
    endDate: '2026-07-31',
    color: '#6A4A8A',
  },
]

export const MOCK_EMAILS: GmailMessage[] = [
  {
    id: 'e1',
    sender: 'Sarah Mitchell',
    senderInitials: 'SM',
    subject: 'Re: Surry Hills — inspection Thursday',
    snippet: 'Hi Wilson, just confirming the site inspection is still on for Thursday at 9am...',
    time: '8m',
    urgent: true,
  },
  {
    id: 'e2',
    sender: 'Council Planning',
    senderInitials: 'CP',
    subject: 'DA-2024-1847 — Decision notice attached',
    snippet: 'Please find attached the decision notice for your development application...',
    time: '1h',
    urgent: false,
  },
  {
    id: 'e3',
    sender: 'Fletcher Building',
    senderInitials: 'FB',
    subject: 'Quote #FB-2891 — Timber pricing update',
    snippet: 'Due to supply chain adjustments, please note the updated pricing for structural...',
    time: '2h',
    urgent: false,
  },
  {
    id: 'e4',
    sender: 'James Whitfield',
    senderInitials: 'JW',
    subject: 'Paddington — marble delivery confirmed',
    snippet: 'The Carrara marble panels are confirmed for delivery next Tuesday between...',
    time: '3h',
    urgent: false,
  },
]

export const MOCK_XERO = {
  revenueYTD: 1247500,
  revenueLastYear: 1089200,
  profitLossQTD: 186200,
  profitLossLastQTD: 142800,
  invoicesOwed: 284750,
  invoicesCount: 7,
  invoicesOverdueCount: 3,
  billsToPay: 67400,
  billsCount: 8,
  billsOverdueCount: 4,
  toReconcile: 15,
  bankBalance: 82595.67,
}

export const TODAY = new Date('2026-04-27')
