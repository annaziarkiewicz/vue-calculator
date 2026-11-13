<template>
    <div
        :class="[
            'az-calculator-keyboard',
            { 'az-calculator-keyboard--compact': compact },
        ]"
    >
        <BlockButton
            v-for="button in buttons"
            :key="button.value"
            :ariaLabel="button.value === 'clear'
                ? `${clearLabel} — ${clearLabel === 'AC' ? 'Clear all' : 'Clear entry'}`
                : button.ariaLabel"
            :compact="compact"
            :label="button.value === 'clear' ? clearLabel : button.label"
            :variant="button.variant"
            @click="emit('action', button.value === 'clear' && clearLabel === 'AC' ? 'all-clear' : button.value)"
        >
            <svg
                v-if="button.value === 'backspace'"
                aria-hidden="true"
                class="az-calculator-keyboard__backspace-icon"
                viewBox="0 0 32 32"
            >
                <path d="M9 6H24C25.7 6 27 7.3 27 9V23C27 24.7 25.7 26 24 26H9L1 16L9 6Z" />
                <path d="M13 12L21 20" />
                <path d="M21 12L13 20" />
            </svg>

            <svg
                v-else-if="button.value === 'toggle-sign' || button.value === 'percent'"
                aria-hidden="true"
                class="az-calculator-keyboard__sign-icon"
                :class="{ 'az-calculator-keyboard__sign-icon--toggle': button.value === 'toggle-sign' }"
                viewBox="0 0 48 48"
            >
                <path d="M14 39L34 9" />
                <template v-if="button.value === 'toggle-sign'">
                    <path
                        class="az-calculator-keyboard__sign-detail"
                        d="M5 15H15M10 10V20"
                    />
                    <path
                        class="az-calculator-keyboard__sign-detail"
                        d="M33 33H43"
                    />
                </template>
                <template v-else>
                    <ellipse cx="12" cy="15" rx="4.5" ry="7" />
                    <ellipse cx="36" cy="33" rx="4.5" ry="7" />
                </template>
            </svg>

            <svg
                v-else-if="button.variant === 'operator'"
                aria-hidden="true"
                class="az-calculator-keyboard__operator-icon"
                viewBox="0 0 48 48"
            >
                <template v-if="button.value === '/'">
                    <path d="M10 24H38" />
                    <circle cx="24" cy="13" r="3" />
                    <circle cx="24" cy="35" r="3" />
                </template>
                <path v-else-if="button.value === '*'" d="M12 12L36 36M36 12L12 36" />
                <path v-else-if="button.value === '-'" d="M10 24H38" />
                <path v-else-if="button.value === '+'" d="M10 24H38M24 10V38" />
                <path v-else d="M10 18H38M10 30H38" />
            </svg>
        </BlockButton>
    </div>
</template>

<script lang="ts" setup>
import BlockButton from '@/components/BlockButton.vue'

import type { CalculatorButton } from '@/types/calculator'

defineProps<{
    clearLabel: string
    compact: boolean
}>()

const emit = defineEmits<{
    action: [value: string]
}>()

const buttons: CalculatorButton[] = [
    { ariaLabel: 'Delete the last character', label: '', value: 'backspace', variant: 'action' },
    { ariaLabel: 'Clear', label: 'AC', value: 'clear', variant: 'action' },
    { ariaLabel: 'Percent', label: '%', value: 'percent', variant: 'action' },
    { ariaLabel: 'Divide', label: '÷', value: '/', variant: 'operator' },
    { ariaLabel: '7 — Seven', label: '7', value: '7', variant: 'number' },
    { ariaLabel: '8 — Eight', label: '8', value: '8', variant: 'number' },
    { ariaLabel: '9 — Nine', label: '9', value: '9', variant: 'number' },
    { ariaLabel: 'Multiply', label: '×', value: '*', variant: 'operator' },
    { ariaLabel: '4 — Four', label: '4', value: '4', variant: 'number' },
    { ariaLabel: '5 — Five', label: '5', value: '5', variant: 'number' },
    { ariaLabel: '6 — Six', label: '6', value: '6', variant: 'number' },
    { ariaLabel: 'Subtract', label: '−', value: '-', variant: 'operator' },
    { ariaLabel: '1 — One', label: '1', value: '1', variant: 'number' },
    { ariaLabel: '2 — Two', label: '2', value: '2', variant: 'number' },
    { ariaLabel: '3 — Three', label: '3', value: '3', variant: 'number' },
    { ariaLabel: 'Add', label: '+', value: '+', variant: 'operator' },
    { ariaLabel: 'Toggle positive or negative', label: '+/−', value: 'toggle-sign', variant: 'number' },
    { ariaLabel: '0 — Zero', label: '0', value: '0', variant: 'number' },
    { ariaLabel: 'Decimal separator', label: ',', value: ',', variant: 'number' },
    { ariaLabel: 'Equals', label: '=', value: 'equals', variant: 'operator' },
]
</script>

<style lang="scss" scoped>
.az-calculator-keyboard {
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(5, auto);
    gap: 8px;

    &--compact {
        height: 256px;
        gap: 4px 8px;
    }

    &__backspace-icon,
    &__sign-icon,
    &__operator-icon {
        fill: none;
        stroke: $color-milk-100;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    &__backspace-icon {
        width: 1.2em;
        height: 1.2em;
        stroke-width: 2.5;
    }

    &__sign-icon {
        width: 1.2em;
        height: 1.2em;
        stroke-width: 5px;

        &--toggle {
            stroke: $color-grey-200;
        }

        ellipse {
            stroke-width: 4px;
        }
    }

    &__sign-detail {
        stroke-width: 4px;
    }

    &__operator-icon {
        width: 1em;
        height: 1em;
        stroke-width: 5px;

        circle {
            fill: $color-milk-100;
            stroke: none;
        }
    }
}
</style>