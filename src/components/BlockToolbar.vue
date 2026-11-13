<template>
    <div class="az-calculator-toolbar">
        <div
            class="az-calculator-toolbar__history-wrapper"
            @focusout="closeHistoryOnFocusOut"
            @keydown="closeHistoryWithFocus"
        >
            <BlockButton
                :aria-expanded="historyOpen"
                aria-controls="calculator-history"
                ariaLabel="Toggle calculation history"
                small
                @click="emit('toggleHistory')"
            >
                <svg
                    aria-hidden="true"
                    class="az-calculator-toolbar__icon"
                    viewBox="0 0 32 32"
                >
                    <path d="M7 10V4M7 10H13" />
                    <path d="M7.2 9.7A11 11 0 1 1 5 18" />
                    <path d="M16 9V16L20 18" />
                </svg>
            </BlockButton>

            <BlockHistory
                v-if="historyOpen"
                id="calculator-history"
                :history="history"
                @clear="clearHistoryWithFocus"
                @select="selectHistoryWithFocus"
            />
        </div>

        <BlockButton
            :ariaLabel="scientific ? 'Switch to basic calculator' : 'Switch to scientific calculator'"
            small
            @click="emit('toggleMode')"
        >
            <svg
                aria-hidden="true"
                class="az-calculator-toolbar__icon"
                viewBox="0 0 32 32"
            >
                <rect height="24" rx="3" width="20" x="6" y="4" />
                <rect height="5" rx="1" width="12" x="10" y="8" />
                <circle cx="11" cy="18" r="1" />
                <circle cx="16" cy="18" r="1" />
                <circle cx="21" cy="18" r="1" />
                <circle cx="11" cy="23" r="1" />
                <circle cx="16" cy="23" r="1" />
                <circle cx="21" cy="23" r="1" />
            </svg>
        </BlockButton>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue'

import BlockButton from '@/components/BlockButton.vue'
import BlockHistory from '@/components/BlockHistory.vue'

import type {
    CalculatorHistoryDisplayItem,
    CalculatorHistoryItem,
} from '@/types/calculator'

const props = defineProps<{
    history: CalculatorHistoryDisplayItem[]
    historyOpen: boolean
    scientific: boolean
}>()

const emit = defineEmits<{
    clearHistory: []
    closeHistory: []
    selectHistory: [item: CalculatorHistoryItem]
    toggleHistory: []
    toggleMode: []
}>()

const focusHistoryButton = (wrapper: Element | null) => {
    wrapper?.querySelector<HTMLButtonElement>('button')?.focus()
}

const closeHistoryWithFocus = (event: KeyboardEvent) => {
    if (!props.historyOpen || event.key !== 'Escape') {
        return
    }

    event.preventDefault()
    event.stopPropagation()
    focusHistoryButton(event.currentTarget as HTMLElement)
    emit('closeHistory')
}

const closeHistoryOnFocusOut = (event: FocusEvent) => {
    const wrapper = event.currentTarget as HTMLElement

    if (props.historyOpen && !(event.relatedTarget instanceof Node && wrapper.contains(event.relatedTarget))) {
        emit('closeHistory')
    }
}

const clearHistoryWithFocus = () => {
    document.activeElement?.closest<HTMLElement>('.az-calculator-history')?.focus()
    emit('clearHistory')
}

const selectHistoryWithFocus = (item: CalculatorHistoryItem) => {
    const wrapper = document.activeElement?.closest('.az-calculator-toolbar__history-wrapper') ?? null

    focusHistoryButton(wrapper)
    emit('selectHistory', item)
}

const closeHistoryOutside = (event: MouseEvent) => {
    const target = event.target

    if (props.historyOpen && target instanceof Element
        && !target.closest('.az-calculator-toolbar__history-wrapper')) {
        emit('closeHistory')
    }
}

onMounted(() => document.addEventListener('click', closeHistoryOutside))
onUnmounted(() => document.removeEventListener('click', closeHistoryOutside))
</script>

<style lang="scss" scoped>
.az-calculator-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;

    &__history-wrapper {
        position: relative;
    }

    &__icon {
        width: 24px;
        height: 24px;
        fill: none;
        stroke: $color-grey-300;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2;
    }
}
</style>