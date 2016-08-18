import handleAction from './handleAction'

const handleMutations = mutations => {
  Object.keys(mutations).forEach(name => {
    mutations[name] = handleAction(mutations[name])
  })
  return mutations
}

export default handleMutations
