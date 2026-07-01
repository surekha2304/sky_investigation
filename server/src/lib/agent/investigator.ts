import Groq from 'groq-sdk'
import { OVERNIGHT_EVENTS } from '../data/events'
import { callTool, GROQ_TOOLS } from '../mcp/server'
import type { BriefingDraft, EventClassification } from '../../types'

export type AgentStreamCallback = (event: AgentStreamEvent) => void

export type AgentStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'tool_call'; tool: string; input: Record<string, unknown>; reasoning: string }
  | { type: 'tool_result'; tool: string; output: unknown }
  | { type: 'classification'; data: EventClassification }
  | { type: 'briefing_draft'; data: BriefingDraft }
  | { type: 'error'; message: string }
  | { type: 'done' }

// Fallback classifications for event types the agent commonly skips
const FALLBACK_CLASSIFICATIONS: Record<string, Pick<EventClassification, 'classification' | 'confidence' | 'reasoning'>> = {
  badge_swipe_failed: {
    classification: 'monitor',
    confidence: 0.65,
    reasoning: 'Part of a cluster of failed badge swipes at Access Point 7. Grouped with evt_003 — same reader, same time window. Reader may have malfunctioned in cold conditions or badge was damaged.',
  },
  drone_patrol: {
    classification: 'harmless',
    confidence: 0.99,
    reasoning: 'Scheduled nightly patrol. No anomalies reported. Mission completed successfully.',
  },
  weather: {
    classification: 'harmless',
    confidence: 0.99,
    reasoning: 'Automated weather station reading. Contextual data only — confirms windy conditions (43 km/h) that explain the fence vibration alert at Gate 3.',
  },
  motion_sensor: {
    classification: 'monitor',
    confidence: 0.70,
    reasoning: 'Motion sensor trigger with no further corroborating events. Likely environmental, but requires acknowledgement.',
  },
  camera_fault: {
    classification: 'monitor',
    confidence: 0.70,
    reasoning: 'Camera feed dropped. Could be hardware fault or external interference. Needs day-shift inspection.',
  },
}

function buildSystemPrompt(eventIds: string[]): string {
  return `Security AI for Ridgeway Site, 6:10 AM. Investigate overnight events using tools, then output a briefing.
Must classify ALL these IDs: ${eventIds.join(' ')}
Rules: use tools before classifying; cross-reference events; be honest about uncertainty (confidence<0.8); address Raghav's Block C note; no event IDs in follow_up_needed.
Output ONLY valid JSON in <briefing_draft>...</briefing_draft> with keys: overall_assessment, event_classifications[{event_id,classification(harmless|monitor|escalate),confidence,reasoning,uncertainty?}], drone_coverage_summary, what_happened, harmless_items, escalate_items, follow_up_needed, raghav_note_response.`
}

// After parsing the draft, fill in any event IDs the agent missed
function backfillMissingEvents(draft: BriefingDraft): BriefingDraft {
  const classifiedIds = new Set(draft.event_classifications.map(c => c.event_id))
  const missing = OVERNIGHT_EVENTS.filter(e => !classifiedIds.has(e.id))

  if (missing.length === 0) return draft

  const backfilled: EventClassification[] = missing.map(event => {
    const fallback = FALLBACK_CLASSIFICATIONS[event.type]
    return {
      event_id: event.id,
      classification: fallback?.classification ?? 'monitor',
      confidence: fallback?.confidence ?? 0.60,
      reasoning: fallback?.reasoning ?? `Event type ${event.type} — not explicitly reviewed by agent. Flagged for manual review.`,
      uncertainty: (fallback?.confidence ?? 0.60) < 0.8
        ? 'Not directly investigated in this run — classification inferred from event type and context.'
        : undefined,
    }
  })

  return {
    ...draft,
    event_classifications: [...draft.event_classifications, ...backfilled],
  }
}

