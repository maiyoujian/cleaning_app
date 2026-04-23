import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CleaningRules } from '@/lib/cleaning'
import { ColumnChecklist } from '@/components/rules/ColumnChecklist'
import { ColumnStringMapEditor } from '@/components/rules/ColumnStringMapEditor'
import { ColumnDirectionMapEditor } from '@/components/rules/ColumnDirectionMapEditor'
import { Eraser } from 'lucide-react'

function asNumberOrNull(v: string) {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
}

interface MissingSectionProps {
    columns: string[]
    value: CleaningRules['missing']
    onChange: (next: CleaningRules['missing']) => void
}

export function MissingSection({ columns, value, onChange }: MissingSectionProps) {
    return (
        <section className="flex flex-col gap-5">
            <h3 className="flex items-center gap-3 text-base font-semibold text-slate-900">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <Eraser className="size-4" />
                </div>
                <span>空值处理</span>
            </h3>
            <div className="flex flex-col gap-5 overflow-visible">
                <div className="flex items-center justify-between gap-6 rounded-xl border bg-card p-4">
                    <div className="flex flex-col gap-1">
                        <div className="font-medium">空值判断</div>
                        <div className="text-sm text-muted-foreground">
                            控制“空”的判定规则，影响删除空行/列与填充行为
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Label className="text-sm">去除首尾空白再判断</Label>
                        <Switch
                            className="cursor-pointer"
                            checked={value.trimWhitespaceForEmptyCheck}
                            onCheckedChange={(checked) =>
                                onChange({ ...value, trimWhitespaceForEmptyCheck: checked })
                            }
                        />
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">删除空行</div>
                            <div className="text-sm text-muted-foreground">删除包含空值的行</div>
                        </div>
                        <Switch
                            className="cursor-pointer"
                            checked={value.removeEmptyRows.enabled}
                            onCheckedChange={(checked) => onChange({ ...value, removeEmptyRows: { ...value.removeEmptyRows, enabled: checked } })}
                        />
                    </div>
                    {value.removeEmptyRows.enabled && (
                        <div className="mt-4 flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div className="flex flex-col gap-2">
                                    <Label>检查范围</Label>
                                    <Select
                                        value={value.removeEmptyRows.columnsMode}
                                        onValueChange={(v) => onChange({ ...value, removeEmptyRows: { ...value.removeEmptyRows, columnsMode: v as 'all' | 'custom' } })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">所有列</SelectItem>
                                            <SelectItem value="custom">指定列</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>删除条件</Label>
                                    <Select
                                        value={value.removeEmptyRows.condition}
                                        onValueChange={(v) => onChange({ ...value, removeEmptyRows: { ...value.removeEmptyRows, condition: v as 'all' | 'any' } })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">检查范围内的列全部为空时删除</SelectItem>
                                            <SelectItem value="any">检查范围内的列任意为空时删除</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {value.removeEmptyRows.columnsMode === 'custom' && (
                                <div className="flex flex-col gap-2">
                                    <Label>参与检查的列</Label>
                                    <ColumnChecklist
                                        columns={columns}
                                        value={value.removeEmptyRows.columns}
                                        onChange={(next) => onChange({ ...value, removeEmptyRows: { ...value.removeEmptyRows, columns: next } })}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">填充默认值</div>
                            <div className="text-sm text-muted-foreground">对指定列的空值填充固定默认值</div>
                        </div>
                        <Switch
                            className="cursor-pointer"
                            checked={value.fillDefault.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    fillDefault: { ...value.fillDefault, enabled: checked }
                                })
                            }
                        />
                    </div>
                    {value.fillDefault.enabled && (
                        <div className="mt-4 flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div className="flex flex-col gap-2">
                                    <Label>目标列</Label>
                                    <ColumnChecklist
                                        columns={columns}
                                        value={value.fillDefault.columns}
                                        onChange={(next) =>
                                            onChange({
                                                ...value,
                                                fillDefault: { ...value.fillDefault, columns: next }
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Label>列对应的默认值</Label>
                                    <ColumnStringMapEditor
                                        columns={value.fillDefault.columns}
                                        value={value.fillDefault.values}
                                        onChange={(next) =>
                                            onChange({
                                                ...value,
                                                fillDefault: { ...value.fillDefault, values: next }
                                            })
                                        }
                                        placeholder="输入默认值..."
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-sm font-medium">仅对空值填充</div>
                                    <div className="text-xs text-muted-foreground">
                                        关闭后会覆盖该列的原有值（谨慎）
                                    </div>
                                </div>
                                <Switch
                                    className="cursor-pointer"
                                    checked={value.fillDefault.onlyWhenEmpty}
                                    onCheckedChange={(checked) =>
                                        onChange({
                                            ...value,
                                            fillDefault: { ...value.fillDefault, onlyWhenEmpty: checked }
                                        })
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">前向 / 后向填充</div>
                            <div className="text-sm text-muted-foreground">
                                用相邻非空值补齐缺失，常用于时间序列或分组数据
                            </div>
                        </div>
                        <Switch
                            className="cursor-pointer"
                            checked={value.fillForwardBackward.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    fillForwardBackward: {
                                        ...value.fillForwardBackward,
                                        enabled: checked
                                    }
                                })
                            }
                        />
                    </div>
                    {value.fillForwardBackward.enabled && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="flex flex-col gap-2">
                                <Label>目标列</Label>
                                <ColumnChecklist
                                    columns={columns}
                                    value={value.fillForwardBackward.columns}
                                    onChange={(next) =>
                                        onChange({
                                            ...value,
                                            fillForwardBackward: {
                                                ...value.fillForwardBackward,
                                                columns: next
                                            }
                                        })
                                    }
                                />
                            </div>
                            <div className="flex flex-col gap-3">
                                <Label>列对应的填充方向</Label>
                                <ColumnDirectionMapEditor
                                    columns={value.fillForwardBackward.columns}
                                    value={value.fillForwardBackward.directions}
                                    onChange={(next) =>
                                        onChange({
                                            ...value,
                                            fillForwardBackward: {
                                                ...value.fillForwardBackward,
                                                directions: next
                                            }
                                        })
                                    }
                                />
                                <div className="flex flex-col gap-2 mt-2">
                                    <Label>最大连续填充（可选）</Label>
                                    <Input
                                        value={value.fillForwardBackward.limit ?? ''}
                                        onChange={(e) =>
                                            onChange({
                                                ...value,
                                                fillForwardBackward: {
                                                    ...value.fillForwardBackward,
                                                    limit: asNumberOrNull(e.target.value)
                                                }
                                            })
                                        }
                                        placeholder="例如：3"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

