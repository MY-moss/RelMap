export const personKeys = {
  all: ['persons'] as const,
  lists: () => [...personKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...personKeys.lists(), filters] as const,
  details: () => [...personKeys.all, 'detail'] as const,
  detail: (id: string) => [...personKeys.details(), id] as const,
}

export const relationKeys = {
  all: ['relations'] as const,
  lists: () => [...relationKeys.all, 'list'] as const,
  list: (personId: string) => [...relationKeys.lists(), personId] as const,
  graph: (minIntimacy?: number, limit?: number) => [...relationKeys.all, 'graph', minIntimacy, limit] as const,
  distribution: () => [...relationKeys.all, 'distribution'] as const,
}

export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...eventKeys.lists(), filters] as const,
}

export const diaryKeys = {
  all: ['diaries'] as const,
  lists: () => [...diaryKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...diaryKeys.lists(), filters] as const,
}

export const reminderKeys = {
  all: ['reminders'] as const,
  lists: () => [...reminderKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...reminderKeys.lists(), filters] as const,
  upcoming: (days: number) => [...reminderKeys.all, 'upcoming', days] as const,
}

export const socialKeys = {
  all: ['socialAccounts'] as const,
  byPerson: (personId: string) => [...socialKeys.all, personId] as const,
}

export const photoKeys = {
  all: ['photos'] as const,
  byPerson: (personId: string) => [...photoKeys.all, 'person', personId] as const,
  list: (limit?: number, offset?: number) => [...photoKeys.all, 'list', limit, offset] as const,
}

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  detail: (id: string) => [...groupKeys.all, 'detail', id] as const,
  members: (id: string) => [...groupKeys.all, 'members', id] as const,
  byPerson: (personId: string) => [...groupKeys.all, 'byPerson', personId] as const,
}

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  byTarget: (targetId: string, targetType: string) => [...tagKeys.all, 'byTarget', targetId, targetType] as const,
}

export const interactionKeys = {
  all: ['interactions'] as const,
  lists: () => [...interactionKeys.all, 'list'] as const,
  byPerson: (personId: string, limit?: number) => [...interactionKeys.all, 'byPerson', personId, limit] as const,
  list: (filters?: Record<string, unknown>) => [...interactionKeys.all, 'list', filters] as const,
}

export const searchKeys = {
  all: ['search'] as const,
  global: (query: string) => [...searchKeys.all, 'global', query] as const,
}

export const followUpKeys = {
  all: ['followUp'] as const,
  lists: () => [...followUpKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...followUpKeys.lists(), filters] as const,
}