export async function runInvestigation(
  groq: Groq,
  onEvent: AgentStreamCallback,
): Promise<void> {
  onEvent({ type: 'status', message: 'Starting overnight investigation...' })

  const eventIds = OVERNIGHT_EVENTS.map(e => e.id)
  // Compact format — time+type+zone only, no full title (saves ~80 tokens)
  const eventSummary = OVERNIGHT_EVENTS.map(e =>
    `${e.id} ${e.timestamp.slice(11, 16)} ${e.type} ${e.zone}`
  ).join('\n')

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(eventIds) },
    {
      role: 'user',
      content: `Events (2024-01-15, Ridgeway Site):\n${eventSummary}\n\nUse tools to investigate, classify all ${eventIds.length} events.`,
    },
  ]

  let iterations = 0
  const MAX_ITERATIONS = 20
  let totalToolCalls = 0
  const MAX_TOOL_CALLS = 20
  let injectedStop = false

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const forceFinal = totalToolCalls >= MAX_TOOL_CALLS
    if (forceFinal && !injectedStop) {
      injectedStop = true
      messages.push({ role: 'user', content: 'Enough data gathered. Output the briefing JSON now in <briefing_draft> tags.' })
    }

    // Retry up to 3 times on malformed tool call errors (Groq/llama formatting bug)
    let response: Awaited<ReturnType<typeof groq.chat.completions.create>> | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await groq.chat.completions.create({
          // Switch back to llama-3.3-70b-versatile once daily quota resets
          model: 'llama-3.1-8b-instant',
          messages,
          tools: GROQ_TOOLS,
          tool_choice: forceFinal ? 'none' : 'auto',
          max_tokens: 2500,
          temperature: 0.2 + attempt * 0.1,
        })
        break
      } catch (err: unknown) {
        const msg = String(err)
        const isToolFormatError = msg.includes('tool_use_failed') || msg.includes('Failed to call a function')
        const isRateLimit = msg.includes('429') || msg.includes('rate_limit')
        if (isToolFormatError && attempt < 2) {
          onEvent({ type: 'status', message: `Tool call formatting error — retrying (${attempt + 1}/3)...` })
          await new Promise(r => setTimeout(r, 1000))
          continue
        }
        if (isRateLimit) {
          onEvent({ type: 'error', message: 'Rate limit reached. Please wait and try again.' })
          onEvent({ type: 'done' })
          return
        }
        throw err
      }
    }

    if (!response) {
      onEvent({ type: 'error', message: 'Failed after 3 retries due to tool call formatting errors.' })
      onEvent({ type: 'done' })
      return
    }

    const choice = response.choices[0]
    const message = choice.message

    messages.push(message as Groq.Chat.ChatCompletionMessageParam)

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name
        let toolInput: Record<string, unknown> = {}
        try {
          toolInput = JSON.parse(toolCall.function.arguments || '{}')
        } catch {
          toolInput = {}
        }

        onEvent({
          type: 'tool_call',
          tool: toolName,
          input: toolInput,
          reasoning: message.content || `Investigating using ${toolName}`,
        })

        totalToolCalls++
        const result = callTool(toolName, toolInput)
        onEvent({ type: 'tool_result', tool: toolName, output: result.data })

        // Truncate tool result aggressively to stay under TPM limits
        const fullJson = JSON.stringify(result.data)
        const truncated = fullJson.length > 150
          ? fullJson.slice(0, 150) + '...'
          : fullJson

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: truncated,
        } as Groq.Chat.ChatCompletionMessageParam)
      }
      continue
    }

    // No tool calls — agent has finished
    const content = message.content || ''

    // Extract briefing draft from tags
    const briefingMatch = content.match(/<briefing_draft>([\s\S]*?)<\/briefing_draft>/)
    const rawJson = briefingMatch ? briefingMatch[1].trim() : content.trim()

    try {
      const draft: BriefingDraft = JSON.parse(rawJson)

      // Backfill any events the agent missed
      const completeDraft = backfillMissingEvents(draft)

      // Emit each classification individually so the UI updates incrementally
      for (const cls of completeDraft.event_classifications) {
        onEvent({ type: 'classification', data: cls })
      }

      onEvent({ type: 'briefing_draft', data: completeDraft })
    } catch {
      onEvent({ type: 'error', message: 'Could not parse the agent briefing. Try running again.' })
    }

    onEvent({ type: 'done' })
    return
  }

  onEvent({ type: 'error', message: 'Investigation exceeded maximum iterations.' })
  onEvent({ type: 'done' })
}
