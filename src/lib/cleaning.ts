import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export type DataCell = string
export type DataRow = Record<string, DataCell>

export interface DataTable {
    columns: string[]
    rows: DataRow[]
}

export type FillDirection = 'forward' | 'backward' | 'both'
export type DedupMode = 'wholeRow' | 'byColumns'
export type KeepStrategy = 'first' | 'last'
export type DateOutputFormat =
    | 'YYYY-MM-DD'
    | 'YYYY/MM/DD'
    | 'YYYY-MM-DD HH:mm:ss'
    | 'ISO'
export type TimezoneMode = 'local' | 'utc'
export type InvalidDateHandling = 'keep' | 'empty'
export type TextColumnsMode = 'allText' | 'selected'
export type PhoneOutputMode = 'E164' | 'digits'

export interface CleaningRules {
    missing: {
        trimWhitespaceForEmptyCheck: boolean
        removeEmptyRows: boolean
        removeEmptyCols: boolean
        fillDefault: {
            enabled: boolean
            columns: string[]
            values: Record<string, string>
            onlyWhenEmpty: boolean
        }
        fillForwardBackward: {
            enabled: boolean
            columns: string[]
            directions: Record<string, FillDirection>
            limit: number | null
        }
    }
    dedup: {
        enabled: boolean
        mode: DedupMode
        columns: string[]
        keep: KeepStrategy
        normalizeText: boolean
    }
    format: {
        date: {
            enabled: boolean
            columns: string[]
            outputFormat: DateOutputFormat
            timezone: TimezoneMode
            onInvalid: InvalidDateHandling
        }
        phone: {
            enabled: boolean
            columns: string[]
            countryCode: string
            output: PhoneOutputMode
        }
        email: {
            enabled: boolean
            columns: string[]
            lowercase: boolean
            trim: boolean
        }
        text: {
            enabled: boolean
            columnsMode: TextColumnsMode
            columns: string[]
            trim: boolean
            collapseSpaces: boolean
            removeAllWhitespace: boolean
        }
    }
    columns: {
        rename: {
            enabled: boolean
            mappings: Array<{ from: string; to: string }>
        }
        drop: {
            enabled: boolean
            columns: string[]
        }
        split: {
            enabled: boolean
            column: string
            separator: string
            into: string[]
            keepOriginal: boolean
        }
        merge: {
            enabled: boolean
            columns: string[]
            separator: string
            into: string
            dropSources: boolean
        }
    }
}

export interface CleaningStats {
    rowsBefore: number
    rowsAfter: number
    colsBefore: number
    colsAfter: number
    removedEmptyRows: number
    removedEmptyCols: number
    filledDefaultCells: number
    filledForwardBackwardCells: number
    removedDuplicates: number
    formattedDateCells: number
    normalizedPhoneCells: number
    normalizedEmailCells: number
    cleanedTextCells: number
    renamedColumns: number
    droppedColumns: number
    splitColumnsAdded: number
    mergedColumnsAdded: number
}

export interface CleaningResult {
    data: DataTable
    stats: CleaningStats
}


export function asNumberOrNull(val: string): number | null {
    if (!val) return null
    const n = parseInt(val, 10)
    return isNaN(n) ? null : n
}

export function createDefaultRules(): CleaningRules {
    return {
        missing: {
            trimWhitespaceForEmptyCheck: true,
            removeEmptyRows: false,
            removeEmptyCols: false,
            fillDefault: {
                enabled: false,
                columns: [],
                values: {},
                onlyWhenEmpty: true
            },
            fillForwardBackward: {
                enabled: false,
                columns: [],
                directions: {},
                limit: null
            }
        },
        dedup: {
            enabled: false,
            mode: 'wholeRow',
            columns: [],
            keep: 'first',
            normalizeText: true
        },
        format: {
            date: {
                enabled: false,
                columns: [],
                outputFormat: 'YYYY-MM-DD',
                timezone: 'local',
                onInvalid: 'keep'
            },
            phone: {
                enabled: false,
                columns: [],
                countryCode: '86',
                output: 'digits'
            },
            email: {
                enabled: false,
                columns: [],
                lowercase: true,
                trim: true
            },
            text: {
                enabled: false,
                columnsMode: 'allText',
                columns: [],
                trim: true,
                collapseSpaces: false,
                removeAllWhitespace: false
            }
        },
        columns: {
            rename: { enabled: false, mappings: [] },
            drop: { enabled: false, columns: [] },
            split: {
                enabled: false,
                column: '',
                separator: '',
                into: [],
                keepOriginal: true
            },
            merge: {
                enabled: false,
                columns: [],
                separator: '',
                into: '',
                dropSources: false
            }
        }
    }
}

