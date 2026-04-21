import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ColumnStringMapEditorProps {
    columns: string[]
    value: Record<string, string>
    onChange: (next: Record<string, string>) => void
    emptyText?: string
    placeholder?: string
    disabled?: boolean
}

export function ColumnStringMapEditor({
    columns,
    value,
    onChange,
    emptyText = '请先选择左侧的列',
    placeholder = '请输入…',
    disabled
}: ColumnStringMapEditorProps) {
    return (
        <ScrollArea className="h-44 border rounded-xl bg-card p-2">
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
                            <Input
                                className="flex-1"
                                value={value[c] ?? ''}
                                disabled={disabled}
                                onChange={(e) =>
                                    onChange({
                                        ...value,
                                        [c]: e.target.value
                                    })
                                }
                                placeholder={placeholder}
                            />
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
    )
}

