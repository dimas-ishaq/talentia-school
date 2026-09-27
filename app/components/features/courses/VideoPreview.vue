<script setup lang="ts">
import type { VideoMetadata } from '~/utils/video'

defineProps<{ video: VideoMetadata | null; controls?: boolean }>()
</script>

<template>
  <div v-if="video" class="overflow-hidden rounded-lg bg-black">
    <iframe
      v-if="video.embedUrl" :src="video.embedUrl" title="Preview video"
      class="aspect-video w-full" allowfullscreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
    />
    <video v-else :src="video.url" :controls="controls !== false" preload="metadata" class="aspect-video w-full" />
  </div>
</template>
