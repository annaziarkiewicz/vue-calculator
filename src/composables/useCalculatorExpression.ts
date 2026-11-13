import {
    calculatorFunctions,
    calculatorOperators,
} from '@/composables/useCalculatorHistory'

import type {
    AngleMode,
    RepeatOperation,
} from '@/types/calculator'

export const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '^': 3,
    'reverse-power': 3,
    ee: 3,
    root: 3,
}

export const isOperator = (value: string) => calculatorOperators.includes(value)
export const isRightAssociative = (value: string) => ['^', 'root'].includes(value)

export const isFunction = (value: string) => calculatorFunctions.includes(value)

export const numericValue = (value: string) => {
    if (value === 'π' || value === '-π') {
        return value.startsWith('-') ? -Math.PI : Math.PI
    }

    if (value === 'e' || value === '-e') {
        return value.startsWith('-') ? -Math.E : Math.E
    }

    return Number(value)
}

export const useCalculatorExpression = (getAngleMode: () => AngleMode) => {
    const getExactValue = (value: string): [bigint, bigint] | null => {
        const match = value.match(/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i)

        if (!match || !Number.isFinite(Number(value))) {
            return null
        }

        const [, sign, integer, fraction = '', exponent = '0'] = match
        const scale = Number(exponent) - fraction.length

        if (Math.abs(scale) > 1000) {
            return null
        }

        const numerator = BigInt(`${sign}${integer}${fraction}`)

        return scale >= 0
            ? [numerator * 10n ** BigInt(scale), 1n]
            : [numerator, 10n ** BigInt(-scale)]
    }

    const calculateExactValue = (
        first: [bigint, bigint],
        second: [bigint, bigint],
        operator: string,
    ): [bigint, bigint] | null => {
        let numerator: bigint
        let denominator: bigint

        if (operator === '+' || operator === '-') {
            numerator = first[0] * second[1] + (operator === '+' ? second[0] : -second[0]) * first[1]
            denominator = first[1] * second[1]
        } else if (operator === '*') {
            numerator = first[0] * second[0]
            denominator = first[1] * second[1]
        } else if (operator === '/' && second[0] !== 0n) {
            numerator = first[0] * second[1]
            denominator = first[1] * second[0]
        } else if (operator === 'ee') {
            if (second[0] % second[1] !== 0n) {
                return null
            }

            const exponent = second[0] / second[1]
            const absoluteExponent = exponent < 0n ? -exponent : exponent

            if (first[0] === 0n) {
                return [0n, 1n]
            }

            if (absoluteExponent * 4n > 65536n) {
                return null
            }

            const scale = 10n ** absoluteExponent

            numerator = exponent < 0n ? first[0] : first[0] * scale
            denominator = exponent < 0n ? first[1] * scale : first[1]
        } else if (operator === '^' || operator === 'reverse-power') {
            const base = operator === '^' ? first : second
            const power = operator === '^' ? second : first

            if (power[0] % power[1] !== 0n) {
                return null
            }

            const exponent = power[0] / power[1]
            const absoluteExponent = exponent < 0n ? -exponent : exponent

            if (exponent === 0n || base[0] === base[1]) {
                return [1n, 1n]
            }

            if (base[0] === -base[1]) {
                return [absoluteExponent % 2n === 0n ? 1n : -1n, 1n]
            }

            if (base[0] === 0n) {
                return exponent < 0n ? null : [0n, 1n]
            }

            const numeratorBits = (base[0] < 0n ? -base[0] : base[0]).toString(2).length
            const denominatorBits = base[1].toString(2).length

            if (BigInt(Math.max(numeratorBits, denominatorBits)) * absoluteExponent > 65536n) {
                return null
            }

            numerator = (exponent < 0n ? base[1] : base[0]) ** absoluteExponent
            denominator = (exponent < 0n ? base[0] : base[1]) ** absoluteExponent
        } else {
            return null
        }

        if (denominator < 0n) {
            numerator = -numerator
            denominator = -denominator
        }

        let divisor = numerator < 0n ? -numerator : numerator
        let remainder = denominator

        while (remainder !== 0n) {
            const nextRemainder = divisor % remainder
            divisor = remainder
            remainder = nextRemainder
        }

        return [numerator / divisor, denominator / divisor]
    }

    const exactValueToNumber = ([numerator, denominator]: [bigint, bigint]) => {
        if (numerator === 0n) {
            return 0
        }

        const absoluteNumerator = numerator < 0n ? -numerator : numerator
        let exponent = absoluteNumerator.toString(2).length - denominator.toString(2).length
        const belowPower = exponent >= 0
            ? absoluteNumerator < (denominator << BigInt(exponent))
            : (absoluteNumerator << BigInt(-exponent)) < denominator

        if (belowPower) {
            exponent -= 1
        }

        if (exponent > 1023) {
            return numerator < 0n ? -Infinity : Infinity
        }

        if (exponent < -1075) {
            return numerator < 0n ? -0 : 0
        }

        const scale = Math.max(exponent - 52, -1074)
        const scaledNumerator = scale < 0 ? absoluteNumerator << BigInt(-scale) : absoluteNumerator
        const scaledDenominator = scale > 0 ? denominator << BigInt(scale) : denominator
        let significand = scaledNumerator / scaledDenominator
        const remainder = scaledNumerator % scaledDenominator

        if (remainder * 2n > scaledDenominator
            || (remainder * 2n === scaledDenominator && significand % 2n !== 0n)) {
            significand += 1n
        }

        const value = Number(significand) * 2 ** scale

        return numerator < 0n ? -value : value
    }

    const calculate = (first: number, second: number, operator: string) => {
        if (operator === '+') {
            return first + second
        }

        if (operator === '-') {
            return first - second
        }

        if (operator === '*') {
            return first * second
        }

        if (operator === '/') {
            return second === 0 ? Number.NaN : first / second
        }

        if (operator === '^') {
            return first ** second
        }

        if (operator === 'reverse-power') {
            return second ** first
        }

        if (operator === 'root') {
            if (second === 0) {
                return Number.NaN
            }

            if (first < 0 && Number.isInteger(second) && Math.abs(second % 2) === 1) {
                return -((-first) ** (1 / second))
            }

            return first ** (1 / second)
        }

        if (operator === 'ee') {
            if (first === 0) {
                return 0
            }

            const [coefficient, exponent] = first.toExponential().split('e')
            const integerExponent = Math.trunc(second)
            const scaledCoefficient = Number(coefficient) * (10 ** (second - integerExponent))

            return Number(`${scaledCoefficient}e${Number(exponent) + integerExponent}`)
        }

        return Number.NaN
    }

    const calculateWithPrecision = (
        first: number,
        second: number,
        operator: string,
        firstExactValue: [bigint, bigint] | null = getExactValue(first.toString()),
        secondExactValue: [bigint, bigint] | null = getExactValue(second.toString()),
    ) => {
        const exactValue = firstExactValue && secondExactValue
            ? calculateExactValue(firstExactValue, secondExactValue, operator)
            : null
        const value = exactValue
            ? exactValueToNumber(exactValue)
            : calculate(first, second, operator)

        return { exactValue, value }
    }

    const functionOperations: Record<string, (input: number) => number> = {
        sin: input => {
            const period = getAngleMode() === 'deg' ? 180 : Math.PI

            return input % period === 0 ? 0 : Math.sin(toRadians(input))
        },
        cos: input => {
            const period = getAngleMode() === 'deg' ? 180 : Math.PI

            return Math.abs(input % period) === period / 2 ? 0 : Math.cos(toRadians(input))
        },
        tan: input => {
            const period = getAngleMode() === 'deg' ? 180 : Math.PI
            const remainder = Math.abs(input % period)
            const tolerance = Number.EPSILON * period * 4

            if (remainder === 0) {
                return 0
            }

            return Math.abs(remainder - period / 2) <= tolerance
                ? Number.NaN
                : Math.tan(toRadians(input))
        },
        sinh: Math.sinh,
        cosh: Math.cosh,
        tanh: Math.tanh,
        asin: input => fromRadians(Math.asin(input)),
        acos: input => fromRadians(Math.acos(input)),
        atan: input => fromRadians(Math.atan(input)),
        asinh: Math.asinh,
        acosh: Math.acosh,
        atanh: Math.atanh,
        ln: Math.log,
        log: Math.log10,
        log2: Math.log2,
        '√': Math.sqrt,
        '∛': Math.cbrt,
        square: input => input ** 2,
        cube: input => input ** 3,
        exp: Math.exp,
        exp10: input => 10 ** input,
        exp2: input => 2 ** input,
        '1/x': input => 1 / input,
        'x!': input => {
            const exactValue = factorial(input)

            return exactValue ? exactValueToNumber(exactValue) : Number.NaN
        },
        negate: input => -input,
        percent: input => input / 100,
    }

    const toReversePolishNotation = (sourceTokens: string[]) => {
        const output: { index: number; token: string }[] = []
        const operators: { index: number; token: string }[] = []

        sourceTokens.forEach((token, index) => {
            const item = { index, token }

            if (!Number.isNaN(numericValue(token))) {
                output.push(item)
                return
            }

            if (functionOperations[token] || token === '(') {
                operators.push(item)
                return
            }

            if (token === ')') {
                while (operators.length && operators.at(-1)?.token !== '(') {
                    output.push(operators.pop()!)
                }

                if (operators.at(-1)?.token === '(') {
                    operators.pop()
                }

                if (functionOperations[operators.at(-1)?.token ?? '']) {
                    output.push(operators.pop()!)
                }

                return
            }

            if (!isOperator(token)) {
                throw new Error('Invalid expression')
            }

            while (
                operators.length
                && isOperator(operators.at(-1)!.token)
                && (
                    precedence[operators.at(-1)!.token] > precedence[token]
                    || (
                        precedence[operators.at(-1)!.token] === precedence[token]
                        && !isRightAssociative(token)
                    )
                )
            ) {
                output.push(operators.pop()!)
            }

            operators.push(item)
        })

        while (operators.length) {
            const operator = operators.pop()!

            if (operator.token === '(' || operator.token === ')') {
                throw new Error('Invalid parentheses')
            }

            output.push(operator)
        }

        return output
    }

    const getPercentageBase = (
        sourceTokens: string[],
        operandStart: number,
        exactValues: ReadonlyMap<number, [bigint, bigint]>,
        percentageCache: Map<string, { exactValue: [bigint, bigint] | null; value: number }>,
        sourceOffset: number,
    ): { exactValue: [bigint, bigint] | null; value: number } | null => {
        let depth = 0
        let groupStart = 0
        let lastOperatorIndex = -1

        for (let index = operandStart - 1; index >= 0; index -= 1) {
            const token = sourceTokens[index]

            if (token === ')') {
                depth += 1
            } else if (token === '(') {
                if (depth === 0 && sourceTokens[index - 1] === 'negate') {
                    index -= 1
                    continue
                }

                if (depth === 0) {
                    groupStart = index + 1
                    break
                }

                depth -= 1
            } else if (depth === 0 && lastOperatorIndex === -1 && isOperator(token)) {
                lastOperatorIndex = index
            }
        }

        if (lastOperatorIndex <= groupStart || !['+', '-'].includes(sourceTokens[lastOperatorIndex])) {
            return null
        }

        const fragmentOffset = sourceOffset + groupStart
        const cacheKey = `${fragmentOffset}:${sourceOffset + lastOperatorIndex}`
        const cachedValue = percentageCache.get(cacheKey)

        if (cachedValue) {
            return cachedValue
        }

        const calculation = evaluateCalculation(
            sourceTokens.slice(groupStart, lastOperatorIndex),
            new Map(Array.from(exactValues)
                .filter(([index]) => index >= groupStart && index < lastOperatorIndex)
                .map(([index, value]) => [index - groupStart, value])),
            percentageCache,
            fragmentOffset,
        )

        percentageCache.set(cacheKey, calculation)

        return calculation
    }

    const evaluateCalculation = (
        sourceTokens: string[],
        exactValues: ReadonlyMap<number, [bigint, bigint]> = new Map(),
        percentageCache = new Map<string, { exactValue: [bigint, bigint] | null; value: number }>(),
        sourceOffset = 0,
    ) => {
        const stack: {
            exactValue: [bigint, bigint] | null
            percentage?: number
            percentageExactValue?: [bigint, bigint] | null
            repeat: RepeatOperation | null
            value: number
        }[] = []

        toReversePolishNotation(sourceTokens).forEach(({ index, token }) => {
            if (functionOperations[token]) {
                const input = stack.pop()

                if (!input) {
                    throw new Error('Missing function argument')
                }

                const percentageBase = token === 'percent'
                    ? getPercentageBase(sourceTokens, index, exactValues, percentageCache, sourceOffset)
                    : null
                let exactValue: [bigint, bigint] | null
                let value: number

                if (token === 'square' || token === 'cube') {
                    const exponent = token === 'square' ? 2n : 3n

                    exactValue = input.exactValue
                        ? [input.exactValue[0] ** exponent, input.exactValue[1] ** exponent]
                        : null
                    value = exactValue ? exactValueToNumber(exactValue) : functionOperations[token](input.value)
                } else if (token === 'percent') {
                    const product = percentageBase
                        ? calculateWithPrecision(percentageBase.value, input.value, '*', percentageBase.exactValue, input.exactValue)
                        : input
                    const result = calculateWithPrecision(product.value, 100, '/', product.exactValue)

                    exactValue = result.exactValue
                    value = result.value
                } else if (token === '1/x' && input.exactValue) {
                    const result = calculateWithPrecision(1, input.value, '/', [1n, 1n], input.exactValue)

                    exactValue = result.exactValue
                    value = result.value
                } else if (token === 'x!') {
                    const argument = input.exactValue
                        ? input.exactValue[0] % input.exactValue[1] === 0n
                            ? Number(input.exactValue[0] / input.exactValue[1])
                            : Number.NaN
                        : input.value

                    exactValue = factorial(argument)
                    value = exactValue ? exactValueToNumber(exactValue) : Number.NaN
                } else if (token === 'negate' && input.exactValue) {
                    exactValue = calculateExactValue(input.exactValue, [-1n, 1n], '*')
                    value = exactValueToNumber(exactValue!)
                } else {
                    value = functionOperations[token](input.value)
                    exactValue = getExactValue(value.toString())
                }

                const percentage = token === 'percent'
                    ? input.value
                    : token === 'negate' && input.percentage !== undefined
                        ? -input.percentage
                        : undefined
                const percentageExactValue = token === 'percent'
                    ? input.exactValue
                    : token === 'negate' && input.percentageExactValue
                        ? calculateExactValue(input.percentageExactValue, [-1n, 1n], '*')
                        : undefined

                if (!Number.isFinite(value)) {
                    throw new Error('Invalid result')
                }

                stack.push({ exactValue, percentage, percentageExactValue, repeat: null, value })
                return
            }

            if (!isOperator(token)) {
                const exactValue = exactValues.get(index) ?? getExactValue(token)

                stack.push({
                    exactValue,
                    repeat: null,
                    value: exactValue ? exactValueToNumber(exactValue) : numericValue(token),
                })
                return
            }

            const second = stack.pop()
            const first = stack.pop()

            if (!first || !second) {
                throw new Error('Invalid expression')
            }

            const percentage = ['+', '-'].includes(token) ? second.percentage : undefined
            const percentageExactValue = ['+', '-'].includes(token) ? second.percentageExactValue : undefined
            const operand = second.value
            const { exactValue, value } = calculateWithPrecision(
                first.value,
                operand,
                token,
                first.exactValue,
                second.exactValue,
            )

            if (!Number.isFinite(value)) {
                throw new Error('Invalid result')
            }

            stack.push({
                exactValue,
                repeat: { exactValue: second.exactValue, operator: token, percentage, percentageExactValue, value: operand },
                value,
            })
        })

        if (stack.length !== 1 || !Number.isFinite(stack[0].value)) {
            throw new Error('Invalid result')
        }

        return stack[0]
    }

    const evaluateExpression = (sourceTokens: string[]) => evaluateCalculation(sourceTokens).value

    const factorial = (input: number): [bigint, bigint] | null => {
        if (!Number.isInteger(input) || input < 0 || input > 170) {
            return null
        }

        let result = 1n

        for (let index = 2n; index <= BigInt(input); index += 1n) {
            result *= index
        }

        return [result, 1n]
    }

    const toRadians = (input: number) => getAngleMode() === 'deg'
        ? (input % 360) * Math.PI / 180
        : input

    const fromRadians = (input: number) => getAngleMode() === 'deg'
        ? input * 180 / Math.PI
        : input

    return {
        calculate,
        calculateWithPrecision,
        evaluateCalculation,
        evaluateExpression,
        getExactValue,
    }
}