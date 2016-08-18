import { handleAction, handleMutations } from '../src'

describe('handle mutations', () => {
  it('wraps a set of mutations with handleAction', () => {
    let val = ''
    const handler1 = (state, mutation) => {
      val = mutation
    }
    const handler2 = {
      pending (state, mutation) {},
      success (state, mutation) {},
      error (state, mutation) {}
    }
    const mutations = handleMutations({
      mutation1: handler1,
      mutation2: handler2
    })
    const mutation1 = handleAction(handler1)
    const mutation2 = handleAction(handler2)

    expect(mutations).to.be.an('object')
    expect(mutations.mutation1).to.be.a('function')
    expect(mutations.mutation2).to.be.a('function')
    expect(mutation1.toString()).to.equal(mutations.mutation1.toString())
    expect(mutation2.toString()).to.equal(mutations.mutation2.toString())
  })
})
