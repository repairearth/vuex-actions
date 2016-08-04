export const isFunc = v => typeof v === 'function'
export const isObject = v => Object.prototype.toString.call(v) === '[object Object]'
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
    let nextProps = props.filter(prop => parsedProps.indexOf(prop) === -1)

    if (!nextProps.length) return

    nextProps.forEach((prop, index) => {
      let isAllDepsParsed = getDeps(payload[prop]).every(dep => parsedProps.indexOf(dep) > -1 || !(dep in payload))
      if (!isAllDepsParsed) {
        nextProps.splice(index, 1)
      }
    })

    if (nextProps.length) {
      promiseQueue.push(nextProps)
      parsedProps.push(...nextProps)
    }

    parseDependencies(promiseQueue)
  }

  function run (...args) {
    promiseQueue.reduce((acc, props) => {
      return acc.then(() => resolveProps(props, ...args))
    }, Promise.resolve(1))
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