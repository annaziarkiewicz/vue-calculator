<template>
    <div class="az-scientific-keyboard">
        <span
            id="calculator-angle-mode"
            class="az-scientific-keyboard__angle-mode"
        >
            Current angle mode: {{ angleMode === 'deg' ? 'degrees' : 'radians' }}
        </span>
        <button
            v-for="button in buttons"
            :key="button.value"
            :aria-label="button.value === 'angle'
                ? `${angleMode === 'deg' ? 'Rad' : 'Deg'} — Switch to ${angleMode === 'deg' ? 'radians' : 'degrees'}`
                : `${button.label} — ${button.ariaLabel}`"
            :aria-describedby="button.value === 'angle' ? 'calculator-angle-mode' : undefined"
            :class="[
                'az-scientific-keyboard__button',
                {
                    'az-scientific-keyboard__button--active': (button.value === 'second' && secondMode)
                        || button.value === activeAction,
                },
            ]"
            :aria-pressed="button.value === 'second' ? secondMode : undefined"
            type="button"
            v-html="formatCalculationMarkup(button.value === 'angle'
                ? (angleMode === 'deg' ? 'Rad' : 'Deg')
                : button.label)"
            @click="emit('action', button.value)"
        />
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import { formatCalculationMarkup } from '@/composables/calculatorFormatting'

import type {
    AngleMode,
    ScientificButton,
} from '@/types/calculator'

const emit = defineEmits<{
    action: [value: string]
}>()

const props = defineProps<{
    activeAction: string
    angleMode: AngleMode
    secondMode: boolean
}>()

const baseButtons: ScientificButton[] = [
    { ariaLabel: 'Open parenthesis', label: '(', value: 'open-parenthesis' },
    { ariaLabel: 'Close parenthesis', label: ')', value: 'close-parenthesis' },
    { ariaLabel: 'Memory clear', label: 'mc', value: 'memory-clear' },
    { ariaLabel: 'Memory add', label: 'm+', value: 'memory-add' },
    { ariaLabel: 'Memory subtract', label: 'm−', value: 'memory-subtract' },
    { ariaLabel: 'Memory recall', label: 'mr', value: 'memory-recall' },
    { ariaLabel: 'Toggle second functions', label: '2nd', value: 'second' },
    { ariaLabel: 'Square', label: 'x²', value: 'square' },
    { ariaLabel: 'Cube', label: 'x³', value: 'cube' },
    { ariaLabel: 'Power', label: 'xʸ', value: 'power' },
    { ariaLabel: 'E to the power of x', label: 'eˣ', value: 'e-power' },
    { ariaLabel: 'Ten to the power of x', label: '10ˣ', value: '10-power' },
    { ariaLabel: 'Reciprocal', label: '1/x', value: 'reciprocal' },
    { ariaLabel: 'Square root', label: '²√x', value: 'square-root' },
    { ariaLabel: 'Cube root', label: '³√x', value: 'cube-root' },
    { ariaLabel: 'Y root of x', label: 'ʸ√x', value: 'root' },
    { ariaLabel: 'Natural logarithm', label: 'ln', value: 'ln' },
    { ariaLabel: 'Base ten logarithm', label: 'log₁₀', value: 'log' },
    { ariaLabel: 'Factorial', label: 'x!', value: 'factorial' },
    { ariaLabel: 'Sine', label: 'sin', value: 'sin' },
    { ariaLabel: 'Cosine', label: 'cos', value: 'cos' },
    { ariaLabel: 'Tangent', label: 'tan', value: 'tan' },
    { ariaLabel: 'Euler number', label: 'e', value: 'e' },
    { ariaLabel: 'Scientific notation', label: 'EE', value: 'ee' },
    { ariaLabel: 'Random number', label: 'Rand', value: 'random' },
    { ariaLabel: 'Hyperbolic sine', label: 'sinh', value: 'sinh' },
    { ariaLabel: 'Hyperbolic cosine', label: 'cosh', value: 'cosh' },
    { ariaLabel: 'Hyperbolic tangent', label: 'tanh', value: 'tanh' },
    { ariaLabel: 'Pi', label: 'π', value: 'pi' },
    { ariaLabel: 'Toggle angle mode', label: 'Rad', value: 'angle' },
]

const buttons = computed(() => baseButtons.map(button => {
    if (!props.secondMode) {
        return button
    }

    const inverseButtons: Record<string, ScientificButton> = {
        'e-power': { ariaLabel: 'Y to the power of x', label: 'yˣ', value: 'inverse-power' },
        '10-power': { ariaLabel: 'Two to the power of x', label: '2ˣ', value: '2-power' },
        ln: { ariaLabel: 'Base two logarithm', label: 'log₂', value: 'log2' },
        sinh: { ariaLabel: 'Inverse hyperbolic sine', label: 'sinh⁻¹', value: 'inverse-sinh' },
        cosh: { ariaLabel: 'Inverse hyperbolic cosine', label: 'cosh⁻¹', value: 'inverse-cosh' },
        tanh: { ariaLabel: 'Inverse hyperbolic tangent', label: 'tanh⁻¹', value: 'inverse-tanh' },
        sin: { ariaLabel: 'Inverse sine', label: 'sin⁻¹', value: 'inverse-sin' },
        cos: { ariaLabel: 'Inverse cosine', label: 'cos⁻¹', value: 'inverse-cos' },
        tan: { ariaLabel: 'Inverse tangent', label: 'tan⁻¹', value: 'inverse-tan' },
    }

    return inverseButtons[button.value] ?? button
}))
</script>

<style lang="scss" scoped>
.az-scientific-keyboard {
    height: 216px;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    grid-template-rows: repeat(5, 40px);
    gap: 4px 8px;

    &__angle-mode {
        position: absolute;
        overflow: hidden;
        width: 1px;
        height: 1px;
        white-space: nowrap;
        clip-path: inset(50%);
    }

    &__button {
        width: 100%;
        min-width: 0;
        height: 40px;
        background: $color-navy-100;
        border-radius: 18px;
        font-size: 15px;
        font-weight: 500;
        color: $color-milk-200;

        &:active {
            transform: scale(.94);
        }

        &:focus-visible {
            box-shadow: 0 0 0 4px $color-grey-300;
        }

        &--active {
            background: $color-navy-200;
        }
    }

    :deep(sup),
    :deep(sub) {
        position: relative;
        font-size: .6em;
        line-height: 0;
        vertical-align: baseline;
    }

    :deep(sup) {
        top: -.55em;
    }

    :deep(sub) {
        top: .15em;
    }
}
</style>