import { type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { LeftAside } from '@/components/LeftAside'
import { RightAside } from '@/components/RightAside'
import { SelectedFile } from '@/components/UploadArea'
import { CleaningRules, DataTable, CleaningResult } from '@/lib/cleaning'

interface WorkspaceLayoutProps {
    children: ReactNode
    files: SelectedFile[]
    setFiles: Dispatch<SetStateAction<SelectedFile[]>>
    activeFileId: string | null
    onActiveFileIdChange: (id: string) => void
    columns: string[]
    table?: DataTable | null
    rules: CleaningRules
    previewResult?: CleaningResult
    onBackToRules?: () => void
}

export function WorkspaceLayout({
    children,
    files,
    setFiles,
    activeFileId,
    onActiveFileIdChange,
    columns,
    table,
    rules,
    previewResult,
    onBackToRules
}: WorkspaceLayoutProps) {
    const activeFile = files.find((f) => f.id === activeFileId) ?? null

    const handleActiveFileChange = (id: string) => {
        onActiveFileIdChange(id)
        if (previewResult && onBackToRules) {
            onBackToRules()
        }
    }

    const handleAddFiles = (newFiles: any) => {
        setFiles(newFiles)
        if (previewResult && onBackToRules) {
            onBackToRules()
        }
    }

    return (
        <div className="h-full w-full overflow-hidden flex">
            <LeftAside
                files={files}
                setFiles={handleAddFiles}
                activeFileId={activeFileId}
                onActiveFileIdChange={handleActiveFileChange}
            />

            <main className="h-full relative flex flex-col flex-1 min-w-[400px]">
                {children}
            </main>

            <RightAside
                activeFile={activeFile}
                columns={columns}
                table={table}
                rules={rules}
                previewResult={previewResult}
            />
        </div>
    )
}