function normalizeHeaderName(name: unknown, index: number) {
    const raw = String(name ?? '').trim()
    return raw.length > 0 ? raw : `列${index + 1}`
}

function uniqueHeaders(headers: unknown[]) {
    const counts = new Map<string, number>()
    return headers.map((h, i) => {
        const base = normalizeHeaderName(h, i)
        const prev = counts.get(base) ?? 0
        counts.set(base, prev + 1)
        return prev === 0 ? base : `${base}_${prev + 1}`
    })
}

function aoaToTable(aoa: unknown[][]): DataTable {
    if (!aoa.length) return { columns: [], rows: [] }
    const columns = uniqueHeaders(aoa[0] ?? [])
    const rows: DataRow[] = []

    for (let r = 1; r < aoa.length; r++) {
        const arr = aoa[r] ?? []
        const row: DataRow = {}
        columns.forEach((col, c) => {
            const v = arr[c]
            row[col] = v == null ? '' : String(v)
        })
        rows.push(row)
    }

    return { columns, rows }
}

export async function parseSpreadsheetFile(file: File): Promise<DataTable> {
    const name = file.name.toLowerCase()

    if (name.endsWith('.csv')) {
        const text = await file.text()
        const parsed = Papa.parse<string[]>(text, {
            skipEmptyLines: false
        })
        const aoa = (parsed.data as unknown as unknown[][]) ?? []
        return aoaToTable(aoa)
    }

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = wb.SheetNames[0]
        const sheet = wb.Sheets[firstSheetName]
        const aoa = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: true,
            raw: false
        }) as unknown[][]
        return aoaToTable(aoa)
    }

    return { columns: [], rows: [] }
}

function isEmptyCell(value: string, trim: boolean) {
    const v = trim ? value.trim() : value
    return v.length === 0
}

function pad2(n: number) {
    return String(n).padStart(2, '0')
}

