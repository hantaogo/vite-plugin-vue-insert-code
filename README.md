# vite-plugin-vue-insert-code
insert template or script to vue sfc.

# only for vue3 and vite

# install

npm install -D vite-plugin-vue-insert-code

# example
```js
// vite.config.ts
export default defineConfig({
  plugins: [
    insertcode({
      // fileRegex: /\.(vue)$/, // skil file when file not match this, default: /\.(vue)$/
      // flag: '<-- insertcode -->', // if flag not empty, skip file when not include this
      // ignoreFlag: '<-- not insertcode -->', // if ignoreFlag not empty, skip file when include this
      rules: [
        {
          // trace every vue sfc file, skip it when this function not return true
          match: path => {
            if (path.includes('Hello World.vue')) {
              return false
            }
            return true
          },
          // add script at top of <script setup>
          addScriptTop: `import Login from './Login.vue'\nimport Loading from ./Loading.vue`,
          // add script at bottom of <script setup>
          addScriptBottom: `showLoading()`,
          // add code at top of <template>
          addTemplateTop: `<Login/>`,
          // add code at bottom of <template>
          addTemplateBottom: `<Loading/>`,
          // show some debug info
          // debug: true,
        }
      ]
    }),
  ],
  // ...
}
```
