import {
    isFunction,
    isOperator,
    isRightAssociative,
    precedence,
} from '@/composables/useCalculatorExpression'

const operatorLabels: Record<string, string> = {
    '*': '×',
    '+': '+',
    '-': '−',
    '/': '÷',
    '^': '^',
    'reverse-power': 'ʸ',
    ee: 'EE',
    root: 'ʸ√',
}

export const formatCalculationMarkup = (value: string): string => {
    const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿˣʸ'
    const subscripts = '₀₁₂₃₄₅₆₇₈₉'
    const normalSuperscripts = '0123456789−+nxy'
    const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

    return escaped
        .replace(/∛/g, '<sup>3</sup>√')
        .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿˣʸ·]+/g, text =>
            `<sup>${Array.from(text, character => character === '·'
                ? ','
                : normalSuperscripts[superscripts.indexOf(character)]).join('')}</sup>`,
        )
        .replace(/[₀₁₂₃₄₅₆₇₈₉]+/g, text =>
            `<sub>${Array.from(text, character => subscripts.indexOf(character).toString()).join('')}</sub>`,
        )
        .replace(/&lt;(\/?(?:sup|sub))&gt;/g, '<$1>')
}

export const formatNumber = (value: string) => value.replace('.', ',')
const formatToken = (token: string) => operatorLabels[token] ?? formatNumber(token)

export const expandScientificNotation = (value: string) => {
    const match = value.match(/^(-?)(\d+)(?:\.(\d+))?e([+-]?\d+)$/i)

    if (!match) {
        return value
    }

    const [, sign, integer, fraction = '', exponent] = match
    const digits = `${integer}${fraction}`
    const decimalPosition = integer.length + Number(exponent)

    if (decimalPosition <= 0) {
        return `${sign}0.${'0'.repeat(-decimalPosition)}${digits}`
    }

    if (decimalPosition >= digits.length) {
        return `${sign}${digits}${'0'.repeat(decimalPosition - digits.length)}`
    }

    return `${sign}${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`
}

export const formatExpression = (parts: string[]): string => {
    const superscripts: Record<string, string> = {
        '-': '⁻', '.': '·', '0': '⁰', '1': '¹', '2': '²',
        '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷',
        '8': '⁸', '9': '⁹',
    }
    const functionLabels: Record<string, string> = {
        acos: 'cos⁻¹', acosh: 'cosh⁻¹', asin: 'sin⁻¹', asinh: 'sinh⁻¹',
        atan: 'tan⁻¹', atanh: 'tanh⁻¹', log: 'log₁₀', log2: 'log₂',
    }
    let index = 0

    const powerLabel = (value: string) => /^-?\d+(?:\.\d*)?$/.test(value)
        ? Array.from(value, character => superscripts[character] ?? character).join('')
        : value ? `<sup>${value}</sup>` : ''

    const render = (minimum: number): string => {
        const token = parts[index]
        let expression = ''

        if (token === undefined || token === ')' || isOperator(token)) {
            return expression
        }

        index += 1

        if (token === '(') {
            expression = `(${render(0)}`

            if (parts[index] === ')') {
                index += 1
                expression += ')'
            }
        } else if (isFunction(token) && parts[index] === '(') {
            index += 1
            const operand = render(0)
            const closed = parts[index] === ')'
            const base = /^\d+(?:[,.]\d*)?$/.test(operand) || ['π', 'e'].includes(operand)
                ? operand
                : `(${operand})`

            if (closed) {
                index += 1
            }

            if (token === 'square' || token === 'cube') {
                expression = closed ? `${base}${token === 'square' ? '²' : '³'}` : `(${operand}`
            } else if (['exp', 'exp10', 'exp2'].includes(token)) {
                const powerBase = token === 'exp' ? 'e' : token === 'exp10' ? '10' : '2'

                expression = `${powerBase}${powerLabel(operand.replace(',', '.'))}`
            } else if (token === 'percent') {
                expression = closed ? `${base}%` : `(${operand}`
            } else if (token === 'x!') {
                expression = closed ? `${base}!` : `(${operand}`
            } else if (token === 'negate') {
                expression = `−(${operand}${closed ? ')' : ''}`
            } else if (token === '1/x') {
                expression = `1÷(${operand}${closed ? ')' : ''}`
            } else {
                expression = `${functionLabels[token] ?? token}(${operand}${closed ? ')' : ''}`
            }
        } else {
            expression = formatToken(token)
        }

        while (isOperator(parts[index] ?? '') && precedence[parts[index]] >= minimum) {
            const operator = parts[index]
            const priority = precedence[operator]
            index += 1
            const operand = render(priority + (isRightAssociative(operator) ? 0 : 1))

            if (!operand && ['^', 'reverse-power', 'root', 'ee'].includes(operator)) {
                continue
            }

            if (operator === '^') {
                const base = /^\d+(?:[,.]\d*)?$/.test(expression) || ['π', 'e'].includes(expression)
                    ? expression
                    : `(${expression})`

                expression = `${base}${powerLabel(operand.replace(',', '.'))}`
            } else if (operator === 'reverse-power') {
                const base = /^\d+(?:[,.]\d*)?$/.test(operand) || ['π', 'e'].includes(operand)
                    ? operand
                    : `(${operand || '…'})`

                expression = `${base}${powerLabel(expression.replace(',', '.'))}`
            } else if (operator === 'root') {
                const degree = operand ? powerLabel(operand.replace(',', '.')) : 'ⁿ'

                expression = `${degree}√(${expression})`
            } else if (operator === 'ee') {
                expression = `${expression}×10${powerLabel(operand.replace(',', '.'))}`
            } else {
                expression += `${formatToken(operator)}${operand}`
            }
        }

        return expression
    }

    return render(0)
}

export const formatResult = (value: number) => Number.isFinite(value)
    ? Number.parseFloat(value.toPrecision(12)).toString()
    : null