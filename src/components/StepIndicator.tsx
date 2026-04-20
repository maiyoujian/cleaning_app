import { cn } from '@/lib/utils'

const steps = [
    { id: 1, title: '选择文件', description: '支持 .xlsx、.xls、.cs...' },
    { id: 2, title: '配置规则', description: '配置去重规则' },
    { id: 3, title: '查看结果', description: '数据预览' }
]

export function StepIndicator({ currentStep = 1 }: { currentStep?: number }) {
    return (
        <div className="flex items-center w-full p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            {steps.map((step, index) => {
                const isActive = step.id === currentStep

                return (
                    <div
                        key={step.id}
                        className={cn(
                            'flex items-center',
                            index < steps.length - 1 ? 'flex-1' : ''
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={cn(
                                    'flex items-center justify-center size-10 rounded-full text-base font-medium',
                                    isActive
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-500'
                                )}
                            >
                                {step.id}
                            </div>
                            <div>
                                <div
                                    className={cn(
                                        'font-medium',
                                        isActive
                                            ? 'text-gray-900'
                                            : 'text-gray-500'
                                    )}
                                >
                                    {step.title}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                    {step.description}
                                </div>
                            </div>
                        </div>
                        {index < steps.length - 1 && (
                            <div className="flex-1 h-px bg-gray-200 mx-4 md:mx-8 lg:mx-12" />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
