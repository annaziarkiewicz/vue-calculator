import {
    onMounted,
    ref,
} from 'vue'

import type {
    AngleMode,
    CalculatorHistoryItem,
} from '@/types/calculator'

export const calculatorOperators = ['+', '-', '*', '/', '^', 'reverse-power', 'root', 'ee']

export const calculatorFunctions = [
    'square', 'cube', 'exp', 'exp10', 'exp2', '1/x',
    '√', '∛', 'ln', 'log2', 'log', 'x!',
    'sin', 'asin', 'cos', 'acos', 'tan', 'atan',
    'sinh', 'asinh', 'cosh', 'acosh', 'tanh', 'atanh', 'negate', 'percent',
]

export const normalizeCalculatorFunction = (token: string) => token.replace(/^(sin|cos|tan)(h?)⁻¹$/, 'a$1$2')

const historyKey = 'vue-calculator-history'

export const useCalculatorHistory = () => {
    const history = ref<CalculatorHistoryItem[]>([])

    const isValidTokens = (value: unknown): value is string[] => {
        let depth = 0
        let expectsOperand = true

        if (!Array.isArray(value) || !value.length) {
            return false
        }

        for (let index = 0; index < value.length; index += 1) {
            const token: unknown = value[index]

            if (typeof token !== 'string') {
                return false
            }

            if (expectsOperand) {
                if (token === '(') {
                    depth += 1
                } else if (['π', '-π', 'e', '-e'].includes(token)
                    || (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(token)
                        && Number.isFinite(Number(token)))) {
                    expectsOperand = false
                } else if (!calculatorFunctions.includes(normalizeCalculatorFunction(token)) || value[index + 1] !== '(') {
                    return false
                }
            } else if (calculatorOperators.includes(token)) {
                expectsOperand = true
            } else if (token === ')' && depth > 0) {
                depth -= 1
            } else {
                return false
            }
        }

        return !expectsOperand && depth === 0
    }

    const isValidExactValues = (value: unknown, tokens: unknown) => {
        if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(tokens)) {
            return false
        }

        return Object.entries(value).every(([index, fraction]) => /^(0|[1-9]\d*)$/.test(index)
            && Number(index) < tokens.length
            && /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(tokens[Number(index)])
            && Array.isArray(fraction)
            && fraction.length === 2
            && typeof fraction[0] === 'string'
            && /^-?\d+$/.test(fraction[0])
            && typeof fraction[1] === 'string'
            && /^[1-9]\d*$/.test(fraction[1]))
    }

    const isValidHistoryItem = (value: unknown): value is CalculatorHistoryItem => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return false
        }

        const item = value as Record<string, unknown>

        return typeof item.expression === 'string'
            && typeof item.result === 'string'
            && /^-?(?:\d+(?:[,.]\d*)?|[,.]\d+)(?:e[+-]?\d+)?$/i.test(item.result)
            && Number.isFinite(Number(item.result.replace(',', '.')))
            && typeof item.id === 'string'
            && typeof item.timestamp === 'number'
            && Number.isFinite(item.timestamp)
            && (item.angleMode === undefined || item.angleMode === 'deg' || item.angleMode === 'rad')
            && (item.tokens === undefined || isValidTokens(item.tokens))
            && (item.exactValues === undefined || isValidExactValues(item.exactValues, item.tokens))
    }

    const saveHistory = () => {
        try {
            localStorage.setItem(historyKey, JSON.stringify({ items: history.value }))
        } catch {
            return
        }
    }

    const loadHistory = () => {
        try {
            const stored: unknown = JSON.parse(localStorage.getItem(historyKey) ?? 'null')

            if (!stored || typeof stored !== 'object' || !('items' in stored) || !Array.isArray(stored.items)) {
                return
            }

            history.value = stored.items.filter(isValidHistoryItem)
        } catch {
            history.value = []
        }
    }

    const addHistoryItem = (
        expression: string,
        result: string,
        tokens?: string[],
        angleMode?: AngleMode,
        exactValues?: Record<number, [string, string]>,
    ) => {
        const timestamp = Date.now()

        history.value = [{
            angleMode,
            exactValues,
            expression,
            id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
            result,
            timestamp,
            tokens: tokens ? [...tokens] : undefined,
        }, ...history.value]
        saveHistory()
    }

    const clearHistory = () => {
        history.value = []
        saveHistory()
    }

    onMounted(loadHistory)

    return {
        addHistoryItem,
        clearHistory,
        history,
    }
}