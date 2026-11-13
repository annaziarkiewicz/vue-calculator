<template>
    <button
        :aria-label="ariaLabel"
        :class="[
            'az-calculator-button',
            `az-calculator-button--${variant}`,
            {
                'az-calculator-button--compact': compact,
                'az-calculator-button--small': small,
            },
        ]"
        type="button"
        @click="emit('click')"
    >
        <slot>{{ label }}</slot>
    </button>
</template>

<script lang="ts" setup>
import type { ButtonVariant } from '@/types/calculator'

withDefaults(defineProps<{
    ariaLabel: string
    compact?: boolean
    label?: string
    small?: boolean
    variant?: ButtonVariant
}>(), {
    compact: false,
    label: '',
    small: false,
    variant: 'number',
})

const emit = defineEmits<{
    click: []
}>()
</script>

<style lang="scss" scoped>
.az-calculator-button {
    width: 100%;
    min-width: 0;
    height: auto;
    aspect-ratio: 1;
    min-height: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: $color-milk-100;
    border-radius: 50%;
    font-size: 32px;
    font-weight: 500;
    line-height: 1;
    text-align: center;

    &:active {
        transform: scale(.94);
    }

    &:focus-visible {
        box-shadow: 0 0 0 4px $color-grey-300;
    }

    &--action {
        background: $color-rose-100;
        font-weight: 400;
        color: $color-milk-100;
    }

    &--operator {
        background: $color-mint-200;
        font-size: 40px;
        color: $color-milk-100;
    }

    &--compact {
        height: 48px;
        aspect-ratio: auto;
        border-radius: 24px;
        font-size: 24px;

        &.az-calculator-button--operator {
            font-size: 32px;
        }
    }

    &--small {
        width: 44px;
        height: 44px;
        background: $color-milk-300;
        font-size: 0;
    }
}
</style>