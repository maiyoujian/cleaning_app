import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { CleaningResult } from '@/lib/cleaning'

interface ResultPreviewProps {
    result: CleaningResult
}

export function ResultPreview({ result }: ResultPreviewProps) {
    const { data } = result
    const previewColumns = data.columns.slice(0, 20)
    const previewRows = data.rows.slice(0, 50)

    return (
        <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-0 relative">
            <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden relative [&_div[data-slot=table-container]]:absolute [&_div[data-slot=table-container]]:inset-0 [&_div[data-slot=table-container]]:overflow-auto">
                <Table className="border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent">
                            {previewColumns.map((c) => (
                                <TableHead
                                    key={c}
                                    className="whitespace-nowrap px-3 py-4 text-xs font-semibold text-slate-600 tracking-wider h-auto border-r border-b border-slate-200 last:border-r-0 bg-slate-50/95 bg-clip-padding"
                                >
                                    {c}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {previewRows.map((row, idx) => (
                            <TableRow
                                key={idx}
                                className="hover:bg-slate-50/50 transition-colors [&>td]:hover:bg-slate-50/50"
                            >
                                {previewColumns.map((c) => (
                                    <TableCell
                                        key={c}
                                        className="whitespace-pre overflow-hidden text-ellipsis px-3 py-3 text-sm text-slate-700 max-w-[320px] border-r border-b border-slate-200 last:border-r-0 bg-white bg-clip-padding"
                                        title={row[c] ?? ''}
                                    >
                                        {row[c] ?? (
                                            <span className="text-slate-300 italic whitespace-normal">
                                                null
                                            </span>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="text-sm text-slate-500 mt-4 flex items-center justify-between shrink-0 px-2">
                <span>
                    显示前 {previewRows.length} 行、前 {previewColumns.length}{' '}
                    列数据
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    处理状态：正常
                </span>
            </div>
        </div>
    )
}
