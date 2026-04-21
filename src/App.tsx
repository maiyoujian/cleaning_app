import { useEffect, useMemo, useState, useRef } from 'react'
import '@/App.css'
import { SelectedFile } from './components/UploadArea'
import { RuleConfig } from './components/RuleConfig'
import {
    applyCleaningRules,
    createDefaultRules,
    parseSpreadsheetFile,
    type CleaningResult,
    type CleaningRules,
    type DataTable
} from '@/lib/cleaning'

function App() {
    const [currentStep, setCurrentStep] = useState(2)
    const [files, setFiles] = useState<SelectedFile[]>([])
    const [activeFileId, setActiveFileId] = useState<string | null>(null)
    const [table, setTable] = useState<DataTable | null>(null)
    const [parsingError, setParsingError] = useState<string | null>(null)
    const [rulesMap, setRulesMap] = useState<Record<string, CleaningRules>>({})
    const [result, setResult] = useState<CleaningResult | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    // 当文件列表增加时，自动选中最新添加的文件
    const prevFilesLength = useRef(0)
    useEffect(() => {
        if (files.length > prevFilesLength.current) {
            const newlyAdded = files[files.length - 1]
            if (newlyAdded) {
                setActiveFileId(newlyAdded.id)
                // 如果处于预览界面，自动返回配置界面
                if (currentStep === 3) {
                    setCurrentStep(2)
                }
            }
        }
        prevFilesLength.current = files.length
    }, [files, currentStep])

    const activeRules = activeFileId ? (rulesMap[activeFileId] ?? createDefaultRules()) : createDefaultRules()

    const handleRulesChange = (newRules: CleaningRules) => {
        if (activeFileId) {
            setRulesMap(prev => ({ ...prev, [activeFileId]: newRules }))
        }
    }

    useEffect(() => {
        const preventDefault = (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
        }
        window.addEventListener('dragenter', preventDefault, false)
        window.addEventListener('dragover', preventDefault, false)
        window.addEventListener('dragleave', preventDefault, false)
        window.addEventListener('drop', preventDefault, false)
        return () => {
            window.removeEventListener('dragenter', preventDefault)
            window.removeEventListener('dragover', preventDefault)
            window.removeEventListener('dragleave', preventDefault)
            window.removeEventListener('drop', preventDefault)
        }
    }, [])

    const successFiles = useMemo(
        () => files.filter((f) => f.status === 'success'),
        [files]
    )

    useEffect(() => {
        if (!activeFileId && successFiles.length > 0) {
            setActiveFileId(successFiles[0].id)
        }
    }, [activeFileId, successFiles])

    useEffect(() => {
        const parse = async () => {
            if (currentStep !== 2) return
            if (!activeFileId) return
            const active = files.find((f) => f.id === activeFileId)
            if (!active) return

            setParsingError(null)
            setTable(null)

            if (active.file.size === 0) {
                setParsingError(
                    '当前文件内容为空。若为桌面拖拽文件，请接入 Tauri 后端读取本地文件内容。'
                )
                return
            }

            try {
                const next = await parseSpreadsheetFile(active.file)
                if (next.columns.length === 0) {
                    setParsingError(
                        '未检测到表头或数据为空，请确认首行是表头。'
                    )
                    return
                }
                setTable(next)
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e)
                setParsingError(msg)
            }
        }

        parse()
    }, [activeFileId, currentStep, files])

    const handleRun = async () => {
        if (!table) return
        setIsProcessing(true)
        try {
            const next = applyCleaningRules(table, activeRules)
            setResult(next)
            setCurrentStep(3)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleRestart = () => {
        setCurrentStep(2)
        setFiles([])
        setActiveFileId(null)
        setTable(null)
        setResult(null)
        setParsingError(null)
        setRulesMap({})
    }

    return (
        <main className="h-screen w-screen overflow-hidden bg-slate-50/50 border-t border-gray-200">
            <div className="h-full w-full">
                {currentStep === 2 && (
                    <RuleConfig
                        onRun={handleRun}
                        isProcessing={isProcessing}
                        files={files}
                        setFiles={setFiles}
                        activeFileId={activeFileId}
                        onActiveFileIdChange={setActiveFileId}
                        columns={table?.columns ?? []}
                        table={table}
                        parsingError={parsingError}
                        value={activeRules}
                        onChange={handleRulesChange}
                    />
                )}
                {currentStep === 3 && result && (
                    <RuleConfig
                        onRun={handleRun}
                        isProcessing={isProcessing}
                        files={files}
                        setFiles={setFiles}
                        activeFileId={activeFileId}
                        onActiveFileIdChange={setActiveFileId}
                        columns={table?.columns ?? []}
                        table={table}
                        parsingError={parsingError}
                        value={activeRules}
                        onChange={handleRulesChange}
                        previewResult={result}
                        onBackToRules={() => setCurrentStep(2)}
                        onRestart={handleRestart}
                    />
                )}
            </div>
        </main>
    )
}

export default App
