// Single source of truth for category + tag taxonomy.
// Categories: 7 real umbrellas. "For You" and "All" are UI-only meta filters
// (handled in the Explore page) — they're not stored on activities.
//
// Tags: free-form text[] on activities. Up to 3 per activity. The lists
// below are the curated palette per category — UI uses these to render
// chip suggestions in the Create form and as the secondary filter row on
// Explore. Users can't create new tags (MVP).

export const CATEGORIES = [
  'Travel',
  'Local',
  'Sports',
  'Learning',
  'Help',
  'Events',
  'Wellness',
] as const

export type Category = typeof CATEGORIES[number]

export const TAGS_BY_CATEGORY: Record<Category, string[]> = {
  Travel:   ['Road Trip', 'Carpool', 'Flight', 'Group Travel', 'Solo', 'Ride Share'],
  Local:    ['Outdoor', 'Food', 'Markets', 'Volunteering', 'Neighborhood'],
  Sports:   ['Basketball', 'Football', 'Soccer', 'Tennis', 'Running', 'Gym', 'Pickup', 'Gaming'],
  Learning: ['Language', 'Coding', 'Music', 'Art', 'Tutoring', 'Book Club'],
  Help:     ['Ride Share', 'Dog Walk', 'Babysit', 'Errands', 'Pet Help', 'Moving Help'],
  Events:   ['Party', 'Concert', 'Meetup', 'Watch Party', 'Nightlife', 'Open Mic'],
  Wellness: ['Pray', 'Meditation', 'Yoga', 'Walking', 'Support Circle'],
}

// Max tags per activity. Hard cap, enforced in the form UI.
export const MAX_TAGS = 3

// Returns the tag palette for a given category. Empty array for an
// unknown category — caller decides whether to show "no tags" or hide row.
export function tagsForCategory(category: string | null | undefined): string[] {
  if (!category) return []
  return TAGS_BY_CATEGORY[category as Category] || []
}

// Maps a legacy category (pre-refactor) to the new canonical category.
// Used in client code as a defensive fallback if any UI still references
// old labels. The DB migration already remapped stored rows.
export function normalizeLegacyCategory(c: string | null | undefined): Category | string {
  if (!c) return 'Local'
  switch (c) {
    case 'Local Activities': return 'Local'
    case 'Sports / Play':    return 'Sports'
    case 'Help / Support':   return 'Help'
    case 'Outdoor':          return 'Local'
    case 'Gaming':           return 'Sports'
    case 'Ride Share':       return 'Help'
    case 'Dog Walk':         return 'Help'
    case 'Babysit':          return 'Help'
    case 'Party':            return 'Events'
    case 'Pray':             return 'Wellness'
    case 'Others':           return 'Local'
    default:                 return c as Category
  }
}
