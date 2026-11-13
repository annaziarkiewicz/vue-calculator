export type AngleMode = 'deg' | 'rad'
export type ButtonVariant = 'action' | 'number' | 'operator'

export interface CalculatorButton {
    ariaLabel: string
    label: string
    value: string
    variant: ButtonVariant
}

export interface CalculatorHistoryItem {
    angleMode?: AngleMode
    exactValues?: Record<number, [string, string]>
    expression: string
    id: string
    result: string
    timestamp: number
    tokens?: string[]
}

export interface ScientificButton {
    ariaLabel: string
    label: string
    value: string
}

export interface CalculatorHistoryDisplayItem extends CalculatorHistoryItem {
    expressionMarkup: string
    resultMarkup: string
}

export interface RepeatOperation {
    exactValue?: [bigint, bigint] | null
    operator: string
    value: number
    percentage?: number
    percentageExactValue?: [bigint, bigint] | null
}