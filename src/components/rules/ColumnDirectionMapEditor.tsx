import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FillDirection } from '@/lib/cleaning'

interface ColumnDirectionMapEditorProps {
    columns: string[]
    value: Record<string, FillDirection>
    onChange: (next: Record<string, FillDirection>) => void
    disabled?: boolean
    emptyText?: string
}

export function ColumnDirectionMapEditor({
    columns,
    value,
    onChange,
    disabled,
    emptyText = '请先选择左侧的列'
}: ColumnDirectionMapEditorProps) {
    return (
        <div className="h-44 border rounded-xl bg-card p-2 overflow-y-auto">
            {columns.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    {emptyText}
                </div>
            ) : (
                <div className="flex flex-col gap-3 p-1">
                    {columns.map((c) => (
                        <div key={c} className="flex items-center gap-3">
                            <div className="text-sm font-medium w-1/3 truncate" title={c}>
                                {c}
                            </div>
                            <Select
                                value={value[c] ?? 'forward'}
                                disabled={disabled}
                                onValueChange={(v) =>
                                    onChange({
                                        ...value,
                                        [c]: v as FillDirection
                                    })
                                }
                            >
                                <SelectTrigger className="flex-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="forward">前向填充（用上面的值）</SelectItem>
                                    <SelectItem value="backward">后向填充（用下面的值）</SelectItem>
                                    <SelectItem value="both">双向填充</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

