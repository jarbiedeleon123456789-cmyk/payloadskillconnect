/* ==========================================================================
   SKILLCONNECT — AUTH HELPERS
   ========================================================================== */
;(function (global) {
  'use strict'

  var ROLE_HOME = {
    customer: 'customer.html',
    worker: 'worker.html',
    admin: 'admin.html',
  }

  var Auth = {
    login: function (email, password) {
      var result = DB.login(email, password)
      if (!result || !result.user) {
        return { ok: false, message: 'Email or password is incorrect.' }
      }
      return { ok: true, user: DB.getCurrentUser() || result.user }
    },

    register: function (payload) {
      var user = DB.createUser(payload)
      if (!user) return { ok: false, message: 'Unable to create account.' }
      var result = DB.login(payload.email, payload.password)
      return result && result.user
        ? { ok: true, user: DB.getCurrentUser() || result.user }
        : { ok: true, user: user }
    },

    logout: function () {
      DB.logout()
      window.history.replaceState(null, '', 'login.html')
      window.location.replace('login.html?loggedOut=1')
    },

    homeFor: function (role) {
      return ROLE_HOME[role] || 'index.html'
    },

    // Call at the top of a protected page. Redirects to login if not
    // authenticated, or to the correct dashboard if the role doesn't match.
    requireRole: function (role) {
      var user = DB.getCurrentUser()
      if (!user) {
        window.location.href = 'login.html'
        return null
      }
      if (user.role !== role) {
        window.location.href = ROLE_HOME[user.role] || 'index.html'
        return null
      }

      window.addEventListener('pageshow', function () {
        if (!DB.getCurrentUser()) window.location.replace('login.html?loggedOut=1')
      })

      return user
    },

    // Call on the landing/login/register pages to bounce logged-in users
    // straight to their dashboard.
    redirectIfLoggedIn: function () {
      var user = DB.getCurrentUser()
      if (user) window.location.href = ROLE_HOME[user.role] || 'index.html'
    },
  }

  global.Auth = Auth
})(window)
