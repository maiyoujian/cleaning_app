import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ColumnChecklist } from '@/components/rules/ColumnChecklist'
import { CleaningRules } from '@/lib/cleaning'
import { Columns, Plus, Trash2 } from 'lucide-react'

interface ColumnsSectionProps {
    columns: string[]
    value: CleaningRules['columns']
    onChange: (next: CleaningRules['columns']) => void
}

export function ColumnsSection({ columns, value, onChange }: ColumnsSectionProps) {
    return (
        <AccordionItem value="columns">
            <AccordionTrigger>
                <div className="flex items-center gap-3">
                    <Columns />
                    <span>列处理</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-5 overflow-visible">
                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">重命名列</div>
                            <div className="text-sm text-muted-foreground">支持批量设置旧列名 → 新列名</div>
                        </div>
                        <Switch
                            checked={value.rename.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    rename: { ...value.rename, enabled: checked }
                                })
                            }
                        />
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                        {value.rename.mappings.map((m, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                                <Input
                                    placeholder="旧列名"
                                    disabled={!value.rename.enabled}
                                    value={m.from}
                                    onChange={(e) => {
                                        const next = [...value.rename.mappings]
                                        next[idx] = { ...next[idx], from: e.target.value }
                                        onChange({
                                            ...value,
                                            rename: { ...value.rename, mappings: next }
                                        })
                                    }}
                                />
                                <Input
                                    placeholder="新列名"
                                    disabled={!value.rename.enabled}
                                    value={m.to}
                                    onChange={(e) => {
                                        const next = [...value.rename.mappings]
                                        next[idx] = { ...next[idx], to: e.target.value }
                                        onChange({
                                            ...value,
                                            rename: { ...value.rename, mappings: next }
                                        })
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={!value.rename.enabled}
                                    onClick={() => {
                                        const next = value.rename.mappings.filter((_, i) => i !== idx)
                                        onChange({
                                            ...value,
                                            rename: { ...value.rename, mappings: next }
                                        })
                                    }}
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!value.rename.enabled}
                            onClick={() => {
                                const next = [...value.rename.mappings, { from: '', to: '' }]
                                onChange({
                                    ...value,
                                    rename: { ...value.rename, mappings: next }
                                })
                            }}
                        >
                            <Plus data-icon="inline-start" />
                            添加映射
                        </Button>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">删除列</div>
                            <div className="text-sm text-muted-foreground">从数据中彻底移除不需要的列</div>
                        </div>
                        <Switch
                            checked={value.drop.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    drop: { ...value.drop, enabled: checked }
                                })
                            }
                        />
                    </div>
                    <div className="mt-4">
                        <ColumnChecklist
                            columns={columns}
                            value={value.drop.columns}
                            disabled={!value.drop.enabled}
                            onChange={(next) =>
                                onChange({
                                    ...value,
                                    drop: { ...value.drop, columns: next }
                                })
                            }
                        />
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">列拆分</div>
                            <div className="text-sm text-muted-foreground">将一个字段按分隔符拆成多个新字段</div>
                        </div>
                        <Switch
                            checked={value.split.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    split: { ...value.split, enabled: checked }
                                })
                            }
                        />
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>要拆分的列</Label>
                            <Select
                                value={value.split.column}
                                disabled={!value.split.enabled}
                                onValueChange={(v) =>
                                    onChange({
                                        ...value,
                                        split: { ...value.split, column: v }
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="请选择列" />
                                </SelectTrigger>
                                <SelectContent>
                                    {columns.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Label className="mt-2">分隔符（可选）</Label>
                            <Input
                                value={value.split.separator}
                                disabled={!value.split.enabled}
                                onChange={(e) =>
                                    onChange({
                                        ...value,
                                        split: { ...value.split, separator: e.target.value }
                                    })
                                }
                                placeholder="例如：, 或 -（留空则按空白分割）"
                            />
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                                <Label>新列名（逗号分隔）</Label>
                                <Input
                                    value={value.split.into.join(',')}
                                    disabled={!value.split.enabled}
                                    onChange={(e) =>
                                        onChange({
                                            ...value,
                                            split: {
                                                ...value.split,
                                                into: e.target.value
                                                    .split(',')
                                                    .map((s) => s.trim())
                                                    .filter(Boolean)
                                            }
                                        })
                                    }
                                    placeholder="例如：姓名,电话"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                                <div className="text-sm font-medium">保留原列</div>
                                <Switch
                                    checked={value.split.keepOriginal}
                                    disabled={!value.split.enabled}
                                    onCheckedChange={(checked) =>
                                        onChange({
                                            ...value,
                                            split: { ...value.split, keepOriginal: checked }
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">列合并</div>
                            <div className="text-sm text-muted-foreground">将多个列按顺序拼接到一个新列中</div>
                        </div>
                        <Switch
                            checked={value.merge.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    merge: { ...value.merge, enabled: checked }
                                })
                            }
                        />
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>参与合并的列（按列表顺序）</Label>
                            <ColumnChecklist
                                columns={columns}
                                value={value.merge.columns}
                                disabled={!value.merge.enabled}
                                onChange={(next) =>
                                    onChange({
                                        ...value,
                                        merge: { ...value.merge, columns: next }
                                    })
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                                <Label>目标列名</Label>
                                <Input
                                    value={value.merge.into}
                                    disabled={!value.merge.enabled}
                                    onChange={(e) =>
                                        onChange({
                                            ...value,
                                            merge: { ...value.merge, into: e.target.value }
                                        })
                                    }
                                    placeholder="例如：姓名_电话"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>连接符</Label>
                                <Input
                                    value={value.merge.separator}
                                    disabled={!value.merge.enabled}
                                    onChange={(e) =>
                                        onChange({
                                            ...value,
                                            merge: { ...value.merge, separator: e.target.value }
                                        })
                                    }
                                    placeholder="例如：-"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-sm font-medium">合并后删除源列</div>
                                    <div className="text-xs text-muted-foreground">
                                        开启后仅保留目标列
                                    </div>
                                </div>
                                <Switch
                                    checked={value.merge.dropSources}
                                    disabled={!value.merge.enabled}
                                    onCheckedChange={(checked) =>
                                        onChange({
                                            ...value,
                                            merge: { ...value.merge, dropSources: checked }
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    )
}

