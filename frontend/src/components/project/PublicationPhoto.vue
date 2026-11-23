<template>
  <figure>
    <img v-if="url" :src="url" :alt="photo.description || photo.name" loading="lazy" />
    <div v-else class="publication-photo-state">{{ failed ? '影像無法載入' : '載入中…' }}</div>
    <figcaption>{{ photo.caption }}<p v-if="photo.description">原始登錄說明：{{ photo.description }}</p></figcaption>
  </figure>
</template>

<script>
export default {
  name: 'PublicationPhoto',
  props: { photo: { type: Object, required: true }, url: String, failed: Boolean }
}
</script>
