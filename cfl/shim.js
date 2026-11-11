/* stands in for the chrome extension APIs: saves to this browser and to your Away Message account */
(function () {
  const LK = 'am.cfl';
  let mem = { local: {}, sync: {} };
  try { const v = JSON.parse(localStorage.getItem(LK) || 'null'); if (v && v.local && v.sync) mem = v; } catch (e) {}
  const sb = () => { try { return window.parent && window.parent.DSB && window.parent.DSB(); } catch (e) { return null; } };
  let uid = null;
  const ready = (async () => {
    const c = sb(); if (!c) return;
    try {
      const { data: s } = await c.auth.getSession(); uid = s && s.session && s.session.user.id; if (!uid) return;
      const { data } = await c.from('cfl_journal').select('data,updated_at').eq('owner', uid).maybeSingle();
      if (data && data.data && data.data.sync) {
        const cloud = data.data, localT = Number(localStorage.getItem(LK + '.t') || 0), cloudT = Date.parse(data.updated_at) || 0;
        if (cloudT >= localT || !Object.keys(mem.sync).length) mem = { local: Object.assign({}, mem.local, cloud.local || {}), sync: Object.assign({}, cloud.sync) };
      } else if (Object.keys(mem.sync).length) push();
    } catch (e) {}
  })();
  let pt = null;
  function save() { try { localStorage.setItem(LK, JSON.stringify(mem)); localStorage.setItem(LK + '.t', String(Date.now())); } catch (e) {} clearTimeout(pt); pt = setTimeout(push, 800); }
  async function push() { const c = sb(); if (!c || !uid) return; try { await c.from('cfl_journal').upsert({ owner: uid, data: mem, updated_at: new Date().toISOString() }); } catch (e) {} }
  function area(name) {
    return {
      get(keys, cb) { ready.then(() => { const a = mem[name], out = {}; if (keys == null) Object.assign(out, a); else if (typeof keys === 'string') { if (keys in a) out[keys] = a[keys]; } else if (Array.isArray(keys)) keys.forEach(k => { if (k in a) out[k] = a[k]; }); else Object.keys(keys).forEach(k => { out[k] = k in a ? a[k] : keys[k]; }); cb && cb(JSON.parse(JSON.stringify(out))); }); },
      set(obj, cb) { ready.then(() => { Object.assign(mem[name], JSON.parse(JSON.stringify(obj))); save(); cb && cb(); }); },
      remove(keys, cb) { ready.then(() => { [].concat(keys).forEach(k => delete mem[name][k]); save(); cb && cb(); }); },
      clear(cb) { ready.then(() => { mem[name] = {}; save(); cb && cb(); }); }
    };
  }
  window.chrome = window.chrome || {};
  window.chrome.storage = { local: area('local'), sync: area('sync') };
  window.chrome.downloads = { download(o) { const a = document.createElement('a'); a.href = o.url; a.download = o.filename || 'coffeelings.txt'; document.body.append(a); a.click(); a.remove(); } };
})();
