import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface ColumnChecklistProps {
    columns: string[]
    value: string[]
    onChange: (next: string[]) => void
    disabled?: boolean
    heightClassName?: string
}

export function ColumnChecklist({
    columns,
    value,
    onChange,
    disabled,
    heightClassName = 'h-44'
}: ColumnChecklistProps) {
    const selected = useMemo(() => new Set(value), [value])

    return (
        <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 p-3">
                <div className="text-sm text-muted-foreground">
                    已选 {value.length} / {columns.length}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled || columns.length === 0}
                        onClick={() => onChange(columns)}
                    >
                        全选
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled || value.length === 0}
                        onClick={() => onChange([])}
                    >
                        清空
                    </Button>
                </div>
            </div>
            <Separator />
            <ScrollArea className={heightClassName}>
                <div className="flex flex-col gap-2 p-3">
                    {columns.map((c) => (
                        <label
                            key={c}
                            className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors cursor-pointer"
                        >
                            <Checkbox
                                checked={selected.has(c)}
                                disabled={disabled}
                                onCheckedChange={(checked) => {
                                    const next = new Set(selected)
                                    if (checked) next.add(c)
                                    else next.delete(c)
                                    onChange(Array.from(next))
                                }}
                            />
                            <span className="text-sm">{c}</span>
                        </label>
                    ))}
                    {columns.length === 0 && (
                        <div className="text-sm text-muted-foreground py-6 text-center">
                            暂无可用列
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

