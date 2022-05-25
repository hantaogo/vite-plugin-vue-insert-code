import { parse } from '@vue/compiler-dom'

/**
 * vite插件-插入代码到vue3单文件组件
 * 
 * plugins: [
 *   insertcode({
 *     // fileRegex: /\.(vue)$/, // 非必填
 *     // flag: '<-- insertcode -->', // 非必填
 *     // ignoreFlag: '<-- not insertcode -->', // 非必填
 *     // 规则列表：必填，只匹配第一个
 *     rules: [
 *       {
 *         // 匹配函数，必填，path为文件路径
 *         match: path => {
 *           // 只对pages添加代码
 *           return path.includes('/pages/')
 *         },
 *         // 以下为添加的代码，都为非必填
 *         addTemplateTop: `<LoginTipTop ref="loginTop"/>`,
 *         addTemplateBottom: `<LoginTipBottom ref="loginBottom"/>`,
 *         addScriptTop: `import { useLogin } from '@/utils/common/useLogin'\nimport LoginTipTop from '@/components/User/LoginTipTop'\nimport LoginTipBottom from '@/components/User/LoginTipBottom'\n`,
 *         addScriptBottom: 'const loginTop = useLogin()\nconst loginBottom = useLogin()\nconst showLoginTop = () => { loginTop.value.show() }\nconst showLoginBottom = () => { loginBottom.value.show() }\n',
 *       }
 *     ],
 *     // 是否开始调试模式，此时会将转换后的代码打印出来
 *     debug: true,
 *   }),
 * ],
 */
export default (options = {}) => {
  const fileRegex = options.fileRegex || /\.(vue)$/

  return {
    name: 'vite-plugin-vue-insertcode',
    transform(code, id) {
      if (!fileRegex.test(id)) {
        return
      }
      // 忽略有标记的文件
      if (options.ignoreFlag && code.startsWith(options.ignoreFlag)) {
        return
      }
      // 只使用有标记的文件
      if (options.flag && !code.startsWith(options.flag)) {
        return
      }
      // 匹配成功后替换代码
      const rules = Array.isArray(options.rules) ? options.rules : []
      for (const rule of rules) {
        if (rule.match && rule.match(id)) {
          return transformSFC(code, {
            options,
            ...rule, // 合并规则到参数
          })
        }
      }
      // 未匹配成功，返回原始代码
      return code
    },
    handleHotUpdate(ctx) {
      const read = ctx.read
      if (fileRegex.test(ctx.file)) {
        ctx.read = async () => {
          const code = await read()
          return transformSFC(code, options) || code
        }
      }
    },
  }
}

