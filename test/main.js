import chai from 'chai'

global.chai = chai
global.expect = chai.expect
global.should = chai.should()

// source code
import '../src/createAction'
import '../src/handleAction'

// test code
import './vuex1.x.spec'
