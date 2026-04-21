import { CleaningStats } from '@/lib/cleaning'

interface ProcessingDetailsWidgetProps {
    stats: CleaningStats
}

export function ProcessingDetailsWidget({ stats }: ProcessingDetailsWidgetProps) {
    const hasAnyProcessing = 
        stats.removedEmptyRows > 0 ||
        stats.removedEmptyCols > 0 ||
        stats.removedDuplicates > 0 ||
        stats.filledDefaultCells > 0 ||
        stats.filledForwardBackwardCells > 0 ||
        stats.formattedDateCells > 0 ||
        stats.normalizedPhoneCells > 0 ||
        stats.normalizedEmailCells > 0 ||
        stats.cleanedTextCells > 0

    return (
        <div className="pt-5 border-t border-gray-200/60 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">处理明细</h3>
            <div className="space-y-2">
                {stats.removedEmptyRows > 0 && (
                    <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <span className="text-gray-600">删除空行</span>
                        <span className="font-semibold text-gray-900">{stats.removedEmptyRows}</span>
                    </div>
                )}
                {stats.removedEmptyCols > 0 && (
                    <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <span className="text-gray-600">删除空列</span>
                        <span className="font-semibold text-gray-900">{stats.removedEmptyCols}</span>
                    </div>
                )}
                {stats.removedDuplicates > 0 && (
                    <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <span className="text-gray-600">去重数据</span>
                        <span className="font-semibold text-gray-900">{stats.removedDuplicates}</span>
                    </div>
                )}
                {stats.filledDefaultCells > 0 && (
                    <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <span className="text-gray-600">默认值填充</span>
                        <span className="font-semibold text-gray-900">{stats.filledDefaultCells}</span>
                    </div>
                )}
                {stats.filledForwardBackwardCells > 0 && (
                    <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <span className="text-gray-600">前/后向填充</span>
                        <span className="font-semibold text-gray-900">{stats.filledForwardBackwardCells}</span>
                    </div>
                )}
                {stats.formattedDateCells > 0 && (
                    <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <span className="text-gray-600">日期格式化</span>
                        <span className="font-semibold text-gray-900">{stats.formattedDateCells}</span>
                    </div>
                )}
                {stats.normalizedPhoneCells > 0 && (
                    <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <span className="text-gray-600">手机号规范化</span>
                        <span className="font-semibold text-gray-900">{stats.normalizedPhoneCells}</span>
                    </div>
                )}
                {stats.normalizedEmailCells > 0 && (
                    <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <span className="text-gray-600">邮箱规范化</span>
                        <span className="font-semibold text-gray-900">{stats.normalizedEmailCells}</span>
                    </div>
                )}
                {stats.cleanedTextCells > 0 && (
                    <div className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <span className="text-gray-600">文本清理</span>
                        <span className="font-semibold text-gray-900">{stats.cleanedTextCells}</span>
                    </div>
                )}
                
                {!hasAnyProcessing && (
                    <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 rounded-lg border border-slate-100 border-dashed text-center">
                        <div className="text-sm font-medium text-slate-700 mb-1">未匹配到清洗规则</div>
                        <div className="text-xs text-slate-500">当前数据未触发任何修改，或未启用相关规则</div>
                    </div>
                )}
            </div>
        </div>
    )
}
