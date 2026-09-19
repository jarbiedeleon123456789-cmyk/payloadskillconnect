;(function () {
  'use strict'

  var user = Auth.requireRole('worker')
  if (!user) return

  UI.renderShell(user, {
    section: 'jobfeed',
    title: 'Job Feed',
    subtitle: 'Requests matching your specialty: ' + user.skillCategory + '.',
  })

  var activeTab = 'available'

  window.addEventListener('sc:section', function (e) {
    go(e.detail)
  })
  go('jobfeed')

  function go(section) {
    if (section === 'jobfeed') {
      UI.setTopbar('Job Feed', 'Requests matching your specialty: ' + user.skillCategory + '.')
      renderJobFeed()
    }
    if (section === 'profile') {
      UI.setTopbar('Availability & Profile', 'Control whether new requests can reach you.')
      renderProfile()
    }
  }

  function tabCounts() {
    var all = DB.getRequests()
    var available = all.filter(function (r) {
      return (
        r.status === 'pending' &&
        r.skillNeeded === user.skillCategory &&
        (!r.workerId || r.workerId === user.id)
      )
    })
    var mine = DB.getRequestsByWorker(user.id)
    return {
      available: available,
      accepted: mine.filter(function (r) {
        return r.status === 'accepted'
      }),
      working: mine.filter(function (r) {
        return r.status === 'working'
      }),
      completed: mine.filter(function (r) {
        return r.status === 'completed'
      }),
    }
  }

  function reqCard(r, mode) {
    var action = ''
    if (mode === 'available')
      action =
        '<button class="btn btn-primary" style="height:36px;padding:0 14px;font-size:13px;" data-accept="' +
        r.id +
        '">Accept job</button>'
    if (mode === 'accepted')
      action =
        '<button class="btn btn-primary" style="height:36px;padding:0 14px;font-size:13px;" data-start="' +
        r.id +
        '">Start job</button>'
    if (mode === 'working')
      action =
        '<button class="btn btn-primary" style="height:36px;padding:0 14px;font-size:13px;" data-complete="' +
        r.id +
        '">Mark complete</button>'
    if (mode === 'completed')
      action = r.rating
        ? '<span style="font-size:12.5px;color:var(--ink-soft);">' +
          UI.starRow(r.rating) +
          '</span>'
        : '<span style="font-size:12.5px;color:var(--ink-soft);">Not yet rated</span>'

    return (
      '<article class="req-card">' +
      '<div class="req-top"><span class="req-id">' +
      r.ticketId +
      '</span><span class="badge ' +
      r.status +
      '">' +
      r.status +
      '</span></div>' +
      '<div><span class="req-skill">' +
      UI.esc(r.skillNeeded) +
      '</span></div>' +
      '<p class="req-desc">' +
      UI.esc(r.description) +
      '</p>' +
      '<div class="req-meta">' +
      UI.esc(r.customerName) +
      ' · Brgy. ' +
      UI.esc(r.barangay) +
      ' · ' +
      UI.esc(r.contactNumber) +
      ' · Preferred ' +
      UI.fmtDate(r.preferredDate) +
      '</div>' +
      '<div class="req-foot"><span class="req-people">Submitted ' +
      UI.timeAgo(r.createdAt) +
      '</span>' +
      action +
      '</div>' +
      '</article>'
    )
  }

  function renderJobFeed() {
    var c = tabCounts()
    var tabs = [
      { id: 'available', label: 'Available', list: c.available },
      { id: 'accepted', label: 'Pending (accepted)', list: c.accepted },
      { id: 'working', label: 'Working', list: c.working },
      { id: 'completed', label: 'Completed', list: c.completed },
    ]
    var tabsHtml = tabs
      .map(function (t) {
        return (
          '<button class="tab-btn' +
          (t.id === activeTab ? ' is-active' : '') +
          '" data-tab="' +
          t.id +
          '">' +
          t.label +
          ' <span class="count">' +
          t.list.length +
          '</span></button>'
        )
      })
      .join('')

    var active = tabs.filter(function (t) {
      return t.id === activeTab
    })[0]
    var listHtml
    if (!active.list.length) {
      var msgs = {
        available: 'No matching requests right now — check back soon.',
        accepted: 'Nothing accepted yet. Grab a job from the Available tab.',
        working: 'Nothing in progress at the moment.',
        completed: "You haven't completed any jobs yet.",
      }
      listHtml =
        '<div class="panel"><div class="empty-state">' +
        UI.ICONS.inbox +
        '<h4>All clear</h4><p>' +
        msgs[active.id] +
        '</p></div></div>'
    } else {
      listHtml =
        '<div class="req-list">' +
        active.list
          .map(function (r) {
            return reqCard(r, active.id)
          })
          .join('') +
        '</div>'
    }

    if (!user.verified) {
      UI.content().innerHTML =
        '<div class="panel" style="margin-bottom:20px;"><div class="panel-body" style="display:flex;gap:14px;align-items:center;">' +
        '<div class="icon" style="width:34px;height:34px;border-radius:9px;background:rgba(180,86,47,0.1);color:var(--clay);display:grid;place-items:center;flex:none;">' +
        UI.ICONS.bolt +
        '</div><div>' +
        '<div style="font-weight:700;">Your account is pending verification</div>' +
        '<div style="font-size:13.5px;color:var(--ink-soft);margin-top:2px;">Visit the barangay or PESO desk with a valid ID. You can still browse, but residents will not see your profile in the public directory until an admin verifies you.</div>' +
        '</div></div></div>' +
        '<div class="tabs" style="margin-bottom:18px;">' +
        tabsHtml +
        '</div>' +
        listHtml
    } else {
      UI.content().innerHTML =
        '<div class="tabs" style="margin-bottom:18px;">' + tabsHtml + '</div>' + listHtml
    }

    UI.content()
      .querySelectorAll('[data-tab]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          activeTab = btn.getAttribute('data-tab')
          renderJobFeed()
        })
      })
    UI.content()
      .querySelectorAll('[data-accept]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          DB.updateRequest(btn.getAttribute('data-accept'), {
            status: 'accepted',
            workerId: user.id,
            workerName: user.name,
          })
          UI.toast('Job accepted — find it under Pending.')
          activeTab = 'accepted'
          renderJobFeed()
        })
      })
    UI.content()
      .querySelectorAll('[data-start]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          DB.updateRequest(btn.getAttribute('data-start'), { status: 'working' })
          UI.toast('Job marked as in progress.')
          activeTab = 'working'
          renderJobFeed()
        })
      })
    UI.content()
      .querySelectorAll('[data-complete]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          DB.updateRequest(btn.getAttribute('data-complete'), { status: 'completed' })
          DB.updateUser(user.id, { jobs: (user.jobs || 0) + 1 })
          user.jobs = (user.jobs || 0) + 1
          UI.toast('Nice work! Job marked complete.')
          activeTab = 'completed'
          renderJobFeed()
        })
      })
  }

  function renderProfile() {
    var facebookUrl = /^https?:\/\//i.test(String(user.facebookUrl || '')) ? user.facebookUrl : ''
    var opts = ['available', 'busy', 'offline']
    var switcherHtml = opts
      .map(function (o) {
        return (
          '<button class="avail-opt' +
          (user.availability === o ? ' is-active' : '') +
          '" data-val="' +
          o +
          '"><span class="dot"></span>' +
          o.charAt(0).toUpperCase() +
          o.slice(1) +
          '</button>'
        )
      })
      .join('')

    UI.content().innerHTML =
      '<section class="profile-stage" style="max-width:900px;"><div class="profile-hero worker-profile-hero">' +
      '<div class="profile-avatar-wrap">' +
      UI.profileAvatar(user, 'profile-avatar') +
      '<label class="avatar-upload" for="workerAvatarInput" title="Upload profile picture">' +
      UI.ICONS.plus +
      '<input id="workerAvatarInput" type="file" accept="image/png,image/jpeg,image/webp"></label></div>' +
      '<div class="profile-identity"><span class="profile-kicker">Worker profile</span><h2>' +
      UI.esc(user.name || 'Your profile') +
      '</h2><p>Your profile is the first signal residents see when choosing a skilled worker.</p><div class="profile-meta"><span>' +
      UI.esc(user.skillCategory || 'Skill category not set') +
      '</span><span>' +
      UI.esc(user.barangay || 'Barangay not set') +
      '</span></div></div>' +
      '<div class="profile-quick-link">' +
      (facebookUrl
        ? '<a href="' +
          UI.esc(facebookUrl) +
          '" target="_blank" rel="noopener noreferrer"><span class="facebook-mark">f</span><span><b>Facebook</b><small>Open profile</small></span><span class="link-arrow">&#8599;</span></a>'
        : '<span class="profile-quick-empty"><span class="facebook-mark">f</span><span><b>Facebook</b><small>Add your profile link below</small></span></span>') +
      '</div></div><div class="grid-2">' +
      '<div class="panel"><div class="panel-head"><div><h3>Availability</h3><div class="sub">Residents only see you as bookable when you\'re Available.</div></div></div>' +
      '<div class="panel-body"><div class="avail-switcher">' +
      switcherHtml +
      '</div></div></div>' +
      '<div class="panel"><div class="panel-head"><h3>Verification status</h3></div><div class="panel-body">' +
      '<span class="badge ' +
      (user.verified ? 'verified' : 'unverified') +
      '">' +
      (user.verified ? 'Verified' : 'Pending verification') +
      '</span>' +
      '<p style="font-size:13.5px;color:var(--ink-soft);margin-top:12px;">' +
      (user.verified
        ? "You're listed in the public directory."
        : 'Visit the barangay/PESO desk with a valid ID to get verified.') +
      '</p>' +
      '</div></div>' +
      '</div>' +
      '<div class="panel" style="margin-top:22px;"><div class="panel-head"><h3>Your profile</h3><div class="sub">Shown to residents browsing the directory.</div></div>' +
      '<div class="panel-body"><form id="profileForm" class="form-grid">' +
      '<div class="field"><label>Full name</label><input name="name" value="' +
      UI.esc(user.name) +
      '" disabled></div>' +
      '<div class="field"><label>Skill category</label><input value="' +
      UI.esc(user.skillCategory) +
      '" disabled></div>' +
      '<div class="field"><label>Barangay</label><input value="' +
      UI.esc(user.barangay) +
      '" disabled></div>' +
      '<div class="field"><label>Contact number</label><input name="phone" value="' +
      UI.esc(user.phone || '') +
      '"></div>' +
      '<div class="field"><label>Facebook profile URL</label><input type="url" name="facebookUrl" value="' +
      UI.esc(user.facebookUrl || '') +
      '" placeholder="https://facebook.com/your-name">' +
      (facebookUrl
        ? '<a class="profile-social-link" href="' +
          UI.esc(facebookUrl) +
          '" target="_blank" rel="noopener noreferrer">Open Facebook profile</a>'
        : '') +
      '</div>' +
      '<div class="field full"><label>Bio (shown to residents)</label><textarea name="bio">' +
      UI.esc(user.bio || '') +
      '</textarea></div>' +
      '<div class="field full"><button class="btn btn-primary" type="submit">Save profile</button></div>' +
      '</form></div></div></section>'

    document.getElementById('workerAvatarInput').addEventListener('change', function (event) {
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

    UI.content()
      .querySelectorAll('[data-val]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          var val = btn.getAttribute('data-val')
          DB.updateUser(user.id, { availability: val })
          user.availability = val
          UI.toast('Availability set to ' + val + '.')
          renderProfile()
        })
      })
    document.getElementById('profileForm').addEventListener('submit', function (e) {
      e.preventDefault()
      var data = Object.fromEntries(new FormData(e.target).entries())
      var saved = DB.updateProfile({
        phone: data.phone,
        bio: data.bio,
        facebookUrl: data.facebookUrl,
      })
      if (saved) Object.assign(user, saved)
      UI.toast('Profile updated.')
      renderProfile()
    })
  }
})()
