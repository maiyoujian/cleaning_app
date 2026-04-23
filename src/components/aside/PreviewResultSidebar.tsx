import { SelectedFile } from '@/components/UploadArea'
import { CleaningResult } from '@/lib/cleaning'
import { FileInfoWidget } from './FileInfoWidget'
import { SizeComparisonWidget } from './SizeComparisonWidget'
import { ProcessingDetailsWidget } from './ProcessingDetailsWidget'

interface PreviewResultSidebarProps {
    activeFile: SelectedFile
    previewResult: CleaningResult
}

export function PreviewResultSidebar({
    activeFile,
    previewResult
}: PreviewResultSidebarProps) {
    return (
        <div className="flex flex-col gap-6">
            <FileInfoWidget activeFile={activeFile} />
            <SizeComparisonWidget stats={previewResult.stats} />
            <ProcessingDetailsWidget stats={previewResult.stats} />
        </div>
    )
}
