import Vue from 'vue'
import multidep from 'multidep'
import { createAction, handleAction, $inject } from '../src'
import { STATUS } from '../src/utils'

const multidepRequire = multidep('test/multidep.json')
const Vuex = multidepRequire('vuex', '2.0.0-rc.3')
const { mapActions } = Vuex

Vue.use(Vuex)

const CHANGE = 'change'
const SUCCESS_ONLY = 'success_only'
const MOD_ACTION = 'mod_action'

describe('vuex-action tests for vuex 2.x', () => {
  const store = new Vuex.Store({
    state: {
      obj: null,
      so: null,
      status: ''
    },
    mutations: {
      [CHANGE]: handleAction({
        pending (state, mutation) {
          state.obj = mutation
        },
        success (state, mutation) {
          state.obj = mutation
        },
        error (state, mutation) {
          state.obj = mutation
        }
      }),
      [SUCCESS_ONLY]: handleAction((state, mutation) => {
        state.so = mutation
      })
    },
    actions: {
      [CHANGE]: createAction(CHANGE),
      changeWithPayloadCreator: createAction(CHANGE, ({args1, args2, args3}) => ({
        args1, args2, args3
      })),
      [SUCCESS_ONLY]: createAction(SUCCESS_ONLY),
      [MOD_ACTION]: createAction(MOD_ACTION)
    },
    modules: {
      mod: {
        state: {
          obj: null
        },
        mutations: {
          [MOD_ACTION]: handleAction({
            pending (state, mutation) {
              state.obj = mutation
            },
            success (state, mutation) {
              state.obj = mutation
            },
            error (state, mutation) {
              state.obj = mutation
            }
          })
        }
      }
    },
    plugins: [
      store => {
        store.subscribe((mutation, state) => {
          state.status = mutation.payload.__status__
        })
      }
    ]
  })

  describe('create action', () => {
    it('create an action', () => {
      const action = createAction(CHANGE)
      expect(action).to.be.a('function')
    })

    it('create action without payload creator', () => {
      const vm = new Vue({
        store,
        methods: mapActions(['change'])
      })

      expect(vm.change).to.be.a('function')
      vm.change(1)
      expect(store.state.obj).to.equal(1)
      vm.change(null)
      expect(store.state.obj).to.be.null
      vm.change({a: 1})
      expect(store.state.obj).to.be.an('object')
    })

    it('create action with a payload creator', () => {
      const vm = new Vue({
        store,
        methods: mapActions(['changeWithPayloadCreator'])
      })

      expect(vm.changeWithPayloadCreator).to.be.a('function')
      vm.changeWithPayloadCreator({args1: 1, args2: 2})
      expect(store.state.obj).to.eql({ args1: 1, args2: 2, args3: undefined })
      vm.changeWithPayloadCreator({args1: 1, args2: 2, args3: 3})
      expect(store.state.obj).to.eql({ args1: 1, args2: 2, args3: 3 })
    })
  })

  describe('async actions', () => {
    it('resolve a single promise payload', done => {
      store.dispatch(CHANGE, Promise.resolve(1))
        .then(() => {
          expect(store.state.obj).to.equal(1)
        })
        .then(done)
    })

    it('reject a single promise payload', done => {
      store.dispatch(CHANGE, Promise.reject(new Error('wow, it\'s rejected')))
        .then(() => {
          expect(store.state.obj).to.be.an.instanceof(Error)
          expect(store.state.obj.message).to.equal('wow, it\'s rejected')
        })
        .then(done)
    })

    it('handle parallel promises in payload', done => {
      const p1 = new Promise((resolve) => setTimeout(() => resolve(1), 10))
      const p2 = new Promise((resolve) => setTimeout(() => resolve(2), 20))
      store.dispatch(CHANGE, {
        p1,
        p2,
        other: 3
      }).then(() => {
        expect(store.state.obj).to.eql({ p1: 1, p2: 2, other: 3 })
        expect(store.state.status).to.equal(STATUS.SUCCESS)
        done()
      })
      expect(store.state.status).to.equal(STATUS.PENDING)
    })

    it('handle promises in payload with dependencies', done => {
      const p1 = Promise.resolve(1)
      const p2 = Promise.resolve(2)
      const getP3 = p2 => Promise.resolve(p2 + 1)
      const getP4 = p3 => Promise.resolve(p3 + 1)
      const getP5 = (p3, p4) => Promise.resolve(p3 + p4)
      const getP6 = (p4, p5) => Promise.resolve(p4 + p5)

      store.dispatch(CHANGE, {
        p1,
        p2,
        p3: $inject(getP3)('p2'),
        p4: $inject(getP4)('p3'),
        p5: $inject(getP5)('p3', 'p4'),
        p6: $inject(getP6)('p4', 'p5'),
        other: 'other'
      }).then(() => {
        expect(store.state.obj).to.eql({ p1: 1, p2: 2, p3: 3, p4: 4, p5: 7, p6: 11, other: 'other' })
        done()
      })
    })

    it('handle rejected promise in payload', done => {
      const p1 = new Promise((resolve) => setTimeout(() => resolve(1), 10))
      const p2 = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('something went wrong')), 20)
      })
      store.dispatch(CHANGE, {
        p1,
        p2,
        other: 3
      }).then(() => {
        expect(store.state.obj).to.be.an('error')
        expect(store.state.obj.message).to.equal('something went wrong')
        expect(store.state.status).to.equal(STATUS.ERROR)
        done()
      })
      expect(store.state.status).to.equal(STATUS.PENDING)
    })

    it('contain origin args in the dependent function', () => {
      const testArgs1 = createAction(CHANGE, (...args) => ({
        p1: new Promise((resolve) => setTimeout(() => resolve(1), 10)),
        p2: new Promise((resolve) => setTimeout(() => resolve(2), 20)),
        p3: $inject((p1, p2, ...args) => {
          expect(p1).to.equal(1)
          expect(p2).to.equal(2)
          expect(args).to.be.an('array')
          expect(args.length).to.equal(2)
          expect(args[0]).to.equal('arg1')
          expect(args[1]).to.equal('arg2')
          return Promise.resolve(3)
        })('p1', 'p2')
      }))

      const testArgs2 = createAction(CHANGE, options => ({
        p1: new Promise((resolve) => setTimeout(() => resolve(1), 10)),
        p2: new Promise((resolve) => setTimeout(() => resolve(2), 20)),
        p3: $inject((p1, p2, options) => {
          expect(p1).to.equal(1)
          expect(p2).to.equal(2)
          expect(options).to.be.an('object')
          expect(options.opt1).to.equal('opt1')
          expect(options.opt2).to.equal('opt2')
          return Promise.resolve(3)
        })('p1', 'p2')
      }))

      testArgs1(store, 'args1', 'arg2')
      testArgs2(store, {
        opt1: 'opt1',
        opt2: 'opt2'
      })
    })
  })

  describe('handle action', () => {
    it('pass success handler to handleAction', () => {
      store.dispatch(SUCCESS_ONLY, Promise.reject(new Error('dropped'))).then(() => {
        expect(store.state.so).to.be.null
      })
      store.dispatch(SUCCESS_ONLY, Promise.resolve('take it!')).then(() => {
        expect(store.state.so).to.equal('take it!')
      })
    })
  })

  describe('modules', () => {
    it('resolve a single promise payload', done => {
      store.dispatch(MOD_ACTION, Promise.resolve(1))
        .then(() => {
          expect(store.state.mod.obj).to.equal(1)
        })
        .then(done)
    })

    it('reject a single promise payload', done => {
      store.dispatch(MOD_ACTION, Promise.reject(new Error('wow, it\'s rejected')))
        .then(() => {
          expect(store.state.mod.obj).to.be.an.instanceof(Error)
          expect(store.state.mod.obj.message).to.equal('wow, it\'s rejected')
        })
        .then(done)
    })

    it('handle parallel promises in payload', done => {
      const p1 = new Promise((resolve) => setTimeout(() => resolve(1), 10))
      const p2 = new Promise((resolve) => setTimeout(() => resolve(2), 20))
      store.dispatch(MOD_ACTION, {
        p1,
        p2,
        other: 3
      }).then(() => {
        expect(store.state.mod.obj).to.eql({ p1: 1, p2: 2, other: 3 })
        expect(store.state.status).to.equal(STATUS.SUCCESS)
        done()
      })
      expect(store.state.status).to.equal(STATUS.PENDING)
    })

    it('handle promises in payload with dependencies', done => {
      const p1 = Promise.resolve(1)
      const p2 = Promise.resolve(2)
      const getP3 = p2 => Promise.resolve(p2 + 1)
      const getP4 = p3 => Promise.resolve(p3 + 1)
      store.dispatch(MOD_ACTION, {
        p1,
        p2,
        p3: $inject(getP3)('p2'),
        p4: $inject(getP4)('p3'),
        other: 'other'
      }).then(() => {
        expect(store.state.mod.obj).to.eql({ p1: 1, p2: 2, p3: 3, p4: 4, other: 'other' })
        done()
      })
    })

    it('handle rejected promise in payload', done => {
      const p1 = new Promise((resolve) => setTimeout(() => resolve(1), 10))
      const p2 = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('something went wrong')), 20)
      })
      store.dispatch(MOD_ACTION, {
        p1,
        p2,
        other: 3
      }).then(() => {
        expect(store.state.mod.obj).to.be.an('error')
        expect(store.state.mod.obj.message).to.equal('something went wrong')
        expect(store.state.status).to.equal(STATUS.ERROR)
        done()
      })
      expect(store.state.status).to.equal(STATUS.PENDING)
    })
  })
})
