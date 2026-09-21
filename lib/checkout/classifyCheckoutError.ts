/** Extract "table.column" or "'column'" from PostgREST / Postgres schema errors. */
function extractMissingColumn(raw: string): string | null {
  const dotted = raw.match(
    /column\s+([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)\s+does\s+not\s+exist/i,
  )
  if (dotted?.[1]) return dotted[1]

  const quoted = raw.match(
    /could\s+not\s+find\s+the\s+'([^']+)'\s+column(?:\s+of\s+'([^']+)')?/i,
  )
  if (quoted?.[1]) {
    return quoted[2] ? `${quoted[2]}.${quoted[1]}` : quoted[1]
  }

  const ofThe = raw.match(
    /column\s+'([^']+)'\s+of\s+(?:relation\s+)?'?([a-zA-Z_][a-zA-Z0-9_]*)'?/i,
  )
  if (ofThe?.[1]) {
    return ofThe[2] ? `${ofThe[2]}.${ofThe[1]}` : ofThe[1]
  }

  return null
}

function isSchemaColumnError(lower: string): boolean {
  return (
    lower.includes('schema cache') ||
    lower.includes('could not find') ||
    lower.includes('does not exist') ||
    lower.includes('pgrst') ||
    (lower.includes('column') &&
      (lower.includes('orders') ||
        lower.includes('inventory') ||
        lower.includes('vendor_staff') ||
        lower.includes('of the') ||
        lower.includes('of relation')))
  )
}

function schemaErrorMessage(raw: string, isHold: boolean): string {
  const column = extractMissingColumn(raw)
  if (column) {
    return isHold
      ? `Missing column ${column}. Hold was not saved.`
      : `Missing column ${column}. Sale was not saved.`
  }
  return isHold
    ? 'POS schema out of date (missing column). Contact support before retrying hold.'
    : 'POS schema out of date (missing column). Sale was not saved — contact support.'
}

/** Map PostgREST / network errors into till-facing copy + retry policy. */
export function classifyCheckoutError(
  raw: string | null | undefined,
  isHold: boolean,
): { error: string; retryable: boolean } {
  const text = (raw || '').trim()
  const lower = text.toLowerCase()

  // Empty PostgREST errors are not network failures — do not enqueue offline.
  if (!text) {
    return {
      error: isHold
        ? 'Could not save hold (server returned no details). Try again or contact support.'
        : 'Could not save sale (server returned no details). Try again or contact support.',
      retryable: false,
    }
  }

  // Schema / column mismatches must NOT enter the offline outbox.
  if (isSchemaColumnError(lower)) {
    return {
      error: schemaErrorMessage(text, isHold),
      retryable: false,
    }
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('offline') ||
    lower.includes('fetch')
  ) {
    return {
      error: isHold
        ? 'No connection. Hold requires an online connection — try again when connected.'
        : 'No connection. Sale can sync when you are online.',
      retryable: !isHold,
    }
  }

  // Idempotent outbox: unique pos_external_id means the sale already landed.
  if (
    lower.includes('pos_external_id') &&
    (lower.includes('duplicate') ||
      lower.includes('unique') ||
      lower.includes('already exists') ||
      lower.includes('23505'))
  ) {
    return {
      error: 'Sale already synced',
      retryable: false,
    }
  }

  if (lower.includes('row-level security') || lower.includes('permission') || lower.includes('42501')) {
    return {
      error: isHold
        ? 'You do not have permission to hold orders for this restaurant.'
        : 'You do not have permission to record sales for this restaurant.',
      retryable: false,
    }
  }

  if (lower.includes('violates') || lower.includes('null value') || lower.includes('invalid input')) {
    return {
      error: isHold ? 'Could not hold order (invalid data).' : 'Could not record sale (invalid data).',
      retryable: false,
    }
  }

  // Prefer short server messages; fall back to generic.
  if (text.length > 0 && text.length <= 120 && !text.includes('\n') && !lower.includes('http')) {
    return { error: text, retryable: false }
  }

  return {
    error: isHold ? 'Failed to hold order' : 'Failed to record sale',
    retryable: false,
  }
}
