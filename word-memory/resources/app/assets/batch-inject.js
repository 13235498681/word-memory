/**
 * batch-inject.js — 为单词记忆软件添加：
 *   词表管理（多词表切换） + 批量导入（粘贴） + 批量删除（含全选）
 * 在 React 渲染后注入，通过 localStorage 与 Zustand store 交互
 */

(function () {
  'use strict';

  /* ==================== 常量 ==================== */
  const STORAGE_KEY = 'word\u8BB0\u5FC6-words';       //  Zustand 使用的 key
  const LISTS_META_KEY = 'word\u8BB0\u5FC6-lists-meta'; // 词表元数据
  const LIST_PREFIX = 'word\u8BB0\u5FC6-list-';        // 词表数据前缀
  const GROUPS_KEY = 'word\u8BB0\u5FC6-groups';        // 分组数据

  const CSS = {
    container:
      'background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:16px;',
    bar:
      'display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:12px 16px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px;',
    btn: [
      'display:inline-flex; align-items:center; justify-content:center; gap:6px;',
      'padding:8px 16px; border-radius:8px; border:none;',
      'font-size:14px; font-weight:500; cursor:pointer;',
      'transition:all 0.2s ease;',
    ].join(' '),
    btnSmall:
      'padding:4px 12px; font-size:13px;',
    btnPrimary:
      'background:#10b981; color:white; box-shadow:0 4px 6px rgba(16,185,129,0.2);',
    btnDanger:
      'background:#ef4444; color:white; box-shadow:0 4px 6px rgba(239,68,68,0.2);',
    btnOutline:
      'background:transparent; color:rgba(255,255,255,0.8); border:1px solid rgba(255,255,255,0.2);',
    textarea:
      'width:100%; min-height:120px; padding:12px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:white; font-size:14px; line-height:1.6; resize:vertical; outline:none; box-sizing:border-box;',
    sectionTitle:
      'font-size:15px; font-weight:600; color:white; margin-bottom:12px;',
    checkbox:
      'width:18px; height:18px; accent-color:#10b981; cursor:pointer; flex-shrink:0;',
    dropdown:
      'position:absolute; top:100%; left:0; right:0; margin-top:4px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:4px; z-index:999; max-height:240px; overflow-y:auto; box-shadow:0 8px 24px rgba(0,0,0,0.4);',
    dropdownItem:
      'display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:14px; color:rgba(255,255,255,0.8); transition:background 0.15s;',
  };

  /* ==================== 词表元数据 ==================== */
  const DEFAULT_LIST_ID = 'default';

  function getListsMeta() {
    try {
      const raw = localStorage.getItem(LISTS_META_KEY);
      if (!raw) return { lists: [], activeListId: DEFAULT_LIST_ID };
      return JSON.parse(raw);
    } catch {
      return { lists: [], activeListId: DEFAULT_LIST_ID };
    }
  }

  function saveListsMeta(meta) {
    localStorage.setItem(LISTS_META_KEY, JSON.stringify(meta));
  }

  function getActiveListId() {
    return getListsMeta().activeListId || DEFAULT_LIST_ID;
  }

  function getActiveListName() {
    const meta = getListsMeta();
    const list = meta.lists.find(function (l) { return l.id === meta.activeListId; });
    return list ? list.name : '\u672A\u547D\u540D\u8BCD\u8868'; // "未命名词表"
  }

  function getAllLists() {
    return getListsMeta().lists;
  }

  function getListInfo(listId) {
    const meta = getListsMeta();
    return meta.lists.find(function (l) { return l.id === listId; }) || null;
  }

  /* ==================== 分组数据 ==================== */
  function getGroupsStore() {
    try {
      var raw = localStorage.getItem(GROUPS_KEY);
      if (!raw) return { groups: [] };
      return JSON.parse(raw);
    } catch {
      return { groups: [] };
    }
  }

  function saveGroupsStore(store) {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(store));
  }

  function getAllGroups() {
    return getGroupsStore().groups;
  }

  function getGroupInfo(groupId) {
    var groups = getAllGroups();
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === groupId) return groups[i];
    }
    return null;
  }

  function createGroup(name) {
    name = name.trim();
    if (!name) return null;
    var store = getGroupsStore();
    // 检查重名
    for (var i = 0; i < store.groups.length; i++) {
      if (store.groups[i].name === name) return null;
    }
    var id = 'group_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    store.groups.push({ id: id, name: name, createdAt: Date.now() });
    saveGroupsStore(store);
    return id;
  }

  function renameGroup(groupId, newName) {
    newName = newName.trim();
    if (!newName) return false;
    var store = getGroupsStore();
    var group = null;
    for (var i = 0; i < store.groups.length; i++) {
      if (store.groups[i].id === groupId) { group = store.groups[i]; break; }
    }
    if (!group) return false;
    // 检查重名
    for (var i = 0; i < store.groups.length; i++) {
      if (store.groups[i].name === newName && store.groups[i].id !== groupId) return false;
    }
    group.name = newName;
    saveGroupsStore(store);
    return true;
  }

  function deleteGroup(groupId) {
    var store = getGroupsStore();
    var newGroups = [];
    var found = false;
    for (var i = 0; i < store.groups.length; i++) {
      if (store.groups[i].id === groupId) { found = true; }
      else { newGroups.push(store.groups[i]); }
    }
    if (!found) return false;
    store.groups = newGroups;
    saveGroupsStore(store);
    // 将该分组下所有词表的 groupId 置为 null
    var meta = getListsMeta();
    for (var i = 0; i < meta.lists.length; i++) {
      if (meta.lists[i].groupId === groupId) {
        meta.lists[i].groupId = null;
      }
    }
    saveListsMeta(meta);
    return true;
  }

  function assignListToGroup(listId, groupId) {
    var meta = getListsMeta();
    for (var i = 0; i < meta.lists.length; i++) {
      if (meta.lists[i].id === listId) {
        meta.lists[i].groupId = groupId || null;
        saveListsMeta(meta);
        return true;
      }
    }
    return false;
  }

  function getGroupsWithLists() {
    var groups = getAllGroups();
    var allLists = getAllLists();
    // 构建分组映射
    var result = [];
    var unassignedLists = [];

    for (var i = 0; i < groups.length; i++) {
      result.push({
        id: groups[i].id,
        name: groups[i].name,
        createdAt: groups[i].createdAt,
        lists: []
      });
    }

    for (var i = 0; i < allLists.length; i++) {
      var list = allLists[i];
      var hasGroup = false;
      for (var j = 0; j < result.length; j++) {
        if (list.groupId === result[j].id) {
          result[j].lists.push(list);
          hasGroup = true;
          break;
        }
      }
      if (!hasGroup) {
        unassignedLists.push(list);
      }
    }

    return { groups: result, unassigned: unassignedLists };
  }

  /* ==================== 词表数据 ==================== */
  function listStorageKey(listId) {
    return LIST_PREFIX + listId;
  }

  function getListStore(listId) {
    try {
      const raw = localStorage.getItem(listStorageKey(listId));
      if (!raw) return { state: { words: [] }, version: 0 };
      return JSON.parse(raw);
    } catch {
      return { state: { words: [] }, version: 0 };
    }
  }

  function saveListStore(listId, store) {
    localStorage.setItem(listStorageKey(listId), JSON.stringify(store));
  }

  function getListWords(listId) {
    return getListStore(listId).state.words || [];
  }

  function setListWords(listId, words) {
    const store = getListStore(listId);
    store.state.words = words;
    saveListStore(listId, store);
  }

  /* ==================== Zustand store 操作 ==================== */
  function getStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { state: { words: [] }, version: 0 };
      return JSON.parse(raw);
    } catch {
      return { state: { words: [] }, version: 0 };
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function getWords() {
    return getStore().state.words || [];
  }

  function setWords(words) {
    const store = getStore();
    store.state.words = words;
    saveStore(store);
  }

  /* ==================== 同步工具 ==================== */
  // 将 Zustand store 的单词同步回当前词表
  function syncCurrentToList() {
    const activeId = getActiveListId();
    const words = getWords();
    const store = getListStore(activeId);
    store.state.words = words;
    saveListStore(activeId, store);
  }

  // 加载指定词表的单词到 Zustand store
  function loadListIntoStore(listId) {
    const words = getListWords(listId);
    const store = getStore();
    store.state.words = words;
    saveStore(store);
  }

  // 确保默认词表存在（首次使用）
  function ensureDefaultList() {
    const meta = getListsMeta();
    if (!meta.lists.find(function (l) { return l.id === DEFAULT_LIST_ID; })) {
      // 把现有单词迁移到默认词表
      const existingWords = getWords();
      meta.lists.unshift({
        id: DEFAULT_LIST_ID,
        name: '\u9ED8\u8BA4\u8BCD\u8868', // "默认词表"
        createdAt: Date.now(),
      });
      meta.activeListId = DEFAULT_LIST_ID;
      saveListsMeta(meta);
      // 如果已有单词，保存到默认词表
      if (existingWords.length > 0) {
        setListWords(DEFAULT_LIST_ID, existingWords);
      }
    }
    // 保证 activeListId 有效
    if (!meta.lists.find(function (l) { return l.id === meta.activeListId; })) {
      meta.activeListId = meta.lists[0] ? meta.lists[0].id : DEFAULT_LIST_ID;
      saveListsMeta(meta);
    }
    // 确保 Zustand store 与活跃词表一致
    loadListIntoStore(meta.activeListId);
  }

  /* ==================== 词表增删改 ==================== */
  function createList(name, groupId) {
    name = name.trim();
    if (!name) return null;
    const meta = getListsMeta();
    const id = 'list_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    // 检查重名
    if (meta.lists.find(function (l) { return l.name === name; })) {
      return null; // 同名已存在
    }
    meta.lists.push({ id: id, name: name, createdAt: Date.now(), groupId: groupId || null });
    saveListsMeta(meta);
    // 初始化空词表
    setListWords(id, []);
    return id;
  }

  function renameList(listId, newName) {
    newName = newName.trim();
    if (!newName) return false;
    const meta = getListsMeta();
    const list = meta.lists.find(function (l) { return l.id === listId; });
    if (!list) return false;
    if (meta.lists.find(function (l) { return l.name === newName && l.id !== listId; })) {
      return false; // 同名
    }
    list.name = newName;
    saveListsMeta(meta);
    return true;
  }

  function deleteList(listId) {
    if (listId === DEFAULT_LIST_ID) return false; // 不能删默认词表
    const meta = getListsMeta();
    const idx = meta.lists.findIndex(function (l) { return l.id === listId; });
    if (idx === -1) return false;
    meta.lists.splice(idx, 1);
    // 如果删除的是当前词表，切换到第一个
    if (meta.activeListId === listId) {
      meta.activeListId = meta.lists.length > 0 ? meta.lists[0].id : DEFAULT_LIST_ID;
    }
    saveListsMeta(meta);
    // 删除数据
    localStorage.removeItem(listStorageKey(listId));
    return true;
  }

  function switchToList(listId) {
    const meta = getListsMeta();
    if (!meta.lists.find(function (l) { return l.id === listId; })) return false;
    // 先保存当前词表
    syncCurrentToList();
    // 切换
    meta.activeListId = listId;
    saveListsMeta(meta);
    // 加载新词表
    loadListIntoStore(listId);
    return true;
  }

  /* ==================== 添加/删除单词（自动同步词表） ==================== */
  function addWords(newWords) {
    const words = getWords();
    const existingSet = new Set(words.map(function (w) { return w.english.toLowerCase(); }));
    const added = [];
    const skipped = [];
    for (var i = 0; i < newWords.length; i++) {
      var w = newWords[i];
      var key = w.english.trim().toLowerCase();
      if (!key) continue;
      if (existingSet.has(key)) {
        skipped.push(w.english);
      } else {
        words.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          english: w.english.trim(),
          chinese: w.chinese.trim(),
        });
        existingSet.add(key);
        added.push(w.english);
      }
    }
    setWords(words);
    syncCurrentToList(); // 同步回当前词表
    return { added: added, skipped: skipped, total: words.length };
  }

  function removeWordByIds(ids) {
    var words = getWords().filter(function (w) { return ids.indexOf(w.id) === -1; });
    setWords(words);
    syncCurrentToList(); // 同步回当前词表
  }

  /* ==================== 词条解析 ==================== */
  function parseWordsFromText(text) {
    var lines = text.split('\n');
    var result = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;

      var english = '';
      var chinese = '';

      // 1) "word - meaning"
      var m = line.match(/^(.+?)\s*[-\u2013\u2014]\s*(.+)$/);
      if (m) { english = m[1].trim(); chinese = m[2].trim(); }

      // 2) "word,meaning" / "word\tmeaning"
      if (!english) {
        m = line.match(/^([^,\t]+)[,\t]\s*(.+)$/);
        if (m) { english = m[1].trim(); chinese = m[2].trim(); }
      }

      // 3) 按空格分割，找第一个中文位置
      if (!english) {
        var cnIdx = line.search(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/);
        if (cnIdx > 0) {
          english = line.slice(0, cnIdx).trim();
          chinese = line.slice(cnIdx).trim();
        }
      }

      if (english && chinese) {
        result.push({ english: english, chinese: chinese });
      }
    }
    return result;
  }

  /* ==================== 结构化导入解析 ==================== */
  // 解析带分组/词表标记的批量导入文本
  // 格式：[分组名]  ********  {词表名}  #####  word - meaning
  // 返回 [{groupName, lists: [{listName, words: [{english,chinese}]}]}]
  function parseStructuredImport(text) {
    var lines = text.split('\n');
    var result = [];
    var currentSection = null;  // { groupName: null|string, lists: [...] }
    var currentList = null;     // { listName: string, words: [...] }
    var inList = false;         // 是否正在往当前词表收集单词（{xxx}后立即为true）
    var plainWords = [];        // 无标记的普通单词（向后兼容）

    function flushList() {
      if (currentList && currentList.words.length > 0) {
        if (!currentSection) {
          currentSection = { groupName: null, lists: [] };
          result.push(currentSection);
        }
        currentSection.lists.push(currentList);
      }
      currentList = null;
      inList = false;
    }

    function flushSection() {
      flushList();
      currentSection = null;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      // 检测分组名 [xxx]
      var groupMatch = line.match(/^\[(.+)\]$/);
      if (groupMatch) {
        flushSection();
        currentSection = { groupName: groupMatch[1].trim(), lists: [] };
        result.push(currentSection);
        currentList = null;
        inList = false;
        continue;
      }

      // 检测分组分隔 ******** (8个以上*)
      if (/^\*{8,}$/.test(line)) {
        flushSection();
        continue;
      }

      // 检测词表名 {xxx}  → 立即开始收集单词
      var listMatch = line.match(/^\{(.+)\}$/);
      if (listMatch) {
        flushList();
        currentList = { listName: listMatch[1].trim(), words: [] };
        inList = true; // {词表名} 后立即开始收集
        continue;
      }

      // 检测词表分隔 ##### (5个以上#) → 结束当前词表的单词收集
      var hashOnly = /^#{5,}$/.test(line);
      if (hashOnly) {
        inList = false; // 停止收集，等待下一个 {词表名}
        continue;
      }

      // 跳过注释行（纯 # 开头但不是 #####）
      if (line.startsWith('//')) continue;
      if (line.startsWith('#') && !hashOnly) {
        // 只跳过纯注释行，比如 "# 这是注释"
        // 但如果行中包含有意义内容+末尾#####，则继续处理
        if (!/#{5,}$/.test(line)) continue;
      }

      // 处理行末 #####  → 剥离后当作单词行处理，然后停止收集
      var endHash = line.match(/^(.*?)#{5,}$/);
      var stopAfter = false;
      if (endHash) {
        line = endHash[1].trim();
        stopAfter = true;
        if (!line) { inList = false; continue; } // 纯 ##### 已在上面处理，此处是 "word#####" 去掉#####后为空的情况
      }

      // 解析单词行
      var english = '';
      var chinese = '';

      // 1) "word - meaning"
      var m = line.match(/^(.+?)\s*[-\u2013\u2014]\s*(.+)$/);
      if (m) { english = m[1].trim(); chinese = m[2].trim(); }

      // 2) "word,meaning" / "word\tmeaning"
      if (!english) {
        m = line.match(/^([^,\t]+)[,\t]\s*(.+)$/);
        if (m) { english = m[1].trim(); chinese = m[2].trim(); }
      }

      // 3) 按空格分割，找第一个中文位置
      if (!english) {
        var cnIdx = line.search(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/);
        if (cnIdx > 0) {
          english = line.slice(0, cnIdx).trim();
          chinese = line.slice(cnIdx).trim();
        }
      }

      if (english && chinese) {
        if (inList && currentList) {
          currentList.words.push({ english: english, chinese: chinese });
        } else {
          plainWords.push({ english: english, chinese: chinese });
        }
      }

      if (stopAfter) {
        inList = false;
      }
    }

    flushSection();

    // 清理空的 sections 和 lists
    result = result.filter(function (s) { return s.lists.length > 0; });

    return { sections: result, plainWords: plainWords };
  }

  // 向指定词表添加单词（不限于当前活跃词表）
  function addWordsToList(listId, newWords) {
    var words = getListWords(listId);
    var existingSet = new Set();
    for (var i = 0; i < words.length; i++) {
      existingSet.add(words[i].english.toLowerCase());
    }
    var added = [];
    var skipped = [];
    for (var i = 0; i < newWords.length; i++) {
      var w = newWords[i];
      var key = w.english.trim().toLowerCase();
      if (!key) continue;
      if (existingSet.has(key)) {
        skipped.push(w.english);
      } else {
        words.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          english: w.english.trim(),
          chinese: w.chinese.trim(),
        });
        existingSet.add(key);
        added.push(w.english);
      }
    }
    setListWords(listId, words);
    return { added: added, skipped: skipped };
  }

  // 执行结构化导入：创建分组、词表，导入单词
  function executeStructuredImport(parsed) {
    var totalAdded = 0;
    var totalSkipped = 0;
    var createdGroups = [];
    var createdLists = [];
    var targetListId = null; // 最后一个创建/使用的词表 ID，用于切换

    for (var si = 0; si < parsed.sections.length; si++) {
      var section = parsed.sections[si];
      var groupId = null;

      // 创建或查找分组
      if (section.groupName) {
        var existingGroups = getAllGroups();
        var foundGroup = null;
        for (var gi = 0; gi < existingGroups.length; gi++) {
          if (existingGroups[gi].name === section.groupName) {
            foundGroup = existingGroups[gi];
            break;
          }
        }
        if (foundGroup) {
          groupId = foundGroup.id;
        } else {
          groupId = createGroup(section.groupName);
          if (groupId) createdGroups.push(section.groupName);
        }
      }

      // 处理该分组下的词表
      for (var li = 0; li < section.lists.length; li++) {
        var listDef = section.lists[li];
        var listName = listDef.listName || ('\u672A\u547D\u540D\u8BCD\u8868_' + (li + 1));
        var existingLists = getAllLists();
        var foundList = null;
        for (var lj = 0; lj < existingLists.length; lj++) {
          if (existingLists[lj].name === listName) {
            foundList = existingLists[lj];
            break;
          }
        }
        var listId;
        if (foundList) {
          listId = foundList.id;
          // 如果指定了分组且词表未分组，则归入该分组
          if (groupId && !foundList.groupId) {
            assignListToGroup(listId, groupId);
          }
        } else {
          listId = createList(listName, groupId);
          if (listId) createdLists.push(listName);
        }

        if (listId && listDef.words.length > 0) {
          var result = addWordsToList(listId, listDef.words);
          totalAdded += result.added.length;
          totalSkipped += result.skipped.length;
          targetListId = listId;
        }
      }
    }

    // 处理普通单词（无结构化标记）→ 导入当前词表
    if (parsed.plainWords.length > 0) {
      var result = addWords(parsed.plainWords);
      totalAdded += result.added.length;
      totalSkipped += result.skipped.length;
    }

    return {
      added: totalAdded,
      skipped: totalSkipped,
      createdGroups: createdGroups,
      createdLists: createdLists,
      targetListId: targetListId
    };
  }

  /* ==================== 结构化导入预览弹窗 ==================== */
  function showStructuredPreview(parsed) {
    if (parsed.sections.length === 0 && parsed.plainWords.length === 0) {
      showToast('\u672A\u89E3\u6790\u51FA\u4EFB\u4F55\u5355\u8BCD\uFF0C\u8BF7\u68C0\u67E5\u683C\u5F0F');
      return;
    }

    var modal = createModal('batch-import-preview');
    modal.title.textContent = '\u6279\u91CF\u5BFC\u5165\u9884\u89C8';

    var totalWords = 0;
    var html = '';

    // 渲染结构化部分
    for (var si = 0; si < parsed.sections.length; si++) {
      var section = parsed.sections[si];
      if (section.groupName) {
        html += '<div style="padding:4px 8px; margin-top:8px; color:#f59e0b; font-weight:600; font-size:13px;">\uD83D\uDCC2 [' + escapeHtml(section.groupName) + ']</div>';
      }
      for (var li = 0; li < section.lists.length; li++) {
        var listDef = section.lists[li];
        var name = listDef.listName || '\u672A\u547D\u540D';
        html += '<div style="padding:2px 12px; color:#34d399; font-weight:500; font-size:13px;">\uD83D\uDCDA ' + escapeHtml(name) + ' (' + listDef.words.length + '\u8BCD)</div>';
        for (var wi = 0; wi < listDef.words.length && wi < 5; wi++) {
          var w = listDef.words[wi];
          html += '<div style="display:flex; justify-content:space-between; padding:3px 16px; border-bottom:1px solid rgba(255,255,255,0.04); font-size:12px;">' +
            '<span style="color:#34d399;">' + escapeHtml(w.english) + '</span>' +
            '<span style="color:rgba(255,255,255,0.6);">' + escapeHtml(w.chinese) + '</span></div>';
        }
        if (listDef.words.length > 5) {
          html += '<div style="padding:2px 16px; color:rgba(255,255,255,0.3); font-size:12px;">... \u8FD8\u6709 ' + (listDef.words.length - 5) + ' \u4E2A\u5355\u8BCD</div>';
        }
        totalWords += listDef.words.length;
      }
    }

    // 渲染普通单词
    if (parsed.plainWords.length > 0) {
      html += '<div style="padding:4px 8px; margin-top:8px; color:rgba(255,255,255,0.5); font-size:13px;">\uD83D\uDCC4 \u5F53\u524D\u8BCD\u8868\uFF08' + parsed.plainWords.length + '\u8BCD\uFF09</div>';
      for (var pwi = 0; pwi < parsed.plainWords.length && pwi < 5; pwi++) {
        var pw = parsed.plainWords[pwi];
        html += '<div style="display:flex; justify-content:space-between; padding:3px 16px; border-bottom:1px solid rgba(255,255,255,0.04); font-size:12px;">' +
          '<span style="color:#34d399;">' + escapeHtml(pw.english) + '</span>' +
          '<span style="color:rgba(255,255,255,0.6);">' + escapeHtml(pw.chinese) + '</span></div>';
      }
      if (parsed.plainWords.length > 5) {
        html += '<div style="padding:2px 16px; color:rgba(255,255,255,0.3); font-size:12px;">... \u8FD8\u6709 ' + (parsed.plainWords.length - 5) + ' \u4E2A\u5355\u8BCD</div>';
      }
      totalWords += parsed.plainWords.length;
    }

    var previewDiv = document.createElement('div');
    previewDiv.style.cssText = 'max-height:350px; overflow-y:auto; margin-bottom:12px; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px; background:rgba(0,0,0,0.15);';
    previewDiv.innerHTML = html;

    var countLabel = document.createElement('p');
    countLabel.style.cssText = 'color:rgba(255,255,255,0.6); font-size:13px; margin:0 0 4px;';
    countLabel.textContent = '\u5171\u89E3\u6790\u51FA ' + totalWords + ' \u4E2A\u5355\u8BCD\uFF0C' + parsed.sections.length + ' \u4E2A\u5206\u7EC4';
    modal.body.appendChild(countLabel);
    modal.body.appendChild(previewDiv);

    var confirmBtn = createButton('\u786E\u5B9A\u5BFC\u5165', CSS.btnPrimary + CSS.btnSmall, function () {
      var result = executeStructuredImport(parsed);
      modal.overlay.remove();
      var parts = ['\u6210\u529F\u5BFC\u5165 ' + result.added + ' \u4E2A\u5355\u8BCD'];
      if (result.skipped > 0) parts.push(result.skipped + ' \u4E2A\u91CD\u590D\u5DF2\u8DF3\u8FC7');
      if (result.createdGroups.length > 0) parts.push('\u65B0\u5EFA ' + result.createdGroups.length + ' \u4E2A\u5206\u7EC4');
      if (result.createdLists.length > 0) parts.push('\u65B0\u5EFA ' + result.createdLists.length + ' \u4E2A\u8BCD\u8868');
      showToast(parts.join('\uFF0C'));
      // 如果创建了词表，切换到最后一个
      if (result.targetListId) {
        syncCurrentToList();
        switchToList(result.targetListId);
      }
      setTimeout(function () { window.location.reload(); }, 1000);
    });
    var cancelBtn = createButton('\u53D6\u6D88', CSS.btnOutline + CSS.btnSmall, function () {
      modal.overlay.remove();
    });
    modal.footer.appendChild(cancelBtn);
    modal.footer.appendChild(confirmBtn);
    document.body.appendChild(modal.overlay);
  }

  /* ==================== 弹窗组件 ==================== */
  function createModal(id) {
    var overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.cssText = [
      'position:fixed; top:0; left:0; width:100%; height:100%;',
      'background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);',
      'display:flex; align-items:center; justify-content:center;',
      'z-index:99999;',
    ].join(' ');

    var box = document.createElement('div');
    box.style.cssText = [
      'background:#1e293b; border:1px solid rgba(255,255,255,0.1);',
      'border-radius:16px; padding:24px; max-width:520px; width:90%;',
      'max-height:80vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.5);',
    ].join(' ');

    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });

    var header = document.createElement('div');
    header.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;';
    var title = document.createElement('h3');
    title.style.cssText = 'font-size:18px; font-weight:600; color:white; margin:0;';
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '\u00D7';
    closeBtn.style.cssText = 'background:none; border:none; color:rgba(255,255,255,0.5); font-size:24px; cursor:pointer; padding:0 4px; line-height:1;';
    closeBtn.onclick = function () { overlay.remove(); };
    header.appendChild(title);
    header.appendChild(closeBtn);
    box.appendChild(header);

    var body = document.createElement('div');
    body.style.cssText = 'color:rgba(255,255,255,0.85); font-size:14px; line-height:1.6;';
    box.appendChild(body);

    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex; gap:8px; justify-content:flex-end; margin-top:16px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08);';
    box.appendChild(footer);

    return { overlay: overlay, box: box, title: title, body: body, footer: footer, closeBtn: closeBtn };
  }

  function createButton(text, style, onClick) {
    var btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = CSS.btn + style;
    btn.onclick = onClick;
    btn.className = 'batch-inject-btn';
    return btn;
  }

  /* ==================== 导入预览弹窗 ==================== */
  function showImportPreview(parsed) {
    if (parsed.length === 0) {
      showToast('\u672A\u89E3\u6790\u51FA\u4EFB\u4F55\u5355\u8BCD\uFF0C\u8BF7\u68C0\u67E5\u683C\u5F0F');
      return;
    }

    var modal = createModal('batch-import-preview');
    modal.title.textContent = '\u6279\u91CF\u5BFC\u5165\u9884\u89C8';

    var list = document.createElement('div');
    list.style.cssText = 'max-height:300px; overflow-y:auto; margin-bottom:12px;';
    var html = '';
    for (var i = 0; i < parsed.length; i++) {
      var w = parsed[i];
      html += '<div style="display:flex; justify-content:space-between; padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.06);">' +
        '<span style="color:#34d399; font-weight:500;">' + escapeHtml(w.english) + '</span>' +
        '<span style="color:rgba(255,255,255,0.7);">' + escapeHtml(w.chinese) + '</span></div>';
    }
    list.innerHTML = html;

    var countLabel = document.createElement('p');
    countLabel.style.cssText = 'color:rgba(255,255,255,0.6); font-size:13px; margin:0 0 4px;';
    countLabel.textContent = '\u5171\u89E3\u6790\u51FA ' + parsed.length + ' \u4E2A\u5355\u8BCD';
    modal.body.appendChild(countLabel);
    modal.body.appendChild(list);

    var confirmBtn = createButton('\u786E\u5B9A\u5BFC\u5165', CSS.btnPrimary + CSS.btnSmall, function () {
      var result = addWords(parsed);
      modal.overlay.remove();
      var msg = '\u6210\u529F\u5BFC\u5165 ' + result.added.length + ' \u4E2A\u5355\u8BCD' +
        (result.skipped.length > 0 ? '\uFF0C' + result.skipped.length + ' \u4E2A\u91CD\u590D\u5DF2\u8DF3\u8FC7' : '');
      showToast(msg);
      setTimeout(function () { window.location.reload(); }, 800);
    });
    var cancelBtn = createButton('\u53D6\u6D88', CSS.btnOutline + CSS.btnSmall, function () {
      modal.overlay.remove();
    });
    modal.footer.appendChild(cancelBtn);
    modal.footer.appendChild(confirmBtn);
    document.body.appendChild(modal.overlay);
  }

  /* ==================== 粘贴导入 ==================== */
  function showPasteImport() {
    var modal = createModal('batch-paste-import');
    modal.title.textContent = '\u7C98\u8D34\u6279\u91CF\u5BFC\u5165';

    var hint = document.createElement('p');
    hint.style.cssText = 'color:rgba(255,255,255,0.5); font-size:13px; margin:0 0 8px; line-height:1.8;';
    hint.innerHTML = '\u666E\u901A\u683C\u5F0F\uFF1A\u6BCF\u884C\u4E00\u4E2A\u5355\u8BCD\uFF0Capple - \u82F9\u679C \u6216 apple,\u82F9\u679C<br>' +
      '\u7ED3\u6784\u5316\u683C\u5F0F\uFF1A[分组名] \u2605\u2605\u2605\u2605 {\u8BCD\u8868\u540D}\u76F4\u63A5\u63A5\u5355\u8BCD\u884C\uFF0C##### \u5206\u9694\u8BCD\u8868';
    modal.body.appendChild(hint);

    var textarea = document.createElement('textarea');
    textarea.placeholder = '\u793A\u4F8B\uFF1A\n[英语四级]\n{核心词汇}\nabandon - \u653E\u5F03\nability - \u80FD\u529B\n#####\n{高频词汇}\nabsolute - \u7EDD\u5BF9\u7684\n#####\n********';
    textarea.style.cssText = CSS.textarea;
    modal.body.appendChild(textarea);

    var confirmBtn = createButton('\u89E3\u6790\u5E76\u5BFC\u5165', CSS.btnPrimary, function () {
      var parsed = parseStructuredImport(textarea.value);
      modal.overlay.remove();
      // 有结构化标记 → 走结构化预览
      if (parsed.sections.length > 0) {
        showStructuredPreview(parsed);
        return;
      }
      // 无结构化标记但有单词 → 用普通预览
      if (parsed.plainWords.length > 0) {
        showImportPreview(parsed.plainWords);
        return;
      }
      // 兜底：用普通解析再试一次
      var plainParsed = parseWordsFromText(textarea.value);
      if (plainParsed.length === 0) {
        showToast('\u672A\u89E3\u6790\u51FA\u6709\u6548\u5355\u8BCD\uFF0C\u8BF7\u68C0\u67E5\u683C\u5F0F');
        return;
      }
      showImportPreview(plainParsed);
    });
    var cancelBtn = createButton('\u53D6\u6D88', CSS.btnOutline, function () {
      modal.overlay.remove();
    });
    modal.footer.appendChild(cancelBtn);
    modal.footer.appendChild(confirmBtn);
    document.body.appendChild(modal.overlay);
    setTimeout(function () { textarea.focus(); }, 100);
  }

  /* ==================== 批量删除 ==================== */
  var batchDeleteActive = false;

  function toggleBatchDelete() {
    batchDeleteActive = !batchDeleteActive;
    renderBatchDeleteUI();
  }

  function renderBatchDeleteUI() {
    var delBtn = document.getElementById('batch-delete-exec-btn');
    var toggleBtn = document.getElementById('batch-delete-toggle');
    var selectAllLabel = document.getElementById('batch-select-all-label');
    var selectAllCb = document.getElementById('batch-select-all');
    var wordItems = document.querySelectorAll('.batch-delete-cb');

    if (!batchDeleteActive) {
      for (var i = 0; i < wordItems.length; i++) {
        wordItems[i].style.display = 'none';
      }
      if (selectAllLabel) selectAllLabel.style.display = 'none';
      if (delBtn) delBtn.style.display = 'none';
      if (toggleBtn) toggleBtn.textContent = '\u6279\u91CF\u5220\u9664';
      if (selectAllCb) selectAllCb.checked = false;
      return;
    }

    var words = getWords();
    var wordCardContainer = findWordCardContainer();
    if (!wordCardContainer) return;

    var cards = wordCardContainer.querySelectorAll('div.flex.items-center.justify-between');
    for (var i = 0; i < cards.length; i++) {
      if (i >= words.length) break;
      if (cards[i].querySelector('.batch-delete-cb')) continue;

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'batch-delete-cb';
      cb.dataset.wordId = words[i].id;
      cb.style.cssText = CSS.checkbox + ' margin-right:8px;';
      cards[i].insertBefore(cb, cards[i].firstChild);

      cb.addEventListener('change', function () {
        updateBatchDeleteButton();
        syncSelectAll();
      });
    }

    if (selectAllLabel) selectAllLabel.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = 'inline-flex';
    if (toggleBtn) toggleBtn.textContent = '\u5B8C\u6210\u5220\u9664';
  }

  function syncSelectAll() {
    var allCbs = document.querySelectorAll('.batch-delete-cb');
    var checkedCbs = document.querySelectorAll('.batch-delete-cb:checked');
    var selectAllCb = document.getElementById('batch-select-all');
    if (selectAllCb) {
      selectAllCb.checked = allCbs.length > 0 && allCbs.length === checkedCbs.length;
    }
  }

  function updateBatchDeleteButton() {
    var checked = document.querySelectorAll('.batch-delete-cb:checked');
    var btn = document.getElementById('batch-delete-exec-btn');
    if (btn) {
      btn.textContent = '\u5220\u9664\u9009\u4E2D (' + checked.length + ')';
    }
  }

  function executeBatchDelete() {
    var checked = document.querySelectorAll('.batch-delete-cb:checked');
    if (checked.length === 0) {
      showToast('\u8BF7\u9009\u62E9\u8981\u5220\u9664\u7684\u5355\u8BCD');
      return;
    }

    var modal = createModal('batch-delete-confirm');
    modal.title.textContent = '\u786E\u8BA4\u5220\u9664';
    modal.body.innerHTML = '<p>\u786E\u5B9A\u8981\u5220\u9664\u9009\u4E2D\u7684 ' + checked.length + ' \u4E2A\u5355\u8BCD\u5417\uFF1F</p>';

    var confirmBtn = createButton('\u786E\u5B9A\u5220\u9664', CSS.btnDanger + CSS.btnSmall, function () {
      var ids = [];
      for (var i = 0; i < checked.length; i++) {
        ids.push(checked[i].dataset.wordId);
      }
      removeWordByIds(ids);
      modal.overlay.remove();
      showToast('\u5DF2\u5220\u9664 ' + ids.length + ' \u4E2A\u5355\u8BCD');
      setTimeout(function () { window.location.reload(); }, 800);
    });
    var cancelBtn = createButton('\u53D6\u6D88', CSS.btnOutline + CSS.btnSmall, function () {
      modal.overlay.remove();
    });
    modal.footer.appendChild(cancelBtn);
    modal.footer.appendChild(confirmBtn);
    document.body.appendChild(modal.overlay);
  }

  /* ==================== 词表管理 UI ==================== */
  var listDropdownVisible = false;

  function renderWordListSelector(root) {
    var activeName = getActiveListName();
    var lists = getAllLists();

    // --- 词表选择栏 ---
    var bar = document.createElement('div');
    bar.style.cssText = CSS.bar + ' margin-bottom:12px;';

    // 左侧：下拉选择器
    var selectorWrap = document.createElement('div');
    selectorWrap.style.cssText = 'position:relative; flex:1; min-width:140px;';

    var selectorBtn = document.createElement('button');
    selectorBtn.id = 'list-selector-btn';
    selectorBtn.style.cssText = CSS.btn + CSS.btnSmall + CSS.btnOutline +
      ' width:100%; justify-content:space-between; text-align:left;';
    selectorBtn.innerHTML = '\uD83D\uDCDA <span id="list-selector-name">' + escapeHtml(activeName) + '</span> \u25BC';

    var dropdown = document.createElement('div');
    dropdown.id = 'list-selector-dropdown';
    dropdown.style.cssText = CSS.dropdown + ' display:none;';

    function renderDropdown() {
      var activeId = getActiveListId();
      var data = getGroupsWithLists();
      var h = '';

      // 有分组的词表
      for (var gi = 0; gi < data.groups.length; gi++) {
        var group = data.groups[gi];
        var totalWords = 0;
        for (var lj = 0; lj < group.lists.length; lj++) {
          totalWords += getListWords(group.lists[lj].id).length;
        }
        var collapsed = group._collapsed || false;
        h += '<div class="list-group-header" data-group-id="' + group.id + '" style="' +
          'display:flex; align-items:center; gap:6px; padding:6px 10px; cursor:pointer;' +
          'color:#f59e0b; font-size:12px; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.06);' +
          '">' +
          '<span style="font-size:10px; transition:transform 0.2s;' + (collapsed ? '' : 'transform:rotate(90deg);') + '">\u25B6</span>' +
          '\uD83D\uDCC2 ' + escapeHtml(group.name) +
          '<span style="font-weight:400; color:rgba(255,255,255,0.3); margin-left:auto;">' + group.lists.length + '\u8868 ' + totalWords + '\u8BCD</span>' +
          '</div>';
        if (!collapsed) {
          h += '<div class="list-group-items" data-group-id="' + group.id + '">';
          for (var lj = 0; lj < group.lists.length; lj++) {
            var l = group.lists[lj];
            var wordCount = getListWords(l.id).length;
            var isActive = l.id === activeId;
            h += '<div class="list-selector-item" data-id="' + l.id + '" style="' +
              CSS.dropdownItem + ' padding-left:24px;' +
              (isActive ? 'background:rgba(16,185,129,0.15);' : '') + '">' +
              '<span style="flex:1;">' + escapeHtml(l.name) + '</span>' +
              '<span style="font-size:12px; color:rgba(255,255,255,0.4);">' + wordCount + '\u8BCD</span>' +
              (isActive ? '<span style="color:#10b981; margin-left:4px;">\u2713</span>' : '') +
              '</div>';
          }
          h += '</div>';
        }
      }

      // 未分组词表
      if (data.unassigned.length > 0) {
        var unassCollapsed = false;
        h += '<div class="list-group-header" data-group-id="__unassigned__" style="' +
          'display:flex; align-items:center; gap:6px; padding:6px 10px; cursor:pointer;' +
          'color:rgba(255,255,255,0.5); font-size:12px; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.06);' +
          '">' +
          '<span style="font-size:10px;">\u25B6</span>' +
          '\uD83D\uDCC4 \u672A\u5206\u7EC4' +
          '<span style="font-weight:400; color:rgba(255,255,255,0.3); margin-left:auto;">' + data.unassigned.length + '\u8868</span>' +
          '</div>';
        h += '<div class="list-group-items" data-group-id="__unassigned__">';
        for (var ui = 0; ui < data.unassigned.length; ui++) {
          var ul = data.unassigned[ui];
          var uCount = getListWords(ul.id).length;
          var uActive = ul.id === activeId;
          h += '<div class="list-selector-item" data-id="' + ul.id + '" style="' +
            CSS.dropdownItem + ' padding-left:24px;' +
            (uActive ? 'background:rgba(16,185,129,0.15);' : '') + '">' +
            '<span style="flex:1;">' + escapeHtml(ul.name) + '</span>' +
            '<span style="font-size:12px; color:rgba(255,255,255,0.4);">' + uCount + '\u8BCD</span>' +
            (uActive ? '<span style="color:#10b981; margin-left:4px;">\u2713</span>' : '') +
            '</div>';
        }
        h += '</div>';
      }

      dropdown.innerHTML = h;

      // 分组折叠/展开
      var groupHeaders = dropdown.querySelectorAll('.list-group-header');
      for (var i = 0; i < groupHeaders.length; i++) {
        groupHeaders[i].addEventListener('click', function (e) {
          e.stopPropagation();
          var gid = this.getAttribute('data-group-id');
          var items = dropdown.querySelector('.list-group-items[data-group-id="' + gid + '"]');
          var arrow = this.querySelector('span');
          if (items) {
            if (items.style.display === 'none') {
              items.style.display = '';
              if (arrow) arrow.style.transform = 'rotate(90deg)';
            } else {
              items.style.display = 'none';
              if (arrow) arrow.style.transform = '';
            }
          }
        });
      }

      // 点击切换词表
      var items = dropdown.querySelectorAll('.list-selector-item');
      for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function (e) {
          e.stopPropagation();
          var id = this.getAttribute('data-id');
          if (id === getActiveListId()) { hideDropdown(); return; }
          if (switchToList(id)) {
            hideDropdown();
            showToast('\u5DF2\u5207\u6362\u5230\uFF1A' + escapeHtml(getActiveListName()));
            setTimeout(function () { window.location.reload(); }, 600);
          }
        });
      }
    }

    function showDropdown() {
      listDropdownVisible = true;
      renderDropdown();
      dropdown.style.display = 'block';
    }

    function hideDropdown() {
      listDropdownVisible = false;
      dropdown.style.display = 'none';
    }

    function toggleDropdown() {
      if (listDropdownVisible) { hideDropdown(); }
      else { showDropdown(); }
    }

    selectorBtn.onclick = function (e) { e.stopPropagation(); toggleDropdown(); };

    // 点击外部关闭
    document.addEventListener('click', function (e) {
      if (listDropdownVisible && !selectorWrap.contains(e.target)) {
        hideDropdown();
      }
    });

    selectorWrap.appendChild(selectorBtn);
    selectorWrap.appendChild(dropdown);
    bar.appendChild(selectorWrap);

    // 右侧：操作按钮
    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:6px;';

    var createBtn = createButton('\u2795', CSS.btnSmall + CSS.btnOutline, function () {
      showCreateListModal();
    });
    createBtn.title = '\u65B0\u5EFA\u8BCD\u8868';

    var renameBtn = createButton('\u270F\uFE0F', CSS.btnSmall + CSS.btnOutline, function () {
      showRenameListModal();
    });
    renameBtn.title = '\u91CD\u547D\u540D';

    var delListBtn = createButton('\uD83D\uDDD1\uFE0F', CSS.btnSmall + CSS.btnOutline, function () {
      showDeleteListModal();
    });
    delListBtn.title = '\u5220\u9664\u8BCD\u8868';

    var groupBtn = createButton('\uD83D\uDCC2', CSS.btnSmall + CSS.btnOutline, function () {
      showGroupManageModal();
    });
    groupBtn.title = '\u5206\u7EC4\u7BA1\u7406';

    var batchDelBtn = createButton('\uD83D\uDDD1', CSS.btnSmall + CSS.btnDanger, function () {
      showBatchDeleteListsModal();
    });
    batchDelBtn.title = '\u6279\u91CF\u5220\u9664\u8BCD\u8868';

    actions.appendChild(createBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(delListBtn);
    actions.appendChild(groupBtn);
    actions.appendChild(batchDelBtn);
    bar.appendChild(actions);

    root.appendChild(bar);
  }

  /* ==================== 词表管理弹窗 ==================== */
  function showCreateListModal() {
    var modal = createModal('list-create-modal');
    modal.title.textContent = '\u65B0\u5EFA\u8BCD\u8868';

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '\u8F93\u5165\u8BCD\u8868\u540D\u79F0';
    input.style.cssText = 'width:100%; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:white; font-size:14px; outline:none; box-sizing:border-box;';
    modal.body.appendChild(input);

    var groupSelect = createGroupSelect(null);
    modal.body.appendChild(groupSelect);

    var errMsg = document.createElement('p');
    errMsg.style.cssText = 'color:#ef4444; font-size:13px; margin:6px 0 0; display:none;';
    errMsg.textContent = '\u8BE5\u540D\u79F0\u5DF2\u5B58\u5728\uFF0C\u8BF7\u6362\u4E00\u4E2A';
    modal.body.appendChild(errMsg);

    var confirmBtn = createButton('\u521B\u5EFA', CSS.btnPrimary, function () {
      var name = input.value.trim();
      if (!name) return;
      var gid = groupSelect.value || null;
      var id = createList(name, gid);
      if (!id) {
        errMsg.style.display = 'block';
        return;
      }
      modal.overlay.remove();
      showToast('\u5DF2\u521B\u5EFA\u8BCD\u8868\uFF1A' + escapeHtml(name));
      // 切换到新词表
      switchToList(id);
      setTimeout(function () { window.location.reload(); }, 600);
    });
    var cancelBtn = createButton('\u53D6\u6D88', CSS.btnOutline, function () {
      modal.overlay.remove();
    });
    modal.footer.appendChild(cancelBtn);
    modal.footer.appendChild(confirmBtn);
    document.body.appendChild(modal.overlay);
    setTimeout(function () { input.focus(); }, 100);

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') confirmBtn.click();
    });
  }

  function showRenameListModal() {
    var activeId = getActiveListId();
    var list = getListInfo(activeId);
    if (!list) return;
    if (activeId === DEFAULT_LIST_ID) {
      showToast('\u9ED8\u8BA4\u8BCD\u8868\u4E0D\u80FD\u91CD\u547D\u540D');
      return;
    }

    var modal = createModal('list-rename-modal');
    modal.title.textContent = '\u91CD\u547D\u540D\u8BCD\u8868';

    var input = document.createElement('input');
    input.type = 'text';
    input.value = list.name;
    input.style.cssText = 'width:100%; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:white; font-size:14px; outline:none; box-sizing:border-box;';
    modal.body.appendChild(input);

    var groupSelect = createGroupSelect(list.groupId || null);
    modal.body.appendChild(groupSelect);

    var errMsg = document.createElement('p');
    errMsg.style.cssText = 'color:#ef4444; font-size:13px; margin:6px 0 0; display:none;';
    errMsg.textContent = '\u8BE5\u540D\u79F0\u5DF2\u5B58\u5728\uFF0C\u8BF7\u6362\u4E00\u4E2A';
    modal.body.appendChild(errMsg);

    var confirmBtn = createButton('\u4FDD\u5B58', CSS.btnPrimary, function () {
      var name = input.value.trim();
      if (!name) return;
      var gid = groupSelect.value || null;
      // 保存分组归属
      assignListToGroup(activeId, gid);
      if (renameList(activeId, name)) {
        modal.overlay.remove();
        showToast('\u5DF2\u91CD\u547D\u540D\u4E3A\uFF1A' + escapeHtml(name));
        setTimeout(function () { window.location.reload(); }, 600);
      } else {
        errMsg.style.display = 'block';
      }
    });
    var cancelBtn = createButton('\u53D6\u6D88', CSS.btnOutline, function () {
      modal.overlay.remove();
    });
    modal.footer.appendChild(cancelBtn);
    modal.footer.appendChild(confirmBtn);
    document.body.appendChild(modal.overlay);
    setTimeout(function () { input.focus(); input.select(); }, 100);

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') confirmBtn.click();
    });
  }

  function showDeleteListModal() {
    var activeId = getActiveListId();
    if (activeId === DEFAULT_LIST_ID) {
      showToast('\u9ED8\u8BA4\u8BCD\u8868\u4E0D\u80FD\u5220\u9664');
      return;
    }
    var list = getListInfo(activeId);
    if (!list) return;

    var modal = createModal('list-delete-modal');
    modal.title.textContent = '\u5220\u9664\u8BCD\u8868';

    var words = getListWords(activeId);
    modal.body.innerHTML = '<p>\u786E\u5B9A\u8981\u5220\u9664\u8BCD\u8868 <strong style="color:#ef4444;">' +
      escapeHtml(list.name) + '</strong> \u5417\uFF1F</p>' +
      '<p style="color:rgba(255,255,255,0.5); font-size:13px;">\u8BE5\u8BCD\u8868\u5171 ' +
      words.length + ' \u4E2A\u5355\u8BCD\uFF0C\u5220\u9664\u540E\u4E0D\u53EF\u6062\u590D\u3002</p>';

    var confirmBtn = createButton('\u786E\u5B9A\u5220\u9664', CSS.btnDanger, function () {
      var targetId = activeId;
      deleteList(targetId);
      modal.overlay.remove();
      showToast('\u5DF2\u5220\u9664\u8BCD\u8868');
      // 加载第一个词表
      switchToList(getActiveListId());
      setTimeout(function () { window.location.reload(); }, 600);
    });
    var cancelBtn = createButton('\u53D6\u6D88', CSS.btnOutline, function () {
      modal.overlay.remove();
    });
    modal.footer.appendChild(cancelBtn);
    modal.footer.appendChild(confirmBtn);
    document.body.appendChild(modal.overlay);
  }

  /* ==================== 分组选择器组件 ==================== */
  function createGroupSelect(selectedGroupId) {
    var select = document.createElement('select');
    select.style.cssText = 'width:100%; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:white; font-size:14px; outline:none; box-sizing:border-box; margin-top:8px;';
    var groups = getAllGroups();
    var optStyle = 'style="color:white; background:#1e293b;"';
    var html = '<option ' + optStyle + ' value="">\u65E0\u5206\u7EC4</option>';
    for (var i = 0; i < groups.length; i++) {
      var sel = (groups[i].id === selectedGroupId) ? ' selected' : '';
      html += '<option ' + optStyle + ' value="' + groups[i].id + '"' + sel + '>' + escapeHtml(groups[i].name) + '</option>';
    }
    select.innerHTML = html;
    return select;
  }

  /* ==================== 分组管理弹窗 ==================== */
  function showGroupManageModal() {
    var modal = createModal('group-manage-modal');
    modal.title.textContent = '\u5206\u7EC4\u7BA1\u7406';
    modal.box.style.maxWidth = '560px';

    // 创建分组
    var createRow = document.createElement('div');
    createRow.style.cssText = 'display:flex; gap:8px; margin-bottom:16px;';
    var createInput = document.createElement('input');
    createInput.type = 'text';
    createInput.placeholder = '\u65B0\u5206\u7EC4\u540D\u79F0';
    createInput.style.cssText = 'flex:1; padding:8px 12px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:white; font-size:14px; outline:none;';
    var createBtn = createButton('\u521B\u5EFA\u5206\u7EC4', CSS.btnPrimary + CSS.btnSmall, function () {
      var name = createInput.value.trim();
      if (!name) return;
      var id = createGroup(name);
      if (!id) {
        showToast('\u5206\u7EC4\u540D\u5DF2\u5B58\u5728\u6216\u65E0\u6548');
        return;
      }
      showToast('\u5DF2\u521B\u5EFA\u5206\u7EC4\uFF1A' + escapeHtml(name));
      modal.overlay.remove();
      showGroupManageModal(); // 刷新弹窗
    });
    createRow.appendChild(createInput);
    createRow.appendChild(createBtn);
    modal.body.appendChild(createRow);

    // 现有分组列表
    var groups = getAllGroups();
    if (groups.length === 0) {
      var emptyMsg = document.createElement('p');
      emptyMsg.style.cssText = 'color:rgba(255,255,255,0.4); font-size:13px; text-align:center; padding:20px 0;';
      emptyMsg.textContent = '\u6682\u65E0\u5206\u7EC4\uFF0C\u8BF7\u5148\u521B\u5EFA';
      modal.body.appendChild(emptyMsg);
    } else {
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];

        // 获取该分组下的词表
        var meta = getListsMeta();
        var groupLists = [];
        for (var j = 0; j < meta.lists.length; j++) {
          if (meta.lists[j].groupId === group.id) {
            groupLists.push(meta.lists[j]);
          }
        }

        var groupItem = document.createElement('div');
        groupItem.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px 10px; margin-bottom:4px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.06);';

        var nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'flex:1; color:#f59e0b; font-weight:500; font-size:14px;';
        nameSpan.textContent = '\uD83D\uDCC2 ' + group.name;

        var countSpan = document.createElement('span');
        countSpan.style.cssText = 'color:rgba(255,255,255,0.4); font-size:12px;';
        countSpan.textContent = groupLists.length + '\u4E2A\u8BCD\u8868';

        var renameBtn = createButton('\u270F\uFE0F', 'padding:4px 8px; font-size:12px; background:transparent; color:rgba(255,255,255,0.5); border:1px solid rgba(255,255,255,0.15); border-radius:6px; cursor:pointer;', function () {
          var newName = prompt('\u91CD\u547D\u540D\u5206\u7EC4\uFF1A', group.name);
          if (newName && newName.trim() && newName.trim() !== group.name) {
            if (renameGroup(group.id, newName.trim())) {
              modal.overlay.remove();
              showGroupManageModal();
              showToast('\u5DF2\u91CD\u547D\u540D\u4E3A\uFF1A' + escapeHtml(newName.trim()));
            } else {
              showToast('\u5206\u7EC4\u540D\u5DF2\u5B58\u5728\u6216\u65E0\u6548');
            }
          }
        });

        var delBtn = createButton('\uD83D\uDDD1\uFE0F', 'padding:4px 8px; font-size:12px; background:transparent; color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:6px; cursor:pointer;', function () {
          if (deleteGroup(group.id)) {
            modal.overlay.remove();
            showGroupManageModal();
            showToast('\u5DF2\u5220\u9664\u5206\u7EC4\uFF1A' + escapeHtml(group.name));
          }
        });

        groupItem.appendChild(nameSpan);
        groupItem.appendChild(countSpan);
        groupItem.appendChild(renameBtn);
        groupItem.appendChild(delBtn);
        modal.body.appendChild(groupItem);

        // 显示词表列表
        if (groupLists.length > 0) {
          var listContainer = document.createElement('div');
          listContainer.style.cssText = 'padding-left:12px; margin-bottom:8px;';
          for (var k = 0; k < groupLists.length; k++) {
            var l = groupLists[k];
            var lItem = document.createElement('div');
            lItem.style.cssText = 'display:flex; align-items:center; gap:6px; padding:4px 8px; font-size:13px; color:rgba(255,255,255,0.6);';
            lItem.innerHTML = '<span style="flex:1;">\uD83D\uDCDA ' + escapeHtml(l.name) + '</span>' +
              '<button style="padding:2px 8px; font-size:11px; background:transparent; color:#ef4444; border:1px solid rgba(239,68,68,0.2); border-radius:4px; cursor:pointer;" data-list-id="' + l.id + '">\u79FB\u51FA</button>';
            lItem.querySelector('button').addEventListener('click', function () {
              assignListToGroup(this.getAttribute('data-list-id'), null);
              modal.overlay.remove();
              showGroupManageModal();
              showToast('\u5DF2\u5C06\u8BCD\u8868\u79FB\u51FA\u5206\u7EC4');
            });
            listContainer.appendChild(lItem);
          }
          modal.body.appendChild(listContainer);
        }
      }
    }

    var closeBtn = createButton('\u5173\u95ED', CSS.btnOutline + CSS.btnSmall, function () {
      modal.overlay.remove();
    });
    modal.footer.appendChild(closeBtn);
    document.body.appendChild(modal.overlay);
  }

  /* ==================== 批量删除词表 ==================== */
  function showBatchDeleteListsModal() {
    var modal = createModal('batch-delete-lists-modal');
    modal.title.textContent = '\u6279\u91CF\u5220\u9664\u8BCD\u8868';
    modal.box.style.maxWidth = '560px';

    var allLists = getAllLists();
    if (allLists.length <= 1 && allLists[0] && allLists[0].id === DEFAULT_LIST_ID) {
      modal.body.innerHTML = '<p style="color:rgba(255,255,255,0.4); text-align:center; padding:20px 0;">\u6CA1\u6709\u53EF\u5220\u9664\u7684\u8BCD\u8868</p>';
      var closeOnly = createButton('\u5173\u95ED', CSS.btnOutline + CSS.btnSmall, function () { modal.overlay.remove(); });
      modal.footer.appendChild(closeOnly);
      document.body.appendChild(modal.overlay);
      return;
    }

    // 提示
    var hint = document.createElement('p');
    hint.style.cssText = 'color:rgba(255,255,255,0.5); font-size:13px; margin:0 0 12px;';
    hint.textContent = '\u52FE\u9009\u8981\u5220\u9664\u7684\u8BCD\u8868\uFF0C\u9ED8\u8BA4\u8BCD\u8868\u4E0D\u53EF\u5220\u9664\u3002\u5220\u9664\u540E\u5355\u8BCD\u4E0D\u53EF\u6062\u590D\u3002';
    modal.body.appendChild(hint);

    // 全选
    var selectAllRow = document.createElement('label');
    selectAllRow.style.cssText = 'display:flex; align-items:center; gap:8px; padding:6px 10px; cursor:pointer; font-size:13px; color:rgba(255,255,255,0.7); margin-bottom:8px;';
    var selectAllCb = document.createElement('input');
    selectAllCb.type = 'checkbox';
    selectAllCb.style.cssText = CSS.checkbox;
    selectAllRow.appendChild(selectAllCb);
    selectAllRow.appendChild(document.createTextNode('\u5168\u9009'));
    modal.body.appendChild(selectAllRow);

    // 分组归类显示
    var data = getGroupsWithLists();
    var listItems = document.createElement('div');
    listItems.style.cssText = 'max-height:300px; overflow-y:auto;';

    function renderListRow(list) {
      var row = document.createElement('label');
      row.style.cssText = 'display:flex; align-items:center; gap:8px; padding:6px 10px; cursor:pointer; font-size:13px; color:rgba(255,255,255,0.8); border-bottom:1px solid rgba(255,255,255,0.04);';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'batch-delete-list-cb';
      cb.dataset.listId = list.id;
      cb.style.cssText = CSS.checkbox;
      if (list.id === DEFAULT_LIST_ID) {
        cb.disabled = true;
        cb.style.opacity = '0.3';
      }
      var label = document.createElement('span');
      label.style.cssText = 'flex:1;';
      label.textContent = '\uD83D\uDCDA ' + list.name;
      var count = document.createElement('span');
      count.style.cssText = 'color:rgba(255,255,255,0.35); font-size:12px;';
      count.textContent = getListWords(list.id).length + '\u8BCD';
      row.appendChild(cb);
      row.appendChild(label);
      row.appendChild(count);
      return row;
    }

    for (var gi = 0; gi < data.groups.length; gi++) {
      var group = data.groups[gi];
      var gHeader = document.createElement('div');
      gHeader.style.cssText = 'padding:6px 10px; color:#f59e0b; font-weight:600; font-size:12px; border-bottom:1px solid rgba(255,255,255,0.06);';
      gHeader.textContent = '\uD83D\uDCC2 ' + group.name;
      listItems.appendChild(gHeader);
      for (var lj = 0; lj < group.lists.length; lj++) {
        listItems.appendChild(renderListRow(group.lists[lj]));
      }
    }

    if (data.unassigned.length > 0) {
      var uHeader = document.createElement('div');
      uHeader.style.cssText = 'padding:6px 10px; color:rgba(255,255,255,0.5); font-weight:600; font-size:12px; border-bottom:1px solid rgba(255,255,255,0.06);';
      uHeader.textContent = '\uD83D\uDCC4 \u672A\u5206\u7EC4';
      listItems.appendChild(uHeader);
      for (var uj = 0; uj < data.unassigned.length; uj++) {
        listItems.appendChild(renderListRow(data.unassigned[uj]));
      }
    }

    selectAllCb.addEventListener('change', function () {
      var cbs = listItems.querySelectorAll('.batch-delete-list-cb:not([disabled])');
      for (var ci = 0; ci < cbs.length; ci++) { cbs[ci].checked = this.checked; }
    });

    modal.body.appendChild(listItems);

    var confirmBtn = createButton('\u5220\u9664\u9009\u4E2D\u8BCD\u8868', CSS.btnDanger, function () {
      var checked = listItems.querySelectorAll('.batch-delete-list-cb:checked');
      if (checked.length === 0) {
        showToast('\u8BF7\u9009\u62E9\u8981\u5220\u9664\u7684\u8BCD\u8868');
        return;
      }
      var ids = [];
      for (var ci = 0; ci < checked.length; ci++) {
        ids.push(checked[ci].dataset.listId);
      }

      // 二次确认
      var confirm2 = createModal('batch-delete-lists-confirm');
      confirm2.title.textContent = '\u786E\u8BA4\u5220\u9664';
      confirm2.body.innerHTML = '<p>\u786E\u5B9A\u8981\u5220\u9664\u9009\u4E2D\u7684 <strong style="color:#ef4444;">' + ids.length + '</strong> \u4E2A\u8BCD\u8868\u5417\uFF1F\u5355\u8BCD\u5C06\u4E0D\u53EF\u6062\u590D\u3002</p>';
      var cfmBtn = createButton('\u786E\u5B9A\u5220\u9664', CSS.btnDanger + CSS.btnSmall, function () {
        var deleted = 0;
        for (var di = 0; di < ids.length; di++) {
          if (ids[di] === DEFAULT_LIST_ID) continue;
          if (deleteList(ids[di])) deleted++;
        }
        confirm2.overlay.remove();
        modal.overlay.remove();
        // 如果当前词表被删了，切换到第一个
        var activeId = getActiveListId();
        var stillExists = getListInfo(activeId);
        if (!stillExists) {
          switchToList(getActiveListId());
        }
        showToast('\u5DF2\u5220\u9664 ' + deleted + ' \u4E2A\u8BCD\u8868');
        setTimeout(function () { window.location.reload(); }, 800);
      });
      var cclBtn = createButton('\u53D6\u6D88', CSS.btnOutline + CSS.btnSmall, function () { confirm2.overlay.remove(); });
      confirm2.footer.appendChild(cclBtn);
      confirm2.footer.appendChild(cfmBtn);
      document.body.appendChild(confirm2.overlay);
    });
    var cancelBtn = createButton('\u53D6\u6D88', CSS.btnOutline + CSS.btnSmall, function () {
      modal.overlay.remove();
    });
    modal.footer.appendChild(cancelBtn);
    modal.footer.appendChild(confirmBtn);
    document.body.appendChild(modal.overlay);
  }

  /* ==================== Toast ==================== */
  function showToast(msg) {
    var existing = document.getElementById('batch-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'batch-toast';
    toast.textContent = msg;
    toast.style.cssText = [
      'position:fixed; bottom:30px; left:50%; transform:translateX(-50%);',
      'background:#1e293b; color:white; padding:12px 24px; border-radius:10px;',
      'font-size:14px; box-shadow:0 8px 24px rgba(0,0,0,0.4);',
      'z-index:999999; white-space:nowrap; max-width:90vw; overflow:hidden; text-overflow:ellipsis;',
      'animation:batchToastIn 0.3s ease-out;',
    ].join(' ');
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  }

  /* ==================== 工具 ==================== */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function findWordCardContainer() {
    var main = document.querySelector('.space-y-6');
    if (!main) return null;
    return main.querySelector('.flex.flex-col.gap-2') || null;
  }

  function isHomePage() {
    return !!document.querySelector('.space-y-6');
  }

  /* ==================== 注入样式 ==================== */
  function injectStyles() {
    if (document.getElementById('batch-inject-styles')) return;
    var style = document.createElement('style');
    style.id = 'batch-inject-styles';
    style.textContent = [
      '@keyframes batchToastIn { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }',
      '.batch-inject-btn:hover { transform:translateY(-1px); }',
      '.batch-inject-btn:active { transform:translateY(0); }',
      '.list-selector-item:hover { background:rgba(255,255,255,0.08) !important; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ==================== 等待元素 ==================== */
  function waitForElement(selector, timeout) {
    if (!timeout) timeout = 10000;
    return new Promise(function (resolve) {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }
      var observer = new MutationObserver(function () {
        var el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  /* ==================== 注入主流程 ==================== */
  function injectBatchUI() {
    if (document.getElementById('batch-inject-root')) return;

    var spaceContainer = document.querySelector('.space-y-6');
    if (!spaceContainer) return;

    var root = document.createElement('div');
    root.id = 'batch-inject-root';

    // ===== 词表选择栏 =====
    renderWordListSelector(root);

    // ===== 批量导入按钮（插在"添加单词"表单下方） =====
    // spaceContainer 子元素顺序: [0]header [1]WordInput表单 [2]词表区 [3]开始背词
    var formEl = spaceContainer.children[1];
    if (formEl) {
      var importBar = document.createElement('div');
      importBar.id = 'batch-import-bar';
      importBar.style.cssText = 'display:flex; gap:8px; margin-top:12px;';
      var pasteBtn = createButton('\uD83D\uDCCB \u7C98\u8D34\u6279\u91CF\u5BFC\u5165', CSS.btnPrimary, showPasteImport);
      pasteBtn.style.cssText = CSS.btn + CSS.btnPrimary + ' flex:1; justify-content:center; padding:10px 16px;';
      importBar.appendChild(pasteBtn);
      formEl.parentNode.insertBefore(importBar, formEl.nextSibling);
    }

    // ===== 批量删除 =====
    var deleteSection = document.createElement('div');
    deleteSection.id = 'batch-delete-container';
    deleteSection.style.cssText = CSS.container + ' margin-top:12px;';

    var deleteTitleRow = document.createElement('div');
    deleteTitleRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between;';

    var deleteTitle = document.createElement('div');
    deleteTitle.style.cssText = CSS.sectionTitle;
    deleteTitle.textContent = '\u6279\u91CF\u5220\u9664';
    deleteTitle.style.marginBottom = '0';
    deleteTitleRow.appendChild(deleteTitle);

    var deleteBtnRow = document.createElement('div');
    deleteBtnRow.style.cssText = 'display:flex; gap:8px; align-items:center;';

    var delToggleBtn = createButton('\u6279\u91CF\u5220\u9664', CSS.btnDanger + CSS.btnSmall, toggleBatchDelete);
    delToggleBtn.id = 'batch-delete-toggle';

    // 全选
    var selectAllLabel = document.createElement('label');
    selectAllLabel.id = 'batch-select-all-label';
    selectAllLabel.style.cssText = 'display:none; align-items:center; gap:6px; cursor:pointer; font-size:13px; color:rgba(255,255,255,0.7);';
    var selectAllCb = document.createElement('input');
    selectAllCb.type = 'checkbox';
    selectAllCb.id = 'batch-select-all';
    selectAllCb.style.cssText = CSS.checkbox;
    selectAllCb.addEventListener('change', function () {
      var checked = this.checked;
      var allCbs = document.querySelectorAll('.batch-delete-cb');
      for (var i = 0; i < allCbs.length; i++) { allCbs[i].checked = checked; }
      updateBatchDeleteButton();
    });
    var selectAllText = document.createElement('span');
    selectAllText.textContent = '\u5168\u9009';
    selectAllLabel.appendChild(selectAllCb);
    selectAllLabel.appendChild(selectAllText);

    var delExecBtn = createButton('\u5220\u9664\u9009\u4E2D', CSS.btnDanger + CSS.btnSmall, executeBatchDelete);
    delExecBtn.id = 'batch-delete-exec-btn';
    delExecBtn.style.display = 'none';

    deleteBtnRow.appendChild(delToggleBtn);
    deleteBtnRow.appendChild(selectAllLabel);
    deleteBtnRow.appendChild(delExecBtn);
    deleteTitleRow.appendChild(deleteBtnRow);
    deleteSection.appendChild(deleteTitleRow);
    root.appendChild(deleteSection);

    // 插入到开始背词按钮之前
    var children = spaceContainer.children;
    if (children.length >= 2) {
      spaceContainer.insertBefore(root, children[children.length - 1]);
    } else {
      spaceContainer.appendChild(root);
    }
  }

  /* ==================== 启动 ==================== */
  async function init() {
    injectStyles();

    // 初始化词表系统
    ensureDefaultList();

    // 等待 React 渲染首页 (.space-y-6 是首页根容器，有无单词都存在)
    var spaceContainer = await waitForElement('.space-y-6', 8000);
    if (!spaceContainer) {
      // 不在首页 → 监听路由变化
      var observer = new MutationObserver(function () {
        if (isHomePage()) {
          observer.disconnect();
          injectBatchUI();
        }
      });
      observer.observe(document.getElementById('root'), { childList: true, subtree: true });
      return;
    }

    // 注：不等待 .flex.flex-col.gap-2（词条列表），因为空词表时不渲染该元素
    injectBatchUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // SPA 路由切换
  var lastUrl = location.href;
  new MutationObserver(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(function () {
        var root = document.getElementById('batch-inject-root');
        if (root) root.remove();
        var importBar = document.getElementById('batch-import-bar');
        if (importBar) importBar.remove();
        batchDeleteActive = false;
        injectBatchUI();
      }, 500);
    }
  }).observe(document, { subtree: true, childList: true });
})();