function formatDate(date: Date, fmt: DateOutputFormat, tz: TimezoneMode) {
    const year = tz === 'utc' ? date.getUTCFullYear() : date.getFullYear()
    const month = tz === 'utc' ? date.getUTCMonth() + 1 : date.getMonth() + 1
    const day = tz === 'utc' ? date.getUTCDate() : date.getDate()
    const hours = tz === 'utc' ? date.getUTCHours() : date.getHours()
    const minutes = tz === 'utc' ? date.getUTCMinutes() : date.getMinutes()
    const seconds = tz === 'utc' ? date.getUTCSeconds() : date.getSeconds()

    if (fmt === 'ISO') return date.toISOString()
    if (fmt === 'YYYY/MM/DD') return `${year}/${pad2(month)}/${pad2(day)}`
    if (fmt === 'YYYY-MM-DD HH:mm:ss')
        return `${year}-${pad2(month)}-${pad2(day)} ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
    return `${year}-${pad2(month)}-${pad2(day)}`
}

function tryParseDate(input: string): Date | null {
    const v = input.trim()
    if (!v) return null

    const t = Date.parse(v)
    if (!Number.isNaN(t)) return new Date(t)

    const ymd = v.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/)
    if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))

    const ymdCompact = v.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (ymdCompact)
        return new Date(
            Number(ymdCompact[1]),
            Number(ymdCompact[2]) - 1,
            Number(ymdCompact[3])
        )

    const dmy = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))

    return null
}

function normalizeTextValue(v: string) {
    return v.trim().toLowerCase()
}

export function applyCleaningRules(input: DataTable, rules: CleaningRules): CleaningResult {
    const stats: CleaningStats = {
        rowsBefore: input.rows.length,
        rowsAfter: input.rows.length,
        colsBefore: input.columns.length,
        colsAfter: input.columns.length,
        removedEmptyRows: 0,
        removedEmptyCols: 0,
        filledDefaultCells: 0,
        filledForwardBackwardCells: 0,
        removedDuplicates: 0,
        formattedDateCells: 0,
        normalizedPhoneCells: 0,
        normalizedEmailCells: 0,
        cleanedTextCells: 0,
        renamedColumns: 0,
        droppedColumns: 0,
        splitColumnsAdded: 0,
        mergedColumnsAdded: 0
    }

    let data: DataTable = {
        columns: [...input.columns],
        rows: input.rows.map((r) => ({ ...r }))
    }

    if (rules.columns.rename.enabled && rules.columns.rename.mappings.length) {
        const mapping = new Map(
            rules.columns.rename.mappings
                .filter((m) => m.from.trim() && m.to.trim())
                .map((m) => [m.from.trim(), m.to.trim()])
        )
        if (mapping.size) {
            data = {
                columns: data.columns.map((c) => mapping.get(c) ?? c),
                rows: data.rows.map((row) => {
                    const next: DataRow = {}
                    data.columns.forEach((col) => {
                        const newKey = mapping.get(col) ?? col
                        next[newKey] = row[col] ?? ''
                    })
                    return next
                })
            }
            stats.renamedColumns = mapping.size
        }
    }

    if (rules.columns.drop.enabled && rules.columns.drop.columns.length) {
        const toDrop = new Set(rules.columns.drop.columns)
        data = {
            columns: data.columns.filter((c) => !toDrop.has(c)),
            rows: data.rows.map((row) => {
                const next: DataRow = {}
                Object.keys(row).forEach((k) => {
                    if (!toDrop.has(k)) next[k] = row[k]
                })
                return next
            })
        }
        stats.droppedColumns = toDrop.size
    }

    if (rules.columns.split.enabled && rules.columns.split.column) {
        const from = rules.columns.split.column
        const into = rules.columns.split.into.filter((n) => n.trim()).map((n) => n.trim())
        if (data.columns.includes(from) && into.length) {
            const sep = rules.columns.split.separator
            const nextColumns = [...data.columns]
            into.forEach((c) => {
                if (!nextColumns.includes(c)) nextColumns.push(c)
            })
            data = {
                columns: nextColumns,
                rows: data.rows.map((row) => {
                    const raw = row[from] ?? ''
                    const parts =
                        sep.trim().length > 0 ? raw.split(sep) : raw.trim().split(/\s+/)
                    const next: DataRow = { ...row }
                    into.forEach((c, idx) => {
                        next[c] = parts[idx] == null ? '' : String(parts[idx])
                    })
                    if (!rules.columns.split.keepOriginal) delete next[from]
                    return next
                })
            }
            stats.splitColumnsAdded = into.length
            if (!rules.columns.split.keepOriginal) {
                data.columns = data.columns.filter((c) => c !== from)
            }
        }
    }

    if (rules.columns.merge.enabled && rules.columns.merge.into && rules.columns.merge.columns.length) {
        const into = rules.columns.merge.into.trim()
        const cols = rules.columns.merge.columns.filter((c) => data.columns.includes(c))
        if (into && cols.length) {
            const sep = rules.columns.merge.separator
            const nextColumns = data.columns.includes(into) ? [...data.columns] : [...data.columns, into]
            data = {
                columns: nextColumns,
                rows: data.rows.map((row) => {
                    const next: DataRow = { ...row }
                    next[into] = cols.map((c) => row[c] ?? '').join(sep)
                    if (rules.columns.merge.dropSources) cols.forEach((c) => delete next[c])
                    return next
                })
            }
            stats.mergedColumnsAdded = data.columns.includes(into) ? 0 : 1
            if (rules.columns.merge.dropSources) {
                data.columns = data.columns.filter((c) => c === into || !cols.includes(c))
                stats.droppedColumns += cols.length
            }
        }
    }

    if (rules.format.text.enabled) {
        const cols =
            rules.format.text.columnsMode === 'selected'
                ? rules.format.text.columns.filter((c) => data.columns.includes(c))
                : data.columns
        data = {
            ...data,
            rows: data.rows.map((row) => {
                const next: DataRow = { ...row }
                cols.forEach((c) => {
                    const raw = next[c] ?? ''
                    let v = raw
                    if (rules.format.text.removeAllWhitespace) {
                        v = v.replace(/\s+/g, '')
                    } else if (rules.format.text.collapseSpaces) {
                        v = v.replace(/\s+/g, ' ')
                    }
                    if (rules.format.text.trim) v = v.trim()
                    if (v !== raw) {
                        next[c] = v
                        stats.cleanedTextCells += 1
                    }
                })
                return next
            })
        }
    }

    if (rules.format.email.enabled) {
        const cols = rules.format.email.columns.filter((c) => data.columns.includes(c))
        data = {
            ...data,
            rows: data.rows.map((row) => {
                const next: DataRow = { ...row }
                cols.forEach((c) => {
                    const raw = next[c] ?? ''
                    let v = raw
                    if (rules.format.email.trim) v = v.trim()
                    if (rules.format.email.lowercase) v = v.toLowerCase()
                    if (v !== raw) {
                        next[c] = v
                        stats.normalizedEmailCells += 1
                    }
                })
                return next
            })
        }
    }

    if (rules.format.phone.enabled) {
        const cols = rules.format.phone.columns.filter((c) => data.columns.includes(c))
        const cc = rules.format.phone.countryCode.replace(/[^\d]/g, '').trim()
        data = {
            ...data,
            rows: data.rows.map((row) => {
                const next: DataRow = { ...row }
                cols.forEach((c) => {
                    const raw = next[c] ?? ''
                    const digits = raw.replace(/[^\d]/g, '')
                    if (!digits) return
                    const v =
                        rules.format.phone.output === 'E164' && cc
                            ? `+${cc}${digits}`
                            : digits
                    if (v !== raw) {
                        next[c] = v
                        stats.normalizedPhoneCells += 1
                    }
                })
                return next
            })
        }
    }

    if (rules.format.date.enabled) {
        const cols = rules.format.date.columns.filter((c) => data.columns.includes(c))
        data = {
            ...data,
            rows: data.rows.map((row) => {
                const next: DataRow = { ...row }
                cols.forEach((c) => {
                    const raw = next[c] ?? ''
                    const date = tryParseDate(raw)
                    if (!date) {
                        if (rules.format.date.onInvalid === 'empty' && raw.trim().length) {
                            next[c] = ''
                            stats.formattedDateCells += 1
                        }
                        return
                    }
                    const v = formatDate(date, rules.format.date.outputFormat, rules.format.date.timezone)
                    if (v !== raw) {
                        next[c] = v
                        stats.formattedDateCells += 1
                    }
                })
                return next
            })
        }
    }

    if (rules.missing.fillDefault.enabled && rules.missing.fillDefault.columns.length) {
        const cols = rules.missing.fillDefault.columns.filter((c) => data.columns.includes(c))
        data = {
            ...data,
            rows: data.rows.map((row) => {
                const next: DataRow = { ...row }
                cols.forEach((c) => {
                    const raw = next[c] ?? ''
                    const defVal = rules.missing.fillDefault.values[c] ?? ''
                    const empty = isEmptyCell(raw, rules.missing.trimWhitespaceForEmptyCheck)
                    if (!rules.missing.fillDefault.onlyWhenEmpty || empty) {
                        if (defVal !== raw) {
                            next[c] = defVal
                            stats.filledDefaultCells += 1
                        }
                    }
                })
                return next
            })
        }
    }

    if (rules.missing.fillForwardBackward.enabled && rules.missing.fillForwardBackward.columns.length) {
        const cols = rules.missing.fillForwardBackward.columns.filter((c) => data.columns.includes(c))
        const limit = rules.missing.fillForwardBackward.limit

        const fillForward = (c: string) => {
            let lastNonEmpty: string | null = null
            let since = 0
            data.rows.forEach((row) => {
                const raw = row[c] ?? ''
                if (!isEmptyCell(raw, rules.missing.trimWhitespaceForEmptyCheck)) {
                    lastNonEmpty = raw
                    since = 0
                    return
                }
                if (lastNonEmpty == null) return
                if (limit != null && since >= limit) {
                    since += 1
                    return
                }
                row[c] = lastNonEmpty
                since += 1
                stats.filledForwardBackwardCells += 1
            })
        }

        const fillBackward = (c: string) => {
            let nextNonEmpty: string | null = null
            let since = 0
            for (let i = data.rows.length - 1; i >= 0; i--) {
                const raw = data.rows[i][c] ?? ''
                if (!isEmptyCell(raw, rules.missing.trimWhitespaceForEmptyCheck)) {
                    nextNonEmpty = raw
                    since = 0
                    continue
                }
                if (nextNonEmpty == null) continue
                if (limit != null && since >= limit) {
                    since += 1
                    continue
                }
                data.rows[i][c] = nextNonEmpty
                since += 1
                stats.filledForwardBackwardCells += 1
            }
        }

        cols.forEach((c) => {
            const dir = rules.missing.fillForwardBackward.directions[c] || 'forward'
            if (dir === 'forward') fillForward(c)
            if (dir === 'backward') fillBackward(c)
            if (dir === 'both') {
                fillForward(c)
                fillBackward(c)
            }
        })
    }

    if (rules.missing.removeEmptyRows) {
        const before = data.rows.length
        data = {
            ...data,
            rows: data.rows.filter((row) => {
                return !data.columns.every((c) =>
                    isEmptyCell(row[c] ?? '', rules.missing.trimWhitespaceForEmptyCheck)
                )
            })
        }
        stats.removedEmptyRows = before - data.rows.length
    }

    if (rules.missing.removeEmptyCols) {
        const before = data.columns.length
        const keep = data.columns.filter((c) => {
            return !data.rows.every((row) =>
                isEmptyCell(row[c] ?? '', rules.missing.trimWhitespaceForEmptyCheck)
            )
        })
        if (keep.length !== data.columns.length) {
            data = {
                columns: keep,
                rows: data.rows.map((row) => {
                    const next: DataRow = {}
                    keep.forEach((c) => (next[c] = row[c] ?? ''))
                    return next
                })
            }
            stats.removedEmptyCols = before - keep.length
        }
    }

    if (rules.dedup.enabled) {
        const before = data.rows.length
        const cols =
            rules.dedup.mode === 'byColumns' && rules.dedup.columns.length
                ? rules.dedup.columns.filter((c) => data.columns.includes(c))
                : data.columns

        const seen = new Map<string, number>()
        const indexByRow = data.rows.map((row, idx) => {
            const parts = cols.map((c) => {
                const v = row[c] ?? ''
                return rules.dedup.normalizeText ? normalizeTextValue(v) : v
            })
            const key = parts.join('\u0001')
            if (!seen.has(key)) seen.set(key, idx)
            return { key, idx }
        })

        const keepIdx = new Set<number>()
        if (rules.dedup.keep === 'first') {
            seen.forEach((idx) => keepIdx.add(idx))
        } else if (rules.dedup.keep === 'last') {
            const last = new Map<string, number>()
            indexByRow.forEach(({ key, idx }) => last.set(key, idx))
            last.forEach((idx) => keepIdx.add(idx))
        }

        data = { ...data, rows: data.rows.filter((_, idx) => keepIdx.has(idx)) }
        stats.removedDuplicates = before - data.rows.length
    }

    stats.rowsAfter = data.rows.length
    stats.colsAfter = data.columns.length

    return { data, stats }
}
