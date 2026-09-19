;(function () {
  'use strict'

  var user = Auth.requireRole('customer')
  if (!user) return

  UI.renderShell(user, {
    section: 'feed',
    title: 'My Requests',
    subtitle: "Everything you've submitted to the barangay directory.",
  })

  var current = 'feed'
  var directoryFilter = 'All'

  window.addEventListener('sc:section', function (e) {
    go(e.detail)
  })
  go('feed')

  function go(section) {
    current = section
    if (section === 'feed') {
      UI.setTopbar('My Requests', "Everything you've submitted to the barangay directory.")
      renderFeed()
    }
    if (section === 'new') {
      UI.setTopbar(
        'Submit a Request',
        'Describe the job — a matching verified worker will pick it up.',
      )
      renderNewForm()
    }
    if (section === 'directory') {
      UI.setTopbar('Find a Worker', 'Browse verified workers by skill and request them directly.')
      renderDirectory()
    }
    if (section === 'profile') {
      UI.setTopbar('My Profile', 'Manage your contact details and Facebook link.')
      renderProfile()
    }
  }

  function statusMeta(status) {
    return (
      {
        pending: 'Waiting for a worker',
        accepted: 'Worker assigned',
        working: 'Job in progress',
        completed: 'Job completed',
        cancelled: 'Cancelled',
      }[status] || status
    )
  }

  function reqCard(r) {
    var actions = ''
    var photos = (r.photos || [])
      .map(function (photo) {
        var url = photo && typeof photo === 'object' ? photo.url : null
        return url
          ? '<img src="' +
              UI.esc(url) +
              '" alt="Request photo" style="width:72px;height:72px;object-fit:cover;border-radius:8px;margin:8px 6px 0 0;">'
          : ''
      })
      .join('')
    if (r.status === 'pending')
      actions += '<button class="pill-btn danger" data-cancel="' + r.id + '">Cancel</button>'
    if (r.status === 'completed' && !r.rating)
      actions += '<button class="pill-btn primary" data-rate="' + r.id + '">Rate worker</button>'
    if (r.status === 'completed' && r.rating)
      actions +=
        '<span style="font-size:12.5px;color:var(--ink-soft);">You rated ' + r.rating + '/5</span>'

    return (
      '<article class="req-card">' +
      '<div class="req-top">' +
      '<div><span class="req-id">' +
      r.ticketId +
      '</span></div>' +
      '<span class="badge ' +
      r.status +
      '">' +
      r.status +
      '</span>' +
      '</div>' +
      '<div><span class="req-skill">' +
      UI.esc(r.skillNeeded) +
      '</span></div>' +
      '<p class="req-desc">' +
      UI.esc(r.description) +
      '</p>' +
      (photos ? '<div class="request-photos">' + photos + '</div>' : '') +
      '<div class="req-meta">' +
      statusMeta(r.status) +
      (r.workerName ? ' · <b>' + UI.esc(r.workerName) + '</b>' : '') +
      ' · Preferred ' +
      UI.fmtDate(r.preferredDate) +
      '</div>' +
      '<div class="req-foot"><span class="req-people">Submitted ' +
      UI.timeAgo(r.createdAt) +
      '</span><div class="req-actions">' +
      actions +
      '</div></div>' +
      '</article>'
    )
  }

  function renderFeed() {
    var list = DB.getRequestsByCustomer(user.id)
    var html =
      '<div class="section-toolbar"><div class="tabs"><span class="tab-btn is-active">All (' +
      list.length +
      ')</span></div>' +
      '<a href="#" data-section="new" class="btn btn-primary" style="height:42px;">' +
      UI.ICONS.plus +
      ' New request</a></div>'

    if (!list.length) {
      html +=
        '<div class="panel"><div class="empty-state">' +
        UI.ICONS.inbox +
        '<h4>No requests yet</h4><p>Submit your first repair request and it will show up here with live status updates.</p></div></div>'
    } else {
      html += '<div class="req-list">' + list.map(reqCard).join('') + '</div>'
    }
    UI.content().innerHTML = html

    UI.content()
      .querySelectorAll('[data-section]')
      .forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault()
          switchNav('new')
        })
      })
    UI.content()
      .querySelectorAll('[data-cancel]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          DB.updateRequest(btn.getAttribute('data-cancel'), { status: 'cancelled' })
          UI.toast('Request cancelled.')
          renderFeed()
        })
      })
    UI.content()
      .querySelectorAll('[data-rate]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          var val = window.prompt('Rate this worker from 1 to 5:', '5')
          var n = parseInt(val, 10)
          if (!n || n < 1 || n > 5) return
          var req = DB.updateRequest(btn.getAttribute('data-rate'), { rating: n })
          if (req && req.workerId) {
            var w = DB.getUserById(req.workerId)
            if (w) {
              var jobs = w.jobs || 0
              var newRating = ((w.rating || 0) * jobs + n) / (jobs + 1)
              DB.updateUser(w.id, { rating: newRating })
            }
          }
          UI.toast('Thanks for rating!')
          renderFeed()
        })
      })
  }

  function switchNav(id) {
    document.querySelectorAll('#appNav .nav-item').forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-section') === id)
    })
    go(id)
  }

  function renderProfile() {
    var facebookUrl = /^https?:\/\//i.test(String(user.facebookUrl || '')) ? user.facebookUrl : ''
    var barangays = DB.BARANGAYS.map(function (barangay) {
      return (
        '<option value="' +
        UI.esc(barangay) +
        '"' +
        (barangay === user.barangay ? ' selected' : '') +
        '>' +
        UI.esc(barangay) +
        '</option>'
      )
    }).join('')

    UI.content().innerHTML =
      '<section class="profile-stage" style="max-width:900px;"><div class="profile-hero">' +
      '<div class="profile-avatar-wrap">' +
      UI.profileAvatar(user, 'profile-avatar') +
      '<label class="avatar-upload" for="customerAvatarInput" title="Upload profile picture">' +
      UI.ICONS.plus +
      '<input id="customerAvatarInput" type="file" accept="image/png,image/jpeg,image/webp"></label></div>' +
      '<div class="profile-identity"><span class="profile-kicker">Customer profile</span><h2>' +
      UI.esc(user.name || 'Your profile') +
      '</h2><p>Keep your identity clear for workers before they accept a request.</p><div class="profile-meta"><span>' +
      UI.esc(user.barangay || 'Barangay not set') +
      '</span><span>' +
      UI.esc(user.email || '') +
      '</span></div></div>' +
      '<div class="profile-quick-link">' +
      (facebookUrl
        ? '<a href="' +
          UI.esc(facebookUrl) +
          '" target="_blank" rel="noopener noreferrer"><span class="facebook-mark">f</span><span><b>Facebook</b><small>Open profile</small></span><span class="link-arrow">&#8599;</span></a>'
        : '<span class="profile-quick-empty"><span class="facebook-mark">f</span><span><b>Facebook</b><small>Add your profile link below</small></span></span>') +
      '</div></div><div class="panel profile-editor"><div class="panel-body">' +
      '<form id="customerProfileForm" class="form-grid">' +
      '<div class="field"><label>Full name</label><input value="' +
      UI.esc(user.name || '') +
      '" disabled></div>' +
      '<div class="field"><label>Email</label><input value="' +
      UI.esc(user.email || '') +
      '" disabled></div>' +
      '<div class="field"><label>Contact number</label><input type="tel" name="phone" required value="' +
      UI.esc(user.phone || '') +
      '"></div>' +
      '<div class="field"><label>Barangay</label><select name="barangay">' +
      barangays +
      '</select></div>' +
      '<div class="field full"><label>Facebook profile link <span style="color:var(--ink-soft);font-weight:400;">(optional)</span></label>' +
      '<input type="url" name="facebookUrl" autocomplete="url" placeholder="https://facebook.com/your.name" value="' +
      UI.esc(user.facebookUrl || '') +
      '">' +
      (facebookUrl
        ? '<a class="profile-social-link" href="' +
          UI.esc(facebookUrl) +
          '" target="_blank" rel="noopener noreferrer">Open Facebook profile</a>'
        : '') +
      '<span style="font-size:12px;color:var(--ink-soft);">Add a Facebook link so workers can contact you about your request.</span></div>' +
      '<div class="field full"><button class="btn btn-primary" type="submit">Save profile</button></div>' +
      '</form></div></div></section>'

    document.getElementById('customerAvatarInput').addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0]
      if (!file) return
      try {
        var saved = DB.updateProfileImage(file, 'Profile picture - ' + user.name)
        if (!saved) throw new Error('Upload failed')
        Object.assign(user, saved)
        UI.toast('Profile picture updated.')
        renderProfile()
      } catch (error) {
        console.error('Profile picture upload failed:', error)
        UI.toast('Could not upload profile picture.')
      }
    })

    document.getElementById('customerProfileForm').addEventListener('submit', function (event) {
      event.preventDefault()
      var data = Object.fromEntries(new FormData(event.target).entries())
      var facebookUrl = (data.facebookUrl || '').trim()
      if (facebookUrl && !/^https?:\/\//i.test(facebookUrl)) facebookUrl = 'https://' + facebookUrl
      var saved = DB.updateUser(user.id, {
        phone: data.phone,
        barangay: data.barangay,
        facebookUrl: facebookUrl || null,
      })
      if (!saved) {
        UI.toast('Could not save your profile.')
        return
      }
      Object.assign(user, saved)
      UI.toast('Profile saved.')
      renderProfile()
    })
  }

  function renderNewForm() {
    var options = DB.SKILL_CATEGORIES.map(function (c) {
      return '<option value="' + c + '">' + c + '</option>'
    }).join('')
    var barangays = DB.BARANGAYS.map(function (b) {
      return (
        '<option value="' +
        b +
        '"' +
        (b === user.barangay ? ' selected' : '') +
        '>' +
        b +
        '</option>'
      )
    }).join('')

    UI.content().innerHTML =
      '<div class="panel" style="max-width:640px;"><div class="panel-body">' +
      '<form id="reqForm" class="form-grid">' +
      '<div class="field full"><label>Skill needed</label><select name="skillNeeded" required>' +
      options +
      '</select></div>' +
      '<div class="field full"><label>Describe the problem</label><textarea name="description" required placeholder="e.g. Aircon not cooling, breaker trips when turned on"></textarea></div>' +
      '<div class="field full"><label>Photos of the problem <span style="color:var(--ink-soft);font-weight:400;">(optional, up to 4)</span></label>' +
      '<input type="file" name="photos" accept="image/*" multiple>' +
      '<div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">Add a clear photo of the problem, the whole unit, or its model sticker.</div></div>' +
      '<div class="field"><label>Barangay</label><select name="barangay">' +
      barangays +
      '</select></div>' +
      '<div class="field"><label>Preferred date</label><input type="date" name="preferredDate" required></div>' +
      '<div class="field full"><label>Contact number</label><input type="tel" name="contactNumber" value="' +
      UI.esc(user.phone || '') +
      '" required></div>' +
      '<div class="field full"><button class="btn btn-primary btn-block" type="submit">Submit request</button></div>' +
      '</form>' +
      '</div></div>'

    document.getElementById('reqForm').addEventListener('submit', function (e) {
      e.preventDefault()
      var form = e.target
      var data = Object.fromEntries(new FormData(form).entries())
      var files = Array.prototype.slice
        .call(form.querySelector('input[name="photos"]').files || [])
        .slice(0, 4)
      data.customerId = user.id
      data.customerName = user.name
      delete data.photos
      var submitButton = form.querySelector('button[type="submit"]')
      submitButton.disabled = true
      try {
        data.photos = files.map(function (file) {
          return DB.uploadMedia(file, 'Request photo - ' + file.name).id
        })
        var created = DB.createRequest(data)
        if (!created) throw new Error('Could not submit the request')
      } catch (error) {
        submitButton.disabled = false
        UI.toast(error.message || 'Could not submit the request.')
        return
      }
      UI.toast('Request submitted! A matching worker will pick it up.')
      switchNav('feed')
    })
  }

  function workerCard(w) {
    return (
      '<article class="req-card">' +
      '<div class="req-top">' +
      '<div style="display:flex;align-items:center;gap:10px;"><div class="mini-avatar">' +
      UI.esc(DB.initials(w.name)) +
      '</div>' +
      '<div><div style="font-weight:700;font-size:14.5px;">' +
      UI.esc(w.name) +
      '</div><div style="font-size:12.5px;color:var(--ink-soft);">Brgy. ' +
      UI.esc(w.barangay) +
      '</div></div></div>' +
      '<span class="badge ' +
      (w.verified ? 'verified' : 'unverified') +
      '">' +
      (w.verified ? 'Verified' : 'Pending') +
      '</span>' +
      '</div>' +
      '<div><span class="req-skill">' +
      UI.esc(w.skillCategory) +
      '</span> ' +
      '<span class="badge ' +
      w.availability +
      '" style="margin-left:6px;">' +
      w.availability +
      '</span></div>' +
      '<p class="req-desc">' +
      UI.esc(w.bio || '') +
      '</p>' +
      '<div class="req-foot">' +
      UI.starRow(w.rating) +
      '<span style="font-size:12px;color:var(--ink-soft);">(' +
      (w.jobs || 0) +
      ' jobs)</span>' +
      '<button class="btn btn-primary" style="height:36px;padding:0 14px;font-size:13px;margin-left:auto;" data-request-worker="' +
      w.id +
      '">Request</button>' +
      '</div>' +
      '</article>'
    )
  }

  function renderDirectory() {
    var chips = ['All']
      .concat(DB.SKILL_CATEGORIES)
      .map(function (c) {
        return (
          '<button class="filter-chip' +
          (c === directoryFilter ? ' is-active' : '') +
          '" data-cat="' +
          c +
          '">' +
          c +
          '</button>'
        )
      })
      .join('')

    var workers = DB.getWorkers().filter(function (worker) {
      return worker.verified
    })
    var list =
      directoryFilter === 'All'
        ? workers
        : workers.filter(function (w) {
            return w.skillCategory === directoryFilter
          })

    UI.content().innerHTML =
      '<div class="filter-row" style="margin-bottom:20px;">' +
      chips +
      '</div>' +
      '<div class="directory-map-wrap"><div class="directory-map-head"><div><span class="profile-kicker">Live directory</span><h3>Workers near Calapan</h3></div><span class="directory-map-count">' +
      list.length +
      ' verified workers</span></div><div id="workerMap" class="directory-map"></div></div>' +
      (list.length
        ? '<div class="mini-ticket-grid">' + list.map(workerCard).join('') + '</div>'
        : '<div class="panel"><div class="empty-state">' +
          UI.ICONS.users +
          '<h4>No workers in this category yet</h4><p>Try another skill category, or check back once staff verifies more workers.</p></div></div>')

    if (window.L) {
      var map = L.map('workerMap', { scrollWheelZoom: false }).setView([13.4105, 121.18], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)
      var locatedWorkers = list.filter(function (worker) {
        return typeof worker.lat === 'number' && typeof worker.lng === 'number'
      })
      locatedWorkers.forEach(function (worker) {
        L.marker([worker.lat, worker.lng])
          .addTo(map)
          .bindPopup(
            '<b>' +
              UI.esc(worker.name) +
              '</b><br>' +
              UI.esc(worker.skillCategory) +
              '<br>' +
              UI.esc(worker.barangay),
          )
      })
      if (locatedWorkers.length === 1)
        map.setView([locatedWorkers[0].lat, locatedWorkers[0].lng], 14)
      if (locatedWorkers.length > 1) {
        map.fitBounds(
          L.latLngBounds(
            locatedWorkers.map(function (worker) {
              return [worker.lat, worker.lng]
            }),
          ),
          { padding: [24, 24] },
        )
      }
    }

    UI.content()
      .querySelectorAll('[data-cat]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          directoryFilter = btn.getAttribute('data-cat')
          renderDirectory()
        })
      })
    UI.content()
      .querySelectorAll('[data-request-worker]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          openRequestModal(btn.getAttribute('data-request-worker'))
        })
      })
  }

  function openRequestModal(workerId) {
    var w = DB.getUserById(workerId)
    if (!w) return
    var overlay = document.createElement('div')
    overlay.className = 'modal-overlay is-visible'
    overlay.innerHTML =
      '<div class="modal-box">' +
      '<h3>Request ' +
      UI.esc(w.name) +
      '</h3>' +
      '<div class="sub">' +
      UI.esc(w.skillCategory) +
      ' · Brgy. ' +
      UI.esc(w.barangay) +
      '</div>' +
      '<form id="modalReqForm" style="margin-top:18px;display:flex;flex-direction:column;gap:14px;">' +
      '<div class="field"><label>Describe the problem</label><textarea name="description" required></textarea></div>' +
      '<div class="field"><label>Preferred date</label><input type="date" name="preferredDate" required></div>' +
      '<div class="field"><label>Contact number</label><input type="tel" name="contactNumber" value="' +
      UI.esc(user.phone || '') +
      '" required></div>' +
      '</form>' +
      '<div class="modal-actions"><button class="btn btn-outline" id="modalCancel" type="button">Cancel</button><button class="btn btn-primary" id="modalSubmit">Send request</button></div>' +
      '</div>'
    document.body.appendChild(overlay)
    overlay.querySelector('#modalCancel').addEventListener('click', function () {
      overlay.remove()
    })
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove()
    })
    overlay.querySelector('#modalSubmit').addEventListener('click', function () {
      var form = overlay.querySelector('#modalReqForm')
      if (!form.reportValidity()) return
      var data = Object.fromEntries(new FormData(form).entries())
      data.customerId = user.id
      data.customerName = user.name
      data.barangay = user.barangay
      data.skillNeeded = w.skillCategory
      var req = DB.createRequest(data)
      DB.updateRequest(req.id, { workerId: w.id, workerName: w.name })
      overlay.remove()
      UI.toast('Request sent to ' + w.name + '.')
      switchNav('feed')
    })
  }
})()
