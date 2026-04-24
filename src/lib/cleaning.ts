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
    | 'YYYY-MM-DD HH:mm'
    | 'YYYY-MM-DD HH:mm:ss'
    | 'YYYY年MM月DD日'
    | 'YYYY年MM月DD日 HH时mm分'
    | 'YYYY年MM月DD日 HH时mm分ss秒'
    | 'ISO'
export type TimezoneMode = 'local' | 'utc'
export type InvalidDateHandling = 'keep' | 'empty'
export type TextColumnsMode = 'allText' | 'selected'
export type PhoneOutputMode = 'E164' | 'digits'

export interface CleaningRules {
    missing: {
        trimWhitespaceForEmptyCheck: boolean
        removeEmptyRows: {
            enabled: boolean
            condition: 'all' | 'any'
            columnsMode: 'all' | 'custom'
            columns: string[]
        }
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
        currency: {
            enabled: boolean
            columns: string[]
            symbol: string
            decimalPlaces: number
            thousandsSeparator: boolean
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
        removeEmptyCols: {
            enabled: boolean
            condition: 'all' | 'any'
        }
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
    formattedCurrencyCells: number
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
            removeEmptyRows: {
                enabled: false,
                condition: 'all',
                columnsMode: 'all',
                columns: []
            },
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
            currency: {
                enabled: false,
                columns: [],
                symbol: '¥',
                decimalPlaces: 2,
                thousandsSeparator: true
            },
            phone: {
                enabled: false,
                columns: [],
                countryCode: '',
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
            removeEmptyCols: {
                enabled: false,
                condition: 'all'
            },
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
    const raw = String(name ?? '')
    return raw.trim().length > 0 ? raw : `列${index + 1}` // 注意：表头名称为了不重名和展示，还是保留了判断逻辑，但最好也不要 trim
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



export async function parseSpreadsheetFile(file: File): Promise<DataTable> {
    const name = file.name.toLowerCase()

    if (name.endsWith('.csv')) {
        const text = await file.text()
        const parsed = Papa.parse<string[]>(text, {
            skipEmptyLines: false
        })
        const aoa = (parsed.data as unknown[][]) ?? []
        // 对于 CSV，保留所有空格，不做任何自动 trim
        if (!aoa.length) return { columns: [], rows: [] }
        const columns = uniqueHeaders(aoa[0] ?? [])
        const rows: DataRow[] = []

        // 跳过最后一行如果是完全空的（Papa.parse 常见的行为）
        const len = aoa.length > 1 && aoa[aoa.length - 1].length === 1 && String(aoa[aoa.length - 1][0]).trim() === '' 
            ? aoa.length - 1 
            : aoa.length

        for (let r = 1; r < len; r++) {
            const arr = aoa[r] ?? []
            // 跳过 CSV 中可能因为空行产生的完全空的数组（比如只有一个空字符串的数组），除非它确实有数据列
            // 但为了真实反映脏数据，我们还是保留空行，交由规则去处理
            const row: DataRow = {}
            columns.forEach((col, c) => {
                const v = arr[c]
                // 强制将 null/undefined 转为空字符串，保留任何可能存在的首尾空格
                row[col] = v == null ? '' : String(v)
            })
            rows.push(row)
        }

        return { columns, rows }
    }

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = wb.SheetNames[0]
        const sheet = wb.Sheets[firstSheetName]
        // 修复 SheetJS 默认丢弃空行的 bug
        const aoa = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: true,
            raw: false,
            defval: '' // 强制将空单元格转换为 '' 而不是忽略
        }) as unknown[][]
        // 对于 Excel，同样保留所有空格，不做任何自动 trim
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
    if (fmt === 'YYYY-MM-DD HH:mm')
        return `${year}-${pad2(month)}-${pad2(day)} ${pad2(hours)}:${pad2(minutes)}`
    if (fmt === 'YYYY-MM-DD HH:mm:ss')
        return `${year}-${pad2(month)}-${pad2(day)} ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
    if (fmt === 'YYYY年MM月DD日') return `${year}年${pad2(month)}月${pad2(day)}日`
    if (fmt === 'YYYY年MM月DD日 HH时mm分')
        return `${year}年${pad2(month)}月${pad2(day)}日 ${pad2(hours)}时${pad2(minutes)}分`
    if (fmt === 'YYYY年MM月DD日 HH时mm分ss秒')
        return `${year}年${pad2(month)}月${pad2(day)}日 ${pad2(hours)}时${pad2(minutes)}分${pad2(seconds)}秒`
    return `${year}-${pad2(month)}-${pad2(day)}`
}

function tryParseDate(input: string): Date | null {
    const v = input.trim()
    if (!v) return null

    // 先尝试通用的中文清理（将年月替换为-，将日、时、分、秒提取）
    // 这可以极大增强 Date.parse() 和我们自定义正则的兼容性
    let normalized = v
        .replace(/年|月/g, '-')
        .replace(/日/g, ' ')
        .replace(/时|分/g, ':')
        .replace(/秒/g, '')
        .replace(/：/g, ':') // 替换中文全角冒号为英文半角冒号
        .replace(/\s*:\s*/g, ':') // 把冒号前后的所有空格直接干掉，变成紧凑的 :
        .replace(/\s*-\s*/g, '-') // 把连字符前后的所有空格直接干掉，变成紧凑的 -
        .replace(/\s+/g, ' ') // 把其他地方多余的空格压缩为一个空格
        .trim()
    
    // 如果末尾多了一个冒号（比如去掉了“分”但是没秒），把冒号去掉
    if (normalized.endsWith(':')) {
        normalized = normalized.slice(0, -1)
    }

    // 支持带时间的完整匹配 YYYY-MM-DD HH:mm:ss 或 YYYY/MM/DD HH:mm:ss (含无秒数的情况)
    // 注意：这里的正则增加了对冒号前后空格的宽容匹配，例如 20: 10 或 20 : 10
    const ymdhms = normalized.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})[\sT](\d{1,2})\s*:\s*(\d{1,2})(?:\s*:\s*(\d{1,2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/i)
    if (ymdhms) {
        const d = new Date(
            Number(ymdhms[1]),
            Number(ymdhms[2]) - 1,
            Number(ymdhms[3]),
            Number(ymdhms[4]),
            Number(ymdhms[5]),
            ymdhms[6] ? Number(ymdhms[6]) : 0
        )
        // 如果有显式的时区标记（如 Z 或 +08:00），则交由 Date.parse 处理
        if (ymdhms[7]) {
            const t = Date.parse(normalized)
            if (!Number.isNaN(t)) return new Date(t)
        }
        return d
    }

    const ymd = normalized.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/)
    if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))

    const ymdCompact = normalized.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (ymdCompact)
        return new Date(
            Number(ymdCompact[1]),
            Number(ymdCompact[2]) - 1,
            Number(ymdCompact[3])
        )



    const dmy = normalized.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))

    const t = Date.parse(normalized)
    if (!Number.isNaN(t)) return new Date(t)

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
        formattedCurrencyCells: 0,
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
        const into = rules.columns.split.into.map((n) => n.trim()).filter((n) => n)
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
            let mergedCount = 0
            data = {
                columns: nextColumns,
                rows: data.rows.map((row) => {
                    const next: DataRow = { ...row }
                    // 过滤掉空值（空字符串、null、undefined），然后再 join
                    const validVals = cols
                        .map((c) => row[c])
                        .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
                    
                    next[into] = validVals.length > 0 ? validVals.join(sep) : ''
                    if (validVals.length > 0) mergedCount += 1
                    
                    if (rules.columns.merge.dropSources) cols.forEach((c) => delete next[c])
                    return next
                })
            }
            stats.mergedColumnsAdded = mergedCount > 0 ? 1 : 0
            if (rules.columns.merge.dropSources) {
                // 不计算 target column
                const actualDropped = cols.filter(c => c !== into).length
                data.columns = data.columns.filter((c) => c === into || !cols.includes(c))
                stats.droppedColumns += actualDropped
            }
        }
    }

    // 当 rules.format.text 没有 enable 时，完全不执行文本清理逻辑
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
                    // 如果原值就是纯空值，没必要进行 text trim 等操作，直接跳过
                    if (raw === '' || raw === null) return
                    
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
        // countryCode 可能为空
        const cc = (rules.format.phone.countryCode || '').replace(/[^\d]/g, '').trim()
        data = {
            ...data,
            rows: data.rows.map((row) => {
                const next: DataRow = { ...row }
                cols.forEach((c) => {
                    const raw = next[c] ?? ''
                    
                    // 去除原值中可能已有的 + 及其紧跟的国家码（例如 +86、+(86)、+ 86）
                    // 避免用户选了 E164 后，原值自带的 86 和新加的 86 重复
                    let cleanedRaw = raw
                    
                    // 1. 无论是否有配置 cc，先尝试剥离所有带 + 号或括号的通用国际区号（如 +86, (+86), +1 等）
                    const genericRegex = /^\s*(?:\+\s*\d+|\+\s*\(\s*\d+\s*\)|\(\s*\+?\d+\s*\))\s*/
                    let prev = ''
                    while (cleanedRaw !== prev) {
                        prev = cleanedRaw
                        cleanedRaw = cleanedRaw.replace(genericRegex, '')
                    }

                    // 2. 如果配置了特定的 cc，还要剥离那些没有带 + 号但正好等于 cc 的前缀（如 86138... 去掉 86）
                    if (cc) {
                        const specificRegex = new RegExp(`^\\s*${cc}\\s*`, 'i')
                        prev = ''
                        while (cleanedRaw !== prev) {
                            prev = cleanedRaw
                            cleanedRaw = cleanedRaw.replace(specificRegex, '')
                        }
                    }

                    // 3. 去除可能残留的单纯 + 号
                    cleanedRaw = cleanedRaw.replace(/^\s*\+?\s*/, '')
                    
                    const digits = cleanedRaw.replace(/[^\d]/g, '')
                    if (!digits) return
                    
                    let v = digits
                    if (rules.format.phone.output === 'E164') {
                        v = cc ? `+${cc}${digits}` : `+${digits}`
                    }
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

    if (rules.format.currency.enabled) {
        const cols = rules.format.currency.columns.filter((c) => data.columns.includes(c))
        const sym = rules.format.currency.symbol
        const dec = rules.format.currency.decimalPlaces
        const thou = rules.format.currency.thousandsSeparator
        
        data = {
            ...data,
            rows: data.rows.map((row) => {
                const next: DataRow = { ...row }
                cols.forEach((c) => {
                    const raw = next[c] ?? ''
                    // 先把原字符串中的所有千分位逗号和空白字符去掉，避免影响正则匹配和 parseFloat
                    const cleanedRaw = raw.replace(/,/g, '').replace(/\s+/g, '')
                    const match = cleanedRaw.match(/[-+]?\d*\.?\d+/)
                    if (!match) return
                    const num = parseFloat(match[0])
                    if (isNaN(num)) return
                    
                    const parts = num.toFixed(dec).split('.')
                    let intPart = parts[0]
                    if (thou) {
                        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                    }
                    const v = `${sym}${intPart}${parts.length > 1 ? '.' + parts[1] : ''}`
                    
                    if (v !== raw) {
                        next[c] = v
                        stats.formattedCurrencyCells = (stats.formattedCurrencyCells || 0) + 1
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

    if (rules.missing.removeEmptyRows.enabled) {
        const cond = rules.missing.removeEmptyRows.condition
        const mode = rules.missing.removeEmptyRows.columnsMode
        const targetCols = mode === 'custom' && rules.missing.removeEmptyRows.columns.length > 0
            ? rules.missing.removeEmptyRows.columns.filter(c => data.columns.includes(c))
            : data.columns

        if (targetCols.length > 0) {
            const trim = rules.missing.trimWhitespaceForEmptyCheck
            const filtered = data.rows.filter((row) => {
                const vals = targetCols.map((c) => row[c] ?? '')
                if (cond === 'all') {
                    const allEmpty = vals.every((v) => isEmptyCell(v, trim))
                    return !allEmpty
                } else {
                    const anyEmpty = vals.some((v) => isEmptyCell(v, trim))
                    return !anyEmpty
                }
            })
            stats.removedEmptyRows = data.rows.length - filtered.length
            data.rows = filtered
        }
    }

    if (rules.columns.removeEmptyCols.enabled) {
        const cond = rules.columns.removeEmptyCols.condition
        const trim = rules.missing.trimWhitespaceForEmptyCheck
        const colsToKeep = data.columns.filter((c) => {
            const vals = data.rows.map((r) => r[c] ?? '')
            if (cond === 'all') {
                const allEmpty = vals.every((v) => isEmptyCell(v, trim))
                return !allEmpty
            } else {
                const anyEmpty = vals.some((v) => isEmptyCell(v, trim))
                return !anyEmpty
            }
        })
        stats.removedEmptyCols = data.columns.length - colsToKeep.length
        data.columns = colsToKeep
        data.rows = data.rows.map((row) => {
            const next: DataRow = {}
            colsToKeep.forEach((c) => {
                next[c] = row[c]
            })
            return next
        })
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

    stats.rowsAfter = data.rows.length
    stats.colsAfter = data.columns.length

    return { data, stats }
}
