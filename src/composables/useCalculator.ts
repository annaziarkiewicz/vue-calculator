import {
    computed,
    ref,
} from 'vue'

import {
    expandScientificNotation,
    formatExpression,
    formatNumber,
    formatResult,
} from '@/composables/calculatorFormatting'
import {
    isFunction,
    isOperator,
    numericValue,
    useCalculatorExpression,
} from '@/composables/useCalculatorExpression'
import {
    normalizeCalculatorFunction,
    useCalculatorHistory,
} from '@/composables/useCalculatorHistory'

import type {
    AngleMode,
    RepeatOperation,
} from '@/types/calculator'

export const useCalculator = () => {
    const { addHistoryItem, clearHistory, history } = useCalculatorHistory()
    const angleMode = ref<AngleMode>('deg')
    const canClearEntry = ref(false)
    const completedExpression = ref('')
    const currentValue = ref('0')
    const calculatedExactValue = ref<[bigint, bigint] | null>(null)
    const calculatedValue = ref<string | null>(null)
    const error = ref('')
    const justEvaluated = ref(false)
    const memory = ref(0)
    const memoryExactValue = ref<[bigint, bigint] | null>([0n, 1n])
    const memoryRecalled = ref(false)
    const repeatOperation = ref<RepeatOperation | null>(null)
    const replaceInput = ref(true)
    const secondMode = ref(false)
    const tokens = ref<string[]>([])
    const tokenExactValues = ref(new Map<number, [bigint, bigint]>())

    let undoPower: (() => void) | null = null

    const {
        calculateWithPrecision,
        evaluateCalculation,
        evaluateExpression,
        getExactValue,
    } = useCalculatorExpression(() => angleMode.value)

    const activeScientificAction = computed(() => {
        if (!replaceInput.value || error.value || justEvaluated.value) {
            return ''
        }

        const actions: Record<string, string> = {
            '^': 'power', 'reverse-power': 'inverse-power', root: 'root', ee: 'ee',
            sin: 'sin', cos: 'cos', tan: 'tan', sinh: 'sinh', cosh: 'cosh', tanh: 'tanh',
            asin: 'inverse-sin', acos: 'inverse-cos', atan: 'inverse-tan',
            asinh: 'inverse-sinh', acosh: 'inverse-cosh', atanh: 'inverse-tanh',
            ln: 'ln', log: 'log', log2: 'log2', exp: 'e-power', exp10: '10-power',
            exp2: '2-power', '√': 'square-root', '∛': 'cube-root', '1/x': 'reciprocal', 'x!': 'factorial',
        }
        const token = tokens.value.at(-1) === '(' ? tokens.value.at(-2) : tokens.value.at(-1)

        return actions[token ?? ''] ?? ''
    })

    const clearLabel = computed(() => canClearEntry.value ? 'C' : 'AC')

    const expressionValue = computed(() => formatExpression(
        replaceInput.value ? tokens.value : [...tokens.value, currentValue.value],
    ))

    const displayValue = computed(() => {
        if (tokens.value.length && expressionValue.value) {
            return expressionValue.value
        }

        return formatNumber(calculatedValue.value === currentValue.value
            ? formatResult(numericValue(currentValue.value)) ?? currentValue.value
            : currentValue.value)
    })

    const resetTokens = (values: string[] = [], exactValues: ReadonlyMap<number, [bigint, bigint]> = new Map()) => {
        tokens.value = values
        tokenExactValues.value = new Map(exactValues)
    }

    const sliceExactValues = (start: number, end = tokens.value.length) => new Map(
        Array.from(tokenExactValues.value)
            .filter(([index]) => index >= start && index < end)
            .map(([index, value]) => [index - start, value]),
    )

    const serializeExactValues = (values: ReadonlyMap<number, [bigint, bigint]>) => Object.fromEntries(
        Array.from(values).map(([index, value]): [number, [string, string]] => [index, [value[0].toString(), value[1].toString()]]),
    )

    const spliceTokens = (start: number, deleteCount = tokens.value.length, ...values: string[]) => {
        const index = Math.min(tokens.value.length, Math.max(0, start < 0 ? tokens.value.length + start : start))
        const removed = tokens.value.splice(index, deleteCount, ...values)

        tokenExactValues.value = new Map(Array.from(tokenExactValues.value)
            .filter(([position]) => position < index || position >= index + removed.length)
            .map(([position, value]) => [position < index ? position : position + values.length - removed.length, value]))

        return removed
    }

    const popToken = () => spliceTokens(-1, 1)[0]

    const appendCurrentValue = () => {
        if (calculatedValue.value === currentValue.value && calculatedExactValue.value) {
            tokenExactValues.value.set(tokens.value.length, calculatedExactValue.value)
        }

        tokens.value.push(currentValue.value)
    }

    const restoreCurrentToken = () => {
        const exactValue = tokenExactValues.value.get(tokens.value.length - 1) ?? null

        currentValue.value = popToken()
        calculatedExactValue.value = exactValue
        calculatedValue.value = exactValue ? currentValue.value : null
    }

    const clearAll = () => {
        undoPower = null
        canClearEntry.value = false
        completedExpression.value = ''
        currentValue.value = '0'
        calculatedExactValue.value = null
        calculatedValue.value = null
        error.value = ''
        justEvaluated.value = false
        memoryRecalled.value = false
        repeatOperation.value = null
        replaceInput.value = true
        resetTokens()
    }

    const setCurrentValue = (
        value: number,
        inputComplete = false,
        exactValue: [bigint, bigint] | null = getExactValue(value.toString()),
    ) => {
        const result = formatResult(value)

        if (result === null) {
            error.value = 'Error'
            return false
        }

        currentValue.value = value.toString()
        calculatedExactValue.value = exactValue
        calculatedValue.value = currentValue.value
        canClearEntry.value = true
        replaceInput.value = inputComplete
        return true
    }

    const beginNewExpressionIfNeeded = () => {
        if (justEvaluated.value) {
            clearAll()
        }
    }

    const inputDigit = (digit: string) => {
        if (memoryRecalled.value) {
            replaceInput.value = true
            memoryRecalled.value = false
        }

        calculatedExactValue.value = null
        calculatedValue.value = null

        if (error.value || justEvaluated.value) {
            const previousRepeat = repeatOperation.value
            clearAll()
            repeatOperation.value = previousRepeat
        }

        if (!replaceInput.value && ['π', '-π', 'e', '-e'].includes(currentValue.value)) {
            commitCurrentValue()
            tokens.value.push('*')
        } else if (replaceInput.value && tokens.value.at(-1) === ')') {
            tokens.value.push('*')
        }

        if (replaceInput.value) {
            currentValue.value = digit
        } else {
            currentValue.value = expandScientificNotation(currentValue.value)
            currentValue.value = currentValue.value === '0'
                ? digit
                : `${currentValue.value}${digit}`
        }

        replaceInput.value = false
        canClearEntry.value = true
    }

    const inputDecimal = () => {
        if (memoryRecalled.value) {
            replaceInput.value = true
            memoryRecalled.value = false
        }

        calculatedExactValue.value = null
        calculatedValue.value = null

        if (error.value || justEvaluated.value) {
            const previousRepeat = repeatOperation.value
            clearAll()
            repeatOperation.value = previousRepeat
        }

        if (!replaceInput.value && ['π', '-π', 'e', '-e'].includes(currentValue.value)) {
            commitCurrentValue()
            tokens.value.push('*')
        } else if (replaceInput.value && tokens.value.at(-1) === ')') {
            tokens.value.push('*')
        }

        if (replaceInput.value) {
            currentValue.value = '0.'
            replaceInput.value = false
        } else {
            currentValue.value = expandScientificNotation(currentValue.value)

            if (!currentValue.value.includes('.')) {
                currentValue.value += '.'
            }
        }

        canClearEntry.value = true
    }

    const commitCurrentValue = () => {
        if (!replaceInput.value) {
            if (currentValue.value === '-') {
                currentValue.value = '0'
            }

            appendCurrentValue()
            replaceInput.value = true
        }
    }

    const chooseOperator = (operator: string) => {
        if (error.value) {
            return
        }

        if (justEvaluated.value) {
            resetTokens()
            appendCurrentValue()
            justEvaluated.value = false
        } else {
            commitCurrentValue()
        }

        if (!tokens.value.length) {
            appendCurrentValue()
        }

        const lastToken = tokens.value.at(-1)

        if (lastToken && isOperator(lastToken)) {
            spliceTokens(-1, 1, operator)
        } else if (lastToken !== '(') {
            tokens.value.push(operator)
        }

        completedExpression.value = ''
        repeatOperation.value = null
        replaceInput.value = true
    }

    const showResult = () => {
        if (error.value) {
            return
        }

        if (repeatOperation.value && !tokens.value.length) {
            const currentNumber = numericValue(currentValue.value)
            const currentExactValue = calculatedValue.value === currentValue.value
                ? calculatedExactValue.value
                : getExactValue(currentValue.value)
            const percentageProduct = repeatOperation.value.percentage === undefined
                ? null
                : calculateWithPrecision(currentNumber, repeatOperation.value.percentage, '*', currentExactValue, repeatOperation.value.percentageExactValue)
            const operand = percentageProduct
                ? calculateWithPrecision(percentageProduct.value, 100, '/', percentageProduct.exactValue)
                : { exactValue: repeatOperation.value.exactValue, value: repeatOperation.value.value }
            const calculation = calculateWithPrecision(
                currentNumber,
                operand.value,
                repeatOperation.value.operator,
                currentExactValue,
                operand.exactValue,
            )
            const sourceTokens = repeatOperation.value.percentage === undefined
                ? [currentValue.value, repeatOperation.value.operator, operand.value.toString()]
                : [currentValue.value, repeatOperation.value.operator, 'percent', '(', repeatOperation.value.percentage.toString(), ')']
            const operation = formatExpression(sourceTokens)
            const sourceExactValues = new Map<number, [bigint, bigint]>()
            const repeatedExactValue = repeatOperation.value.percentage === undefined
                ? operand.exactValue
                : repeatOperation.value.percentageExactValue

            if (currentExactValue) {
                sourceExactValues.set(0, currentExactValue)
            }

            if (repeatedExactValue) {
                sourceExactValues.set(repeatOperation.value.percentage === undefined ? 2 : 4, repeatedExactValue)
            }

            if (setCurrentValue(calculation.value, true, calculation.exactValue)) {
                justEvaluated.value = true
                completedExpression.value = operation
                addHistoryItem(operation, formatNumber(formatResult(numericValue(currentValue.value)) ?? currentValue.value), sourceTokens, angleMode.value, serializeExactValues(sourceExactValues))
            }

            return
        }

        commitCurrentValue()

        while (isOperator(tokens.value.at(-1) ?? '')) {
            popToken()
        }

        while (
            tokens.value.filter(token => token === '(').length
            > tokens.value.filter(token => token === ')').length
        ) {
            tokens.value.push(')')
        }

        if (!tokens.value.length || isOperator(tokens.value.at(-1) as string)) {
            return
        }

        const sourceTokens = [...tokens.value]
        const sourceExactValues = new Map(tokenExactValues.value)

        try {
            const calculation = evaluateCalculation(sourceTokens, sourceExactValues)
            const result = calculation.value
            const operation = formatExpression(sourceTokens)

            if (!setCurrentValue(result, true, calculation.exactValue)) {
                return
            }

            completedExpression.value = operation
            justEvaluated.value = true
            repeatOperation.value = calculation.repeat
            resetTokens()
            addHistoryItem(operation, formatNumber(formatResult(numericValue(currentValue.value)) ?? currentValue.value), sourceTokens, angleMode.value, serializeExactValues(sourceExactValues))
        } catch {
            error.value = 'Error'
        }
    }

    const getLastOperandStart = () => {
        let depth = 0
        let start = tokens.value.length - 1

        for (; start >= 0; start -= 1) {
            depth += tokens.value[start] === ')' ? 1 : tokens.value[start] === '(' ? -1 : 0

            if (depth === 0) {
                break
            }
        }

        if (isFunction(tokens.value[start - 1])) {
            start -= 1
        }

        return start
    }

    const getDisplayedCalculation = () => {
        const parts = replaceInput.value ? [...tokens.value] : [...tokens.value, currentValue.value]
        const exactValues = new Map(tokenExactValues.value)

        if (!replaceInput.value && calculatedValue.value === currentValue.value && calculatedExactValue.value) {
            exactValues.set(tokens.value.length, calculatedExactValue.value)
        }

        if (!parts.length || (!tokens.value.length && calculatedValue.value === currentValue.value)) {
            return {
                exactValue: calculatedValue.value === currentValue.value
                    ? calculatedExactValue.value
                    : getExactValue(currentValue.value),
                value: numericValue(currentValue.value),
            }
        }

        while (isOperator(parts.at(-1) ?? '')) {
            exactValues.delete(parts.length - 1)
            parts.pop()
        }

        const missing = parts.filter(token => token === '(').length - parts.filter(token => token === ')').length
        parts.push(...Array(Math.max(0, missing)).fill(')'))
        return evaluateCalculation(parts, exactValues)
    }

    const clearEntry = () => {
        calculatedExactValue.value = null
        calculatedValue.value = null

        if (!canClearEntry.value) {
            clearAll()
            return
        }

        if (replaceInput.value && tokens.value.at(-1) === ')') {
            spliceTokens(getLastOperandStart())
        } else if (error.value && replaceInput.value && tokens.value.at(-1) !== undefined
            && !Number.isNaN(numericValue(tokens.value.at(-1)!))) {
            popToken()
        }

        currentValue.value = '0'
        completedExpression.value = ''
        error.value = ''
        justEvaluated.value = false
        canClearEntry.value = false
        replaceInput.value = false
    }

    const removeLastCharacter = () => {
        if (undoPower) {
            undoPower()
            undoPower = null
            return
        }

        calculatedExactValue.value = null
        calculatedValue.value = null

        if (error.value) {
            clearAll()
            return
        }

        if (justEvaluated.value && !tokens.value.length) {
            justEvaluated.value = false
            replaceInput.value = false
            completedExpression.value = ''
            repeatOperation.value = null
        }

        if (replaceInput.value) {
            if (tokens.value.at(-1) === '(') {
                popToken()

                if (isFunction(tokens.value.at(-1) ?? '')) {
                    popToken()
                }

                return
            }

            if (tokens.value.at(-1) === ')') {
                const start = getLastOperandStart()

                if (tokens.value[start] === 'percent') {
                    const operand = tokens.value.slice(start + 2, -1)
                    const operandExactValues = sliceExactValues(start + 2, tokens.value.length - 1)

                    spliceTokens(start, tokens.value.length - start, ...operand)

                    for (const [index, value] of operandExactValues) {
                        tokenExactValues.value.set(start + index, value)
                    }

                    if (operand.length === 1 && !Number.isNaN(numericValue(operand[0]))) {
                        restoreCurrentToken()
                        replaceInput.value = false
                    }

                    return
                }

                popToken()
                const lastToken = tokens.value.at(-1)

                if (lastToken !== undefined && !Number.isNaN(numericValue(lastToken))) {
                    restoreCurrentToken()
                    replaceInput.value = false
                }

                return
            }

            if (!isOperator(tokens.value.at(-1) ?? '') && !Number.isNaN(numericValue(tokens.value.at(-1) ?? 'NaN'))) {
                restoreCurrentToken()
                replaceInput.value = false
                removeLastCharacter()
                return
            }

            if (isOperator(tokens.value.at(-1) ?? '')) {
                popToken()
                const base = tokens.value.at(-1)

                if (base && !isOperator(base) && base !== '(' && base !== ')') {
                    restoreCurrentToken()
                    replaceInput.value = false
                }
            }

            return
        }

        if (tokens.value.at(-1) === '^' && /^-?\d$/.test(currentValue.value)) {
            replaceInput.value = true
            return
        }

        currentValue.value = expandScientificNotation(currentValue.value)
        currentValue.value = currentValue.value.length > 1
            ? currentValue.value.slice(0, -1)
            : '0'

        if (currentValue.value === '-') {
            currentValue.value = '0'
        }
    }

    const applyUnary = (label: string) => {
        const lastToken = tokens.value.at(-1)

        if (error.value) {
            return
        }

        if (justEvaluated.value) {
            resetTokens()
        }

        if (lastToken === ')' && !justEvaluated.value) {
            const start = getLastOperandStart()
            const operandExactValues = sliceExactValues(start)
            const operand = spliceTokens(start)
            tokens.value.push(label, '(', ...operand, ')')

            for (const [index, value] of operandExactValues) {
                tokenExactValues.value.set(start + index + 2, value)
            }
        } else if (replaceInput.value && !justEvaluated.value && (
            tokens.value.length || !['square', 'cube', '1/x', 'x!', '√', '∛', 'percent'].includes(label)
        )) {
            tokens.value.push(label, '(')
        } else {
            tokens.value.push(label, '(')
            appendCurrentValue()
            tokens.value.push(')')
        }

        completedExpression.value = ''
        justEvaluated.value = false
        repeatOperation.value = null
        replaceInput.value = true
        canClearEntry.value = true
    }

    const applyPower = (exponent: 2 | 3) => {
        if (error.value) {
            return
        }

        const previousTokens = [...tokens.value]
        const previousTokenExactValues = new Map(tokenExactValues.value)
        const previousValue = currentValue.value
        const previousCalculatedExactValue = calculatedExactValue.value
        const previousCalculatedValue = calculatedValue.value
        const previousExpression = completedExpression.value
        const previousClearEntry = canClearEntry.value
        const previousError = error.value
        const previousEvaluation = justEvaluated.value
        const previousReplaceInput = replaceInput.value
        const previousRepeatOperation = repeatOperation.value ? { ...repeatOperation.value } : null

        undoPower = () => {
            resetTokens(previousTokens, previousTokenExactValues)
            currentValue.value = previousValue
            calculatedExactValue.value = previousCalculatedExactValue
            calculatedValue.value = previousCalculatedValue
            completedExpression.value = previousExpression
            canClearEntry.value = previousClearEntry
            error.value = previousError
            justEvaluated.value = previousEvaluation
            replaceInput.value = previousReplaceInput
            repeatOperation.value = previousRepeatOperation
        }

        applyUnary(exponent === 2 ? 'square' : 'cube')
    }

    const inputPercent = () => {
        if (error.value || (replaceInput.value && !justEvaluated.value
            && (isOperator(tokens.value.at(-1) ?? '') || tokens.value.at(-1) === '('))) {
            return
        }

        applyUnary('percent')
    }

    const openParenthesis = () => {
        beginNewExpressionIfNeeded()

        if (!replaceInput.value) {
            commitCurrentValue()
            tokens.value.push('*')
        } else if (tokens.value.at(-1) === ')') {
            tokens.value.push('*')
        }

        tokens.value.push('(')
        replaceInput.value = true
        canClearEntry.value = true
    }

    const closeParenthesis = () => {
        const openCount = tokens.value.filter(token => token === '(').length
        const closeCount = tokens.value.filter(token => token === ')').length

        if (openCount <= closeCount) {
            return
        }

        undoPower = null
        commitCurrentValue()

        const lastToken = tokens.value.at(-1)

        if (openCount > closeCount && lastToken && !isOperator(lastToken) && lastToken !== '(') {
            tokens.value.push(')')
            replaceInput.value = true
        }
    }

    const insertConstant = (value: number, symbol?: string) => {
        if (error.value || justEvaluated.value) {
            clearAll()
        }

        if (!replaceInput.value) {
            commitCurrentValue()
            tokens.value.push('*')
        } else if (tokens.value.at(-1) === ')') {
            tokens.value.push('*')
        }

        setCurrentValue(value)

        if (symbol) {
            currentValue.value = symbol
        }

        justEvaluated.value = false
    }

    const applyScientificAction = (value: string) => {
        if (!['second', 'angle'].includes(value)) {
            memoryRecalled.value = false
        }

        if (value === 'close-parenthesis') {
            closeParenthesis()
            return
        }

        undoPower = null

        if (activeScientificAction.value === value) {
            if (tokens.value.at(-1) === '(') {
                spliceTokens(-2)
            } else {
                removeLastCharacter()
            }

            return
        }

        const unaryActions: Record<string, () => void> = {
            '10-power': () => applyUnary('exp10'),
            '2-power': () => applyUnary('exp2'),
            log2: () => applyUnary('log2'),
            'inverse-sinh': () => applyUnary('asinh'),
            'inverse-cosh': () => applyUnary('acosh'),
            'inverse-tanh': () => applyUnary('atanh'),
            'cube-root': () => applyUnary('∛'),
            cos: () => applyUnary('cos'),
            cosh: () => applyUnary('cosh'),
            cube: () => applyPower(3),
            'e-power': () => applyUnary('exp'),
            factorial: () => applyUnary('x!'),
            'inverse-cos': () => applyUnary('acos'),
            'inverse-sin': () => applyUnary('asin'),
            'inverse-tan': () => applyUnary('atan'),
            ln: () => applyUnary('ln'),
            log: () => applyUnary('log'),
            reciprocal: () => applyUnary('1/x'),
            sin: () => applyUnary('sin'),
            sinh: () => applyUnary('sinh'),
            square: () => applyPower(2),
            'square-root': () => applyUnary('√'),
            tan: () => applyUnary('tan'),
            tanh: () => applyUnary('tanh'),
        }

        if (unaryActions[value]) {
            unaryActions[value]()
        } else if (value === 'second') {
            secondMode.value = !secondMode.value
        } else if (value === 'open-parenthesis') {
            openParenthesis()

        } else if (value === 'power') {
            chooseOperator('^')
        } else if (value === 'inverse-power') {
            chooseOperator('reverse-power')
        } else if (value === 'ee') {
            chooseOperator('ee')
        } else if (value === 'root') {
            chooseOperator('root')
        } else if (value === 'pi') {
            insertConstant(Math.PI, 'π')
        } else if (value === 'e') {
            insertConstant(Math.E, 'e')
        } else if (value === 'random') {
            insertConstant(Math.random())
        } else if (value === 'angle') {
            angleMode.value = angleMode.value === 'rad' ? 'deg' : 'rad'
        } else if (value === 'memory-clear') {
            memory.value = 0
            memoryExactValue.value = [0n, 1n]
        } else if (value === 'memory-add') {
            try {
                const operand = getDisplayedCalculation()
                const nextMemory = calculateWithPrecision(memory.value, operand.value, '+', memoryExactValue.value, operand.exactValue)

                if (Number.isFinite(nextMemory.value)) {
                    memory.value = nextMemory.value
                    memoryExactValue.value = nextMemory.exactValue
                }
            } catch {
                return
            }
        } else if (value === 'memory-subtract') {
            try {
                const operand = getDisplayedCalculation()
                const nextMemory = calculateWithPrecision(memory.value, operand.value, '-', memoryExactValue.value, operand.exactValue)

                if (Number.isFinite(nextMemory.value)) {
                    memory.value = nextMemory.value
                    memoryExactValue.value = nextMemory.exactValue
                }
            } catch {
                return
            }
        } else if (value === 'memory-recall') {
            if (error.value) {
                clearAll()
            }

            if (replaceInput.value && tokens.value.at(-1) === ')') {
                spliceTokens(getLastOperandStart())
            }

            setCurrentValue(memory.value, false, memoryExactValue.value)
            justEvaluated.value = false
            memoryRecalled.value = true
        }
    }

    const inputAction = (value: string) => {
        if (!/^\d$/.test(value) && value !== ',') {
            memoryRecalled.value = false
        }

        if (value !== 'backspace') {
            undoPower = null
        }

        if (/^\d$/.test(value)) {
            inputDigit(value)
            return
        }

        if (['+', '-', '*', '/'].includes(value)) {
            chooseOperator(value)
            return
        }

        const actions: Record<string, () => void> = {
            ',': inputDecimal,
            backspace: removeLastCharacter,
            clear: clearEntry,
            'all-clear': clearAll,
            equals: showResult,
            percent: inputPercent,
            'toggle-sign': () => {
                let wasCalculated = calculatedValue.value === currentValue.value
                const lastToken = tokens.value.at(-1)

                if (replaceInput.value && !justEvaluated.value && lastToken
                    && !Number.isNaN(numericValue(lastToken))) {
                    restoreCurrentToken()
                    wasCalculated = calculatedValue.value === currentValue.value
                    replaceInput.value = false
                }

                if (replaceInput.value && tokens.value.at(-1) === ')' && !justEvaluated.value) {
                    applyUnary('negate')
                } else if ((replaceInput.value && (isOperator(tokens.value.at(-1) ?? '') || tokens.value.at(-1) === '('))
                    || (currentValue.value === '0' && !tokens.value.length && !justEvaluated.value)) {
                    currentValue.value = '-'
                    replaceInput.value = false
                } else {
                    currentValue.value = currentValue.value.startsWith('-')
                        ? currentValue.value.slice(1) || '0'
                        : `-${currentValue.value}`
                }

                calculatedValue.value = wasCalculated ? currentValue.value : null
                calculatedExactValue.value = wasCalculated && calculatedExactValue.value
                    ? [-calculatedExactValue.value[0], calculatedExactValue.value[1]]
                    : null
            },
        }

        actions[value]?.()
    }

    const restoreResult = (result: string) => {
        clearAll()
        currentValue.value = result.replace(',', '.')
        canClearEntry.value = true
        justEvaluated.value = true
    }

    const restoreCalculation = (
        expression: string,
        result: string,
        savedTokens?: string[],
        savedAngleMode?: AngleMode,
        savedExactValues?: Record<number, [string, string]>,
    ) => {
        clearAll()
        if (savedAngleMode) {
            angleMode.value = savedAngleMode
        }

        const normalDigits: Record<string, string> = {
            '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
            '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
            '⁻': '-',
        }
        const normalized = expression.replace(/=$/, '')
            .replace(/³√/g, '∛').replace(/²√/g, '√')
            .replace(/<sup>(.*?)<\/sup>/g, '^($1)').replace(/<sub>(.*?)<\/sub>/g, '$1')
            .replace(/log₁₀/g, 'log').replace(/log₂/g, 'log2')
            .replace(/x²\(/g, 'square(').replace(/x³\(/g, 'cube(')
            .replace(/10\^\(/g, 'exp10(').replace(/e\^\(/g, 'exp(')
            .replace(/([\d)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁻·]+)/g, (_, base: string, exponent: string) =>
                `${base}^${Array.from(exponent, character => normalDigits[character] ?? '.').join('')}`,
            )
            .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '.')
        const scannedTokens = normalized.match(
            /(?:sin|cos|tan)h?(?:⁻¹)?|square|cube|exp10|exp2|exp|log2|log|ln|[√∛π]|\d+(?:\.\d*)?(?:e[+-]?\d+)?|e|[()+*/^!-]/g,
        ) ?? []
        const validSavedTokens = Array.isArray(savedTokens) && savedTokens.every(token => typeof token === 'string')
        const parsedTokens = validSavedTokens ? savedTokens.map(normalizeCalculatorFunction) : []

        if (!validSavedTokens) {
            if (scannedTokens.join('') !== normalized.replace(/\s/g, '')) {
                restoreResult(result)
                return
            }

            for (let index = 0; index < scannedTokens.length; index += 1) {
                const token = normalizeCalculatorFunction(scannedTokens[index])
                const previous = parsedTokens.at(-1)

                if (token === '!') {
                    let start = parsedTokens.length - 1
                    let depth = 0

                    if (!previous || previous === '(' || isOperator(previous)) {
                        restoreResult(result)
                        return
                    }

                    if (previous === ')') {
                        for (; start >= 0; start -= 1) {
                            depth += parsedTokens[start] === ')' ? 1 : parsedTokens[start] === '(' ? -1 : 0

                            if (depth === 0) {
                                break
                            }
                        }

                        if (isFunction(parsedTokens[start - 1])) {
                            start -= 1
                        }
                    }

                    const operand = parsedTokens.splice(start)
                    parsedTokens.push('x!', '(', ...operand, ')')
                } else if (token === '-' && (!previous || previous === '(' || isOperator(previous))
                    && !Number.isNaN(numericValue(scannedTokens[index + 1]))) {
                    parsedTokens.push(`-${scannedTokens[index + 1]}`)
                    index += 1
                } else {
                    parsedTokens.push(token)
                }
            }

            try {
                if (formatResult(evaluateExpression(parsedTokens)) !== formatResult(numericValue(result.replace(',', '.')))) {
                    restoreResult(result)
                    return
                }
            } catch {
                restoreResult(result)
                return
            }
        }

        if (!parsedTokens?.length) {
            restoreResult(result)
            return
        }

        resetTokens([...parsedTokens], validSavedTokens && savedExactValues
            ? new Map(Object.entries(savedExactValues)
                .map(([index, value]) => [Number(index), [BigInt(value[0]), BigInt(value[1])]]))
            : new Map())
        const lastToken = tokens.value.at(-1)
        const editableNumber = lastToken !== undefined && !Number.isNaN(numericValue(lastToken))

        if (editableNumber) {
            restoreCurrentToken()
        } else {
            currentValue.value = result.replace(',', '.')
        }
        canClearEntry.value = true
        replaceInput.value = !editableNumber
    }

    return {
        activeScientificAction,
        angleMode,
        applyScientificAction,
        clearAll,
        clearHistory,
        clearLabel,
        completedExpression,
        displayValue,
        error,
        history,
        inputAction,
        restoreCalculation,
        restoreResult,
        secondMode,
    }
}