const transformSFC = (code, options) => {

  let newCode = code

  const root = parse(code)

  if (root) {
    const children = Array.isArray(root.children) ? root.children : []
    const scriptNode = children.find(t => t.tag === 'script')
    const templateNode = children.find(t => t.tag === 'template')

    // console.log('scriptNode', JSON.stringify(scriptNode, null, '  '))
    // console.log('templateNode', JSON.stringify(templateNode))

    let scriptSetupContentStart = null
    let scriptSetupContentEnd = null

    let templateContentStart = null
    let templateContentEnd = null

    if (scriptNode && Array.isArray(scriptNode.props) && scriptNode.props.find(t => t.name === 'setup')) {

      const children = Array.isArray(scriptNode.children) ? scriptNode.children : []

      const contentNode = children.find(t => t.type === 2 && t.content)

      if (contentNode) {
        scriptSetupContentStart = contentNode.loc.start.offset
        scriptSetupContentEnd = contentNode.loc.end.offset
      }
    }
    
    if (templateNode) {
      templateContentStart = templateNode.loc.start.offset + '<template>'.length
      templateContentEnd = templateNode.loc.end.offset - '</template>'.length
    }

    // console.log('------------script setup------------')
    // const scriptSetupContent = code.substring(scriptSetupContentStart, scriptSetupContentEnd)
    // console.log(JSON.stringify(scriptSetupContent))
    
    // console.log('------------tempalte------------')
    // const templateContent = code.substring(templateContentStart, templateContentEnd)
    // console.log(JSON.stringify(templateContent))

    // 根据位置插入代码，更新偏移值
    if (templateContentStart && templateContentEnd && scriptSetupContentStart && scriptSetupContentEnd) {
      // 脚本和模板都有
      if (templateContentStart < scriptSetupContentStart) {
        // 模板在前
        // 1.  templateContentStart addTemplateTop
        // 2.  templateContentEnd addTemplateBottom
        // 3.  scriptSetupContentStart addScriptTop
        // 4.  scriptSetupContentEnd addScriptBottom
        if (options.addTemplateTop) {
          // 1-4
          const str = '\n' + options.addTemplateTop + '\n'
          const length = str.length

          newCode = newCode.substring(0, templateContentStart) + str + newCode.substring(templateContentStart)

          templateContentStart += length
          templateContentEnd += length
          scriptSetupContentStart += length
          scriptSetupContentEnd += length
        }
        if (options.addTemplateBottom) {
          // 2-4
          const str = '\n' + options.addTemplateBottom + '\n'
          const length = str.length

          newCode = newCode.substring(0, templateContentEnd) + str + newCode.substring(templateContentEnd)
          
          templateContentEnd += length
          scriptSetupContentStart += length
          scriptSetupContentEnd += length
        }
        if (options.addScriptTop) {
          // 3-4
          const str = '\n' + options.addScriptTop + '\n'
          const length = str.length

          newCode = newCode.substring(0, scriptSetupContentStart) + str + newCode.substring(scriptSetupContentStart)

          scriptSetupContentStart += length
          scriptSetupContentEnd += length
        }
        if (options.addScriptBottom) {
          // 4
          const str = '\n' + options.addScriptBottom + '\n'
          const length = str.length

          newCode = newCode.substring(0, scriptSetupContentEnd) + str + newCode.substring(scriptSetupContentEnd)

          scriptSetupContentEnd += length
        }
      } else {
        // 脚本在前
        // 1.  scriptSetupContentStart addScriptTop
        // 2.  scriptSetupContentEnd addScriptBottom
        // 3.  templateContentStart addTemplateTop
        // 4.  templateContentEnd addTemplateBottom
        if (options.addScriptTop) {
          // 1-4
          const str = '\n' + options.addScriptTop + '\n'
          const length = str.length

          newCode = newCode.substring(0, scriptSetupContentStart) + str + newCode.substring(scriptSetupContentStart)

          scriptSetupContentStart += length
          scriptSetupContentEnd += length
          templateContentStart += length
          templateContentEnd += length
        }
        if (options.addScriptBottom) {
          // 2-4
          const str = '\n' + options.addScriptBottom + '\n'
          const length = str.length

          newCode = newCode.substring(0, scriptSetupContentEnd) + str + newCode.substring(scriptSetupContentEnd)

          scriptSetupContentEnd += length
          templateContentStart += length
          templateContentEnd += length
        }
        if (options.addTemplateTop) {
          // 3-4
          const str = '\n' + options.addTemplateTop + '\n'
          const length = str.length

          newCode = newCode.substring(0, templateContentStart) + str + newCode.substring(templateContentStart)

          templateContentStart += length
          templateContentEnd += length
        }
        if (options.addTemplateBottom) {
          // 4
          const str = '\n' + options.addTemplateBottom + '\n'
          const length = str.length

          newCode = newCode.substring(0, templateContentEnd) + str + newCode.substring(templateContentEnd)

          templateContentEnd += length
        }
      }
    } else if (templateContentStart && templateContentEnd) {
      // 只有模板
      // 1.  templateContentStart addTemplateTop
      // 2.  templateContentEnd addTemplateBottom
      if (options.addTemplateTop) {
        // 1-2
        const str = '\n' + options.addTemplateTop + '\n'
        const length = str.length

        newCode = newCode.substring(0, templateContentStart) + str + newCode.substring(templateContentStart)

        templateContentStart += length
        templateContentEnd += length
      }
      if (options.addTemplateBottom) {
        // 2
        const str = '\n' + options.addTemplateBottom + '\n'
        const length = str.length

        newCode = newCode.substring(0, templateContentEnd) + str + newCode.substring(templateContentEnd)

        templateContentEnd += length
      }
    } else if (scriptSetupContentStart && scriptSetupContentEnd) {
      // 只有脚本
      // 1.  scriptSetupContentStart addScriptTop
      // 2.  scriptSetupContentEnd addScriptBottom
      if (options.addScriptTop) {
        // 1-2
        const str = '\n' + options.addScriptTop + '\n'
        const length = str.length

        newCode = newCode.substring(0, scriptSetupContentStart) + str + newCode.substring(scriptSetupContentStart)

        scriptSetupContentStart += length
        scriptSetupContentEnd += length
      }
      if (options.addScriptBottom) {
        // 2
        const str = '\n' + options.addScriptBottom + '\n'
        const length = str.length

        newCode = newCode.substring(0, scriptSetupContentEnd) + str + newCode.substring(scriptSetupContentEnd)

        scriptSetupContentEnd += length
      }
    }
  }

  if (options.debug) {
    console.log(newCode)
  }
  return newCode
}
