export const isFunc = v => typeof v === 'function'
export const isObject = v => v && typeof v === 'object'
export const isPromise = obj => isObject(obj) && isFunc(obj.then)
export const hasPromise = obj => isObject(obj) && Object.keys(obj).some(key => isPromise(obj[key]))
export const hasDeps = fn => getDeps(fn) !== null

export const STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error'
}

export const getDeps = fn => {
  if (isFunc(fn)) {
    return fn._deps
  }
  return null
}

export const $inject = fn => (...deps) => {
  if (isFunc(fn) && deps.length) {
    fn._deps = deps
  }
  return fn
}

export const execute = (fn, payload, ...args) => {
  if (!isFunc(fn) || !hasDeps(fn)) return fn
  return fn(...getDeps(fn).map(name => payload[name]), ...args)
}

export const buildPromiseQueue = payload => {
  const props = Object.keys(payload)
  const nonDependentProps = props.filter(key => !hasDeps(payload[key]))
  let parsedProps = [...nonDependentProps]
  let promiseQueue = [nonDependentProps]

  parseDependencies(promiseQueue)

  return { run }

  function parseDependencies (promiseQueue) {
    const remainProps = props.filter(prop => parsedProps.indexOf(prop) === -1)
    let nextProps = []

    if (!remainProps.length) return

    remainProps.forEach(prop => {
      let isAllDepsParsed = getDeps(payload[prop]).every(dep => parsedProps.indexOf(dep) > -1 || !(dep in payload))
      isAllDepsParsed && nextProps.push(prop)
    })

    if (nextProps.length) {
      promiseQueue.push(nextProps)
      parsedProps.push(...nextProps)
    }

    parseDependencies(promiseQueue)
  }

  function run (...args) {
    return promiseQueue.reduce((acc, props) => acc.then(() => resolveProps(props, ...args)), Promise.resolve(1))
  }

  function resolveProps (props, ...args) {
    let promises = props.map(prop => execute(payload[prop], payload, ...args))

    return Promise.all(promises).then(res => {
      props.forEach((prop, index) => {
        payload[prop] = res[index]
      })
    })
  }
}
