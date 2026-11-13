<template>
    <output class="az-calculator-display" aria-live="polite">
        <span
            ref="operationRef"
            aria-label="Calculation expression"
            class="az-calculator-display__operation"
            role="region"
            tabindex="-1"
            v-html="completedExpression"
        />

        <span
            ref="valueRef"
            aria-label="Current value"
            class="az-calculator-display__value"
            role="region"
            tabindex="-1"
        >
            <template v-if="error">{{ error }}</template>
            <span v-else v-html="value" />
        </span>
    </output>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{
    completedExpression: string
    error: string
    value: string
}>()

const operationRef = ref<HTMLElement | null>(null)
const valueRef = ref<HTMLElement | null>(null)

const scrollToEnd = () => {
    for (const element of [operationRef.value, valueRef.value]) {
        if (element) {
            element.scrollLeft = element.scrollWidth
        }
    }
}

onMounted(scrollToEnd)

watch(
    () => [props.completedExpression, props.error, props.value],
    scrollToEnd,
    { flush: 'post' },
)
</script>

<style lang="scss" scoped>
.az-calculator-display {
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-end;

    &__operation,
    &__value {
        overflow-x: auto;
        overflow-y: hidden;
        width: 100%;
        min-width: 0;
        text-align: end;
        white-space: nowrap;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    &__operation {
        height: 24px;
        flex-shrink: 0;
        font-size: 18px;
        line-height: 24px;
        color: $color-sand-300;
    }

    &__value {
        height: 60px;
        flex-shrink: 0;
        font-size: 48px;
        font-weight: 500;
        line-height: 60px;
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