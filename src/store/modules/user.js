import storage from 'store'
import expirePlugin from 'store/plugins/expire'
import { login, getInfo, logout } from '@/api/login'
import { ACCESS_TOKEN } from '@/store/mutation-types'
import { welcome } from '@/utils/util'

/**
 * 将一个名为 expirePlugin 的插件添加到了 Vuex 的 storage 对象中，该插件用于设置存储在本地的数据的过期时间。
 * expirePlugin 是一个 Vuex 插件，主要用于对存储在本地的数据设置过期时间。该插件可以在存储数据时同时设置一个过期时间，到达指定时间后，存储的数据将自动被清除。
 * 具体来说，expirePlugin 在 storage 对象上添加了两个方法：set 和 get。在使用 storage.set 方法存储数据时，可以传递一个额外的参数来设置数据的过期时间
 * 例如：storage.set(key, value, expireTime)
 * 其中，key 是数据的键名，value 是数据的值，expireTime 是一个表示过期时间的时间戳。
 * 在数据存储后，expirePlugin 会定时检查存储的数据是否过期，如果过期则自动清除数据。
 * 注意:
 *      expirePlugin 仅对存储在本地的数据生效，例如使用 localStorage 或 sessionStorage 存储的数据。
 *      对于其他存储方式，例如使用 cookie 存储的数据，expirePlugin 可能无法生效。
 *      另外，由于 JavaScript 本身无法直接访问存储的数据的过期时间，expirePlugin 实际上是定时检查数据的存储时间，然后根据存储时间和过期时间的差值来判断数据是否过期。
 *      因此，在使用 expirePlugin 时需要合理设置过期时间，以免误判数据是否过期。
 */
storage.addPlugin(expirePlugin)
const user = {
  // 定义了应用程序中的一些状态数据
  state: {
    // 身份验证令牌
    token: '',
    // 用户名
    name: '',
    // 欢迎消息
    welcome: '',
    // 用户头像
    avatar: '',
    // 角色
    roles: [],
    // 用户信息
    info: {}
  },

  // 定义了一些函数，用于更新 state 中的状态。不能使用异步函数！！！
  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_NAME: (state, { name, welcome }) => {
      state.name = name
      state.welcome = welcome
    },
    SET_AVATAR: (state, avatar) => {
      state.avatar = avatar
    },
    SET_ROLES: (state, roles) => {
      state.roles = roles
    },
    SET_INFO: (state, info) => {
      state.info = info
    }
  },

  /**
   * 定义了一些函数，用于触发 mutations 中的函数，并在必要时与后端进行交互。
   * 可以包含异步操作和其他复杂的逻辑处理，用于在触发 mutations 前进行一些准备工作，或在 mutations 执行完毕后进行一些额外的处理。
   * 与 mutations 不同，actions 可以包含异步操作，例如发送网络请求等。
   * 使用 Vuex 管理状态时，通常将复杂的逻辑处理和异步操作放在 actions 中，而将简单的状态变更操作放在 mutations 中。
   * 通过这种方式，可以保证状态变更的同步性和一致性。
   * actions 函数接收一个名为 context 的参数，该参数包含了一些与 store 实例具有相同方法和属性的对象，例如 commit、dispatch、state 等。
   * 在 actions 函数中，可以使用 context.commit 方法触发 mutations 中的函数，从而更新状态。
   */
  actions: {
    // 登录
    Login ({ commit }, userInfo) {
      return new Promise((resolve, reject) => {
        // 调用登录接口
        login(userInfo).then(response => {
          // 登录成功，获取登录返回信息
          const result = response.result
          // 存储用户 token，设置过期时间
          storage.set(ACCESS_TOKEN, result.token, new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
          // 设置 TOKEN
          commit('SET_TOKEN', result.token)
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 获取用户信息
    GetInfo ({ commit }) {
      return new Promise((resolve, reject) => {
        // 请求后端获取用户信息 /api/user/info
        getInfo().then(response => {
          const { result } = response
          if (result.role && result.role.permissions.length > 0) {
            const role = { ...result.role }
            role.permissions = result.role.permissions.map(permission => {
              const per = {
                ...permission,
                actionList: (permission.actionEntitySet || {}).map(item => item.action)
               }
              return per
            })
            role.permissionList = role.permissions.map(permission => { return permission.permissionId })
            // 覆盖响应体的 role, 供下游使用
            result.role = role

            commit('SET_ROLES', role)
            commit('SET_INFO', result)
            commit('SET_NAME', { name: result.name, welcome: welcome() })
            commit('SET_AVATAR', result.avatar)
            // 下游
            resolve(result)
          } else {
            reject(new Error('getInfo: roles must be a non-null array !'))
          }
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 登出
    Logout ({ commit, state }) {
      return new Promise((resolve) => {
        logout(state.token).then(() => {
          commit('SET_TOKEN', '')
          commit('SET_ROLES', [])
          storage.remove(ACCESS_TOKEN)
          resolve()
        }).catch((err) => {
          console.log('logout fail:', err)
          // resolve()
        }).finally(() => {
        })
      })
    }

  }
}

export default user
