import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CleaningResult } from '@/lib/cleaning'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ResultPreviewProps {
    result: CleaningResult
    onBackToRules: () => void
    onRestart: () => void
}

export function ResultPreview({ result }: ResultPreviewProps) {
    const { data, stats } = result
    const previewColumns = data.columns.slice(0, 20)
    const previewRows = data.rows.slice(0, 50)

    return (
        <div className="flex-1 min-w-0 h-full overflow-y-auto">
            <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto flex flex-col gap-6">
                <Card className="border-none shadow-none bg-transparent">
                    <CardHeader className="flex flex-row items-start justify-between gap-4 px-0">
                        <div className="flex flex-col gap-1">
                            <CardTitle>清洗结果</CardTitle>
                            <div className="text-sm text-muted-foreground">查看处理统计与数据预览</div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 px-0">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                            原始：{stats.rowsBefore} 行 / {stats.colsBefore} 列
                        </Badge>
                        <Badge variant="secondary">
                            结果：{stats.rowsAfter} 行 / {stats.colsAfter} 列
                        </Badge>
                        {stats.removedEmptyRows > 0 && (
                            <Badge variant="outline">删除空行：{stats.removedEmptyRows}</Badge>
                        )}
                        {stats.removedEmptyCols > 0 && (
                            <Badge variant="outline">删除空列：{stats.removedEmptyCols}</Badge>
                        )}
                        {stats.removedDuplicates > 0 && (
                            <Badge variant="outline">去重：{stats.removedDuplicates}</Badge>
                        )}
                        {stats.filledDefaultCells > 0 && (
                            <Badge variant="outline">默认值填充：{stats.filledDefaultCells}</Badge>
                        )}
                        {stats.filledForwardBackwardCells > 0 && (
                            <Badge variant="outline">
                                前/后向填充：{stats.filledForwardBackwardCells}
                            </Badge>
                        )}
                        {stats.formattedDateCells > 0 && (
                            <Badge variant="outline">日期格式化：{stats.formattedDateCells}</Badge>
                        )}
                        {stats.normalizedPhoneCells > 0 && (
                            <Badge variant="outline">手机号规范化：{stats.normalizedPhoneCells}</Badge>
                        )}
                        {stats.normalizedEmailCells > 0 && (
                            <Badge variant="outline">邮箱规范化：{stats.normalizedEmailCells}</Badge>
                        )}
                        {stats.cleanedTextCells > 0 && (
                            <Badge variant="outline">文本清理：{stats.cleanedTextCells}</Badge>
                        )}
                    </div>
                    <Separator />
                    <Tabs defaultValue="preview" className="w-full">
                        <TabsList>
                            <TabsTrigger value="preview">预览</TabsTrigger>
                            <TabsTrigger value="stats">统计明细</TabsTrigger>
                        </TabsList>
                        <TabsContent value="preview" className="mt-4">
                            <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
                                <div className="h-[520px] overflow-auto">
                                    <Table className="w-max min-w-full">
                                        <TableHeader>
                                            <TableRow>
                                                {previewColumns.map((c) => (
                                                    <TableHead key={c} className="whitespace-nowrap px-4 py-3 bg-gray-50/50 sticky top-0 z-10">
                                                        {c}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewRows.map((row, idx) => (
                                                <TableRow key={idx}>
                                                    {previewColumns.map((c) => (
                                                        <TableCell key={c} className="whitespace-nowrap px-4 py-2.5 max-w-[300px] truncate" title={row[c] ?? ''}>
                                                            {row[c] ?? ''}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground mt-3">
                                预览展示前 {previewRows.length} 行、前 {previewColumns.length} 列
                            </div>
                        </TabsContent>
                        <TabsContent value="stats" className="mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">空值处理</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        删除空行：{stats.removedEmptyRows}
                                        <br />
                                        删除空列：{stats.removedEmptyCols}
                                        <br />
                                        默认值填充：{stats.filledDefaultCells}
                                        <br />
                                        前/后向填充：{stats.filledForwardBackwardCells}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">格式与去重</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        去重删除：{stats.removedDuplicates}
                                        <br />
                                        日期格式化：{stats.formattedDateCells}
                                        <br />
                                        手机号规范化：{stats.normalizedPhoneCells}
                                        <br />
                                        邮箱规范化：{stats.normalizedEmailCells}
                                        <br />
                                        文本清理：{stats.cleanedTextCells}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">列处理</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        重命名列：{stats.renamedColumns}
                                        <br />
                                        删除列：{stats.droppedColumns}
                                        <br />
                                        拆分新增列：{stats.splitColumnsAdded}
                                        <br />
                                        合并新增列：{stats.mergedColumnsAdded}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">总体</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        原始：{stats.rowsBefore} 行 / {stats.colsBefore} 列
                                        <br />
                                        结果：{stats.rowsAfter} 行 / {stats.colsAfter} 列
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                </Card>
            </div>
        </div>
    )
}

