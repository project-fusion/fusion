<script setup lang="ts">
/* What a Vue app writes: attributes, properties, enum values, slots, and typed events. */
import type { HelixPagination } from '@fusion.dev/helix'
import { useTemplateRef } from 'vue'

const pagination = useTemplateRef<HelixPagination>('pagination')
const switched = (checked: boolean) => checked
const total = () => pagination.value?.total
</script>

<template>
  <helix-button
    emphasis="solid"
    tone="danger"
    type="submit"
    width="full"
    @helix-press="(event) => event.detail.pointerType"
  >
    Delete
  </helix-button>
  <helix-switch
    :checked="true"
    name="alerts"
    @helix-before-check="(event) => switched(event.detail.checked) || event.preventDefault()"
  >
    Alerts
    <span slot="hint">Sent to your email.</span>
  </helix-switch>
  <!-- `default-page` is bound. `vue-tsc` checks the attribute as the `defaultPage`
       property, which is a number, so it refuses the string `default-page="2"`
       even though Vue writes that string to the attribute and the element reads
       the number out of it. -->
  <helix-pagination
    ref="pagination"
    :default-page="2"
    :page-size="20"
    :total="120"
    @helix-navigate="(event) => event.detail.page ?? total()"
  />
  <helix-tabs
    active="billing"
    orientation="vertical"
    variant="underlined"
    @helix-before-select="(event) => event.detail.value"
  >
    <helix-tab value="billing">Billing</helix-tab>
    <helix-tab-panel value="billing">Invoices</helix-tab-panel>
  </helix-tabs>
  <helix-code-block line-numbers wrap @helix-check="(event) => event.detail.checked">
    <code>bun add @fusion.dev/helix</code>
  </helix-code-block>
</template>
