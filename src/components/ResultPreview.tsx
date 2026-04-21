import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CleaningResult } from '@/lib/cleaning'

interface ResultPreviewProps {
    result: CleaningResult
}

export function ResultPreview({ result }: ResultPreviewProps) {
    const { data } = result
    const previewColumns = data.columns.slice(0, 20)
    const previewRows = data.rows.slice(0, 50)

    return (
        <div className="absolute inset-0 flex flex-col p-6 overflow-hidden">
            <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto relative">
                    <Table className="w-max min-w-full border-collapse">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-slate-200">
                                {previewColumns.map((c) => (
                                    <TableHead key={c} className="whitespace-nowrap px-5 py-3.5 bg-slate-50/80 sticky top-0 z-10 text-xs font-semibold text-slate-600 uppercase tracking-wider backdrop-blur-sm border-b border-slate-200 after:absolute after:inset-0 after:border-b after:border-slate-200 after:-z-10">
                                        {c}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewRows.map((row, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                                    {previewColumns.map((c) => (
                                        <TableCell key={c} className="whitespace-nowrap px-5 py-3 text-sm text-slate-700 max-w-[320px] truncate" title={row[c] ?? ''}>
                                            {row[c] ?? <span className="text-slate-300 italic">null</span>}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <div className="text-sm text-slate-500 mt-4 flex items-center justify-between shrink-0 px-2">
                <span>显示前 {previewRows.length} 行、前 {previewColumns.length} 列数据</span>
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    处理状态：正常
                </span>
            </div>
        </div>
    )
}