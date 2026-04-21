import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ColumnChecklist } from '@/components/rules/ColumnChecklist'
import { CleaningRules, DateOutputFormat } from '@/lib/cleaning'
import { Type } from 'lucide-react'

interface FormatSectionProps {
    columns: string[]
    value: CleaningRules['format']
    onChange: (next: CleaningRules['format']) => void
}

export function FormatSection({ columns, value, onChange }: FormatSectionProps) {
    return (
        <AccordionItem value="format">
            <AccordionTrigger>
                <div className="flex items-center gap-3">
                    <Type />
                    <span>格式统一</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-5 overflow-visible">
                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">文本清理（去除空白字符）</div>
                            <div className="text-sm text-muted-foreground">
                                可选择仅去首尾空格，或去除全部空白字符
                            </div>
                        </div>
                        <Switch
                            checked={value.text.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    text: { ...value.text, enabled: checked }
                                })
                            }
                        />
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>作用范围</Label>
                            <Select
                                value={value.text.columnsMode}
                                disabled={!value.text.enabled}
                                onValueChange={(v) =>
                                    onChange({
                                        ...value,
                                        text: {
                                            ...value.text,
                                            columnsMode: v as CleaningRules['format']['text']['columnsMode']
                                        }
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="allText">所有列</SelectItem>
                                    <SelectItem value="selected">仅选择列</SelectItem>
                                </SelectContent>
                            </Select>
                            {value.text.columnsMode === 'selected' && (
                                <div className="mt-2">
                                    <ColumnChecklist
                                        columns={columns}
                                        value={value.text.columns}
                                        disabled={!value.text.enabled}
                                        onChange={(next) =>
                                            onChange({
                                                ...value,
                                                text: { ...value.text, columns: next }
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                                <div className="text-sm font-medium">去首尾空格</div>
                                <Switch
                                    checked={value.text.trim}
                                    disabled={!value.text.enabled}
                                    onCheckedChange={(checked) =>
                                        onChange({
                                            ...value,
                                            text: { ...value.text, trim: checked }
                                        })
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-sm font-medium">连续空白合并为单个空格</div>
                                    <div className="text-xs text-muted-foreground">
                                        适用于字段里存在多空格/换行的情况
                                    </div>
                                </div>
                                <Switch
                                    checked={value.text.collapseSpaces}
                                    disabled={!value.text.enabled || value.text.removeAllWhitespace}
                                    onCheckedChange={(checked) =>
                                        onChange({
                                            ...value,
                                            text: { ...value.text, collapseSpaces: checked }
                                        })
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-sm font-medium">去除全部空白字符</div>
                                    <div className="text-xs text-muted-foreground">
                                        包括空格、制表符、换行等（更激进）
                                    </div>
                                </div>
                                <Switch
                                    checked={value.text.removeAllWhitespace}
                                    disabled={!value.text.enabled}
                                    onCheckedChange={(checked) =>
                                        onChange({
                                            ...value,
                                            text: {
                                                ...value.text,
                                                removeAllWhitespace: checked,
                                                collapseSpaces: checked ? false : value.text.collapseSpaces
                                            }
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
                            <div className="font-medium">日期格式统一</div>
                            <div className="text-sm text-muted-foreground">将日期列统一输出到目标格式</div>
                        </div>
                        <Switch
                            checked={value.date.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    date: { ...value.date, enabled: checked }
                                })
                            }
                        />
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <Label>日期列</Label>
                            <ColumnChecklist
                                columns={columns}
                                value={value.date.columns}
                                disabled={!value.date.enabled}
                                onChange={(next) =>
                                    onChange({
                                        ...value,
                                        date: { ...value.date, columns: next }
                                    })
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>输出格式</Label>
                            <Select
                                value={value.date.outputFormat}
                                disabled={!value.date.enabled}
                                onValueChange={(v) =>
                                    onChange({
                                        ...value,
                                        date: { ...value.date, outputFormat: v as DateOutputFormat }
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                    <SelectItem value="YYYY/MM/DD">YYYY/MM/DD</SelectItem>
                                    <SelectItem value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss</SelectItem>
                                    <SelectItem value="ISO">ISO</SelectItem>
                                </SelectContent>
                            </Select>
                            <Label className="mt-2">时区</Label>
                            <Select
                                value={value.date.timezone}
                                disabled={!value.date.enabled}
                                onValueChange={(v) =>
                                    onChange({
                                        ...value,
                                        date: {
                                            ...value.date,
                                            timezone: v as CleaningRules['format']['date']['timezone']
                                        }
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="local">本地</SelectItem>
                                    <SelectItem value="utc">UTC</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="font-medium">手机号规范化</div>
                                <div className="text-sm text-muted-foreground">
                                    去除非数字字符，可输出为 E.164
                                </div>
                            </div>
                            <Switch
                                checked={value.phone.enabled}
                                onCheckedChange={(checked) =>
                                    onChange({
                                        ...value,
                                        phone: { ...value.phone, enabled: checked }
                                    })
                                }
                            />
                        </div>
                        <div className="mt-4 flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                                <Label>手机号列</Label>
                                <ColumnChecklist
                                    columns={columns}
                                    value={value.phone.columns}
                                    disabled={!value.phone.enabled}
                                    onChange={(next) =>
                                        onChange({
                                            ...value,
                                            phone: { ...value.phone, columns: next }
                                        })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-2">
                                    <Label>国家码</Label>
                                    <Input
                                        value={value.phone.countryCode}
                                        disabled={!value.phone.enabled}
                                        onChange={(e) =>
                                            onChange({
                                                ...value,
                                                phone: { ...value.phone, countryCode: e.target.value }
                                            })
                                        }
                                        placeholder="86"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>输出</Label>
                                    <Select
                                        value={value.phone.output}
                                        disabled={!value.phone.enabled}
                                        onValueChange={(v) =>
                                            onChange({
                                                ...value,
                                                phone: {
                                                    ...value.phone,
                                                    output: v as CleaningRules['format']['phone']['output']
                                                }
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="digits">仅数字</SelectItem>
                                            <SelectItem value="E164">E.164</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="font-medium">邮箱规范化</div>
                                <div className="text-sm text-muted-foreground">
                                    去空格、转小写，减少重复与校验问题
                                </div>
                            </div>
                            <Switch
                                checked={value.email.enabled}
                                onCheckedChange={(checked) =>
                                    onChange({
                                        ...value,
                                        email: { ...value.email, enabled: checked }
                                    })
                                }
                            />
                        </div>
                        <div className="mt-4 flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                                <Label>邮箱列</Label>
                                <ColumnChecklist
                                    columns={columns}
                                    value={value.email.columns}
                                    disabled={!value.email.enabled}
                                    onChange={(next) =>
                                        onChange({
                                            ...value,
                                            email: { ...value.email, columns: next }
                                        })
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                                <div className="text-sm font-medium">去除首尾空格</div>
                                <Switch
                                    checked={value.email.trim}
                                    disabled={!value.email.enabled}
                                    onCheckedChange={(checked) =>
                                        onChange({
                                            ...value,
                                            email: { ...value.email, trim: checked }
                                        })
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                                <div className="text-sm font-medium">转小写</div>
                                <Switch
                                    checked={value.email.lowercase}
                                    disabled={!value.email.enabled}
                                    onCheckedChange={(checked) =>
                                        onChange({
                                            ...value,
                                            email: { ...value.email, lowercase: checked }
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

