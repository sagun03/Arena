import axios from 'axios'
import apiClient from './api-client'

export interface VerdictRecord {
  id: string
  debateId: string
  status: string
  decision?: string
  ideaTitle?: string | null
  confidence?: number
  reasoning?: string
  createdAt?: string | null
  updatedAt?: string | null
  verdict?: any
}

export type RecentVerdictItem = VerdictRecord

export interface ValidationResponse {
  debate_id?: string
  idea_title?: string
}

export interface DebateState {
  debate_id: string
  status: string
  transcript: Array<any>
  current_round?: number
  last_updated?: string | null
  error?: string | null
  idea_title?: string
}

export interface DebateVerdictResponse {
  debate_id: string
  verdict: any
  status: string
  message: string
  idea_title?: string | null
  started_at?: string | null
  last_updated?: string | null
}

export interface ExecutionTask {
  id: string
  title?: string
  rationale?: string
  priority?: string
  owner?: string
  day?: number
  task?: string
  success_criteria?: string
  completed: boolean
}

export interface ExecutionPlan {
  debate_id: string
  checklist: ExecutionTask[]
  sprint_plan: ExecutionTask[]
}

export interface InterviewPersona {
  id: string
  name: string
  headline?: string
  traits?: string[]
  priorities?: string[]
}

export interface InterviewResponsePayload {
  summary?: string
  reactions?: string[]
  concerns?: string[]
  willingness_to_pay?: {
    will_pay?: boolean
    price_range?: string
    reason?: string
  }
  adoption_barriers?: string[]
  verdict?: string
  reply?: string
  bullets?: string[]
  final_stance?: string
  follow_up_questions?: string[]
}

export interface InterviewResult {
  persona: InterviewPersona
  response: InterviewResponsePayload
}

function normalizeVerdict(item: any): VerdictRecord {
  return {
    id: item.id ?? item.debate_id ?? item.debateId,
    debateId: item.debate_id ?? item.debateId ?? item.id,
    status: item.status ?? 'pending',
    decision: item.decision,
    ideaTitle: item.idea_title ?? item.ideaTitle ?? null,
    confidence: item.confidence,
    reasoning: item.reasoning,
    createdAt: item.created_at ?? item.createdAt ?? null,
    updatedAt: item.updated_at ?? item.updatedAt ?? null,
    verdict: item.verdict,
  }
}

export type ValidationMode = 'short' | 'long'

export async function startValidation(
  prdText: string,
  mode: ValidationMode = 'long'
): Promise<ValidationResponse> {
  const { data } = await apiClient.post<ValidationResponse>('/arena/validate', {
    prd_text: prdText.trim(),
    mode,
  })
  return data
}

export async function getUserVerdicts(limitCount?: number): Promise<VerdictRecord[]> {
  const { data } = await apiClient.get<{ verdicts: any[] }>('/arena/verdicts', {
    params: typeof limitCount === 'number' ? { limit: limitCount } : undefined,
  })
  const items = Array.isArray(data?.verdicts) ? data.verdicts : []
  return items.map(normalizeVerdict)
}

export async function getActiveDebates(): Promise<VerdictRecord[]> {
  const verdicts = await getUserVerdicts()
  return verdicts.filter(v => {
    const status = (v.status || '').toLowerCase()
    return status !== 'completed' && status !== 'failed'
  })
}

export async function getRecentVerdicts(limitCount: number = 3): Promise<RecentVerdictItem[]> {
  return getUserVerdicts(limitCount)
}

export async function getVerdictById(debateId: string): Promise<VerdictRecord | null> {
  try {
    const { data } = await apiClient.get(`/arena/verdicts/${debateId}`)
    return normalizeVerdict(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw error
  }
}

export async function saveVerdict(
  debateId: string,
  verdict: any,
  status: string,
  ideaTitle?: string | null
): Promise<void> {
  await apiClient.post('/arena/verdicts', {
    debate_id: debateId,
    verdict,
    status,
    idea_title: ideaTitle,
  })
}

export async function getDebateState(debateId: string): Promise<DebateState> {
  const { data } = await apiClient.get<DebateState>(`/arena/debate/${debateId}`)
  return data
}

export async function getDebateVerdict(debateId: string): Promise<DebateVerdictResponse> {
  const { data } = await apiClient.get<DebateVerdictResponse>(`/arena/debate/${debateId}/verdict`)
  return data
}

export async function getExecutionPlan(debateId: string): Promise<ExecutionPlan> {
  const { data } = await apiClient.get<ExecutionPlan>(`/arena/execution/${debateId}`)
  return data
}

export async function updateExecutionTask(
  debateId: string,
  taskId: string,
  taskType: 'checklist' | 'sprint',
  completed: boolean
): Promise<ExecutionPlan> {
  const { data } = await apiClient.post<ExecutionPlan>(
    `/arena/execution/${debateId}/tasks/${taskId}`,
    {
      task_type: taskType,
      completed,
    }
  )
  return data
}

export async function getInterviewPersonas(): Promise<InterviewPersona[]> {
  const { data } = await apiClient.get<{ personas: InterviewPersona[] }>(
    '/arena/interviews/personas'
  )
  return data?.personas ?? []
}

export async function runInterview(debateId: string, personaId: string): Promise<InterviewResult> {
  const { data } = await apiClient.post<InterviewResult>('/arena/interviews/run', {
    debate_id: debateId,
    persona_id: personaId,
  })
  return data
}

export async function rebuttalInterview(
  debateId: string,
  personaId: string,
  message: string,
  history: Array<{ role: string; message: string }>
): Promise<InterviewResult> {
  const { data } = await apiClient.post<InterviewResult>('/arena/interviews/rebuttal', {
    debate_id: debateId,
    persona_id: personaId,
    message,
    history,
  })
  return data
}
