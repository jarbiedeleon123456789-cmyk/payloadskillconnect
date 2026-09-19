/* SkillConnect frontend adapter for the Payload REST API. */
;(function (global) {
  'use strict'

  var API_BASE = '/api'
  var AUTH_TOKEN_KEY = 'skillconnect.authToken'
  var SKILL_CATEGORIES = [
    'Electronics',
    'Appliance Repair',
    'Electrical',
    'Welding',
    'Plumbing',
    'Small Engine Repair',
  ]
  var BARANGAYS = [
    'Guinobatan',
    'Camansihan',
    'Bayanan I',
    'Lumangbayan',
    'Sta. Isabel',
    'San Vicente',
  ]

  function initials(name) {
    return String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (word) {
        return word[0].toUpperCase()
      })
      .join('')
  }

  function unwrap(response) {
    return response && Array.isArray(response.docs) ? response.docs : response
  }

  function relationId(value) {
    return value && typeof value === 'object' ? value.id : value
  }

  function relationName(value) {
    return value && typeof value === 'object' ? value.name : null
  }

  function mapUser(user) {
    if (!user) return null
    return Object.assign({}, user, { initials: initials(user.name) })
  }

  function mapRequest(requestItem) {
    if (!requestItem) return null
    return Object.assign({}, requestItem, {
      customerId: relationId(requestItem.customer),
      workerId: relationId(requestItem.worker),
      workerName: requestItem.workerName || relationName(requestItem.worker),
      customerName: requestItem.customerName || relationName(requestItem.customer),
    })
  }

  function mapAnnouncement(announcement) {
    if (!announcement) return null
    return Object.assign({}, announcement, {
      date: announcement.dateLabel || announcement.date,
    })
  }

  function request(path, method, body) {
    var xhr = new XMLHttpRequest()
    xhr.open(method || 'GET', API_BASE + path, false)
    xhr.withCredentials = true
    xhr.setRequestHeader('Accept', 'application/json')
    var token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    if (body !== undefined) {
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.send(JSON.stringify(body))
    } else {
      xhr.send()
    }

    var result = null
    try {
      result = xhr.responseText ? JSON.parse(xhr.responseText) : null
    } catch (e) {
      result = null
    }
    if (xhr.status < 200 || xhr.status >= 300) {
      var message =
        result &&
        (result.message || (result.errors && result.errors[0] && result.errors[0].message))
      throw new Error(message || 'Payload request failed with status ' + xhr.status)
    }
    return result
  }

  function safeRequest(path, method, body) {
    try {
      return request(path, method, body)
    } catch (error) {
      console.error('SkillConnect API error:', error)
      return null
    }
  }

  var DB = {
    SKILL_CATEGORIES: SKILL_CATEGORIES,
    BARANGAYS: BARANGAYS,
    initials: initials,
    reset: function () {},

    getUsers: function () {
      var result = safeRequest('/users?limit=1000&sort=name')
      return (unwrap(result) || []).map(mapUser)
    },
    getUserById: function (id) {
      return mapUser(safeRequest('/users/' + encodeURIComponent(id)))
    },
    getUserByEmail: function (email) {
      var result = safeRequest(
        '/users?where[email][equals]=' +
          encodeURIComponent(
            String(email || '')
              .trim()
              .toLowerCase(),
          ) +
          '&limit=1',
      )
      return mapUser((unwrap(result) || [])[0])
    },
    createUser: function (user) {
      return mapUser(safeRequest('/users', 'POST', user))
    },
    updateProfile: function (patch) {
      return mapUser(safeRequest('/profile', 'PATCH', patch))
    },
    updateProfileImage: function (file, alt) {
      var media = DB.uploadMedia(file, alt)
      if (!media || !media.id) return null
      var saved = DB.updateProfile({ profileImage: media.id })
      if (!saved) return null
      if (!saved.profileImage || typeof saved.profileImage !== 'object') saved.profileImage = media
      return saved
    },
    updateUser: function (id, patch) {
      return mapUser(safeRequest('/users/' + encodeURIComponent(id), 'PATCH', patch))
    },
    uploadMedia: function (file, alt) {
      var xhr = new XMLHttpRequest()
      xhr.open('POST', API_BASE + '/media', false)
      xhr.withCredentials = true
      var token = localStorage.getItem(AUTH_TOKEN_KEY)
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token)
      var formData = new FormData()
      formData.append('file', file)
      formData.append('_payload', JSON.stringify({ alt: alt || file.name }))
      xhr.send(formData)

      var result = null
      try {
        result = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch (e) {
        result = null
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        var message =
          result &&
          (result.message || (result.errors && result.errors[0] && result.errors[0].message))
        throw new Error(message || 'Photo upload failed')
      }
      return result && result.doc ? result.doc : result
    },
    getWorkers: function () {
      return this.getUsers().filter(function (user) {
        return user.role === 'worker'
      })
    },

    getRequests: function () {
      var result = safeRequest('/requests?limit=1000&sort=-createdAt&depth=1')
      return (unwrap(result) || []).map(mapRequest)
    },
    getRequestsByCustomer: function (customerId) {
      return this.getRequests().filter(function (requestItem) {
        return String(requestItem.customerId) === String(customerId)
      })
    },
    getRequestsByWorker: function (workerId) {
      return this.getRequests().filter(function (requestItem) {
        return String(requestItem.workerId) === String(workerId)
      })
    },
    createRequest: function (data) {
      var payload = Object.assign({}, data)
      delete payload.id
      delete payload.customerId
      delete payload.customerName
      delete payload.workerId
      delete payload.workerName
      return mapRequest(safeRequest('/requests', 'POST', payload))
    },
    updateRequest: function (id, patch) {
      var payload = Object.assign({}, patch)
      if (Object.prototype.hasOwnProperty.call(payload, 'workerId')) {
        payload.worker = payload.workerId || null
        delete payload.workerId
      }
      delete payload.workerName
      return mapRequest(safeRequest('/requests/' + encodeURIComponent(id), 'PATCH', payload))
    },
    deleteRequest: function (id) {
      return safeRequest('/requests/' + encodeURIComponent(id), 'DELETE')
    },

    getAnnouncements: function () {
      var result = safeRequest('/announcements?limit=1000&sort=sortOrder')
      return (unwrap(result) || []).map(mapAnnouncement)
    },

    getCurrentUser: function () {
      var result = safeRequest('/users/me?depth=1')
      if (!result || result.user === null) return null
      return mapUser(result && result.user ? result.user : result)
    },
    setSession: function () {},
    clearSession: function () {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      safeRequest('/logout', 'POST', {})
    },
    login: function (email, password) {
      var result = safeRequest('/users/login', 'POST', {
        email: email,
        password: password,
      })
      if (result && result.token) localStorage.setItem(AUTH_TOKEN_KEY, result.token)
      return result
    },
    logout: function () {
      var result = safeRequest('/logout', 'POST', {})
      localStorage.removeItem(AUTH_TOKEN_KEY)
      return result || { user: null }
    },
  }

  global.DB = DB
})(window)
