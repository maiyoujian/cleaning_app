import { SelectedFile } from '@/components/UploadArea'
import { CleaningRules, DataTable } from '@/lib/cleaning'
import { FileInfoWidget } from './FileInfoWidget'
import { ExpectedResultsWidget } from './ExpectedResultsWidget'

interface RuleConfigSidebarProps {
    activeFile: SelectedFile
    columns: string[]
    table: DataTable | null | undefined
    rules: CleaningRules
}

export function RuleConfigSidebar({
    activeFile,
    columns,
    table,
    rules
}: RuleConfigSidebarProps) {
    return (
        <div className="space-y-6">
            <FileInfoWidget activeFile={activeFile} columns={columns} table={table} />
            <ExpectedResultsWidget rules={rules} table={table} />
        </div>
    )
}
