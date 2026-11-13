<template>
    <aside
        class="az-calculator-history"
        aria-label="Calculation history"
        role="region"
        tabindex="0"
    >
        <div v-if="!history.length" class="az-calculator-history__empty">
            No calculations
        </div>

        <template v-else>
            <div
                v-for="item in history"
                :key="item.id"
                class="az-calculator-history__entry"
            >
                <button
                    :aria-label="`Restore calculation ${item.expression.replace(/<sup>/g, ' to the power of ').replace(/<sub>/g, ' base ').replace(/<\/(?:sup|sub)>/g, '')}, result ${item.result}`"
                    class="az-calculator-history__item"
                    type="button"
                    @click="emit('select', item)"
                >
                    <span
                        class="az-calculator-history__expression"
                        v-html="item.expressionMarkup"
                    />
                    <span
                        class="az-calculator-history__result"
                        v-html="item.resultMarkup"
                    />
                </button>
            </div>

            <button
                class="az-calculator-history__action"
                type="button"
                @click="emit('clear')"
            >
                Clear history
            </button>
        </template>
    </aside>
</template>

<script lang="ts" setup>
import type {
    CalculatorHistoryDisplayItem,
    CalculatorHistoryItem,
} from '@/types/calculator'

defineProps<{
    history: CalculatorHistoryDisplayItem[]
}>()

const emit = defineEmits<{
    clear: []
    select: [item: CalculatorHistoryItem]
}>()
</script>

<style lang="scss" scoped>
.az-calculator-history {
    position: absolute;
    top: 52px;
    left: 0;
    z-index: 1;
    overflow-y: auto;
    width: 280px;
    max-height: 420px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    background: $color-milk-100;
    box-shadow: 0 1px 4px 1px $color-milk-600;
    border-radius: 16px;

    &:focus-visible {
        box-shadow: 0 0 0 4px $color-grey-300;
    }

    &__entry {
        display: flex;
        flex-direction: column;
    }

    &__action {
        min-height: 44px;
        margin-block-start: 12px;
        padding: 6px 12px;
        align-self: center;
        background: $color-milk-300;
        border-radius: 8px;

        &:active {
            transform: scale(.94);
        }

        &:focus-visible {
            box-shadow: inset 0 0 0 4px $color-grey-300;
        }
    }

    &__empty {
        padding: 12px;
        font-size: 15px;
        color: $color-sand-300;
        text-align: center;
    }

    &__item {
        width: 100%;
        padding: 12px 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid $color-milk-600;
        text-align: left;

        &:focus-visible {
            box-shadow: inset 0 0 0 4px $color-grey-300;
            border-radius: 4px;
        }
    }

    &__expression {
        overflow: hidden;
        font-size: 13px;
        color: $color-sand-400;
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    &__result {
        font-size: 18px;
        text-align: right;
    }

    :deep(sup),
    :deep(sub) {
        position: relative;
        font-size: .6em;
        font-weight: 500;
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