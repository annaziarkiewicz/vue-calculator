<template>
    <div
        class="az-calculator"
        :class="{ 'az-calculator--scientific': scientific }"
        @keydown="onKeydown"
    >
        <BlockToolbar
            :history="displayHistory"
            :history-open="historyOpen"
            :scientific="scientific"
            @clear-history="clearHistory"
            @close-history="historyOpen = false"
            @select-history="onSelectHistory"
            @toggle-history="historyOpen = !historyOpen"
            @toggle-mode="onToggleMode"
        />

        <BlockDisplay
            :completed-expression="formatCalculationMarkup(completedExpression)"
            :error="error"
            :value="formatCalculationMarkup(displayValue)"
        />

        <BlockScientificKeyboard
            v-if="scientific"
            :active-action="activeScientificAction"
            :angle-mode="angleMode"
            :second-mode="secondMode"
            @action="onScientificAction"
        />

        <BlockKeyboard
            :clear-label="clearLabel"
            :compact="scientific"
            @action="onAction"
        />
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'

import { formatCalculationMarkup } from '@/composables/calculatorFormatting'
import { useCalculator } from '@/composables/useCalculator'

import BlockDisplay from '@/components/BlockDisplay.vue'
import BlockKeyboard from '@/components/BlockKeyboard.vue'
import BlockScientificKeyboard from '@/components/BlockScientificKeyboard.vue'
import BlockToolbar from '@/components/BlockToolbar.vue'

import type { CalculatorHistoryItem } from '@/types/calculator'

const historyOpen = ref(false)
const scientific = ref(false)

const {
    activeScientificAction,
    angleMode,
    applyScientificAction,
    clearHistory,
    clearLabel,
    completedExpression,
    displayValue,
    error,
    history,
    inputAction,
    restoreCalculation,
    secondMode,
} = useCalculator()

const displayHistory = computed(() => history.value.map(item => ({
    ...item,
    expressionMarkup: formatCalculationMarkup(item.expression),
    resultMarkup: formatCalculationMarkup(item.result),
})))

const onAction = (value: string) => {
    inputAction(value)
}

const onScientificAction = (value: string) => {
    applyScientificAction(value)
}

const onKeydown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
        return
    }

    const target = event.target as HTMLElement | null

    if (event.key === 'Enter' && target?.closest('button')) {
        return
    }

    const mappedKeys: Record<string, string> = {
        ',': ',',
        '.': ',',
        Backspace: 'backspace',
        Delete: 'clear',
        Enter: 'equals',
        Escape: 'all-clear',
        '=': 'equals',
        '%': 'percent',
    }
    const value = /^\d$/.test(event.key) || ['+', '-', '*', '/'].includes(event.key)
        ? event.key
        : mappedKeys[event.key]

    if (value) {
        event.preventDefault()
        onAction(value)
    }
}

const onSelectHistory = (item: CalculatorHistoryItem) => {
    restoreCalculation(item.expression, item.result, item.tokens, item.angleMode, item.exactValues)
    historyOpen.value = false
}

const onToggleMode = () => {
    scientific.value = !scientific.value
    historyOpen.value = false
}
</script>

<style lang="scss" scoped>
.az-calculator {
    position: relative;
    overflow: hidden;
    min-width: 0;
    height: 100%;
    min-height: 0;
    padding: 24px 36px 36px;
    display: grid;
    grid-template-rows: 44px minmax(0, 1fr) auto;
    gap: 12px;
    color: $color-grey-200;

    &--scientific {
        grid-template-rows: 44px minmax(0, 1fr) max-content 256px;
        row-gap: 4px;
    }
}
</style>