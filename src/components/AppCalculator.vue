<template>
    <section
        class="az-app"
        :class="{ 'az-app--inside-iframe': isIframe }"
        :aria-label="appHeadline"
    >
        <BlockCalculator />
    </section>

    <BlockSplinter :is-iframe="isIframe" />
</template>

<script lang="ts" setup>
import { useIframeCommunication } from '@/composables/useIframeCommunication'

import BlockCalculator from '@/components/BlockCalculator.vue'
import BlockSplinter from '@/components/BlockSplinter.vue'

const appHeadline = 'Calculator'
const { isIframe } = useIframeCommunication()
</script>

<style lang="scss" scoped>
.az-app {
    width: 100%;
    max-width: 400px;
    height: 680px;
    display: flex;
    flex-direction: column;
    background: $color-milk-200;

    &:not(.az-app--inside-iframe) {
        margin-block-start: 24px;
    }
}
</style>