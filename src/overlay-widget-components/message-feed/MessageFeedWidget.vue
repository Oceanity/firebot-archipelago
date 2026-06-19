

<script setup lang="ts">
import { Animation } from "@crowbartools/firebot-types";
import { computed } from "vue";
import { MessageFeedSettings, MessageFeedState } from "../../overlay-widgets/message-feed";
import { useWidgetAnimations } from "../widget-animations";

const props = defineProps<{
  store: {
    settings: MessageFeedSettings;
    state: MessageFeedState;
    entryAnimation: Animation | null;
    exitAnimation: Animation | null;
  }
}>()

const { onEnter, onLeave } = useWidgetAnimations(
    () => props.store.entryAnimation,
    () => props.store.exitAnimation
);

const messages = computed<Array<string> | null>(() => props.store.state?.messages ?? null);
const settings = computed<MessageFeedSettings>(() => props.store.settings ?? {} as MessageFeedSettings);

const fontStyle = computed(() => {
  const f = settings.value.fontOptions ?? {} as NonNullable<MessageFeedSettings["fontOptions"]>;
  return {
    fontFamily: f.family ? `'${f.family}', Inter, sans-serif` : "Inter, sans-serif",
    fontWeight: String(f.weight ?? 600),
    fontSize: `${f.size ?? 20}px`,
    fontStyle: f.italic ? "italic" : "normal",
    color: f.color ?? "#FFF"
  }
});

const panelStyle = computed(() => ({
  background: settings.value.backgroundColor ?? "transparent"
}));
</script>

<template>
  <transition :css="false" @enter="onEnter" @leave="onLeave">
    <div v-if="messages" class="archipelago-message-feed-widget" :style="[fontStyle, panelStyle]">
      <div v-for="(message, index) in messages" :key="index" class="archipelago-message">
        <p v-html="message"></p>
      </div>
    </div>
  </transition>
</template>