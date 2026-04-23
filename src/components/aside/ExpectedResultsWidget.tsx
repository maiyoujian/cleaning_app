import { CleaningRules, DataTable } from '@/lib/cleaning'
import { Badge } from '@/components/ui/badge'

interface ExpectedResultsWidgetProps {
    rules: CleaningRules
    table?: DataTable | null
}

export function ExpectedResultsWidget({ rules, table }: ExpectedResultsWidgetProps) {
    const totalRows = table ? table.rows.length : 0
    
    // Calculate expected active rules summary
    const activeActions: { label: string, desc: string, type: 'danger' | 'warning' | 'info' }[] = []
    
    if (rules.dedup.enabled) {
        activeActions.push({
            label: '数据去重',
            desc: rules.dedup.mode === 'wholeRow' ? '整行去重' : `基于 ${rules.dedup.columns.length} 个字段去重`,
            type: 'danger'
        })
    }
    
    if (rules.missing.trimWhitespaceForEmptyCheck) {
        activeActions.push({
            label: '空值判断',
            desc: '将纯空格字符串视为空值',
            type: 'info'
        })
    }
    
    if (rules.missing.removeEmptyRows.enabled) {
        const mode = rules.missing.removeEmptyRows.columnsMode === 'custom' ? '指定列' : '全部列'
        const cond = rules.missing.removeEmptyRows.condition === 'all' ? '都为空' : '任意为空'
        activeActions.push({
            label: '删除空行',
            desc: `当${mode}${cond}时删除该行`,
            type: 'danger'
        })
    }
    
    if (rules.columns.removeEmptyCols.enabled) {
        activeActions.push({
            label: '删除空列',
            desc: rules.columns.removeEmptyCols.condition === 'all' ? '删除全部行都为空的列' : '删除任意行为空的列',
            type: 'danger'
        })
    }
    
    if (rules.missing.fillDefault.enabled) {
        const fillColsCount = rules.missing.fillDefault.columns.length
        activeActions.push({
            label: '填充空值',
            desc: fillColsCount > 0 ? `为 ${fillColsCount} 列填充默认值` : '填充默认值 (未指定列)',
            type: 'info'
        })
    }
    
    if (rules.missing.fillForwardBackward.enabled) {
        const fbColsCount = rules.missing.fillForwardBackward.columns.length
        activeActions.push({
            label: '填充空值',
            desc: fbColsCount > 0 ? `为 ${fbColsCount} 列前向/后向填充` : '前向/后向填充 (未指定列)',
            type: 'info'
        })
    }
    
    if (rules.format.date.enabled || rules.format.phone.enabled || rules.format.email.enabled || rules.format.text.enabled || rules.format.currency.enabled) {
        const formats = []
        if (rules.format.date.enabled) formats.push('日期')
        if (rules.format.phone.enabled) formats.push('手机号')
        if (rules.format.email.enabled) formats.push('邮箱')
        if (rules.format.text.enabled) formats.push('文本')
        if (rules.format.currency.enabled) formats.push('金额')
        
        activeActions.push({
            label: '数据格式化',
            desc: `格式化: ${formats.join(', ')}`,
            type: 'info'
        })
    }
    
    if (rules.columns.rename.enabled || rules.columns.drop.enabled || rules.columns.split.enabled || rules.columns.merge.enabled) {
        const ops = []
        if (rules.columns.rename.enabled) ops.push(`重命名 ${rules.columns.rename.mappings.length} 列`)
        if (rules.columns.drop.enabled) ops.push(`删除 ${rules.columns.drop.columns.length} 列`)
        if (rules.columns.split.enabled) ops.push(`拆分 ${rules.columns.split.column || '1'} 列`)
        if (rules.columns.merge.enabled) ops.push(`合并为 1 列`)
        
        activeActions.push({
            label: '列操作',
            desc: ops.join(', '),
            type: 'warning'
        })
    }
    
    const isDroppingRows = activeActions.some(a => a.type === 'danger')

    return (
        <div className="pt-5 border-t border-gray-200/60">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">预计结果</h3>
            
            {activeActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 rounded-lg border border-slate-100 border-dashed text-center mb-4">
                    <div className="text-sm font-medium text-slate-700 mb-1">暂无清洗规则</div>
                    <div className="text-xs text-slate-500">请在左侧配置需要执行的清洗操作</div>
                </div>
            ) : (
                <div className="flex flex-col gap-3 mb-6">
                    <p className="text-xs text-gray-500 leading-relaxed">以下规则将在清洗时执行：</p>
                    <div className="flex flex-col gap-2">
                        {activeActions.map((action, idx) => (
                            <div key={idx} className="flex flex-col bg-white border border-gray-100 shadow-sm rounded-lg p-2.5">
                                <Badge 
                                    variant="secondary" 
                                    className={`w-fit mb-1 px-1.5 py-0 text-[10px] ${
                                        action.type === 'danger' ? 'bg-red-50 text-red-600 border-red-100' :
                                        action.type === 'warning' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                        'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}
                                >
                                    {action.label}
                                </Badge>
                                <span className="text-xs text-gray-600">{action.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-blue-500"></span>
                        <span className="text-gray-700">处理前总行数</span>
                    </div>
                    <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-blue-100/50">
                        {totalRows}
                    </span>
                </div>
                {isDroppingRows && (
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-red-400"></span>
                            <span className="text-gray-700">可能减少</span>
                        </div>
                        <span className="text-xs text-red-500 italic">未知 (需执行清洗)</span>
                    </div>
                )}
            </div>
        </div>
    )
}
