import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ColumnChecklist } from '@/components/rules/ColumnChecklist'
import { CleaningRules } from '@/lib/cleaning'
import { CopyX } from 'lucide-react'

interface DedupSectionProps {
    columns: string[]
    value: CleaningRules['dedup']
    onChange: (next: CleaningRules['dedup']) => void
}

export function DedupSection({ columns, value, onChange }: DedupSectionProps) {
    return (
        <section className="flex flex-col gap-5">
            <h3 className="flex items-center gap-3 text-base font-semibold text-slate-900">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <CopyX className="size-4" />
                </div>
                <span>去重</span>
            </h3>
            <div className="flex flex-col gap-5 overflow-visible">
                <div className="rounded-xl border bg-card p-4 h-fit">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">启用去重</div>
                            <div className="text-sm text-muted-foreground">支持全表去重或按指定列去重</div>
                        </div>
                        <Switch
                            className="cursor-pointer"
                            checked={value.enabled}
                            onCheckedChange={(checked) => onChange({ ...value, enabled: checked })}
                        />
                    </div>

                    {value.enabled && (
                        <>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div className="flex flex-col gap-2">
                                    <Label>去重方式</Label>
                                    <RadioGroup
                                        value={value.mode}
                                        onValueChange={(v) =>
                                            onChange({
                                                ...value,
                                                mode: v as CleaningRules['dedup']['mode']
                                            })
                                        }
                                        className="flex flex-col gap-2"
                                    >
                                        <label className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3 cursor-pointer">
                                            <RadioGroupItem value="wholeRow" />
                                            <div className="flex flex-col gap-0.5">
                                                <div className="text-sm font-medium">整行去重</div>
                                                <div className="text-xs text-muted-foreground">
                                                    所有列的数据完全相同，才视为重复
                                                </div>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3 cursor-pointer">
                                            <RadioGroupItem value="byColumns" />
                                            <div className="flex flex-col gap-0.5">
                                                <div className="text-sm font-medium">指定列去重</div>
                                                <div className="text-xs text-muted-foreground">
                                                    只要勾选的列数据相同，即视为重复
                                                </div>
                                            </div>
                                        </label>
                                    </RadioGroup>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>保留策略</Label>
                                    <Select
                                        value={value.keep}
                                        onValueChange={(v) =>
                                            onChange({
                                                ...value,
                                                keep: v as CleaningRules['dedup']['keep']
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="first">保留第一条</SelectItem>
                                            <SelectItem value="last">保留最后一条</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3 mt-2">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-sm font-medium">文本归一化</div>
                                            <div className="text-xs text-muted-foreground">
                                                去除首尾空格并转小写后再比较
                                            </div>
                                        </div>
                                        <Switch
                                            className="cursor-pointer"
                                            checked={value.normalizeText}
                                            onCheckedChange={(checked) =>
                                                onChange({ ...value, normalizeText: checked })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {value.mode === 'byColumns' && (
                                <div className="mt-4">
                                    <Label>参与去重的列</Label>
                                    <div className="mt-2">
                                        <ColumnChecklist
                                            columns={columns}
                                            value={value.columns}
                                            onChange={(next) => onChange({ ...value, columns: next })}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </section>
    )
}

