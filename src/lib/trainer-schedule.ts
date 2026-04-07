import { DAY_ABBREVIATIONS, DAYS_OF_WEEK, TIME_SLOTS } from '@/lib/constants'
import type { DayOfWeek, TrainerScheduleRule, TrainerScheduleRuleType } from '@/lib/types'

export type DayPreset = 'all' | 'weekdays' | 'weekends' | 'custom'

const TIME_SLOT_LABELS = new Map(TIME_SLOTS.map((slot) => [slot.value, slot.label]))

export function formatScheduleTime(value: string) {
  return TIME_SLOT_LABELS.get(value) || value
}

export function sortScheduleRules<T extends Pick<TrainerScheduleRule, 'day_of_week' | 'start_time' | 'end_time'>>(
  rules: ReadonlyArray<T>
) {
  return [...rules].sort((left, right) => {
    if (left.day_of_week !== right.day_of_week) {
      return left.day_of_week - right.day_of_week
    }
    if (left.start_time !== right.start_time) {
      return left.start_time.localeCompare(right.start_time)
    }
    return left.end_time.localeCompare(right.end_time)
  })
}

export function splitScheduleRulesByType(rules: ReadonlyArray<TrainerScheduleRule>) {
  return {
    workHours: sortScheduleRules(rules.filter((rule) => rule.rule_type === 'work_hours')),
    blocked: sortScheduleRules(rules.filter((rule) => rule.rule_type === 'blocked')),
  }
}

export function groupScheduleRulesByDay(rules: ReadonlyArray<TrainerScheduleRule>) {
  const sortedRules = sortScheduleRules(rules)

  return DAYS_OF_WEEK.map((day, dayIndex) => {
    const dayRules = sortedRules.filter((rule) => rule.day_of_week === dayIndex)
    return {
      day,
      dayIndex: dayIndex as DayOfWeek,
      workHours: dayRules.filter((rule) => rule.rule_type === 'work_hours'),
      blocked: dayRules.filter((rule) => rule.rule_type === 'blocked'),
    }
  })
}

export function getPresetDayValues(preset: DayPreset) {
  switch (preset) {
    case 'all':
      return [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]
    case 'weekdays':
      return [1, 2, 3, 4, 5] as DayOfWeek[]
    case 'weekends':
      return [0, 6] as DayOfWeek[]
    default:
      return [] as DayOfWeek[]
  }
}

export function getPresetLabel(preset: DayPreset) {
  switch (preset) {
    case 'all':
      return 'All days'
    case 'weekdays':
      return 'Weekdays'
    case 'weekends':
      return 'Weekends'
    default:
      return 'Custom'
  }
}

export function formatSelectedDays(days: ReadonlyArray<DayOfWeek>) {
  if (days.length === 7) return 'All days'
  if (days.length === 5 && days.every((day, index) => day === index + 1)) return 'Weekdays'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'
  return days
    .slice()
    .sort((left, right) => left - right)
    .map((day) => DAY_ABBREVIATIONS[day])
    .join(', ')
}

export function createScheduleRuleDraft(
  trainerId: string,
  ruleType: TrainerScheduleRuleType,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  label?: string | null
): TrainerScheduleRule {
  return {
    id: `temp-${ruleType}-${dayOfWeek}-${startTime}-${endTime}-${Math.random().toString(36).slice(2, 8)}`,
    trainer_id: trainerId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    rule_type: ruleType,
    label: label || null,
  }
}
