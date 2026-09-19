/* ==========================================================================
   Who built it — interactions (vanilla JS, no libraries, works offline)
   1. curtain counter   2. split headline + weight that follows the cursor
   3. photo trail       4. words that light up on scroll
   5. pinned horizontal bench   6. clip reveals   7. cursor label   8. magnets
   ========================================================================== */
;(function () {
  'use strict'

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  var body = document.body
  function $(s, r) {
    return (r || document).querySelector(s)
  }
  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s))
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v))
  }

  /* ------------------------------------------------ 1. curtain */
  var curtain = $('#curtain')
  var seen = false
  try {
    seen = sessionStorage.getItem('sc_builder_seen') === '1'
  } catch (e) {
    /* private mode */
  }

  function reveal() {
    body.classList.remove('is-loading')
    body.classList.add('is-ready')
    try {
      sessionStorage.setItem('sc_builder_seen', '1')
    } catch (e) {
      /* ignore */
    }
  }
  if (reduce || seen) {
    curtain.classList.add('is-done')
    reveal()
  } else {
    var num = $('#curtainNum'),
      bar = $('#curtainBar'),
      t0 = performance.now(),
      dur = 1300
    ;(function tick(now) {
      var p = clamp((now - t0) / dur, 0, 1)
      var e = 1 - Math.pow(1 - p, 3)
      num.textContent = Math.round(e * 100)
      bar.style.width = e * 100 + '%'
      if (p < 1) requestAnimationFrame(tick)
      else
        setTimeout(function () {
          curtain.classList.add('is-done')
          reveal()
        }, 180)
    })(t0)
  }

  /* ------------------------------------------------ 2. split headline */
  var chars = []
  $$('[data-split]').forEach(function (line) {
    var text = line.textContent
    line.textContent = ''
    Array.prototype.forEach.call(text, function (c, i) {
      var s = document.createElement('span')
      s.className = 'ch'
      s.style.setProperty('--i', chars.length)
      s.textContent = c
      line.appendChild(s)
      chars.push(s)
    })
  })

  var hero = $('#top')
  var mouse = { x: -9999, y: -9999, on: false }

  function weightLoop() {
    if (mouse.on) {
      for (var i = 0; i < chars.length; i++) {
        var r = chars[i].getBoundingClientRect()
        var dx = mouse.x - (r.left + r.width / 2)
        var dy = mouse.y - (r.top + r.height / 2)
        var d = Math.sqrt(dx * dx + dy * dy)
        var w = 300 + 500 * clamp(1 - d / 300, 0, 1)
        chars[i].style.fontVariationSettings = '"wght" ' + Math.round(w)
      }
    }
    requestAnimationFrame(weightLoop)
  }
  if (!reduce && fine) requestAnimationFrame(weightLoop)

  /* ------------------------------------------------ 3. photo trail */
  var trail = $('#trail')
  var SRC = [
    'toolbox-rusty',
    'bench-flatlay',
    'tools-mono',
    'hardhat-worker',
    'hero-welder',
    'worker-grinder',
    'workshop',
    'builder-dyarbe-03',
  ]
  var srcIndex = 0,
    last = { x: null, y: null },
    alive = []

  function drop(x, y) {
    var img = document.createElement('img')
    img.src = 'assets/img/' + SRC[srcIndex++ % SRC.length] + '.jpg'
    img.alt = ''
    var rot = (Math.random() - 0.5) * 22
    var w = img.style
    trail.appendChild(img)
    var box = trail.getBoundingClientRect()
    var iw = 170
    w.left = x - box.left - iw / 2 + 'px'
    w.top = y - box.top - iw * 0.66 + 'px'
    var anim = img.animate(
      [
        {
          transform: 'scale(.55) rotate(' + (rot - 8) + 'deg)',
          opacity: 0,
          clipPath: 'inset(0 0 100% 0)',
        },
        {
          transform: 'scale(1) rotate(' + rot + 'deg)',
          opacity: 1,
          clipPath: 'inset(0 0 0 0)',
          offset: 0.18,
        },
        { transform: 'scale(1) rotate(' + rot + 'deg)', opacity: 1, offset: 0.7 },
        { transform: 'scale(.92) rotate(' + (rot + 4) + 'deg) translateY(20px)', opacity: 0 },
      ],
      { duration: 1500, easing: 'cubic-bezier(.2,.8,.2,1)' },
    )
    alive.push(img)
    if (alive.length > 16) {
      var old = alive.shift()
      old.remove()
    }
    anim.onfinish = function () {
      img.remove()
      alive = alive.filter(function (n) {
        return n !== img
      })
    }
  }

  if (reduce) {
    // Static collage instead of motion.
    ;[
      [8, 14],
      [58, 8],
      [76, 44],
      [30, 58],
      [12, 50],
    ].forEach(function (p, i) {
      var img = document.createElement('img')
      img.src = 'assets/img/' + SRC[i] + '.jpg'
      img.alt = ''
      img.style.left = p[0] + '%'
      img.style.top = p[1] + '%'
      img.style.transform = 'rotate(' + (i % 2 ? 1 : -1) * (3 + i) + 'deg)'
      trail.appendChild(img)
    })
  } else {
    hero.addEventListener('pointermove', function (e) {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.on = e.pointerType === 'mouse'
      if (last.x === null) {
        last.x = e.clientX
        last.y = e.clientY
      }
      var d = Math.hypot(e.clientX - last.x, e.clientY - last.y)
      if (d > 110) {
        drop(e.clientX, e.clientY)
        last.x = e.clientX
        last.y = e.clientY
      }
    })
    hero.addEventListener('pointerleave', function () {
      mouse.on = false
      last.x = null
    })
    hero.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') drop(e.clientX, e.clientY)
    })
    // On touch screens, drop a few photos on load so the bench is not empty.
    if (!fine) {
      setTimeout(function () {
        ;[
          [0.22, 0.3],
          [0.7, 0.25],
          [0.5, 0.62],
        ].forEach(function (p, i) {
          setTimeout(function () {
            drop(innerWidth * p[0], innerHeight * p[1])
          }, i * 420)
        })
      }, 1800)
    }
  }

  /* ------------------------------------------------ 4. manifesto words */
  var mText = $('#manifestoText')
  var words = []
  ;(function () {
    var hot = { karaoke: 1, washing: 1, 'barangay:': 1, repair: 1, 'repair.': 1 }
    var parts = mText.textContent.split(' ')
    mText.textContent = ''
    parts.forEach(function (p, i) {
      var s = document.createElement('span')
      s.className = 'w' + (hot[p.toLowerCase()] ? ' is-hat' : '')
      s.textContent = p
      mText.appendChild(s)
      if (i < parts.length - 1) mText.appendChild(document.createTextNode(' '))
      words.push(s)
    })
  })()

  /* ------------------------------------------------ 5. bench pin */
  var bench = $('#bench'),
    track = $('#benchTrack'),
    benchBar = $('#benchBar')
  var pinned = false,
    travel = 0

  function measure() {
    pinned = !reduce && innerWidth > 800
    if (!pinned) {
      bench.style.removeProperty('--bench-h')
      track.style.transform = ''
      return
    }
    travel = Math.max(0, track.scrollWidth - innerWidth + 0)
    bench.style.setProperty('--bench-h', innerHeight + travel + 'px')
  }

  /* ------------------------------------------------ scroll loop */
  var ticking = false
  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(function () {
      ticking = false
      var vh = innerHeight
      // manifesto: light words by how far the paragraph has travelled through the viewport
      if (!reduce) {
        var mr = mText.getBoundingClientRect()
        var p = clamp((vh * 0.85 - mr.top) / (mr.height + vh * 0.25), 0, 1)
        var lit = Math.round(p * words.length)
        for (var i = 0; i < words.length; i++) words[i].classList.toggle('is-lit', i < lit)
      }
      // bench: vertical scroll → horizontal travel
      if (pinned) {
        var br = bench.getBoundingClientRect()
        var bp = clamp(-br.top / Math.max(1, br.height - vh), 0, 1)
        track.style.transform = 'translate3d(' + (-bp * travel).toFixed(1) + 'px,0,0)'
        benchBar.style.transform = 'scaleX(' + bp.toFixed(3) + ')'
      }
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', function () {
    measure()
    onScroll()
  })
  window.addEventListener('load', function () {
    measure()
    onScroll()
  })
  measure()
  onScroll()

  /* ------------------------------------------------ 6. clip reveals */
  var personSection = $('.person')
  if (personSection && 'IntersectionObserver' in window) {
    var personObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return
          personSection.classList.add('is-in')
          personObserver.unobserve(personSection)
        })
      },
      { threshold: 0.25 },
    )
    personObserver.observe(personSection)
  } else if (personSection) {
    personSection.classList.add('is-in')
  }

  var clips = $$('[data-reveal-clip]')
  if ('IntersectionObserver' in window && !reduce) {
    // Watch the parent: an element that is fully clipped away is never reported as visible.
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return
          $$('[data-reveal-clip]', en.target).forEach(function (c) {
            c.classList.add('is-in')
          })
          io.unobserve(en.target)
        })
      },
      { threshold: 0.2 },
    )
    var watched = []
    clips.forEach(function (c) {
      if (watched.indexOf(c.parentElement) < 0) {
        watched.push(c.parentElement)
        io.observe(c.parentElement)
      }
    })
  } else {
    clips.forEach(function (c) {
      c.classList.add('is-in')
    })
  }

  /* ------------------------------------------------ marquee needs a twin */
  var inside = $('#insideTrack')
  inside.innerHTML += inside.innerHTML

  /* ------------------------------------------------ 7. cursor label */
  $$('[data-binary-name]').forEach(function (name) {
    var text = name.getAttribute('data-binary-name') || name.textContent
    var binary = '01001010011000010111001001100010'
    function showBinary() {
      name.innerHTML =
        '<span class="binary-stream">' +
        Array.from(binary)
          .map(function (character, index) {
            return (
              '<span class="binary-char" style="--wave-index:' +
              index +
              '">' +
              character +
              '</span>'
            )
          })
          .join('') +
        '</span>'
      name.classList.add('is-binary')
    }
    function showName() {
      name.textContent = text
      name.classList.remove('is-binary')
    }
    name.addEventListener('pointerenter', showBinary)
    name.addEventListener('pointerleave', showName)
    name.addEventListener('focus', showBinary)
    name.addEventListener('blur', showName)
  })

  var cursor = $('#cursor'),
    label = $('#cursorLabel')
  if (fine && !reduce) {
    document.documentElement.classList.add('has-cursor')
    var cx = 0,
      cy = 0,
      tx = 0,
      ty = 0
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX
      ty = e.clientY
      cursor.classList.add('is-on')
    })
    document.addEventListener('pointerleave', function () {
      cursor.classList.remove('is-on')
    })
    ;(function follow() {
      cx += (tx - cx) * 0.22
      cy += (ty - cy) * 0.22
      cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'
      requestAnimationFrame(follow)
    })()
    $$('[data-cursor]').forEach(function (el) {
      el.addEventListener('pointerenter', function () {
        label.textContent = el.getAttribute('data-cursor')
        cursor.classList.add('is-big')
      })
      el.addEventListener('pointerleave', function () {
        cursor.classList.remove('is-big')
      })
    })
  }

  /* ------------------------------------------------ 8. magnets */
  if (fine && !reduce) {
    $$('[data-magnet]').forEach(function (m) {
      var inner = m.firstElementChild
      m.addEventListener('pointermove', function (e) {
        var r = m.getBoundingClientRect()
        var dx = e.clientX - (r.left + r.width / 2),
          dy = e.clientY - (r.top + r.height / 2)
        m.style.transform = 'translate(' + dx * 0.28 + 'px,' + dy * 0.28 + 'px)'
        inner.style.transform = 'translate(' + dx * 0.12 + 'px,' + dy * 0.12 + 'px)'
      })
      m.addEventListener('pointerleave', function () {
        m.style.transform = ''
        inner.style.transform = ''
      })
    })
  }
})()
