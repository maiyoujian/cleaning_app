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
        <section className="flex flex-col gap-5">
            <h3 className="flex items-center gap-3 text-base font-semibold text-slate-900">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <Type className="size-4" />
                </div>
                <span>格式统一</span>
            </h3>
            <div className="flex flex-col gap-5 overflow-visible">
                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">文本清理（去除空白字符）</div>
                            <div className="text-sm text-muted-foreground">
                                可选择仅去首尾空格，或去除全部空白字符
                            </div>
                        </div>
                        <Switch
                            className="cursor-pointer"
                            checked={value.text.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    text: { ...value.text, enabled: checked }
                                })
                            }
                        />
                    </div>
                    {value.text.enabled && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="flex flex-col gap-2">
                                <Label>作用范围</Label>
                                <Select
                                    value={value.text.columnsMode}
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
                                        className="cursor-pointer"
                                        checked={value.text.trim}
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
                                        className="cursor-pointer"
                                        checked={value.text.collapseSpaces}
                                        disabled={value.text.removeAllWhitespace}
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
                                        className="cursor-pointer"
                                        checked={value.text.removeAllWhitespace}
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
                    )}
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-medium">日期格式统一</div>
                            <div className="text-sm text-muted-foreground">将日期列统一输出到目标格式</div>
                        </div>
                        <Switch
                            className="cursor-pointer"
                            checked={value.date.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    date: { ...value.date, enabled: checked }
                                })
                            }
                        />
                    </div>
                    {value.date.enabled && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-2 md:col-span-2">
                                <Label>日期列</Label>
                                <ColumnChecklist
                                    columns={columns}
                                    value={value.date.columns}
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
                                        <SelectItem value="YYYY-MM-DD HH:mm">YYYY-MM-DD HH:mm</SelectItem>
                                        <SelectItem value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss</SelectItem>
                                        <SelectItem value="YYYY年MM月DD日">YYYY年MM月DD日</SelectItem>
                                        <SelectItem value="YYYY年MM月DD日 HH时mm分">YYYY年MM月DD日 HH时mm分</SelectItem>
                                        <SelectItem value="YYYY年MM月DD日 HH时mm分ss秒">YYYY年MM月DD日 HH时mm分ss秒</SelectItem>
                                        <SelectItem value="ISO">ISO</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Label className="mt-2">时区</Label>
                                <Select
                                    value={value.date.timezone}
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
                                <Label className="mt-2">无效值处理</Label>
                                <Select
                                    value={value.date.onInvalid}
                                    onValueChange={(v) =>
                                        onChange({
                                            ...value,
                                            date: {
                                                ...value.date,
                                                onInvalid: v as CleaningRules['format']['date']['onInvalid']
                                            }
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="keep">保留原值</SelectItem>
                                        <SelectItem value="empty">清空内容</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-5">
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="font-medium">金额格式化</div>
                                <div className="text-sm text-muted-foreground">
                                    提取数字并统一货币格式（支持小数位和千分位）
                                </div>
                            </div>
                            <Switch
                                className="cursor-pointer"
                                checked={value.currency?.enabled ?? false}
                                onCheckedChange={(checked) =>
                                    onChange({
                                        ...value,
                                        currency: { ...(value.currency || { columns: [], symbol: '¥', decimalPlaces: 2, thousandsSeparator: true }), enabled: checked }
                                    })
                                }
                            />
                        </div>
                        {value.currency?.enabled && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div className="flex flex-col gap-2">
                                    <Label>金额列</Label>
                                    <ColumnChecklist
                                        columns={columns}
                                        value={value.currency.columns}
                                        onChange={(next) =>
                                            onChange({
                                                ...value,
                                                currency: { ...value.currency, columns: next }
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-2">
                                            <Label>货币符号</Label>
                                            <Input
                                                value={value.currency.symbol}
                                                onChange={(e) =>
                                                    onChange({
                                                        ...value,
                                                        currency: { ...value.currency, symbol: e.target.value }
                                                    })
                                                }
                                                placeholder="留空输出纯数字, 如 ¥, $"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Label>小数位数</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={6}
                                                value={value.currency.decimalPlaces}
                                                onChange={(e) =>
                                                    onChange({
                                                        ...value,
                                                        currency: { ...value.currency, decimalPlaces: parseInt(e.target.value) || 0 }
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                                        <div className="text-sm font-medium">使用千分位 (,)</div>
                                        <Switch
                                            className="cursor-pointer"
                                            checked={value.currency.thousandsSeparator}
                                            onCheckedChange={(checked) =>
                                                onChange({
                                                    ...value,
                                                    currency: { ...value.currency, thousandsSeparator: checked }
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="font-medium">手机号规范化</div>
                                <div className="text-sm text-muted-foreground">
                                    去除非数字字符，可输出为 E.164
                                </div>
                            </div>
                            <Switch
                            className="cursor-pointer"
                            checked={value.phone.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    phone: { ...(value.phone || { columns: [], countryCode: '', output: 'digits' }), enabled: checked }
                                })
                            }
                        />
                        </div>
                        {value.phone.enabled && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div className="flex flex-col gap-2">
                                    <Label>手机号列</Label>
                                    <ColumnChecklist
                                        columns={columns}
                                        value={value.phone.columns}
                                        onChange={(next) =>
                                            onChange({
                                                ...value,
                                                phone: { ...value.phone, columns: next }
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-2">
                                        <Label>国家码</Label>
                                        <Input
                                            value={value.phone.countryCode}
                                            onChange={(e) =>
                                                onChange({
                                                    ...value,
                                                    phone: { ...value.phone, countryCode: e.target.value }
                                                })
                                            }
                                            placeholder="输入国家码，如 86，留空则不拼接"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label>输出</Label>
                                        <Select
                                            value={value.phone.output}
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
                        )}
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
                            className="cursor-pointer"
                            checked={value.email.enabled}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...value,
                                    email: { ...value.email, enabled: checked }
                                })
                            }
                        />
                        </div>
                        {value.email.enabled && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div className="flex flex-col gap-2">
                                    <Label>邮箱列</Label>
                                    <ColumnChecklist
                                        columns={columns}
                                        value={value.email.columns}
                                        onChange={(next) =>
                                            onChange({
                                                ...value,
                                                email: { ...value.email, columns: next }
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                                        <div className="text-sm font-medium">去除首尾空格</div>
                                        <Switch
                                            className="cursor-pointer"
                                            checked={value.email.trim}
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
                                            className="cursor-pointer"
                                            checked={value.email.lowercase}
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
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

