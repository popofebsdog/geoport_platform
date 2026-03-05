<template>
  <div class="w-full">
    <WarningLightContent
      :route-name="routeName"
      :route-description="routeDescription"
      :current-level="currentLevel"
      :current-level-name="currentLevelName"
      :current-level-description="currentLevelDescription"
      :current-level-color="currentLevelColor"
      :is-red-light-on="isRedLightOn"
      :show-special-alert="showSpecialAlert"
      :special-alert-countdown="specialAlertCountdown"
      :auto-light-mode="autoLightMode"
      @set-light-status="$emit('set-light-status', $event)"
      @trigger-special-alert="$emit('trigger-special-alert')"
      @toggle-auto-mode="$emit('toggle-auto-mode')"
    />
  </div>
</template>

<script>
import WarningLightContent from './WarningLightContent.vue'

export default {
  name: 'WarningLightPanel',
  components: {
    WarningLightContent
  },
  props: {
    routeName: {
      type: String,
      required: true
    },
    routeDescription: {
      type: String,
      default: ''
    },
    currentLevel: {
      type: String,
      default: 'green'
    },
    currentLevelName: {
      type: String,
      default: ''
    },
    currentLevelDescription: {
      type: String,
      default: ''
    },
    currentLevelColor: {
      type: String,
      default: 'text-gray-400'
    },
    isRedLightOn: {
      type: Boolean,
      default: false
    },
    showSpecialAlert: {
      type: Boolean,
      default: false
    },
    specialAlertCountdown: {
      type: Number,
      default: 0
    },
    autoLightMode: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'set-light-status',
    'trigger-special-alert',
    'toggle-auto-mode'
  ]
}
</script>
