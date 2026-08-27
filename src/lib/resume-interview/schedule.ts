// Deterministic control flow for the mock interview. The AI decides WHAT to
// ask and how to evaluate an answer; this file decides the STRUCTURE — the
// resume/role split and whether a follow-up is warranted — so the 70/30
// ratio and question count are reliable instead of left to model memory.
// (Same philosophy as the workspace classify route: code owns the counts,
// the model owns the content.)

import type { AnswerEvaluation, InterviewMode, InterviewTurn, QuestionType } from "./types"

// Builds the ordered list of main-question types for the whole interview.
// First ~70% resume-based, remaining ~30% role-based — matches spec §11.
export function buildQuestionSchedule(mode: InterviewMode, questionCount: number): QuestionType[] {
  const resumeCount = Math.round(questionCount * 0.7)
  const schedule: QuestionType[] = []
  for (let i = 0; i < questionCount; i++) {
    schedule.push(i < resumeCount ? "resume" : "role")
  }
  return schedule
}

const FOLLOW_UP_SCORE_THRESHOLD = 55 // out of 100 — below this, the answer was vague enough to probe further
const MAX_FOLLOW_UPS_PER_MAIN_QUESTION = 1

export interface NextStepDecision {
  isFollowUp: boolean
  scheduleIndex: number // which main question (0-based) this turn belongs to
  type: QuestionType
  done: boolean
}

// Given everything asked so far, decide what the NEXT turn should be:
// a follow-up on the last question, the next scheduled main question, or
// "done" if the schedule is exhausted. Follow-ups are capped so a "10
// question" interview stays close to 10 exchanges, not double.
export function decideNextStep(schedule: QuestionType[], history: InterviewTurn[]): NextStepDecision {
  if (history.length === 0) {
    return { isFollowUp: false, scheduleIndex: 0, type: schedule[0], done: schedule.length === 0 }
  }

  const last = history[history.length - 1]
  const lastScheduleIndex = last.question.isFollowUp
    ? findMainIndexForFollowUp(history)
    : indexOfMainQuestion(history, last)

  const followUpsForCurrent = history.filter(
    (t) => t.question.isFollowUp && belongsToSameMain(history, t, lastScheduleIndex)
  ).length

  const answerWasWeak =
    last.evaluation.specificity < FOLLOW_UP_SCORE_THRESHOLD || last.evaluation.depth < FOLLOW_UP_SCORE_THRESHOLD

  const canFollowUp = answerWasWeak && followUpsForCurrent < MAX_FOLLOW_UPS_PER_MAIN_QUESTION

  if (canFollowUp) {
    return { isFollowUp: true, scheduleIndex: lastScheduleIndex, type: last.question.type, done: false }
  }

  const nextIndex = lastScheduleIndex + 1
  if (nextIndex >= schedule.length) {
    return { isFollowUp: false, scheduleIndex: nextIndex, type: "resume", done: true }
  }
  return { isFollowUp: false, scheduleIndex: nextIndex, type: schedule[nextIndex], done: false }
}

// Main (non-follow-up) questions are asked in schedule order, so the Nth
// main question in history corresponds to schedule index N.
function indexOfMainQuestion(history: InterviewTurn[], turn: InterviewTurn): number {
  let count = -1
  for (const t of history) {
    if (!t.question.isFollowUp) count++
    if (t === turn) return count
  }
  return count
}

function findMainIndexForFollowUp(history: InterviewTurn[]): number {
  // Walk backwards from the follow-up to the main question it belongs to.
  let count = -1
  for (const t of history) {
    if (!t.question.isFollowUp) count++
  }
  return count
}

function belongsToSameMain(history: InterviewTurn[], turn: InterviewTurn, scheduleIndex: number): boolean {
  let count = -1
  for (const t of history) {
    if (!t.question.isFollowUp) count++
    if (t === turn) return count === scheduleIndex
  }
  return false
}

export function averageEvaluation(evaluations: AnswerEvaluation[]): AnswerEvaluation {
  if (evaluations.length === 0) {
    return { relevance: 0, technicalAccuracy: 0, depth: 0, specificity: 0, communication: 0 }
  }
  const sum = evaluations.reduce(
    (acc, e) => ({
      relevance: acc.relevance + e.relevance,
      technicalAccuracy: acc.technicalAccuracy + e.technicalAccuracy,
      depth: acc.depth + e.depth,
      specificity: acc.specificity + e.specificity,
      communication: acc.communication + e.communication,
    }),
    { relevance: 0, technicalAccuracy: 0, depth: 0, specificity: 0, communication: 0 }
  )
  const n = evaluations.length
  return {
    relevance: Math.round(sum.relevance / n),
    technicalAccuracy: Math.round(sum.technicalAccuracy / n),
    depth: Math.round(sum.depth / n),
    specificity: Math.round(sum.specificity / n),
    communication: Math.round(sum.communication / n),
  }
}
