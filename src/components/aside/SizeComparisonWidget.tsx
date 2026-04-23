import { CleaningStats } from '@/lib/cleaning'

interface SizeComparisonWidgetProps {
    stats: CleaningStats
}

export function SizeComparisonWidget({ stats }: SizeComparisonWidgetProps) {
    return (
        <div className="pt-5 border-t border-gray-200/60 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">规模对比</h3>
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">原始数据：</span>
                    <span className="font-medium text-gray-900">{stats.rowsBefore} 行 / {stats.colsBefore} 列</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 font-medium">清洗结果：</span>
                    <span className="font-bold text-blue-700">{stats.rowsAfter} 行 / {stats.colsAfter} 列</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-500">数据精简率：</span>
                    <span className="font-bold text-emerald-600">
                        {stats.rowsBefore > 0 
                            ? (((stats.rowsBefore - stats.rowsAfter) / stats.rowsBefore) * 100).toFixed(1) 
                            : '0.0'}%
                    </span>
                </div>
            </div>
        </div>
    )
}
